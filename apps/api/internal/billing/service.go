package billing

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/customer"
	"github.com/gigabill/isp/internal/notification"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/pagination"
	"github.com/gigabill/isp/internal/subscription"
	"github.com/gigabill/isp/pkg/money"
)

type OnlinePaymentCreator func(ctx context.Context, inv *Invoice, amount int64) (paymentURL string, qrImageURL string, snapToken string, err error)
type DepositPaymentCreator func(ctx context.Context, custID uuid.UUID, custNumber, custName, custEmail, custPhone string, amount int64) (paymentURL string, qrImageURL string, snapToken string, err error)

type Service struct {
	repo                  *Repository
	engine                *Engine
	customerRepo          *customer.Repository
	subscriptionRepo      *subscription.Repository
	subSvc                *subscription.Service
	notifSvc              *notification.Service
	companyInfo           CompanyInfo
	onlinePaymentCreator  OnlinePaymentCreator
	depositPaymentCreator DepositPaymentCreator
	logger                *slog.Logger
}

func NewService(
	repo *Repository,
	engine *Engine,
	customerRepo *customer.Repository,
	subRepo *subscription.Repository,
	logger *slog.Logger,
) *Service {
	return &Service{
		repo:             repo,
		engine:           engine,
		customerRepo:     customerRepo,
		subscriptionRepo: subRepo,
		companyInfo:      DefaultCompanyInfo(),
		logger:           logger,
	}
}

func (s *Service) SetSubscriptionService(subSvc *subscription.Service) {
	s.subSvc = subSvc
}

func (s *Service) SetNotificationService(notifSvc *notification.Service) {
	s.notifSvc = notifSvc
}

func (s *Service) SetCompanyInfo(info CompanyInfo) {
	s.companyInfo = info
}

func (s *Service) SetOnlinePaymentCreator(creator OnlinePaymentCreator) {
	s.onlinePaymentCreator = creator
}

func (s *Service) SetDepositPaymentCreator(creator DepositPaymentCreator) {
	s.depositPaymentCreator = creator
}

func (s *Service) CreateManual(ctx context.Context, req CreateManualInvoiceRequest, issuedBy *uuid.UUID) (*Invoice, error) {
	cust, err := s.customerRepo.GetByID(ctx, req.CustomerID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if cust == nil {
		return nil, apperrors.NotFound("Customer")
	}

	branchCode := resolveCustomerBranch(cust)
	invNum, err := s.repo.GenerateInvoiceNumber(ctx, branchCode)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	now := time.Now()
	inv := &Invoice{
		ID:             uuid.New(),
		InvoiceNumber:  invNum,
		CustomerID:     req.CustomerID,
		SubscriptionID: req.SubscriptionID,
		Status:         StatusDraft,
		DueDate:        req.DueDate,
		Currency:       "IDR",
		Notes:          req.Notes,
		IssuedBy:       issuedBy,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	for _, itemReq := range req.Items {
		item := InvoiceItem{
			ID:          uuid.New(),
			InvoiceID:   inv.ID,
			ItemType:    itemReq.ItemType,
			Description: itemReq.Description,
			Quantity:    itemReq.Quantity,
			UnitPrice:   money.Amount(itemReq.UnitPrice),
			TaxPercent:  itemReq.TaxPercent,
			CreatedAt:   now,
		}
		inv.Items = append(inv.Items, item)
	}

	s.engine.RecalculateTotals(inv)

	if err := s.repo.Create(ctx, inv); err != nil {
		s.logger.Error("failed to create manual invoice", "error", err)
		return nil, apperrors.Internal(err)
	}

	inv.CustomerName = &cust.FullName
	inv.CustomerNumber = &cust.CustomerNumber
	return inv, nil
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*Invoice, error) {
	inv, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if inv == nil {
		return nil, apperrors.NotFound("Invoice")
	}
	return inv, nil
}

func (s *Service) List(ctx context.Context, params pagination.Params, customerID *uuid.UUID, status string) ([]Invoice, pagination.Meta, error) {
	invoices, total, err := s.repo.List(ctx, params, customerID, status)
	if err != nil {
		return nil, pagination.Meta{}, apperrors.Internal(err)
	}
	meta := pagination.NewMeta(params, total)
	return invoices, meta, nil
}

func (s *Service) Issue(ctx context.Context, id uuid.UUID, issuedBy *uuid.UUID) error {
	inv, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if inv == nil {
		return apperrors.NotFound("Invoice")
	}
	if inv.Status != StatusDraft {
		return apperrors.Conflict("Hanya invoice dalam status DRAFT yang dapat diterbitkan (ISSUED)")
	}

	if err := s.repo.Issue(ctx, id, issuedBy); err != nil {
		return apperrors.Internal(err)
	}

	s.logger.Info("invoice issued", "invoice_id", id, "invoice_number", inv.InvoiceNumber)
	return nil
}

func (s *Service) Void(ctx context.Context, id uuid.UUID, reason string) error {
	inv, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if inv == nil {
		return apperrors.NotFound("Invoice")
	}
	if inv.Status == StatusPaid {
		return apperrors.Conflict("Invoice yang sudah lunas (PAID) tidak dapat dibatalkan (VOID)")
	}
	if inv.Status == StatusVoid {
		return nil
	}

	if err := s.repo.Void(ctx, id, reason); err != nil {
		return apperrors.Internal(err)
	}

	s.logger.Info("invoice voided", "invoice_id", id, "reason", reason)
	return nil
}

func (s *Service) PublicLookup(ctx context.Context, query string) (*PublicInvoiceLookupResponse, error) {
	invoices, err := s.repo.PublicLookup(ctx, query)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if len(invoices) == 0 {
		return nil, apperrors.NotFound("Tagihan tidak ditemukan untuk nomor pelanggan/HP/faktur tersebut")
	}

	first := invoices[0]
	custName := "Pelanggan"
	if first.CustomerName != nil {
		custName = *first.CustomerName
	}
	custNumber := ""
	if first.CustomerNumber != nil {
		custNumber = *first.CustomerNumber
	}
	phone := ""
	if first.CustomerPhone != nil {
		phone = *first.CustomerPhone
	}

	creditBalance, heldBalance, holdUntil, creditNotes, _ := s.repo.GetCustomerCreditBalance(ctx, first.CustomerID)

	return &PublicInvoiceLookupResponse{
		CustomerID:     first.CustomerID,
		CustomerName:   custName,
		CustomerNumber: custNumber,
		Phone:          phone,
		CreditBalance:  creditBalance,
		HeldBalance:    heldBalance,
		HoldUntil:      holdUntil,
		CreditNotes:    creditNotes,
		Invoices:       invoices,
	}, nil
}

func (s *Service) PublicPayInvoice(ctx context.Context, req PublicPayInvoiceRequest) (*PublicPayInvoiceResponse, error) {
	inv, err := s.repo.GetByID(ctx, req.InvoiceID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if inv == nil {
		return nil, apperrors.NotFound("Invoice")
	}

	if inv.Status == StatusPaid {
		return &PublicPayInvoiceResponse{
			InvoiceID:     inv.ID,
			InvoiceNumber: inv.InvoiceNumber,
			Amount:        inv.TotalAmount.Int64(),
			Status:        "PAID",
			Message:       "Faktur ini sudah lunas sebelumnya",
		}, nil
	}

	amountToPay := inv.AmountDue
	if amountToPay <= 0 {
		amountToPay = inv.TotalAmount
	}

	// Default mock QRIS
	qrString := fmt.Sprintf("00020101021226600016ID.GIGABILL.WWW0118936009990000000000520458125303360540%d5802ID5912GIGABILL-ISP6007JAKARTA6304ABCD", amountToPay.Int64())
	qrImageUrl := fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=%s", qrString)
	var paymentURL string
	var snapToken string

	// Create real Midtrans online payment if configured
	if s.onlinePaymentCreator != nil && !req.SimulatePay {
		if pURL, qURL, sTok, err := s.onlinePaymentCreator(ctx, inv, amountToPay.Int64()); err == nil && pURL != "" {
			paymentURL = pURL
			snapToken = sTok
			if qURL != "" {
				qrImageUrl = qURL
			}
		}
	}

	if req.SimulatePay {
		// Mark paid
		if err := s.repo.MarkPaid(ctx, inv.ID, amountToPay); err != nil {
			return nil, apperrors.Internal(err)
		}

		// If subscription is linked, extend validity by 30 days (rolling) & reactivate FreeRADIUS session
		if inv.SubscriptionID != nil {
			nowPay := time.Now()
			if s.subSvc != nil {
				_, _ = s.subSvc.ExtendValidityOnPayment(ctx, *inv.SubscriptionID, nowPay)
			} else {
				_ = s.subscriptionRepo.UpdateStatus(ctx, *inv.SubscriptionID, subscription.StatusActive, nil, nil)
				_ = s.subscriptionRepo.UpdateAccessAccountsBySubscriptionID(ctx, *inv.SubscriptionID, subscription.AccessAccountActive)
			}
		}

		// Calculate & record partner revenue share if applicable
		s.repo.RecordPartnerRevenueShare(ctx, inv.ID, amountToPay)

		s.logger.Info("public invoice paid & reactivated", "invoice_number", inv.InvoiceNumber, "amount", amountToPay.Int64())

		return &PublicPayInvoiceResponse{
			InvoiceID:     inv.ID,
			InvoiceNumber: inv.InvoiceNumber,
			Amount:        amountToPay.Int64(),
			QRString:      qrString,
			QRImageUrl:    qrImageUrl,
			PaymentURL:    paymentURL,
			SnapToken:     snapToken,
			Status:        "PAID",
			Message:       "Pembayaran berhasil diverifikasi! Tagihan lunas dan koneksi internet Anda aktif.",
		}, nil
	}

	payMessage := "Silakan scan QRIS untuk menyelesaikan pembayaran"
	if paymentURL != "" {
		payMessage = "Silakan klik tombol bayar via Midtrans (QRIS, VA Bank, E-Wallet) atau scan QR code berikut"
	}

	return &PublicPayInvoiceResponse{
		InvoiceID:     inv.ID,
		InvoiceNumber: inv.InvoiceNumber,
		Amount:        amountToPay.Int64(),
		QRString:      qrString,
		QRImageUrl:    qrImageUrl,
		PaymentURL:    paymentURL,
		SnapToken:     snapToken,
		Status:        string(inv.Status),
		Message:       payMessage,
	}, nil
}

func (s *Service) PublicTopUpDeposit(ctx context.Context, req PublicTopUpDepositRequest) (*PublicTopUpDepositResponse, error) {
	if req.Amount < 10000 {
		return nil, apperrors.BadRequest("Nominal pengisian deposit minimal Rp 10.000")
	}

	// 1. Identify customer
	var custID uuid.UUID
	var custName string
	var custNumber string
	var custEmail string
	var custPhone string

	if req.CustomerID != nil && *req.CustomerID != uuid.Nil {
		custID = *req.CustomerID
		c, err := s.repo.FindCustomerByQuery(ctx, custID.String())
		if err == nil && c != nil {
			custName = c.FullName
			custNumber = c.CustomerNumber
			if c.Email != nil {
				custEmail = *c.Email
			}
			custPhone = c.Phone
		}
	} else if req.Query != "" {
		c, err := s.repo.FindCustomerByQuery(ctx, req.Query)
		if err != nil || c == nil {
			return nil, apperrors.NotFound("Data pelanggan tidak ditemukan untuk nomor/identitas tersebut")
		}
		custID = c.ID
		custName = c.FullName
		custNumber = c.CustomerNumber
		if c.Email != nil {
			custEmail = *c.Email
		}
		custPhone = c.Phone
	} else {
		return nil, apperrors.BadRequest("ID pelanggan atau nomor telepon wajib diisi")
	}

	reason := req.Notes
	if reason == "" {
		reason = fmt.Sprintf("Kredit Tagihan Berlangganan Internet Rp %d", req.Amount)
	}

	if req.SimulatePay {
		expiresAt := time.Now().AddDate(2, 0, 0)
		cn, err := s.repo.AddCreditNote(ctx, custID, req.Amount, reason, &expiresAt)
		if err != nil {
			return nil, apperrors.Internal(err)
		}

		newBal, _, _, _, _ := s.repo.GetCustomerCreditBalance(ctx, custID)

		s.logger.Info("public credit addition successful", "customer_id", custID.String(), "amount", req.Amount, "new_balance", newBal)

		return &PublicTopUpDepositResponse{
			CustomerID:    custID,
			CustomerName:  custName,
			DepositAmount: req.Amount,
			CreditBalance: newBal,
			Status:        "SUCCESS",
			Message:       fmt.Sprintf("Penambahan kredit tagihan sebesar Rp %d berhasil. Kredit sekarang aktif dan siap memotong tagihan berikutnya.", req.Amount),
			CreditNote:    cn,
		}, nil
	}

	var paymentURL, qrImageUrl, snapToken string
	if s.depositPaymentCreator != nil {
		pURL, qrURL, token, err := s.depositPaymentCreator(ctx, custID, custNumber, custName, custEmail, custPhone, req.Amount)
		if err != nil {
			s.logger.Warn("failed to create midtrans payment for deposit", "customer_id", custID.String(), "error", err)
		} else {
			paymentURL = pURL
			qrImageUrl = qrURL
			snapToken = token
		}
	}

	qrString := ""
	if qrImageUrl == "" {
		qrString = fmt.Sprintf("00020101021226600016ID.GIGABILL.WWW0118936009990000000000520458125303360540%d5802ID5912GIGABILL-ISP6007JAKARTA6304ABCD", req.Amount)
		qrImageUrl = fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=%s", qrString)
	}

	currBal, _, _, _, _ := s.repo.GetCustomerCreditBalance(ctx, custID)

	return &PublicTopUpDepositResponse{
		CustomerID:    custID,
		CustomerName:  custName,
		DepositAmount: req.Amount,
		CreditBalance: currBal,
		PaymentURL:    paymentURL,
		SnapToken:     snapToken,
		QRString:      qrString,
		QRImageUrl:    qrImageUrl,
		Status:        "PENDING",
		Message:       "Silakan lanjutkan pembayaran melalui Payment Gateway Midtrans (QRIS, VA Bank, E-Wallet) untuk mengisi kredit tagihan Anda.",
	}, nil
}


// ── Background Worker Jobs ───────────────────────────────────────

// RunInvoiceGenerationJob generates automatic invoices for subscriptions due for billing.
func (s *Service) RunInvoiceGenerationJob(ctx context.Context) error {
	dueSubs, err := s.repo.GetSubscriptionsDueForBilling(ctx)
	if err != nil {
		return fmt.Errorf("fetch due subscriptions: %w", err)
	}

	if len(dueSubs) == 0 {
		return nil
	}

	s.logger.Info("running invoice generation job", "due_count", len(dueSubs))

	now := time.Now()
	for _, sub := range dueSubs {
		branchCode := s.resolveCustomerBranchCode(ctx, sub.CustomerID)
		invNum, err := s.repo.GenerateInvoiceNumber(ctx, branchCode)
		if err != nil {
			s.logger.Error("failed to generate invoice number in worker", "error", err)
			continue
		}

		// Calculate period
		periodStart := sub.NextBillingDate
		var periodEnd time.Time

		switch sub.BillingCycle {
		case "DAILY":
			periodEnd = periodStart.AddDate(0, 0, 1)
		case "WEEKLY":
			periodEnd = periodStart.AddDate(0, 0, 7)
		case "QUARTERLY":
			periodEnd = periodStart.AddDate(0, 3, 0)
		case "ANNUAL":
			periodEnd = periodStart.AddDate(1, 0, 0)
		default: // MONTHLY, PREPAID
			periodEnd = periodStart.AddDate(0, 1, 0)
		}

		// Due date: customer must pay on or before expiration date (plus grace period if configured)
		dueDate := sub.NextBillingDate
		if dueDate.Before(now) {
			dueDate = now
		}
		if sub.GracePeriodDays > 0 {
			dueDate = dueDate.AddDate(0, 0, sub.GracePeriodDays)
		}

		monthlyAmount := money.Amount(sub.MonthlyPrice)
		inv := &Invoice{
			ID:                 uuid.New(),
			InvoiceNumber:      invNum,
			CustomerID:         sub.CustomerID,
			SubscriptionID:     &sub.SubscriptionID,
			PlanPriceID:        &sub.PlanPriceID,
			Status:             StatusIssued, // Auto-generated invoices are directly ISSUED
			BillingPeriodStart: &periodStart,
			BillingPeriodEnd:   &periodEnd,
			IssueDate:          &now,
			DueDate:            dueDate,
			Currency:           "IDR",
			CreatedAt:          now,
			UpdatedAt:          now,
		}

		unitPrice := monthlyAmount.Int64()
		if sub.TaxPercent > 0 {
			unitPrice = int64(math.Round(float64(unitPrice) / (1.0 + float64(sub.TaxPercent)/10000.0)))
		}

		// Primary subscription line item
		item := InvoiceItem{
			ID:          uuid.New(),
			InvoiceID:   inv.ID,
			ItemType:    ItemTypeSubscription,
			Description: fmt.Sprintf("Biaya Perpanjangan Langganan Internet (%s s/d %s)", periodStart.Format("02 Jan 2006"), periodEnd.Format("02 Jan 2006")),
			Quantity:    1,
			UnitPrice:   money.Amount(unitPrice),
			TaxPercent:  sub.TaxPercent,
			PeriodStart: &periodStart,
			PeriodEnd:   &periodEnd,
			CreatedAt:   now,
		}
		inv.Items = append(inv.Items, item)

		// Add-on IP Publik Statik (jika akun PPPoE memiliki IP Publik statis)
		if sub.StaticIP != "" {
			addonPrice, addonDesc := s.repo.GetPublicIPAddonPrice(ctx)
			if addonPrice > 0 {
				addonUnitPrice := addonPrice
				if sub.TaxPercent > 0 {
					addonUnitPrice = int64(math.Round(float64(addonPrice) / (1.0 + float64(sub.TaxPercent)/10000.0)))
				}
				inv.Items = append(inv.Items, InvoiceItem{
					ID:          uuid.New(),
					InvoiceID:   inv.ID,
					ItemType:    ItemTypeOther,
					Description: fmt.Sprintf("%s (%s)", addonDesc, sub.StaticIP),
					Quantity:    1,
					UnitPrice:   money.Amount(addonUnitPrice),
					TaxPercent:  sub.TaxPercent,
					PeriodStart: &periodStart,
					PeriodEnd:   &periodEnd,
					CreatedAt:   now,
				})
			}
		}

		s.engine.RecalculateTotals(inv)

		if err := s.repo.Create(ctx, inv); err != nil {
			s.logger.Error("failed to create auto invoice", "subscription_id", sub.SubscriptionID, "error", err)
			continue
		}

		// In the rolling validity model, next_billing_date is ONLY advanced upon payment confirmation.
		s.logger.Info("auto renewal invoice generated successfully",
			"subscription_id", sub.SubscriptionID,
			"invoice_number", invNum,
			"due_date", dueDate.Format("2006-01-02"),
			"total_amount", inv.TotalAmount.Int64(),
		)
	}

	return nil
}

// RunOverdueCheckJob marks overdue invoices and suspends subscribers who passed grace periods.
func (s *Service) RunOverdueCheckJob(ctx context.Context) error {
	// 1. Mark overdue invoices
	marked, err := s.repo.MarkOverdueInvoices(ctx)
	if err != nil {
		return fmt.Errorf("mark overdue invoices: %w", err)
	}
	if marked > 0 {
		s.logger.Info("marked overdue invoices", "count", marked)
	}

	// 2. Suspend subscriptions exceeding grace period
	exceeding, err := s.repo.GetSubscriptionsExceedingGrace(ctx)
	if err != nil {
		return fmt.Errorf("get subscriptions exceeding grace: %w", err)
	}

	for _, item := range exceeding {
		s.logger.Warn("suspending subscription exceeding grace period",
			"subscription_id", item.SubscriptionID,
			"customer_id", item.CustomerID,
		)
		if s.subSvc != nil {
			_, _ = s.subSvc.Suspend(ctx, item.SubscriptionID)
		} else {
			_ = s.subscriptionRepo.Suspend(ctx, item.SubscriptionID)
		}

		if s.notifSvc != nil {
			cust, _ := s.customerRepo.GetByID(ctx, item.CustomerID)
			if cust != nil && cust.Phone != "" {
				payURL := "https://ispsync.id/portal"
				_, _ = s.notifSvc.DispatchTemplate(ctx, notification.DispatchTemplateRequest{
					TemplateCode: "SERVICE_ISOLATED_WA",
					Recipient:    cust.Phone,
					CustomerID:   &cust.ID,
					Data: map[string]string{
						"customer_name":  cust.FullName,
						"invoice_number": "TAGIHAN-TERTUNGGAK",
						"amount":         "sesuai faktur",
						"payment_url":    payURL,
					},
				})
			}
		}
	}

	return nil
}

// GenerateInitialInvoice generates the first invoice for a new subscription,
// combining the 1st month subscription fee and the installation fee (or showing free promo).
func (s *Service) GenerateInitialInvoice(ctx context.Context, sub *subscription.Subscription, monthlyPrice, installationFee int64, taxPercent int) error {
	branchCode := s.resolveCustomerBranchCode(ctx, sub.CustomerID)
	invNum, err := s.repo.GenerateInvoiceNumber(ctx, branchCode)
	if err != nil {
		s.logger.Error("failed to generate invoice number for new subscription", "error", err)
		return err
	}

	now := time.Now()
	periodEnd := now.AddDate(0, 1, 0)
	dueDays := 7
	if sub.GracePeriodDays > 7 {
		dueDays = sub.GracePeriodDays
	}
	dueDate := now.AddDate(0, 0, dueDays)

	inv := &Invoice{
		ID:                 uuid.New(),
		InvoiceNumber:      invNum,
		CustomerID:         sub.CustomerID,
		SubscriptionID:     &sub.ID,
		PlanPriceID:        &sub.PlanPriceID,
		Status:             StatusIssued,
		BillingPeriodStart: &now,
		BillingPeriodEnd:   &periodEnd,
		IssueDate:          &now,
		DueDate:            dueDate,
		Currency:           "IDR",
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	planName := "Paket Internet"
	if sub.PlanName != nil && *sub.PlanName != "" {
		planName = *sub.PlanName
	}

	// Hitung DPP (Dasar Pengenaan Pajak) jika taxPercent > 0, karena harga paket adalah INCLUDE PPN
	unitPrice := monthlyPrice
	if taxPercent > 0 {
		unitPrice = int64(math.Round(float64(monthlyPrice) / (1.0 + float64(taxPercent)/10000.0)))
	}

	// 1. Biaya Berlangganan Bulan Pertama
	inv.Items = append(inv.Items, InvoiceItem{
		ID:          uuid.New(),
		InvoiceID:   inv.ID,
		ItemType:    ItemTypeSubscription,
		Description: fmt.Sprintf("Biaya Berlangganan Bulan Pertama (%s)", planName),
		Quantity:    1,
		UnitPrice:   money.Amount(unitPrice),
		TaxPercent:  taxPercent,
		PeriodStart: &now,
		PeriodEnd:   &periodEnd,
		CreatedAt:   now,
	})

	// 2. Biaya Registrasi & Instalasi
	if installationFee > 0 {
		inv.Items = append(inv.Items, InvoiceItem{
			ID:          uuid.New(),
			InvoiceID:   inv.ID,
			ItemType:    ItemTypeInstallation,
			Description: "Biaya Registrasi & Instalasi Jaringan Internet",
			Quantity:    1,
			UnitPrice:   money.Amount(installationFee),
			TaxPercent:  taxPercent,
			CreatedAt:   now,
		})
	} else {
		// Promo Gratis Pasang (Rp 0)
		inv.Items = append(inv.Items, InvoiceItem{
			ID:          uuid.New(),
			InvoiceID:   inv.ID,
			ItemType:    ItemTypeInstallation,
			Description: "Promo Pemasangan & Instalasi Jaringan (Gratis)",
			Quantity:    1,
			UnitPrice:   money.Zero,
			TaxPercent:  0,
			CreatedAt:   now,
		})
	}

	// 3. Biaya Add-on IP Publik Statik (jika akun memiliki IP statik saat registrasi)
	var initialStaticIP string
	for _, acc := range sub.AccessAccounts {
		if acc.StaticIP != nil && *acc.StaticIP != "" {
			initialStaticIP = *acc.StaticIP
			break
		}
	}
	if initialStaticIP == "" {
		initialStaticIP, _ = s.repo.GetSubscriptionStaticIP(ctx, sub.ID)
	}
	if initialStaticIP != "" {
		addonPrice, addonDesc := s.repo.GetPublicIPAddonPrice(ctx)
		if addonPrice > 0 {
			addonUnitPrice := addonPrice
			if taxPercent > 0 {
				addonUnitPrice = int64(math.Round(float64(addonPrice) / (1.0 + float64(taxPercent)/10000.0)))
			}
			inv.Items = append(inv.Items, InvoiceItem{
				ID:          uuid.New(),
				InvoiceID:   inv.ID,
				ItemType:    ItemTypeOther,
				Description: fmt.Sprintf("%s (%s)", addonDesc, initialStaticIP),
				Quantity:    1,
				UnitPrice:   money.Amount(addonUnitPrice),
				TaxPercent:  taxPercent,
				PeriodStart: &now,
				PeriodEnd:   &periodEnd,
				CreatedAt:   now,
			})
		}
	}

	s.engine.RecalculateTotals(inv)

	if err := s.repo.Create(ctx, inv); err != nil {
		s.logger.Error("failed to save initial subscription invoice", "subscription_id", sub.ID, "error", err)
		return err
	}

	s.logger.Info("initial subscription invoice created successfully",
		"subscription_id", sub.ID,
		"invoice_number", invNum,
		"total_amount", inv.TotalAmount.Int64(),
		"installation_fee", installationFee,
		"monthly_price", monthlyPrice,
	)
	return nil
}

// ── Security Deposit (Hold / Frozen Deposit) Methods ────────────────

func (s *Service) CreateSecurityDeposit(ctx context.Context, req CreateSecurityDepositRequest) (*CreditNote, error) {
	if req.Amount < 10000 {
		return nil, apperrors.BadRequest("Nominal deposit jaminan minimal Rp 10.000")
	}
	if req.DurationMonths < 1 || req.DurationMonths > 60 {
		return nil, apperrors.BadRequest("Durasi pembekuan deposit harus antara 1 sampai 60 bulan")
	}
	cust, err := s.customerRepo.GetByID(ctx, req.CustomerID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if cust == nil {
		return nil, apperrors.NotFound("Pelanggan tidak ditemukan")
	}
	reason := req.Reason
	if reason == "" {
		reason = fmt.Sprintf("Deposit Jaminan Berlangganan (%d Bulan)", req.DurationMonths)
	}
	depType := req.DepositType
	if depType == "" {
		depType = "SECURITY_DEPOSIT"
	}
	cn, err := s.repo.AddSecurityDeposit(ctx, req.CustomerID, req.Amount, req.DurationMonths, reason, depType)
	if err != nil {
		s.logger.Error("failed to create security deposit", "customer_id", req.CustomerID, "error", err)
		return nil, apperrors.Internal(err)
	}
	s.logger.Info("security deposit created", "customer_id", req.CustomerID, "amount", req.Amount, "duration_months", req.DurationMonths, "hold_until", cn.HoldUntil)
	return cn, nil
}

func (s *Service) ReleaseSecurityDeposit(ctx context.Context, id uuid.UUID, req ReleaseDepositRequest) error {
	if err := s.repo.ReleaseSecurityDeposit(ctx, id, req.Reason); err != nil {
		return apperrors.BadRequest(err.Error())
	}
	s.logger.Info("security deposit released to active credit", "credit_note_id", id)
	return nil
}

func (s *Service) ForfeitSecurityDeposit(ctx context.Context, id uuid.UUID, req ForfeitDepositRequest) error {
	if req.Reason == "" {
		return apperrors.BadRequest("Alasan pinalti / penyitaan deposit wajib diisi")
	}
	if err := s.repo.ForfeitSecurityDeposit(ctx, id, req.Reason); err != nil {
		return apperrors.BadRequest(err.Error())
	}
	s.logger.Info("security deposit forfeited as penalty", "credit_note_id", id, "reason", req.Reason)
	return nil
}

func (s *Service) RefundSecurityDeposit(ctx context.Context, id uuid.UUID, reason string) error {
	if reason == "" {
		reason = "Pengembalian deposit jaminan akhir kontrak"
	}
	if err := s.repo.RefundSecurityDeposit(ctx, id, reason); err != nil {
		return apperrors.BadRequest(err.Error())
	}
	s.logger.Info("security deposit refunded", "credit_note_id", id)
	return nil
}

func (s *Service) RunDepositReleaseJob(ctx context.Context) (int64, error) {
	count, err := s.repo.ReleaseMaturedDeposits(ctx)
	if err != nil {
		s.logger.Error("failed to release matured deposits", "error", err)
		return 0, err
	}
	if count > 0 {
		s.logger.Info("matured security deposits automatically released", "count", count)
	}
	return count, nil
}

// ── Invoice PDF / HTML Print Rendering ──────────────────────────

func (s *Service) RenderInvoicePrint(ctx context.Context, invID uuid.UUID) (string, error) {
	inv, err := s.repo.GetByID(ctx, invID)
	if err != nil {
		return "", apperrors.Internal(err)
	}
	if inv == nil {
		return "", apperrors.NotFound("Invoice")
	}

	cust, _ := s.customerRepo.GetByID(ctx, inv.CustomerID)

	payURL := fmt.Sprintf("https://ispsync.id/portal/invoice/%s", inv.InvoiceNumber)
	qrURL := fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226600016ID.GIGABILL.WWW0118936009990000000000520458125303360540%d5802ID5912GIGABILL-ISP6007JAKARTA6304ABCD", inv.AmountDue.Int64())

	info := s.companyInfo
	if info.BrandName == "" {
		info = DefaultCompanyInfo()
	}

	return RenderInvoiceHTML(inv, cust, info, payURL, qrURL), nil
}

func (s *Service) RenderPublicInvoicePrint(ctx context.Context, invoiceNumber string) (string, error) {
	inv, err := s.repo.GetByNumber(ctx, invoiceNumber)
	if err != nil {
		return "", apperrors.Internal(err)
	}
	if inv == nil {
		return "", apperrors.NotFound("Invoice")
	}

	cust, _ := s.customerRepo.GetByID(ctx, inv.CustomerID)

	payURL := fmt.Sprintf("https://ispsync.id/portal/invoice/%s", inv.InvoiceNumber)
	qrURL := fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226600016ID.GIGABILL.WWW0118936009990000000000520458125303360540%d5802ID5912GIGABILL-ISP6007JAKARTA6304ABCD", inv.AmountDue.Int64())

	info := s.companyInfo
	if info.BrandName == "" {
		info = DefaultCompanyInfo()
	}

	return RenderInvoiceHTML(inv, cust, info, payURL, qrURL), nil
}

// ── Manual & Automated WhatsApp Reminder Engine ─────────────────

func (s *Service) SendManualReminder(ctx context.Context, invID uuid.UUID) error {
	if s.notifSvc == nil {
		return fmt.Errorf("layanan notifikasi belum diinisialisasi")
	}

	inv, err := s.repo.GetByID(ctx, invID)
	if err != nil {
		return apperrors.Internal(err)
	}
	if inv == nil {
		return apperrors.NotFound("Invoice")
	}

	cust, err := s.customerRepo.GetByID(ctx, inv.CustomerID)
	if err != nil || cust == nil || cust.Phone == "" {
		return fmt.Errorf("nomor telepon / WhatsApp pelanggan tidak ditemukan")
	}

	custName := cust.FullName
	payURL := fmt.Sprintf("https://ispsync.id/portal/invoice/%s", inv.InvoiceNumber)
	invURL := fmt.Sprintf("https://ispsync.id/api/v1/invoices/public/%s/print", inv.InvoiceNumber)

	templateCode := "INVOICE_REMINDER_H3_WA"
	if time.Now().After(inv.DueDate) {
		templateCode = "INVOICE_OVERDUE_WA"
	} else if inv.DueDate.Format("2006-01-02") == time.Now().Format("2006-01-02") {
		templateCode = "INVOICE_DUE_TODAY_WA"
	}

	_, err = s.notifSvc.DispatchTemplate(ctx, notification.DispatchTemplateRequest{
		TemplateCode: templateCode,
		Recipient:    cust.Phone,
		CustomerID:   &cust.ID,
		Data: map[string]string{
			"customer_name":  custName,
			"invoice_number": inv.InvoiceNumber,
			"amount":         FormatThousands(fmt.Sprintf("%d", inv.TotalAmount.Int64())),
			"due_date":       inv.DueDate.Format("02 Jan 2006"),
			"payment_url":    payURL,
			"invoice_url":    invURL,
		},
	})
	return err
}

func (s *Service) RunInvoiceReminderJob(ctx context.Context) error {
	if s.notifSvc == nil {
		return nil
	}

	s.logger.Info("starting scheduled multi-stage invoice reminder job")

	stages := []struct {
		days         int
		templateCode string
		stageName    string
	}{
		{days: 3, templateCode: "INVOICE_REMINDER_H3_WA", stageName: "H-3"},
		{days: 1, templateCode: "INVOICE_REMINDER_H1_WA", stageName: "H-1"},
		{days: 0, templateCode: "INVOICE_DUE_TODAY_WA", stageName: "Hari H"},
	}

	totalDispatched := 0
	for _, stage := range stages {
		invoices, err := s.repo.GetInvoicesApproachingDue(ctx, stage.days)
		if err != nil {
			s.logger.Error("failed to query approaching due invoices", "stage", stage.stageName, "error", err)
			continue
		}

		for _, inv := range invoices {
			phone := ""
			if inv.CustomerPhone != nil && *inv.CustomerPhone != "" {
				phone = *inv.CustomerPhone
			} else {
				if c, _ := s.customerRepo.GetByID(ctx, inv.CustomerID); c != nil {
					phone = c.Phone
				}
			}

			if phone == "" {
				continue
			}

			// Anti-spam deduplication
			if s.repo.HasNotificationBeenSentToday(ctx, inv.CustomerID, inv.InvoiceNumber) {
				continue
			}

			custName := "Pelanggan"
			if inv.CustomerName != nil && *inv.CustomerName != "" {
				custName = *inv.CustomerName
			}

			payURL := fmt.Sprintf("https://ispsync.id/portal/invoice/%s", inv.InvoiceNumber)
			invURL := fmt.Sprintf("https://ispsync.id/api/v1/invoices/public/%s/print", inv.InvoiceNumber)

			_, err := s.notifSvc.DispatchTemplate(ctx, notification.DispatchTemplateRequest{
				TemplateCode: stage.templateCode,
				Recipient:    phone,
				CustomerID:   &inv.CustomerID,
				Data: map[string]string{
					"customer_name":  custName,
					"invoice_number": inv.InvoiceNumber,
					"amount":         FormatThousands(fmt.Sprintf("%d", inv.TotalAmount.Int64())),
					"due_date":       inv.DueDate.Format("02 Jan 2006"),
					"payment_url":    payURL,
					"invoice_url":    invURL,
				},
			})
			if err != nil {
				s.logger.Warn("failed to dispatch reminder whatsapp",
					"invoice_number", inv.InvoiceNumber,
					"stage", stage.stageName,
					"error", err,
				)
			} else {
				totalDispatched++
				s.logger.Info("dispatched scheduled reminder whatsapp",
					"invoice_number", inv.InvoiceNumber,
					"stage", stage.stageName,
					"recipient", phone,
				)
			}
		}
	}

	s.logger.Info("scheduled invoice reminder job completed", "total_dispatched", totalDispatched)
	return nil
}

func (s *Service) resolveCustomerBranchCode(ctx context.Context, customerID uuid.UUID) string {
	if s.customerRepo == nil {
		return "PYK"
	}
	cust, err := s.customerRepo.GetByID(ctx, customerID)
	if err != nil || cust == nil {
		return "PYK"
	}
	return resolveCustomerBranch(cust)
}

func resolveCustomerBranch(cust *customer.Customer) string {
	if cust == nil {
		return "PYK"
	}
	// 1. Cek Notes untuk tag resmi [CABANG: <CODE>]
	if cust.Notes != nil && *cust.Notes != "" {
		notes := *cust.Notes
		if idx := strings.Index(notes, "[CABANG:"); idx != -1 {
			sub := notes[idx+8:]
			if endIdx := strings.Index(sub, "]"); endIdx != -1 {
				code := strings.TrimSpace(sub[:endIdx])
				if code != "" {
					return normalizeBranchCode(code)
				}
			}
		}
	}
	// 2. Cek Alamat (Kota / Provinsi)
	for _, addr := range cust.Addresses {
		city := strings.ToUpper(addr.City)
		prov := ""
		if addr.Province != nil {
			prov = strings.ToUpper(*addr.Province)
		}
		if strings.Contains(city, "PAPUA") || strings.Contains(city, "JAYAPURA") || strings.Contains(prov, "PAPUA") {
			return "PAPUA"
		}
		if strings.Contains(city, "JAKARTA") || strings.Contains(prov, "JAKARTA") {
			return "JKT"
		}
		if strings.Contains(city, "BANDUNG") || strings.Contains(prov, "JAWA BARAT") {
			return "BDG"
		}
		if strings.Contains(city, "SURABAYA") || strings.Contains(prov, "JAWA TIMUR") {
			return "SBY"
		}
		if strings.Contains(city, "PAYAKUMBUH") || strings.Contains(city, "LIMA PULUH KOTA") || strings.Contains(prov, "SUMATERA BARAT") {
			return "PYK"
		}
	}
	return "PYK"
}

func normalizeBranchCode(code string) string {
	c := strings.ToUpper(strings.TrimSpace(code))
	switch c {
	case "PYK", "PAYAKUMBUH", "SUMBAR", "14":
		return "PYK"
	case "PAPUA", "JAYAPURA", "PAP", "91":
		return "PAPUA"
	case "JAKARTA", "JKT", "21":
		return "JKT"
	case "BANDUNG", "BDG", "22":
		return "BDG"
	case "SURABAYA", "SBY", "31":
		return "SBY"
	default:
		clean := regexp.MustCompile(`[^A-Z0-9]`).ReplaceAllString(c, "")
		if clean != "" {
			return clean
		}
		return "PYK"
	}
}




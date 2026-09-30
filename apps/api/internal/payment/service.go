package payment

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/billing"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/pagination"
	"github.com/gigabill/isp/internal/subscription"
	"github.com/gigabill/isp/pkg/money"
)

type VoucherPaymentHandler func(ctx context.Context, orderID string, amount int64, provider string) error
type PasspointPaymentHandler func(ctx context.Context, orderID string, amount int64, provider string) error

type Service struct {
	repo             *Repository
	billingRepo      *billing.Repository
	subscriptionRepo *subscription.Repository
	subSvc           *subscription.Service
	registry         *Registry
	logger           *slog.Logger
	voucherHandler   VoucherPaymentHandler
	passpointHandler PasspointPaymentHandler
}

func NewService(
	repo *Repository,
	billingRepo *billing.Repository,
	subRepo *subscription.Repository,
	registry *Registry,
	logger *slog.Logger,
) *Service {
	return &Service{
		repo:             repo,
		billingRepo:      billingRepo,
		subscriptionRepo: subRepo,
		registry:         registry,
		logger:           logger,
	}
}

func (s *Service) SetSubscriptionService(subSvc *subscription.Service) {
	s.subSvc = subSvc
}

func (s *Service) SetVoucherPaymentHandler(h VoucherPaymentHandler) {
	s.voucherHandler = h
}

func (s *Service) SetPasspointPaymentHandler(h PasspointPaymentHandler) {
	s.passpointHandler = h
}

func (s *Service) CreateManualPayment(ctx context.Context, req CreateManualPaymentRequest) (*Payment, error) {
	inv, err := s.billingRepo.GetByID(ctx, req.InvoiceID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if inv == nil {
		return nil, apperrors.NotFound("Invoice")
	}

	if inv.Status == billing.StatusPaid {
		return nil, apperrors.Conflict("Faktur ini sudah lunas (PAID)")
	}
	if inv.Status == billing.StatusVoid || inv.Status == billing.StatusCancelled {
		return nil, apperrors.Conflict("Tidak dapat membayar faktur yang dibatalkan (VOID/CANCELLED)")
	}

	payAmount := money.Amount(req.Amount)
	if payAmount > inv.AmountDue {
		return nil, apperrors.BadRequest(fmt.Sprintf("Jumlah bayar (%s) melebihi sisa tagihan (%s)", payAmount, inv.AmountDue))
	}

	payNum, err := s.repo.GeneratePaymentNumber(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	now := time.Now()
	p := &Payment{
		ID:            uuid.New(),
		PaymentNumber: payNum,
		CustomerID:    inv.CustomerID,
		InvoiceID:     &inv.ID,
		PaymentMethod: req.PaymentMethod,
		Status:        StatusCompleted,
		Amount:        payAmount,
		Currency:      inv.Currency,
		PaidAt:        &now,
		Notes:         req.Notes,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	alloc := &Allocation{
		ID:          uuid.New(),
		PaymentID:   p.ID,
		InvoiceID:   inv.ID,
		Amount:      payAmount,
		AllocatedAt: now,
	}

	if err := s.repo.ProcessPaymentWithAllocation(ctx, p, alloc); err != nil {
		s.logger.Error("failed to process manual payment", "error", err)
		return nil, apperrors.Internal(err)
	}

	// Check if invoice is now fully paid -> extend subscription validity (rolling 30 days) and reactivate
	if payAmount >= inv.AmountDue && inv.SubscriptionID != nil {
		s.handleSubscriptionOnPayment(ctx, *inv.SubscriptionID)
	}

	s.logger.Info("manual payment completed", "payment_number", payNum, "amount", payAmount.Int64())
	return p, nil
}

func (s *Service) ProcessWebhook(ctx context.Context, providerName string, payload []byte, signature string) error {
	provider, err := s.registry.Get(providerName)
	if err != nil {
		return apperrors.BadRequest("Unknown payment provider: " + providerName)
	}

	event, err := provider.VerifyWebhook(ctx, payload, signature)
	if err != nil {
		s.logger.Warn("webhook verification failed", "provider", providerName, "error", err)
		return apperrors.Unauthorized("Webhook signature verification failed")
	}

	// Enforce Idempotency: skip if already processed
	alreadyProcessed, err := s.repo.IsIdempotencyProcessed(ctx, event.IdempotencyKey)
	if err != nil {
		return apperrors.Internal(err)
	}
	if alreadyProcessed {
		s.logger.Info("webhook event already processed (idempotent skip)", "key", event.IdempotencyKey)
		return nil
	}

	if event.Status != StatusCompleted {
		s.logger.Info("payment webhook status not completed, recording audit only",
			"status", event.Status, "external_id", event.ExternalID,
		)
		return nil
	}

	// Handle Kredit Tagihan / Top Up via Payment Gateway
	if strings.HasPrefix(event.ExternalID, "CRD-") || strings.HasPrefix(event.ExternalID, "TOPUP-") || strings.HasPrefix(event.ExternalID, "TOPUP_") {
		trimmed := event.ExternalID
		for _, pfx := range []string{"CRD-", "TOPUP-", "TOPUP_"} {
			if strings.HasPrefix(trimmed, pfx) {
				trimmed = strings.TrimPrefix(trimmed, pfx)
				break
			}
		}
		lastDash := strings.LastIndex(trimmed, "-")
		custIdentifier := trimmed
		if lastDash > 0 {
			custIdentifier = trimmed[:lastDash]
		}

		var targetCustID uuid.UUID
		if len(custIdentifier) == 32 && !strings.Contains(custIdentifier, "-") {
			custIdentifier = fmt.Sprintf("%s-%s-%s-%s-%s",
				custIdentifier[0:8], custIdentifier[8:12], custIdentifier[12:16], custIdentifier[16:20], custIdentifier[20:32])
		}
		if parsedID, err := uuid.Parse(custIdentifier); err == nil {
			targetCustID = parsedID
		} else {
			c, err := s.billingRepo.FindCustomerByQuery(ctx, custIdentifier)
			if err == nil && c != nil {
				targetCustID = c.ID
			}
		}

		if targetCustID != uuid.Nil {
			payNum, err := s.repo.GeneratePaymentNumber(ctx)
			if err != nil {
				return apperrors.Internal(err)
			}
			now := time.Now()
			paymentMethod := MethodMidtrans
			switch providerName {
			case "xendit":
				paymentMethod = MethodXendit
			case "duitku":
				paymentMethod = MethodDuitku
			case "tripay":
				paymentMethod = MethodTripay
			case "nicepay":
				paymentMethod = MethodNicepay
			}
			p := &Payment{
				ID:              uuid.New(),
				PaymentNumber:   payNum,
				CustomerID:      targetCustID,
				InvoiceID:       nil,
				PaymentMethod:   paymentMethod,
				ExternalID:      &event.ExternalID,
				Status:          StatusCompleted,
				Amount:          event.Amount,
				Currency:        "IDR",
				PaidAt:          &event.PaidAt,
				GatewayResponse: event.GatewayResponse,
				IdempotencyKey:  &event.IdempotencyKey,
				CreatedAt:       now,
				UpdatedAt:       now,
			}
			if err := s.repo.ProcessPaymentWithAllocation(ctx, p, nil); err != nil {
				s.logger.Error("failed to record topup payment", "error", err)
				return apperrors.Internal(err)
			}

			reason := fmt.Sprintf("Kredit Tagihan Berlangganan Internet (%s)", providerName)
			expiresAt := time.Now().AddDate(2, 0, 0)
			_, err = s.billingRepo.AddCreditNote(ctx, targetCustID, event.Amount.Int64(), reason, &expiresAt)
			if err != nil {
				s.logger.Error("failed to add credit note for topup webhook", "error", err)
				return apperrors.Internal(err)
			}
			s.logger.Info("topup deposit webhook processed successfully", "customer_id", targetCustID, "amount", event.Amount.Int64(), "external_id", event.ExternalID)
			return nil
		}
		s.logger.Warn("customer not found for topup webhook", "identifier", custIdentifier)
		return apperrors.NotFound("Customer for Top Up")
	}

	// Handle Passpoint Package Purchase via Payment Gateway
	if strings.HasPrefix(event.ExternalID, "ORD-PP-") || strings.HasPrefix(event.ExternalID, "PP-") {
		s.logger.Info("passpoint purchase webhook received", "order_id", event.ExternalID, "provider", providerName)
		if s.passpointHandler != nil {
			if err := s.passpointHandler(ctx, event.ExternalID, event.Amount.Int64(), providerName); err != nil {
				s.logger.Error("failed to process passpoint purchase webhook", "order_id", event.ExternalID, "error", err)
				return apperrors.Internal(err)
			}
		}
		return nil
	}

	// Handle Hotspot Voucher Purchase via Payment Gateway
	if strings.HasPrefix(event.ExternalID, "ORD-WIFI-") || strings.HasPrefix(event.ExternalID, "ORD-") || strings.HasPrefix(event.ExternalID, "WIFI-") {
		s.logger.Info("hotspot voucher purchase webhook received", "order_id", event.ExternalID, "provider", providerName)
		if s.voucherHandler != nil {
			if err := s.voucherHandler(ctx, event.ExternalID, event.Amount.Int64(), providerName); err != nil {
				s.logger.Error("failed to process voucher purchase webhook", "order_id", event.ExternalID, "error", err)
				return apperrors.Internal(err)
			}
		}
		return nil
	}

	// Find invoice by external_id (either invoice_number or invoice UUID)
	var inv *billing.Invoice
	if parsedUUID, err := uuid.Parse(event.ExternalID); err == nil {
		inv, _ = s.billingRepo.GetByID(ctx, parsedUUID)
	}
	if inv == nil {
		inv, _ = s.billingRepo.GetByNumber(ctx, event.ExternalID)
	}
	if inv == nil && strings.Contains(event.ExternalID, "-") {
		// Strip timestamp suffix if present, e.g. "INV-2026-09-00001-1727221234" -> "INV-2026-09-00001"
		lastDash := strings.LastIndex(event.ExternalID, "-")
		if lastDash > 0 {
			baseNum := event.ExternalID[:lastDash]
			inv, _ = s.billingRepo.GetByNumber(ctx, baseNum)
		}
	}
	if inv == nil {
		s.logger.Warn("invoice not found for payment webhook", "external_id", event.ExternalID)
		return apperrors.NotFound("Invoice")
	}

	payNum, err := s.repo.GeneratePaymentNumber(ctx)
	if err != nil {
		return apperrors.Internal(err)
	}

	now := time.Now()
	paymentMethod := MethodMidtrans
	switch providerName {
	case "xendit":
		paymentMethod = MethodXendit
	case "duitku":
		paymentMethod = MethodDuitku
	case "tripay":
		paymentMethod = MethodTripay
	case "nicepay":
		paymentMethod = MethodNicepay
	}


	p := &Payment{
		ID:              uuid.New(),
		PaymentNumber:   payNum,
		CustomerID:      inv.CustomerID,
		InvoiceID:       &inv.ID,
		PaymentMethod:   paymentMethod,
		ExternalID:      &event.ExternalID,
		Status:          StatusCompleted,
		Amount:          event.Amount,
		Currency:        inv.Currency,
		PaidAt:          &event.PaidAt,
		GatewayResponse: event.GatewayResponse,
		IdempotencyKey:  &event.IdempotencyKey,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	alloc := &Allocation{
		ID:          uuid.New(),
		PaymentID:   p.ID,
		InvoiceID:   inv.ID,
		Amount:      event.Amount,
		AllocatedAt: now,
	}

	if err := s.repo.ProcessPaymentWithAllocation(ctx, p, alloc); err != nil {
		s.logger.Error("failed to process webhook payment with allocation", "error", err)
		return apperrors.Internal(err)
	}

	// Auto extend subscription validity and reactivate if invoice is now paid
	if event.Amount >= inv.AmountDue && inv.SubscriptionID != nil {
		s.handleSubscriptionOnPayment(ctx, *inv.SubscriptionID)
	}

	// Calculate and record partner revenue share if applicable
	s.billingRepo.RecordPartnerRevenueShare(ctx, inv.ID, event.Amount)

	s.logger.Info("payment webhook processed successfully",
		"provider", providerName,
		"invoice_number", inv.InvoiceNumber,
		"payment_number", payNum,
		"amount", event.Amount.Int64(),
		"idempotency_key", event.IdempotencyKey,
	)

	return nil
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*Payment, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if p == nil {
		return nil, apperrors.NotFound("Payment")
	}
	return p, nil
}

func (s *Service) List(ctx context.Context, params pagination.Params, customerID *uuid.UUID, status string) ([]Payment, pagination.Meta, error) {
	payments, total, err := s.repo.List(ctx, params, customerID, status)
	if err != nil {
		return nil, pagination.Meta{}, apperrors.Internal(err)
	}
	meta := pagination.NewMeta(params, total)
	return payments, meta, nil
}

func (s *Service) handleSubscriptionOnPayment(ctx context.Context, subID uuid.UUID) {
	now := time.Now()
	if s.subSvc != nil {
		s.logger.Info("extending subscription validity on payment (rolling model)", "subscription_id", subID)
		_, err := s.subSvc.ExtendValidityOnPayment(ctx, subID, now)
		if err != nil {
			s.logger.Error("failed to extend subscription validity on payment", "subscription_id", subID, "error", err)
		}
	} else {
		_ = s.subscriptionRepo.UpdateStatus(ctx, subID, subscription.StatusActive, nil, nil)
		_ = s.subscriptionRepo.UpdateAccessAccountsBySubscriptionID(ctx, subID, subscription.AccessAccountActive)
	}
}

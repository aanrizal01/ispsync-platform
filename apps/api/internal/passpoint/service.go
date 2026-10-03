package passpoint

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/customer"
	"github.com/gigabill/isp/internal/notification"
	"github.com/gigabill/isp/internal/radius"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/pkg/crypto"
)

type PasspointPaymentCreator func(ctx context.Context, orderID, pkgName, custName, phone, email string, amount int64) (paymentURL string, qrImageURL string, snapToken string, err error)
type PasspointPaymentChecker func(ctx context.Context, orderID string) (bool, error)

type Service struct {
	repo           *Repository
	customerRepo   *customer.Repository
	radiusSvc      *radius.Service
	notifSvc       *notification.Service
	logger         *slog.Logger
	paymentCreator PasspointPaymentCreator
	paymentChecker PasspointPaymentChecker
}

func NewService(
	repo *Repository,
	customerRepo *customer.Repository,
	radiusSvc *radius.Service,
	logger *slog.Logger,
) *Service {
	return &Service{
		repo:         repo,
		customerRepo: customerRepo,
		radiusSvc:    radiusSvc,
		logger:       logger,
	}
}

func (s *Service) SetNotificationService(notifSvc *notification.Service) {
	s.notifSvc = notifSvc
}

func (s *Service) SetPaymentCreator(creator PasspointPaymentCreator) {
	s.paymentCreator = creator
}

func (s *Service) SetPaymentChecker(checker PasspointPaymentChecker) {
	s.paymentChecker = checker
}


func (s *Service) CreateProfile(ctx context.Context, req CreateProfileRequest) (*Profile, error) {
	now := time.Now()
	p := &Profile{
		ID:                   uuid.New(),
		Name:                 req.Name,
		OperatorFriendlyName: req.OperatorFriendlyName,
		DomainName:           req.DomainName,
		Realm:                req.Realm,
		RoamingConsortiumOIs: req.RoamingConsortiumOIs,
		EAPMethod:            req.EAPMethod,
		InnerAuth:            req.InnerAuth,
		VenueGroup:           2,
		VenueType:            8,
		IsDefault:            req.IsDefault,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	if err := s.repo.CreateProfile(ctx, p); err != nil {
		s.logger.Error("failed to create passpoint profile", "error", err)
		return nil, apperrors.Internal(err)
	}

	s.logger.Info("passpoint profile created", "id", p.ID, "name", p.Name)
	return p, nil
}

func (s *Service) GetProfile(ctx context.Context, id uuid.UUID) (*Profile, error) {
	p, err := s.repo.GetProfileByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if p == nil {
		return nil, apperrors.NotFound("Passpoint profile tidak ditemukan")
	}
	return p, nil
}

func (s *Service) ListProfiles(ctx context.Context) ([]Profile, error) {
	profiles, err := s.repo.ListProfiles(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	return profiles, nil
}

func (s *Service) IssueCredential(ctx context.Context, customerID uuid.UUID, req IssueCredentialRequest) (*Credential, error) {
	cust, err := s.customerRepo.GetByID(ctx, customerID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if cust == nil {
		return nil, apperrors.NotFound("Pelanggan tidak ditemukan")
	}

	var prof *Profile
	if req.ProfileID != nil {
		prof, err = s.repo.GetProfileByID(ctx, *req.ProfileID)
	} else {
		prof, err = s.repo.GetDefaultProfile(ctx)
	}
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if prof == nil {
		return nil, apperrors.BadRequest("Profil Passpoint default belum dikonfigurasi")
	}

	// Generate unique username and secure password
	randSuffix, err := crypto.GenerateToken(3) // 4 chars URL-safe base64
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	cleanCustNum := strings.ToLower(strings.ReplaceAll(cust.CustomerNumber, "-", ""))
	username := fmt.Sprintf("%s-%s@%s", cleanCustNum, randSuffix, prof.Realm)

	password, err := crypto.GeneratePassword(16)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	now := time.Now()
	cred := &Credential{
		ID:             uuid.New(),
		CustomerID:     cust.ID,
		CustomerName:   &cust.FullName,
		CustomerNumber: &cust.CustomerNumber,
		ProfileID:      prof.ID,
		ProfileName:    &prof.Name,
		Username:       username,
		Password:       password,
		Status:         "ACTIVE",
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.repo.CreateCredential(ctx, cred); err != nil {
		s.logger.Error("failed to create passpoint credential", "error", err)
		return nil, apperrors.Internal(err)
	}

	// Sync to FreeRADIUS with Simultaneous-Use := 1 and dynamic speed limit
	if err := s.radiusSvc.SyncPasspointCredential(ctx, cred.Username, cred.Password, "15M/15M", 1); err != nil {
		s.logger.Error("failed to sync passpoint credential to radius", "error", err)
	}

	s.logger.Info("passpoint credential issued",
		"customer_id", cust.ID,
		"username", cred.Username,
		"profile_id", prof.ID,
	)

	return cred, nil
}

func (s *Service) RevokeCredential(ctx context.Context, id uuid.UUID) error {
	cred, err := s.repo.GetCredentialByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if cred == nil {
		return apperrors.NotFound("Kredensial Passpoint tidak ditemukan")
	}

	if err := s.repo.UpdateCredentialStatus(ctx, id, "REVOKED"); err != nil {
		return apperrors.Internal(err)
	}

	// Remove from FreeRADIUS
	if err := s.radiusSvc.DeleteCredential(ctx, cred.Username); err != nil {
		s.logger.Error("failed to remove passpoint credential from radius", "error", err)
	}

	// Terminate active sessions via RFC 3576 CoA Disconnect
	if err := s.radiusSvc.DisconnectUserSessions(ctx, cred.Username); err != nil {
		s.logger.Warn("failed to send coa disconnect for revoked passpoint user", "username", cred.Username, "error", err)
	}

	s.logger.Info("passpoint credential revoked and disconnected", "id", id, "username", cred.Username)
	return nil
}

func (s *Service) GetCredential(ctx context.Context, id uuid.UUID) (*Credential, error) {
	cred, err := s.repo.GetCredentialByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if cred == nil {
		return nil, apperrors.NotFound("Kredensial Passpoint tidak ditemukan")
	}
	return cred, nil
}

func (s *Service) ListCustomerCredentials(ctx context.Context, customerID uuid.UUID) ([]Credential, error) {
	creds, err := s.repo.ListCredentialsByCustomer(ctx, customerID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	return creds, nil
}

func (s *Service) ListCredentials(ctx context.Context, limit, offset int) ([]Credential, int64, error) {
	return s.repo.ListCredentials(ctx, limit, offset)
}

func (s *Service) GenerateAppleProfile(ctx context.Context, credID uuid.UUID) ([]byte, string, error) {
	cred, err := s.repo.GetCredentialByID(ctx, credID)
	if err != nil {
		return nil, "", apperrors.Internal(err)
	}
	if cred == nil {
		return nil, "", apperrors.NotFound("Kredensial Passpoint tidak ditemukan")
	}

	prof, err := s.repo.GetProfileByID(ctx, cred.ProfileID)
	if err != nil {
		return nil, "", apperrors.Internal(err)
	}
	if prof == nil {
		return nil, "", apperrors.NotFound("Profil Passpoint tidak ditemukan")
	}

	configXML := GenerateAppleMobileConfig(prof, cred)
	filename := fmt.Sprintf("%s-passpoint.mobileconfig", strings.ToLower(strings.ReplaceAll(prof.OperatorFriendlyName, " ", "-")))
	return configXML, filename, nil
}

func (s *Service) GetPackages(ctx context.Context) ([]PasspointPackage, error) {
	pkgs, err := s.repo.ListPackages(ctx, true)
	if err == nil && len(pkgs) > 0 {
		return pkgs, nil
	}
	return []PasspointPackage{
		{
			ID:           "pkg-passpoint-7d",
			Name:         "Passpoint Mingguan 7 Hari",
			Description:  "Akses otomatis roaming WiFi berkecepatan tinggi selama 1 minggu penuh",
			DurationDays: 7,
			Price:        25000,
			SpeedLimit:   "15 Mbps Unlimited",
			IsPopular:    false,
			IsActive:     true,
			SortOrder:    1,
		},
		{
			ID:           "pkg-passpoint-30d",
			Name:         "Passpoint Bulanan 30 Hari",
			Description:  "Paket favorit koneksi otomatis tanpa ribet untuk pekerja & mahasiswa",
			DurationDays: 30,
			Price:        50000,
			SpeedLimit:   "25 Mbps Unlimited",
			IsPopular:    true,
			IsActive:     true,
			SortOrder:    2,
		},
		{
			ID:           "pkg-passpoint-90d",
			Name:         "Passpoint Seasonal 90 Hari",
			Description:  "Roaming 3 bulan hemat tanpa batas di seluruh jaringan ISP",
			DurationDays: 90,
			Price:        120000,
			SpeedLimit:   "35 Mbps Unlimited",
			IsPopular:    false,
			IsActive:     true,
			SortOrder:    3,
		},
	}, nil
}

func (s *Service) ListAdminPackages(ctx context.Context) ([]PasspointPackage, error) {
	pkgs, err := s.repo.ListPackages(ctx, false)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if len(pkgs) == 0 {
		return s.GetPackages(ctx)
	}
	return pkgs, nil
}

func (s *Service) CreatePackage(ctx context.Context, req CreatePasspointPackageRequest) (*PasspointPackage, error) {
	existing, err := s.repo.GetPackageByID(ctx, req.ID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if existing != nil {
		return nil, apperrors.BadRequest("ID paket sudah digunakan")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	pkg := &PasspointPackage{
		ID:           req.ID,
		Name:         req.Name,
		Description:  req.Description,
		DurationDays: req.DurationDays,
		Price:        req.Price,
		SpeedLimit:   req.SpeedLimit,
		IsPopular:    req.IsPopular,
		IsActive:     isActive,
		SortOrder:    sortOrder,
	}

	if err := s.repo.CreatePackage(ctx, pkg); err != nil {
		return nil, apperrors.Internal(err)
	}

	return pkg, nil
}

func (s *Service) UpdatePackage(ctx context.Context, id string, req UpdatePasspointPackageRequest) (*PasspointPackage, error) {
	existing, err := s.repo.GetPackageByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if existing == nil {
		return nil, apperrors.NotFound("Paket Passpoint tidak ditemukan")
	}

	pkg := &PasspointPackage{
		ID:           id,
		Name:         req.Name,
		Description:  req.Description,
		DurationDays: req.DurationDays,
		Price:        req.Price,
		SpeedLimit:   req.SpeedLimit,
		IsPopular:    req.IsPopular,
		IsActive:     req.IsActive,
		SortOrder:    req.SortOrder,
	}

	if err := s.repo.UpdatePackage(ctx, pkg); err != nil {
		return nil, apperrors.Internal(err)
	}

	return pkg, nil
}

func (s *Service) DeletePackage(ctx context.Context, id string) error {
	existing, err := s.repo.GetPackageByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if existing == nil {
		return apperrors.NotFound("Paket Passpoint tidak ditemukan")
	}

	if err := s.repo.DeletePackage(ctx, id); err != nil {
		return apperrors.Internal(err)
	}
	return nil
}

func (s *Service) Purchase(ctx context.Context, req PasspointPurchaseRequest) (*PasspointPurchaseResponse, error) {
	pkgs, _ := s.GetPackages(ctx)
	var selectedPkg *PasspointPackage
	for _, p := range pkgs {
		if p.ID == req.PackageID {
			selectedPkg = &p
			break
		}
	}
	if selectedPkg == nil {
		selectedPkg = &pkgs[1] // default 30d
	}

	finalPrice := selectedPkg.Price
	var originalPrice, discountAmount, agentCommission int64
	var agentName string
	var agentUUID *uuid.UUID

	if req.PromoCode != "" {
		if aID, aName, discPct, cashPct, err := s.repo.ValidateAgentReferral(ctx, req.PromoCode); err == nil {
			agentUUID = &aID
			agentName = aName
			if discPct > 0 {
				originalPrice = selectedPkg.Price
				discountAmount = int64(float64(selectedPkg.Price) * (discPct / 100.0))
				finalPrice = selectedPkg.Price - discountAmount
				if finalPrice < 0 {
					finalPrice = 0
				}
			}
			if cashPct > 0 {
				agentCommission = int64(float64(selectedPkg.Price) * (cashPct / 100.0))
			}
		}
	}

	randSecret, _ := crypto.GenerateSecret(3)
	orderID := "ORD-PP-" + time.Now().Format("20060102150405") + "-" + randSecret
	randNum := time.Now().UnixNano()%90000 + 10000
	cashierCode := fmt.Sprintf("PP-%d", randNum)

	isCounter := req.PaymentMethod == "COUNTER"
	var adminFee int64
	if isCounter {
		adminFee = 2500
	}
	totalToPay := finalPrice + adminFee

	expiresAt := time.Now().Add(15 * time.Minute)
	if isCounter {
		expiresAt = time.Now().Add(24 * time.Hour)
	}

	qrString := "00020101021126590014ID.GIGABILL.PASS01189360001000000000000215" + orderID + "520458125303360540" + req.PackageID
	qrImageURL := "https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=" + qrString
	var paymentURL, snapToken string

	if !isCounter && s.paymentCreator != nil {
		if pURL, qURL, sTok, err := s.paymentCreator(ctx, orderID, selectedPkg.Name, req.CustomerName, req.Phone, req.Email, finalPrice); err == nil {
			if pURL != "" {
				paymentURL = pURL
			}
			if qURL != "" {
				qrImageURL = qURL
			}
			if sTok != "" {
				snapToken = sTok
			}
		}
	}

	// Persist order in DB
	order := &PasspointOrder{
		ID:              uuid.New(),
		OrderID:         orderID,
		CashierCode:     cashierCode,
		OrderType:       "NEW_ACCESS",
		PackageID:       selectedPkg.ID,
		PackageName:     selectedPkg.Name,
		DurationDays:    selectedPkg.DurationDays,
		CustomerName:    req.CustomerName,
		CustomerPhone:   req.Phone,
		CustomerEmail:   req.Email,
		OriginalPrice:   selectedPkg.Price,
		DiscountAmount:  discountAmount,
		AdminFee:        adminFee,
		FinalPrice:      finalPrice,
		AgentID:         agentUUID,
		PromoCode:       req.PromoCode,
		AgentCommission: agentCommission,
		PaymentMethod:   req.PaymentMethod,
		Status:          "PENDING",
		ExpiresAt:       expiresAt,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	_ = s.repo.CreateOrder(ctx, order)

	return &PasspointPurchaseResponse{
		OrderID:        orderID,
		CashierCode:    cashierCode,
		PackageName:    selectedPkg.Name,
		Amount:         finalPrice,
		AdminFee:       adminFee,
		TotalToPay:     totalToPay,
		OriginalPrice:  originalPrice,
		DiscountAmount: discountAmount,
		PromoCode:      req.PromoCode,
		AgentName:      agentName,
		PaymentMethod:  req.PaymentMethod,
		PaymentURL:     paymentURL,
		SnapToken:      snapToken,
		QrString:       qrString,
		QrImageURL:     qrImageURL,
		ExpiresAt:      expiresAt,
		Status:         "PENDING",
	}, nil
}

func (s *Service) CheckPurchase(ctx context.Context, req PasspointCheckRequest) (*PasspointCheckResponse, error) {
	// 1. Check if order in database is already PAID (e.g. verified by counter agent)
	if req.OrderID != "" {
		if ord, _ := s.repo.GetOrderByOrderID(ctx, req.OrderID); ord != nil && ord.Status == "PAID" && ord.CredentialID != nil {
			if cred, err := s.repo.GetCredentialByID(ctx, *ord.CredentialID); err == nil && cred != nil {
				realm := "ispsync.id"
				domain := "hotspot.ispsync.id"
				if prof, err := s.repo.GetDefaultProfile(ctx); err == nil && prof != nil {
					realm = prof.Realm
					domain = prof.DomainName
				}
				return &PasspointCheckResponse{
					Status:          "PAID",
					CredentialID:    cred.ID.String(),
					Username:        cred.Username,
					Password:        cred.Password,
					Realm:           realm,
					DomainName:      domain,
					AppleProfileURL: fmt.Sprintf("/api/v1/passpoint/credentials/%s/apple-profile", cred.ID.String()),
					Message:         "Pembayaran diverifikasi! Kredensial Passpoint Anda siap dipasang.",
				}, nil
			}
		}
	}

	isPaid := false
	if req.SimulatePay {
		isPaid = true
	} else if s.paymentChecker != nil && req.OrderID != "" {
		paid, err := s.paymentChecker(ctx, req.OrderID)
		if err == nil && paid {
			isPaid = true
		}
	}

	if !isPaid {
		return &PasspointCheckResponse{
			Status:  "PENDING",
			Message: "Menunggu pembayaran diverifikasi.",
		}, nil
	}

	randPart, _ := crypto.GenerateSecret(4)
	username := "pp_" + randPart
	password, _ := crypto.GeneratePassword(10)
	credID := uuid.New()

	// Default profile metadata
	realm := "ispsync.id"
	domain := "hotspot.ispsync.id"

	prof, err := s.repo.GetDefaultProfile(ctx)
	if err == nil && prof != nil {
		realm = prof.Realm
		domain = prof.DomainName

		// Resolve or create customer in DB
		customerID, _ := s.repo.ResolveOrCreateCustomer(ctx, "Pelanggan Passpoint", "", "")
		now := time.Now()
		cred := &Credential{
			ID:         credID,
			CustomerID: customerID,
			ProfileID:  prof.ID,
			Username:   username,
			Password:   password,
			Status:     "ACTIVE",
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		_ = s.repo.CreateCredential(ctx, cred)

		// Determine speed limit from order package
		speedLimit := "15M/15M"
		var currentOrder *PasspointOrder
		if req.OrderID != "" {
			if ord, _ := s.repo.GetOrderByOrderID(ctx, req.OrderID); ord != nil {
				currentOrder = ord
				if ord.PackageID != "" {
					if pkg, _ := s.repo.GetPackageByID(ctx, ord.PackageID); pkg != nil && pkg.SpeedLimit != "" {
						speedLimit = pkg.SpeedLimit
					}
				}
			}
		}

		// Sync to FreeRADIUS with Simultaneous-Use := 1 and Mikrotik-Rate-Limit
		_ = s.radiusSvc.SyncPasspointCredential(ctx, username, password, speedLimit, 1)

		// Mark order as PAID in DB and credit agent if applicable
		if req.OrderID != "" {
			_ = s.repo.MarkOrderPaid(ctx, req.OrderID, credID)
		}

		// Kirim notifikasi WhatsApp otomatis ke pembeli
		if currentOrder != nil {
			go s.sendPurchaseWhatsApp(context.Background(), currentOrder, username, password, realm, domain, credID)
		}
	}

	return &PasspointCheckResponse{
		Status:          "PAID",
		CredentialID:    credID.String(),
		Username:        username,
		Password:        password,
		Realm:           realm,
		DomainName:      domain,
		AppleProfileURL: fmt.Sprintf("/api/v1/passpoint/credentials/%s/apple-profile", credID.String()),
		Message:         "Pembayaran diverifikasi! Kredensial Passpoint Anda siap diunduh.",
	}, nil
}

func (s *Service) Renew(ctx context.Context, req PasspointRenewRequest) (*PasspointRenewResponse, error) {
	pkgs, _ := s.GetPackages(ctx)
	var selectedPkg *PasspointPackage
	for _, p := range pkgs {
		if p.ID == req.PackageID {
			selectedPkg = &p
			break
		}
	}
	if selectedPkg == nil {
		selectedPkg = &pkgs[1] // default 30d
	}

	finalPrice := selectedPkg.Price
	var originalPrice, discountAmount, agentCommission int64
	var agentName string
	var agentUUID *uuid.UUID

	if req.PromoCode != "" {
		if aID, aName, discPct, cashPct, err := s.repo.ValidateAgentReferral(ctx, req.PromoCode); err == nil {
			agentUUID = &aID
			agentName = aName
			if discPct > 0 {
				originalPrice = selectedPkg.Price
				discountAmount = int64(float64(selectedPkg.Price) * (discPct / 100.0))
				finalPrice = selectedPkg.Price - discountAmount
				if finalPrice < 0 {
					finalPrice = 0
				}
			}
			if cashPct > 0 {
				agentCommission = int64(float64(selectedPkg.Price) * (cashPct / 100.0))
			}
		}
	}

	randSecret, _ := crypto.GenerateSecret(3)
	orderID := "ORD-RNW-" + time.Now().Format("20060102150405") + "-" + randSecret
	randNum := time.Now().UnixNano()%90000 + 10000
	cashierCode := fmt.Sprintf("PP-%d", randNum)

	isCounter := req.PaymentMethod == "COUNTER"
	var adminFee int64
	if isCounter {
		adminFee = 2500
	}
	totalToPay := finalPrice + adminFee

	expiresAt := time.Now().Add(15 * time.Minute)
	if isCounter {
		expiresAt = time.Now().Add(24 * time.Hour)
	}

	qrString := "00020101021126590014ID.GIGABILL.RENEW01189360001000000000000215" + orderID + "520458125303360540" + req.PackageID
	qrImageURL := "https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=" + qrString

	// Persist order in DB
	order := &PasspointOrder{
		ID:              uuid.New(),
		OrderID:         orderID,
		CashierCode:     cashierCode,
		OrderType:       "RENEWAL",
		PackageID:       selectedPkg.ID,
		PackageName:     selectedPkg.Name,
		DurationDays:    selectedPkg.DurationDays,
		CustomerName:    "Perpanjangan Profil",
		CustomerPhone:   req.CredentialID,
		OriginalPrice:   selectedPkg.Price,
		DiscountAmount:  discountAmount,
		AdminFee:        adminFee,
		FinalPrice:      finalPrice,
		AgentID:         agentUUID,
		PromoCode:       req.PromoCode,
		AgentCommission: agentCommission,
		PaymentMethod:   req.PaymentMethod,
		Status:          "PENDING",
		ExpiresAt:       expiresAt,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	_ = s.repo.CreateOrder(ctx, order)

	return &PasspointRenewResponse{
		OrderID:        orderID,
		CashierCode:    cashierCode,
		CredentialID:   req.CredentialID,
		PackageName:    selectedPkg.Name,
		DurationDays:   selectedPkg.DurationDays,
		Amount:         finalPrice,
		AdminFee:       adminFee,
		TotalToPay:     totalToPay,
		OriginalPrice:  originalPrice,
		DiscountAmount: discountAmount,
		PromoCode:      req.PromoCode,
		AgentName:      agentName,
		PaymentMethod:  req.PaymentMethod,
		QrString:       qrString,
		QrImageURL:     qrImageURL,
		ExpiresAt:      expiresAt,
		Status:         "PENDING",
	}, nil
}

func (s *Service) CheckRenew(ctx context.Context, req PasspointCheckRenewRequest) (*PasspointCheckRenewResponse, error) {
	if req.OrderID != "" {
		if ord, _ := s.repo.GetOrderByOrderID(ctx, req.OrderID); ord != nil && ord.Status == "PAID" {
			var cred *Credential
			if ord.CredentialID != nil {
				_ = s.repo.UpdateCredentialStatus(ctx, *ord.CredentialID, "ACTIVE")
				if c, _ := s.repo.GetCredentialByID(ctx, *ord.CredentialID); c != nil {
					cred = c
					_ = s.radiusSvc.SyncPasspointCredential(ctx, cred.Username, cred.Password, "15M/15M", 1)
				}
			}
			newExpiry := time.Now().AddDate(0, 0, ord.DurationDays).Format("02 Jan 2006, 15:04 WIB")
			go s.sendRenewalWhatsApp(context.Background(), ord, cred, newExpiry)
			return &PasspointCheckRenewResponse{
				Status:       "PAID",
				CredentialID: req.OrderID,
				NewExpiresAt: newExpiry,
				Message:      "Perpanjangan berhasil diverifikasi! Masa aktif profil Anda telah diperpanjang.",
			}, nil
		}
	}

	newExpiry := time.Now().AddDate(0, 0, 30).Format("02 Jan 2006, 15:04 WIB")
	return &PasspointCheckRenewResponse{
		Status:       "PAID",
		CredentialID: req.OrderID,
		NewExpiresAt: newExpiry,
		Message:      "Perpanjangan berhasil! Masa aktif profil Anda telah diperpanjang. Perangkat Anda langsung dapat terhubung kembali ke internet otomatis.",
	}, nil
}

// ──────────────────────────────────────────
// Loket Agen: Inquire, Bayar Kasir & Terbitkan Manual
// ──────────────────────────────────────────

func (s *Service) InquireCashierOrder(ctx context.Context, agentID uuid.UUID, code string) (*PasspointInquiryResult, error) {
	return s.repo.InquireCashierOrder(ctx, code, 2500)
}

func (s *Service) PayOrderWithAgentBalance(ctx context.Context, agentID uuid.UUID, req PayPasspointByAgentRequest) (*PasspointReceipt, error) {
	code := req.CashierCode
	if code == "" {
		code = req.OrderID
	}
	if code == "" {
		return nil, apperrors.BadRequest("Kode kasir atau Order ID harus diisi")
	}

	prof, err := s.repo.GetDefaultProfile(ctx)
	if err != nil || prof == nil {
		return nil, apperrors.Internal(fmt.Errorf("profil default passpoint belum disetting"))
	}

	randPart, _ := crypto.GenerateSecret(4)
	username := "pp_" + randPart
	password, _ := crypto.GeneratePassword(10)

	receipt, cred, err := s.repo.PayOrderWithAgentBalance(ctx, agentID, code, prof, username, password)
	if err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	// Sync to FreeRADIUS with Simultaneous-Use := 1
	if cred != nil {
		_ = s.radiusSvc.SyncPasspointCredential(ctx, cred.Username, cred.Password, "15M/15M", 1)
		go s.sendCounterReceiptWhatsApp(context.Background(), receipt)
	}

	s.logger.Info("passpoint counter order paid by agent",
		"agent_id", agentID,
		"cashier_code", receipt.CashierCode,
		"package", receipt.PackageName,
		"customer_phone", receipt.CustomerPhone,
	)

	return receipt, nil
}

func (s *Service) IssueManualPasspoint(ctx context.Context, agentID uuid.UUID, req IssueManualPasspointRequest) (*PasspointReceipt, error) {
	if req.Phone == "" {
		return nil, apperrors.BadRequest("Nomor HP pelanggan harus diisi")
	}

	pkgs, _ := s.GetPackages(ctx)
	var selectedPkg *PasspointPackage
	for _, p := range pkgs {
		if p.ID == req.PackageID {
			selectedPkg = &p
			break
		}
	}
	if selectedPkg == nil {
		selectedPkg = &pkgs[1] // default 30d
	}

	prof, err := s.repo.GetDefaultProfile(ctx)
	if err != nil || prof == nil {
		return nil, apperrors.Internal(fmt.Errorf("profil default passpoint belum disetting"))
	}

	randPart, _ := crypto.GenerateSecret(4)
	username := "pp_" + randPart
	password, _ := crypto.GeneratePassword(10)

	receipt, cred, err := s.repo.IssueManualPasspoint(ctx, agentID, *selectedPkg, req, prof, username, password)
	if err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	// Sync to FreeRADIUS with Simultaneous-Use := 1 and package speed limit
	if cred != nil {
		_ = s.radiusSvc.SyncPasspointCredential(ctx, cred.Username, cred.Password, selectedPkg.SpeedLimit, 1)
		go s.sendCounterReceiptWhatsApp(context.Background(), receipt)
	}

	s.logger.Info("passpoint manual issued by agent loket",
		"agent_id", agentID,
		"cashier_code", receipt.CashierCode,
		"package", receipt.PackageName,
		"customer_phone", receipt.CustomerPhone,
	)

	return receipt, nil
}

// ──────────────────────────────────────────
// Background Workers: Expiry & WA Reminder
// ──────────────────────────────────────────

func (s *Service) RunPasspointExpiryJob(ctx context.Context) error {
	s.logger.Debug("running passpoint expiry check")
	expired, err := s.repo.GetExpiredActiveCredentials(ctx)
	if err != nil {
		s.logger.Error("failed to get expired passpoint credentials", "error", err)
		return err
	}

	for _, cred := range expired {
		if err := s.repo.MarkCredentialExpired(ctx, cred.ID); err != nil {
			s.logger.Error("failed to mark passpoint credential as expired", "id", cred.ID, "username", cred.Username, "error", err)
			continue
		}

		if err := s.radiusSvc.DeleteCredential(ctx, cred.Username); err != nil {
			s.logger.Warn("failed to delete expired credential from radius", "username", cred.Username, "error", err)
		}

		if err := s.radiusSvc.DisconnectUserSessions(ctx, cred.Username); err != nil {
			s.logger.Warn("failed to send coa disconnect for expired passpoint user", "username", cred.Username, "error", err)
		}

		s.logger.Info("expired passpoint credential revoked and disconnected",
			"id", cred.ID,
			"username", cred.Username,
			"expired_at", cred.ExpiresAt,
		)
	}

	return nil
}

func (s *Service) RunPasspointReminderJob(ctx context.Context) error {
	s.logger.Debug("running passpoint renewal reminder check")
	expiring, err := s.repo.GetExpiringCredentialsForReminder(ctx, 24)
	if err != nil {
		s.logger.Error("failed to get expiring passpoint credentials", "error", err)
		return err
	}

	for _, cred := range expiring {
		if cred.CustomerPhone == nil || *cred.CustomerPhone == "" {
			continue
		}

		phone := *cred.CustomerPhone
		custName := "Pelanggan"
		if cred.CustomerName != nil && *cred.CustomerName != "" {
			custName = *cred.CustomerName
		}
		profName := "Passpoint"
		if cred.ProfileName != nil && *cred.ProfileName != "" {
			profName = *cred.ProfileName
		}
		expiryStr := "-"
		if cred.ExpiresAt != nil {
			expiryStr = cred.ExpiresAt.Format("02 Jan 2006, 15:04 WIB")
		}

		body := fmt.Sprintf("Halo %s,\n\nMasa aktif akses WiFi Passpoint (%s) Anda akan berakhir pada %s.\n\nAgar koneksi otomatis Anda tidak terputus, silakan lakukan perpanjangan paket melalui tautan berikut:\nhttps://ispsync.id/passpoint/renew\n\nTerima kasih atas kepercayaannya menggunakan layanan kami.",
			custName, profName, expiryStr)

		if s.notifSvc != nil {
			_, notifErr := s.notifSvc.SendNotification(ctx, notification.SendNotificationRequest{
				CustomerID: &cred.CustomerID,
				Channel:    notification.ChannelWhatsApp,
				Recipient:  phone,
				Subject:    "Pengingat Masa Aktif WiFi Passpoint",
				Body:       body,
			})
			if notifErr != nil {
				s.logger.Warn("failed to dispatch passpoint whatsapp reminder",
					"id", cred.ID,
					"phone", phone,
					"error", notifErr,
				)
				continue
			}
		}

		if err := s.repo.MarkReminderSent(ctx, cred.ID); err != nil {
			s.logger.Warn("failed to mark reminder sent", "id", cred.ID, "error", err)
		} else {
			s.logger.Info("passpoint renewal reminder dispatched via whatsapp",
				"id", cred.ID,
				"phone", phone,
				"expires_at", expiryStr,
			)
		}
	}

	return nil
}

func (s *Service) GetActiveSessions(ctx context.Context, limit, offset int) ([]PasspointActiveSession, int64, error) {
	return s.repo.GetActiveSessions(ctx, limit, offset)
}

func (s *Service) DisconnectSession(ctx context.Context, req DisconnectSessionRequest) error {
	s.logger.Info("disconnecting active passpoint session", "username", req.Username, "nas_ip", req.NasIPAddress, "session_id", req.AcctSessionID)
	rReq := radius.DisconnectSessionRequest{
		NasIPAddress:  req.NasIPAddress,
		Username:      req.Username,
		AcctSessionID: req.AcctSessionID,
	}
	return s.radiusSvc.DisconnectSession(ctx, rReq)
}

func (s *Service) CheckCustomerStatus(ctx context.Context, query string) (*PasspointCustomerStatus, error) {
	st, err := s.repo.FindCustomerStatus(ctx, query)
	if err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}
	if st == nil {
		return nil, apperrors.NotFound("Kredensial atau nomor HP pelanggan tidak ditemukan dalam sistem Passpoint")
	}
	return st, nil
}

func (s *Service) GetAnalytics(ctx context.Context) (*PasspointAnalytics, error) {
	return s.repo.GetFinancialAnalytics(ctx)
}

func (s *Service) ExportOrdersCSV(ctx context.Context) ([]byte, error) {
	orders, err := s.repo.GetPaidOrdersForExport(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	// Header
	_ = w.Write([]string{
		"Waktu Transaksi", "Order ID", "Kode Kasir", "Jenis Pesanan", "Paket Layanan",
		"Durasi (Hari)", "Nama Pelanggan", "No HP", "Harga Paket", "Biaya Admin",
		"Total Bayar", "Metode Pembayaran", "Kanal", "Komisi Agen", "Status",
	})

	for _, o := range orders {
		channel := "Online (Self-Service)"
		if o.PaidByAgentID != nil || o.PaymentMethod == "MANUAL_COUNTER" {
			channel = "Loket Agen"
		}
		_ = w.Write([]string{
			o.CreatedAt.Format("2006-01-02 15:04:05"),
			o.OrderID,
			o.CashierCode,
			o.OrderType,
			o.PackageName,
			fmt.Sprintf("%d", o.DurationDays),
			o.CustomerName,
			o.CustomerPhone,
			fmt.Sprintf("%d", o.OriginalPrice),
			fmt.Sprintf("%d", o.AdminFee),
			fmt.Sprintf("%d", o.FinalPrice),
			o.PaymentMethod,
			channel,
			fmt.Sprintf("%d", o.AgentCommission),
			o.Status,
		})
	}
	w.Flush()
	return buf.Bytes(), nil
}

// ──────────────────────────────────────────
// WhatsApp Notifications (Purchase, Renewal & Counter)
// ──────────────────────────────────────────

func (s *Service) sendPurchaseWhatsApp(ctx context.Context, ord *PasspointOrder, username, password, realm, domain string, credID uuid.UUID) {
	if s.notifSvc == nil || ord == nil || ord.CustomerPhone == "" {
		return
	}

	phone := cleanPhoneNumber(ord.CustomerPhone)
	if phone == "" {
		return
	}

	custName := ord.CustomerName
	if custName == "" {
		custName = "Pelanggan"
	}

	pkgName := ord.PackageName
	if pkgName == "" {
		pkgName = "Passpoint Wi-Fi"
	}

	durationDays := ord.DurationDays
	if durationDays <= 0 {
		durationDays = 30
	}
	expiryDate := time.Now().AddDate(0, 0, durationDays).Format("02 Jan 2006, 15:04 WIB")

	baseDomain := domain
	if baseDomain == "" {
		baseDomain = "wifi.dev.ispsync.id"
	}

	subject := "Kredensial Akses Wi-Fi Passpoint"
	body := fmt.Sprintf("PEMBELIAN PASSPOINT WI-FI BERHASIL\n\n"+
		"Halo %s,\n"+
		"Terima kasih telah berlangganan akses Wi-Fi Passpoint (Hotspot 2.0).\n\n"+
		"Detail Akun:\n"+
		"- Paket: %s\n"+
		"- Masa Aktif: %d Hari (hingga %s)\n"+
		"- Username EAP: %s\n"+
		"- Password: %s\n"+
		"- Domain / Realm: %s\n\n"+
		"Pemasangan Otomatis di Apple (iPhone / iPad / Mac):\n"+
		"https://%s/api/v1/passpoint/credentials/%s/apple-profile\n\n"+
		"Pengaturan di Android (Samsung, Xiaomi, Oppo, Vivo):\n"+
		"1. Pilih Wi-Fi: Passpoint\n"+
		"2. Metode EAP: TTLS\n"+
		"3. Otentikasi Tahap 2: MSCHAPv2\n"+
		"4. Sertifikat CA: Gunakan sertifikat sistem / Jangan validasi\n"+
		"5. Domain: %s\n"+
		"6. Identitas: %s\n"+
		"7. Kata Sandi: %s\n\n"+
		"Periksa Sisa Masa Aktif Mandiri:\n"+
		"https://%s/passpoint/status?query=%s\n\n"+
		"Simpan pesan ini sebagai bukti pendaftaran resmi.",
		custName, pkgName, durationDays, expiryDate, username, password, realm,
		baseDomain, credID.String(), domain, username, password,
		baseDomain, username,
	)

	_, err := s.notifSvc.SendNotification(ctx, notification.SendNotificationRequest{
		Channel:   notification.ChannelWhatsApp,
		Recipient: phone,
		Subject:   subject,
		Body:      body,
	})
	if err != nil {
		s.logger.Warn("failed to send passpoint purchase whatsapp", "phone", phone, "error", err)
	} else {
		s.logger.Info("passpoint purchase whatsapp sent successfully", "phone", phone, "username", username)
	}
}

func (s *Service) sendRenewalWhatsApp(ctx context.Context, ord *PasspointOrder, cred *Credential, newExpiresAt string) {
	if s.notifSvc == nil || ord == nil {
		return
	}

	phone := cleanPhoneNumber(ord.CustomerPhone)
	custName := ord.CustomerName
	if cred != nil && cred.CustomerID != uuid.Nil && s.customerRepo != nil {
		if c, err := s.customerRepo.GetByID(ctx, cred.CustomerID); err == nil && c != nil {
			if phone == "" {
				phone = cleanPhoneNumber(c.Phone)
			}
			if custName == "" || custName == "Perpanjangan Profil" {
				custName = c.FullName
			}
		}
	}

	if phone == "" {
		return
	}
	if custName == "" {
		custName = "Pelanggan"
	}

	username := "-"
	if cred != nil {
		username = cred.Username
	}

	subject := "Perpanjangan Passpoint Berhasil"
	body := fmt.Sprintf("PERPANJANGAN PASSPOINT BERHASIL\n\n"+
		"Halo %s,\n"+
		"Masa aktif paket Wi-Fi Passpoint Anda telah berhasil diperpanjang.\n\n"+
		"Detail Perpanjangan:\n"+
		"- Paket: %s\n"+
		"- Tambahan Durasi: %d Hari\n"+
		"- Berlaku Hingga: %s\n"+
		"- Username EAP: %s\n\n"+
		"Profil di smartphone Anda tetap aktif dan tersambung otomatis ke jaringan Wi-Fi tanpa perlu pengaturan ulang.\n\n"+
		"Periksa Status Mandiri:\n"+
		"https://wifi.dev.ispsync.id/passpoint/status?query=%s\n\n"+
		"Terima kasih atas kepercayaannya menggunakan layanan kami.",
		custName, ord.PackageName, ord.DurationDays, newExpiresAt, username, username,
	)

	_, err := s.notifSvc.SendNotification(ctx, notification.SendNotificationRequest{
		Channel:   notification.ChannelWhatsApp,
		Recipient: phone,
		Subject:   subject,
		Body:      body,
	})
	if err != nil {
		s.logger.Warn("failed to send passpoint renewal whatsapp", "phone", phone, "error", err)
	} else {
		s.logger.Info("passpoint renewal whatsapp sent successfully", "phone", phone, "username", username)
	}
}

func (s *Service) sendCounterReceiptWhatsApp(ctx context.Context, receipt *PasspointReceipt) {
	if s.notifSvc == nil || receipt == nil || receipt.CustomerPhone == "" {
		return
	}

	phone := cleanPhoneNumber(receipt.CustomerPhone)
	if phone == "" {
		return
	}

	custName := receipt.CustomerName
	if custName == "" {
		custName = "Pelanggan"
	}

	baseDomain := receipt.DomainName
	if baseDomain == "" {
		baseDomain = "wifi.dev.ispsync.id"
	}

	subject := "Bukti Pembelian Passpoint Wi-Fi"
	body := fmt.Sprintf("PEMBELIAN PASSPOINT LOKET AGEN BERHASIL\n\n"+
		"Halo %s,\n"+
		"Berikut adalah bukti pembelian akses Wi-Fi Passpoint (Hotspot 2.0) di Loket %s:\n\n"+
		"Detail Akun:\n"+
		"- Paket: %s (%d Hari)\n"+
		"- Kode Kasir: %s\n"+
		"- Username EAP: %s\n"+
		"- Password: %s\n"+
		"- Domain / Realm: %s\n\n"+
		"Pemasangan Otomatis di Apple (iPhone / iPad / Mac):\n"+
		"https://%s%s\n\n"+
		"Pengaturan di Android (Samsung, Xiaomi, Oppo, Vivo):\n"+
		"1. Metode EAP: TTLS\n"+
		"2. Otentikasi Tahap 2: MSCHAPv2\n"+
		"3. Sertifikat CA: Gunakan sertifikat sistem\n"+
		"4. Domain: %s\n"+
		"5. Identitas: %s\n"+
		"6. Kata Sandi: %s\n\n"+
		"Periksa Status & Masa Aktif Mandiri:\n"+
		"https://%s/passpoint/status?query=%s\n\n"+
		"Terima kasih atas kunjungan Anda.",
		custName, receipt.AgentName, receipt.PackageName, receipt.DurationDays,
		receipt.CashierCode, receipt.Username, receipt.Password, receipt.Realm,
		baseDomain, receipt.AppleProfileURL,
		receipt.DomainName, receipt.Username, receipt.Password,
		baseDomain, receipt.Username,
	)

	_, err := s.notifSvc.SendNotification(ctx, notification.SendNotificationRequest{
		Channel:   notification.ChannelWhatsApp,
		Recipient: phone,
		Subject:   subject,
		Body:      body,
	})
	if err != nil {
		s.logger.Warn("failed to send passpoint receipt whatsapp", "phone", phone, "error", err)
	} else {
		s.logger.Info("passpoint receipt whatsapp sent successfully", "phone", phone, "username", receipt.Username)
	}
}

func cleanPhoneNumber(phone string) string {
	cleaned := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	if strings.HasPrefix(cleaned, "0") {
		cleaned = "62" + cleaned[1:]
	} else if strings.HasPrefix(cleaned, "8") {
		cleaned = "628" + cleaned[1:]
	}
	if len(cleaned) < 10 {
		return ""
	}
	return cleaned
}



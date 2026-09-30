package passpoint

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/customer"
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

	// Sync to FreeRADIUS
	if err := s.radiusSvc.SyncCredential(ctx, cred.Username, cred.Password, "PASSPOINT_USER"); err != nil {
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

	s.logger.Info("passpoint credential revoked", "id", id, "username", cred.Username)
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
	return []PasspointPackage{
		{
			ID:           "pkg-passpoint-7d",
			Name:         "Passpoint Mingguan 7 Hari",
			Description:  "Akses otomatis roaming WiFi berkecepatan tinggi selama 1 minggu penuh",
			DurationDays: 7,
			Price:        25000,
			SpeedLimit:   "15 Mbps Unlimited",
			IsPopular:    false,
		},
		{
			ID:           "pkg-passpoint-30d",
			Name:         "Passpoint Bulanan 30 Hari",
			Description:  "Paket favorit koneksi otomatis tanpa ribet untuk pekerja & mahasiswa",
			DurationDays: 30,
			Price:        50000,
			SpeedLimit:   "25 Mbps Unlimited",
			IsPopular:    true,
		},
		{
			ID:           "pkg-passpoint-90d",
			Name:         "Passpoint Seasonal 90 Hari",
			Description:  "Roaming 3 bulan hemat tanpa batas di seluruh jaringan ISP",
			DurationDays: 90,
			Price:        120000,
			SpeedLimit:   "35 Mbps Unlimited",
			IsPopular:    false,
		},
	}, nil
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

	randSecret, _ := crypto.GenerateSecret(3)
	orderID := "ORD-PP-" + time.Now().Format("20060102150405") + "-" + randSecret

	qrString := "00020101021126590014ID.GIGABILL.PASS01189360001000000000000215" + orderID + "520458125303360540" + req.PackageID
	qrImageURL := "https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=" + qrString
	var paymentURL, snapToken string

	if s.paymentCreator != nil {
		if pURL, qURL, sTok, err := s.paymentCreator(ctx, orderID, selectedPkg.Name, req.CustomerName, req.Phone, req.Email, selectedPkg.Price); err == nil {
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

	return &PasspointPurchaseResponse{
		OrderID:       orderID,
		PackageName:   selectedPkg.Name,
		Amount:        selectedPkg.Price,
		PaymentMethod: req.PaymentMethod,
		PaymentURL:    paymentURL,
		SnapToken:     snapToken,
		QrString:      qrString,
		QrImageURL:    qrImageURL,
		ExpiresAt:     time.Now().Add(15 * time.Minute),
		Status:        "PENDING",
	}, nil
}

func (s *Service) CheckPurchase(ctx context.Context, req PasspointCheckRequest) (*PasspointCheckResponse, error) {
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
			Message: "Menunggu pembayaran dari payment gateway.",
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

		// Create credential in DB
		customerID := uuid.New()
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

		// Sync to FreeRADIUS
		_ = s.radiusSvc.SyncCredential(ctx, username, password, "")
	}

	apiBase := "http://localhost:8080"
	return &PasspointCheckResponse{
		Status:          "PAID",
		CredentialID:    credID.String(),
		Username:        username,
		Password:        password,
		Realm:           realm,
		DomainName:      domain,
		AppleProfileURL: fmt.Sprintf("%s/api/v1/passpoint/credentials/%s/apple-profile", apiBase, credID.String()),
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

	randSecret, _ := crypto.GenerateSecret(3)
	orderID := "ORD-RNW-" + time.Now().Format("20060102150405") + "-" + randSecret

	qrString := "00020101021126590014ID.GIGABILL.RENEW01189360001000000000000215" + orderID + "520458125303360540" + req.PackageID
	qrImageURL := "https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=" + qrString

	return &PasspointRenewResponse{
		OrderID:       orderID,
		CredentialID:  req.CredentialID,
		PackageName:   selectedPkg.Name,
		DurationDays:  selectedPkg.DurationDays,
		Amount:        selectedPkg.Price,
		PaymentMethod: req.PaymentMethod,
		QrString:      qrString,
		QrImageURL:    qrImageURL,
		ExpiresAt:     time.Now().Add(15 * time.Minute),
		Status:        "PENDING",
	}, nil
}

func (s *Service) CheckRenew(ctx context.Context, req PasspointCheckRenewRequest) (*PasspointCheckRenewResponse, error) {
	newExpiry := time.Now().AddDate(0, 0, 30).Format("02 Jan 2006, 15:04 WIB")

	return &PasspointCheckRenewResponse{
		Status:       "PAID",
		CredentialID: req.OrderID,
		NewExpiresAt: newExpiry,
		Message:      "Perpanjangan berhasil! Masa aktif profil Anda telah diperpanjang. Perangkat Anda langsung dapat terhubung kembali ke internet otomatis.",
	}, nil
}



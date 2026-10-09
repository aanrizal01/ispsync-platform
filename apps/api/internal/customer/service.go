package customer

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"time"
	"strings"
	"strconv"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/audit"
	"github.com/gigabill/isp/internal/auth"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/pagination"
)

type Service struct {
	repo        *Repository
	logger      *slog.Logger
	ispBaseURL  string
	ispAdminKey string
	auditSvc    *audit.Service
}

func NewService(repo *Repository, logger *slog.Logger) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

func (s *Service) SetISPIntegration(baseURL, adminKey string) {
	s.ispBaseURL = baseURL
	s.ispAdminKey = adminKey
}

func (s *Service) SetAuditService(auditSvc *audit.Service) {
	s.auditSvc = auditSvc
}

func (s *Service) checkCapacity(ctx context.Context, tenantSlug string) error {
	if tenantSlug == "" || tenantSlug == "dev" || tenantSlug == "superadmin" {
		return nil
	}

	var count int
	err := s.repo.db.QueryRow(ctx, "SELECT COUNT(*) FROM customers WHERE tenant_slug = $1", tenantSlug).Scan(&count)
	if err != nil {
		s.logger.Error("failed to check current customer count", "error", err)
		return nil
	}

	req, err := http.NewRequestWithContext(ctx, "GET", "http://web:3000/api/tenant/profile?slug="+tenantSlug, nil)
	if err != nil {
		return nil
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var res struct {
		Success      bool   `json:"success"`
		PlanCapacity string `json:"planCapacity"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil || !res.Success {
		return nil
	}

	if strings.Contains(strings.ToLower(res.PlanCapacity), "unlimited") {
		return nil
	}

	var limitStr string
	for _, ch := range res.PlanCapacity {
		if ch >= '0' && ch <= '9' {
			limitStr += string(ch)
		}
	}
	if limitStr != "" {
		limit, _ := strconv.Atoi(limitStr)
		if count >= limit {
			return apperrors.BadRequest(fmt.Sprintf("Kapasitas maksimum paket Anda (%d pelanggan) telah tercapai. Silakan upgrade paket SaaS ISPSYNC Anda.", limit))
		}
	}
	return nil
}

func (s *Service) recordAudit(ctx context.Context, action, entityID, description string, oldValues, newValues any) {
	if s.auditSvc == nil {
		return
	}
	claims := auth.ClaimsFromContext(ctx)
	var actorID *uuid.UUID
	var actorEmail *string
	actorType := audit.ActorSystem
	tenantSlug := ""
	if claims != nil {
		actorID = &claims.UserID
		actorType = audit.ActorUser
		actorEmail = &claims.Email
		tenantSlug = claims.TenantSlug
	}
	_ = s.auditSvc.Log(ctx, audit.RecordInput{
		ActorID:     actorID,
		ActorType:   actorType,
		ActorEmail:  actorEmail,
		Action:      action,
		Description: description,
		EntityType:  "Customer",
		EntityID:    entityID,
		OldValues:   oldValues,
		NewValues:   newValues,
		TenantSlug:  tenantSlug,
	})
}


func (s *Service) Create(ctx context.Context, tenantSlug string, req CreateCustomerRequest) (*Customer, error) {
	if tenantSlug == "" {
		tenantSlug = "dev"
	}

	if err := s.checkCapacity(ctx, tenantSlug); err != nil {
		return nil, err
	}

	custNum, err := s.repo.GenerateCustomerNumber(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	now := time.Now()
	cust := &Customer{
		ID:             uuid.New(),
		TenantSlug:     tenantSlug,
		PartnerID:      req.PartnerID,
		CustomerNumber: custNum,
		FullName:       req.FullName,
		Email:          req.Email,
		Phone:          req.Phone,
		Status:         StatusActive,
		Notes:          req.Notes,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	initialAddr := &Address{
		ID:          uuid.New(),
		CustomerID:  cust.ID,
		AddressType: AddressInstallation,
		Street:      req.Street,
		City:        req.City,
		District:    req.District,
		Province:    req.Province,
		PostalCode:  req.PostalCode,
		Country:     "Indonesia",
		IsPrimary:   true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.Create(ctx, cust, initialAddr); err != nil {
		s.logger.Error("failed to create customer", "error", err)
		return nil, apperrors.Internal(err)
	}

	cust.Addresses = append(cust.Addresses, *initialAddr)
	s.recordAudit(ctx, "CustomerCreated", cust.ID.String(), fmt.Sprintf("Pelanggan %s (%s) berhasil didaftarkan", cust.FullName, cust.CustomerNumber), nil, cust)
	return cust, nil
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*Customer, error) {
	cust, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if cust == nil {
		return nil, apperrors.NotFound("Customer")
	}
	return cust, nil
}

func (s *Service) List(ctx context.Context, tenantSlug string, params pagination.Params, search, status string) ([]Customer, pagination.Meta, error) {
	customers, total, err := s.repo.List(ctx, tenantSlug, params, search, status)
	if err != nil {
		return nil, pagination.Meta{}, apperrors.Internal(err)
	}
	meta := pagination.NewMeta(params, total)
	return customers, meta, nil
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, req UpdateCustomerRequest) (*Customer, error) {
	cust, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if cust == nil {
		return nil, apperrors.NotFound("Customer")
	}

	oldCopy := *cust

	cust.FullName = req.FullName
	cust.Email = req.Email
	cust.Phone = req.Phone
	cust.Status = req.Status
	cust.Notes = req.Notes
	cust.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, cust); err != nil {
		return nil, apperrors.Internal(err)
	}

	s.recordAudit(ctx, "CustomerUpdated", cust.ID.String(), fmt.Sprintf("Data profil pelanggan %s diperbarui (Status: %s)", cust.FullName, cust.Status), oldCopy, cust)
	return cust, nil
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	cust, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if cust == nil {
		return apperrors.NotFound("Customer")
	}

	hasHistory, err := s.repo.HasFinancialOrNetworkHistory(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if hasHistory {
		return apperrors.Conflict("Pelanggan memiliki riwayat langganan atau finansial. Data tidak boleh dihapus secara permanen; silakan ubah status menjadi TERMINATED.")
	}

	if err := s.repo.SoftDelete(ctx, id); err != nil {
		return apperrors.Internal(err)
	}

	s.logger.Info("customer soft deleted", "customer_id", id)
	s.recordAudit(ctx, "CustomerDeleted", id.String(), fmt.Sprintf("Pelanggan %s (%s) dihapus", cust.FullName, cust.CustomerNumber), cust, nil)
	return nil
}

func (s *Service) AddAddress(ctx context.Context, customerID uuid.UUID, req AddAddressRequest) (*Address, error) {
	cust, err := s.repo.GetByID(ctx, customerID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if cust == nil {
		return nil, apperrors.NotFound("Customer")
	}

	country := req.Country
	if country == "" {
		country = "Indonesia"
	}

	now := time.Now()
	addr := &Address{
		ID:          uuid.New(),
		CustomerID:  customerID,
		AddressType: req.AddressType,
		Street:      req.Street,
		City:        req.City,
		District:    req.District,
		Province:    req.Province,
		PostalCode:  req.PostalCode,
		Country:     country,
		IsPrimary:   req.IsPrimary,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.AddAddress(ctx, addr); err != nil {
		return nil, apperrors.Internal(err)
	}

	s.recordAudit(ctx, "AddressAdded", customerID.String(), fmt.Sprintf("Alamat (%s) ditambahkan: %s, %s", addr.AddressType, addr.Street, addr.City), nil, addr)
	return addr, nil
}

func (s *Service) RegisterDevice(ctx context.Context, customerID uuid.UUID, req RegisterDeviceRequest) (*Device, error) {
	cust, err := s.repo.GetByID(ctx, customerID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if cust == nil {
		return nil, apperrors.NotFound("Customer")
	}

	dev := &Device{
		ID:               uuid.New(),
		CustomerID:       customerID,
		AccessAccountID:  req.AccessAccountID,
		MACAddress:       req.MACAddress,
		DeviceName:       req.DeviceName,
		DeviceType:       req.DeviceType,
		OSType:           req.OSType,
		PasspointCapable: req.PasspointCapable,
		RegisteredAt:     time.Now(),
	}

	if err := s.repo.AddDevice(ctx, dev); err != nil {
		return nil, apperrors.Internal(err)
	}

	s.recordAudit(ctx, "DeviceRegistered", customerID.String(), fmt.Sprintf("Perangkat MAC %s didaftarkan", dev.MACAddress), nil, dev)
	return dev, nil
}

func (s *Service) GetDevices(ctx context.Context, customerID uuid.UUID) ([]Device, error) {
	return s.repo.GetDevices(ctx, customerID)
}

func (s *Service) GetDocuments(ctx context.Context, customerID uuid.UUID) (*CustomerDocumentsResponse, error) {
	cust, err := s.repo.GetByID(ctx, customerID)
	if err != nil {
		return nil, err
	}
	if cust == nil {
		return nil, apperrors.NotFound("Pelanggan tidak ditemukan")
	}

	baseURL := s.ispBaseURL
	if baseURL == "" {
		baseURL = "http://127.0.0.1:8081"
	}
	adminKey := s.ispAdminKey
	if adminKey == "" {
		adminKey = "isp-onboarding-admin-key"
	}

	email := ""
	if cust.Email != nil {
		email = *cust.Email
	}
	phone := cust.Phone

	targetURL := fmt.Sprintf("%s/api/v1/admin/customers/%s/documents?email=%s&phone=%s",
		baseURL, customerID.String(), url.QueryEscape(email), url.QueryEscape(phone))

	req, err := http.NewRequestWithContext(ctx, "GET", targetURL, nil)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	req.Header.Set("X-Admin-Key", adminKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		s.logger.Error("failed to fetch customer documents from ISP service", "error", err)
		return &CustomerDocumentsResponse{
			CustomerID: customerID.String(),
			FullName:   cust.FullName,
			Phone:      cust.Phone,
			Email:      cust.Email,
			Sites:      []CustomerDocumentSite{},
		}, nil
	}
	defer resp.Body.Close()

	var apiResp struct {
		Success bool                      `json:"success"`
		Message string                    `json:"message"`
		Data    CustomerDocumentsResponse `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		s.logger.Error("failed to decode customer documents response", "error", err)
		return &CustomerDocumentsResponse{
			CustomerID: customerID.String(),
			FullName:   cust.FullName,
			Phone:      cust.Phone,
			Email:      cust.Email,
			Sites:      []CustomerDocumentSite{},
		}, nil
	}

	if apiResp.Data.CustomerID == "" {
		apiResp.Data.CustomerID = customerID.String()
	}
	if apiResp.Data.FullName == "" {
		apiResp.Data.FullName = cust.FullName
	}
	if apiResp.Data.Phone == "" {
		apiResp.Data.Phone = cust.Phone
	}
	if apiResp.Data.Email == nil && cust.Email != nil {
		apiResp.Data.Email = cust.Email
	}

	return &apiResp.Data, nil
}


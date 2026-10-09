package plan

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/radius"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/pagination"
	"github.com/gigabill/isp/pkg/money"
)

type Service struct {
	repo      *Repository
	radiusSvc *radius.Service
	logger    *slog.Logger
}

func NewService(repo *Repository, logger *slog.Logger) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

func (s *Service) SetRadiusService(radiusSvc *radius.Service) {
	s.radiusSvc = radiusSvc
}

func (s *Service) Create(ctx context.Context, tenantSlug string, req CreatePlanRequest, userID *uuid.UUID) (*Plan, error) {
	now := time.Now()
	pkgGroup := req.PackageGroup
	if pkgGroup == "" {
		pkgGroup = "UMUM"
	}

	slug := tenantSlug
	if slug == "" {
		slug = req.TenantSlug
	}
	if slug == "" {
		slug = "dev"
	}

	p := &Plan{
		ID:              uuid.New(),
		Name:            req.Name,
		Description:     req.Description,
		PlanType:        req.PlanType,
		DownloadKbps:    req.DownloadKbps,
		UploadKbps:      req.UploadKbps,
		MinDownloadKbps: req.MinDownloadKbps,
		MinUploadKbps:   req.MinUploadKbps,
		BillingCycle:    req.BillingCycle,
		GracePeriodDays: req.GracePeriodDays,
		Status:          StatusActive,
		IsVisible:       true,
		FramedPool:      req.FramedPool,
		GroupID:         req.GroupID,
		PackageGroup:    pkgGroup,
		TenantSlug:      slug,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	initialPrice := &Price{
		ID:              uuid.New(),
		PlanID:          p.ID,
		MonthlyPrice:    money.Amount(req.MonthlyPrice),
		InstallationFee: money.Amount(req.InstallationFee),
		ActivationFee:   money.Amount(req.ActivationFee),
		TaxPercent:      req.TaxPercent,
		LateFeePercent:  req.LateFeePercent,
		Currency:        "IDR",
		EffectiveFrom:   now,
		EffectiveUntil:  nil,
		CreatedBy:       userID,
		CreatedAt:       now,
	}

	if err := s.repo.Create(ctx, p, initialPrice); err != nil {
		s.logger.Error("failed to create plan", "error", err)
		return nil, apperrors.Internal(err)
	}

	if s.radiusSvc != nil {
		framedPool := ""
		if p.FramedPool != nil {
			framedPool = *p.FramedPool
		}
		_ = s.radiusSvc.EnsureGroupProfileWithPool(ctx, p.Name, p.DownloadKbps, p.UploadKbps, framedPool, p.MinDownloadKbps, p.MinUploadKbps)
	}

	p.CurrentPrice = initialPrice
	p.PriceHistory = []Price{*initialPrice}
	return p, nil
}

func (s *Service) GetByID(ctx context.Context, tenantSlug string, id uuid.UUID) (*Plan, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if p == nil {
		return nil, apperrors.NotFound("Plan")
	}
	if tenantSlug != "" && tenantSlug != "superadmin" && p.TenantSlug != "" && p.TenantSlug != tenantSlug {
		return nil, apperrors.NotFound("Plan")
	}
	return p, nil
}

func (s *Service) List(ctx context.Context, tenantSlug string, params pagination.Params, status, planType, group, cluster string, visibleOnly *bool) ([]Plan, pagination.Meta, error) {
	plans, total, err := s.repo.List(ctx, tenantSlug, params, status, planType, group, cluster, visibleOnly)
	if err != nil {
		return nil, pagination.Meta{}, apperrors.Internal(err)
	}
	meta := pagination.NewMeta(params, total)
	return plans, meta, nil
}

func (s *Service) Update(ctx context.Context, tenantSlug string, id uuid.UUID, req UpdatePlanRequest) (*Plan, error) {
	p, err := s.GetByID(ctx, tenantSlug, id)
	if err != nil {
		return nil, err
	}

	p.Name = req.Name
	p.Description = req.Description
	p.Status = req.Status
	p.GracePeriodDays = req.GracePeriodDays
	if req.PlanType != nil && *req.PlanType != "" {
		p.PlanType = *req.PlanType
	}
	if req.DownloadKbps != nil && *req.DownloadKbps > 0 {
		p.DownloadKbps = *req.DownloadKbps
	}
	if req.UploadKbps != nil && *req.UploadKbps > 0 {
		p.UploadKbps = *req.UploadKbps
	}
	if req.MinDownloadKbps != nil {
		p.MinDownloadKbps = *req.MinDownloadKbps
	}
	if req.MinUploadKbps != nil {
		p.MinUploadKbps = *req.MinUploadKbps
	}
	if req.BillingCycle != nil && *req.BillingCycle != "" {
		p.BillingCycle = *req.BillingCycle
	}
	if req.GroupID != nil {
		p.GroupID = req.GroupID
	}
	if req.PackageGroup != "" {
		p.PackageGroup = req.PackageGroup
	}
	if req.FramedPool != nil {
		p.FramedPool = req.FramedPool
	}
	if req.IsVisible != nil {
		p.IsVisible = *req.IsVisible
	}
	p.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, p); err != nil {
		return nil, apperrors.Internal(err)
	}

	if s.radiusSvc != nil {
		framedPool := ""
		if p.FramedPool != nil {
			framedPool = *p.FramedPool
		}
		_ = s.radiusSvc.EnsureGroupProfileWithPool(ctx, p.Name, p.DownloadKbps, p.UploadKbps, framedPool, p.MinDownloadKbps, p.MinUploadKbps)
	}

	return p, nil
}

func (s *Service) ToggleVisibility(ctx context.Context, tenantSlug string, id uuid.UUID, isVisible bool) (*Plan, error) {
	p, err := s.GetByID(ctx, tenantSlug, id)
	if err != nil {
		return nil, err
	}

	if err := s.repo.UpdateVisibility(ctx, id, isVisible); err != nil {
		return nil, apperrors.Internal(err)
	}

	p.IsVisible = isVisible
	p.UpdatedAt = time.Now()
	return p, nil
}

func (s *Service) Delete(ctx context.Context, tenantSlug string, id uuid.UUID) error {
	_, err := s.GetByID(ctx, tenantSlug, id)
	if err != nil {
		return err
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		s.logger.Error("failed to delete plan", "error", err)
		return apperrors.Internal(err)
	}

	return nil
}

func (s *Service) AddPriceVersion(ctx context.Context, tenantSlug string, planID uuid.UUID, req CreatePriceVersionRequest, userID *uuid.UUID) (*Price, error) {
	_, err := s.GetByID(ctx, tenantSlug, planID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	newPrice := &Price{
		ID:              uuid.New(),
		PlanID:          planID,
		MonthlyPrice:    money.Amount(req.MonthlyPrice),
		InstallationFee: money.Amount(req.InstallationFee),
		ActivationFee:   money.Amount(req.ActivationFee),
		TaxPercent:      req.TaxPercent,
		LateFeePercent:  req.LateFeePercent,
		Currency:        "IDR",
		EffectiveFrom:   now,
		EffectiveUntil:  nil,
		CreatedBy:       userID,
		CreatedAt:       now,
	}

	if err := s.repo.AddPriceVersion(ctx, newPrice); err != nil {
		s.logger.Error("failed to create price version", "error", err)
		return nil, apperrors.Internal(err)
	}

	s.logger.Info("new plan price version created", "plan_id", planID, "price_id", newPrice.ID)
	return newPrice, nil
}

// Plan Groups

func (s *Service) ListGroups(ctx context.Context, tenantSlug string) ([]PlanGroup, error) {
	groups, err := s.repo.ListPlanGroups(ctx, tenantSlug)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	return groups, nil
}

func (s *Service) GetGroupByID(ctx context.Context, tenantSlug string, id uuid.UUID) (*PlanGroup, error) {
	g, err := s.repo.GetPlanGroupByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if g == nil {
		return nil, apperrors.NotFound("PlanGroup")
	}
	if tenantSlug != "" && tenantSlug != "superadmin" && g.TenantSlug != "" && g.TenantSlug != tenantSlug {
		return nil, apperrors.NotFound("PlanGroup")
	}
	return g, nil
}

func (s *Service) CreateGroup(ctx context.Context, tenantSlug string, req CreatePlanGroupRequest) (*PlanGroup, error) {
	now := time.Now()
	slug := tenantSlug
	if slug == "" {
		slug = req.TenantSlug
	}
	if slug == "" {
		slug = "dev"
	}

	g := &PlanGroup{
		ID:          uuid.New(),
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		ClusterCode: req.ClusterCode,
		ClusterArea: req.ClusterArea,
		TenantSlug:  slug,
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.CreatePlanGroup(ctx, g); err != nil {
		s.logger.Error("failed to create plan group", "error", err)
		return nil, apperrors.Internal(err)
	}

	return g, nil
}

func (s *Service) UpdateGroup(ctx context.Context, tenantSlug string, id uuid.UUID, req UpdatePlanGroupRequest) (*PlanGroup, error) {
	g, err := s.GetGroupByID(ctx, tenantSlug, id)
	if err != nil {
		return nil, err
	}

	g.Name = req.Name
	g.Description = req.Description
	g.ClusterCode = req.ClusterCode
	g.ClusterArea = req.ClusterArea
	g.IsActive = req.IsActive
	g.UpdatedAt = time.Now()

	if err := s.repo.UpdatePlanGroup(ctx, g); err != nil {
		return nil, apperrors.Internal(err)
	}

	return g, nil
}

func (s *Service) DeleteGroup(ctx context.Context, tenantSlug string, id uuid.UUID) error {
	_, err := s.GetGroupByID(ctx, tenantSlug, id)
	if err != nil {
		return err
	}

	if err := s.repo.DeletePlanGroup(ctx, id); err != nil {
		return apperrors.Internal(err)
	}
	return nil
}

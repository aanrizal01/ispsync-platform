package partner

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/pagination"
	"github.com/gigabill/isp/pkg/money"
)

type Service struct {
	repo   *Repository
	logger *slog.Logger
}

func NewService(repo *Repository, logger *slog.Logger) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

func (s *Service) CreatePartner(ctx context.Context, req CreatePartnerRequest) (*Partner, error) {
	now := time.Now()
	p := &Partner{
		ID:                uuid.New(),
		Code:              req.Code,
		Name:              req.Name,
		CompanyName:       req.CompanyName,
		ContactPerson:     req.ContactPerson,
		Phone:             req.Phone,
		Email:             req.Email,
		ShareType:         req.ShareType,
		PartnerShareBps:   req.PartnerShareBps,
		ISPShareBps:       req.ISPShareBps,
		FlatFeeAmount:     money.Amount(req.FlatFeeAmount),
		Balance:           0,
		BankName:          req.BankName,
		BankAccountNumber: req.BankAccountNumber,
		BankAccountHolder: req.BankAccountHolder,
		Status:            PartnerStatusActive,
		Notes:             req.Notes,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := s.repo.Create(ctx, p); err != nil {
		s.logger.Error("failed to create partner", "error", err)
		return nil, apperrors.Internal(err)
	}

	s.logger.Info("partner created", "id", p.ID, "code", p.Code, "name", p.Name)
	return p, nil
}

func (s *Service) GetPartner(ctx context.Context, id uuid.UUID) (*Partner, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if p == nil {
		return nil, apperrors.NotFound("Mitra tidak ditemukan")
	}
	return p, nil
}

func (s *Service) ListPartners(ctx context.Context, params pagination.Params, search, status string) ([]Partner, pagination.Meta, error) {
	partners, total, err := s.repo.List(ctx, params, search, status)
	if err != nil {
		return nil, pagination.Meta{}, apperrors.Internal(err)
	}
	meta := pagination.NewMeta(params, total)
	return partners, meta, nil
}

func (s *Service) RecordRevenueShare(ctx context.Context, invoiceID uuid.UUID, grossAmount money.Amount) (*RevenueShare, error) {
	rs, err := s.repo.RecordRevenueShare(ctx, invoiceID, grossAmount)
	if err != nil {
		s.logger.Error("failed to record revenue share", "invoice_id", invoiceID, "error", err)
		return nil, err
	}
	if rs != nil {
		s.logger.Info("revenue share recorded",
			"invoice_id", invoiceID,
			"partner_id", rs.PartnerID,
			"partner_amount", rs.PartnerAmount.Int64(),
			"isp_amount", rs.ISPAmount.Int64(),
		)
	}
	return rs, nil
}

func (s *Service) ListRevenueShares(ctx context.Context, partnerID uuid.UUID, limit, offset int) ([]RevenueShare, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.repo.ListRevenueShares(ctx, partnerID, limit, offset)
}

func (s *Service) CreateSettlement(ctx context.Context, req CreateSettlementRequest) (*Settlement, error) {
	now := time.Now()
	settleNum := fmt.Sprintf("STL-%d-%s", now.Year(), uuid.New().String()[:8])

	settle := &Settlement{
		ID:                uuid.New(),
		SettlementNumber:  settleNum,
		PartnerID:         req.PartnerID,
		Amount:            money.Amount(req.Amount),
		Status:            SettlementStatusPending,
		BankName:          req.BankName,
		BankAccountNumber: req.BankAccountNumber,
		BankAccountHolder: req.BankAccountHolder,
		Notes:             req.Notes,
		RequestedAt:       now,
	}

	if err := s.repo.CreateSettlement(ctx, settle); err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	s.logger.Info("settlement requested", "settlement_id", settle.ID, "partner_id", settle.PartnerID, "amount", settle.Amount.Int64())
	return settle, nil
}

func (s *Service) ListSettlements(ctx context.Context, partnerID *uuid.UUID, limit, offset int) ([]Settlement, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.repo.ListSettlements(ctx, partnerID, limit, offset)
}

func (s *Service) ProcessSettlement(ctx context.Context, id uuid.UUID, req ProcessSettlementRequest, processedBy *uuid.UUID) error {
	if err := s.repo.ProcessSettlement(ctx, id, req.Status, req.ProofURL, req.Notes, processedBy); err != nil {
		return apperrors.Internal(err)
	}
	s.logger.Info("settlement processed", "settlement_id", id, "status", req.Status)
	return nil
}

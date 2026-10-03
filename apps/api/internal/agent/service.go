package agent

import (
	"context"
	"crypto/rand"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/passpoint"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/pagination"
	"github.com/gigabill/isp/internal/voucher"
	"github.com/gigabill/isp/pkg/crypto"
	"github.com/gigabill/isp/pkg/money"
)

type Service struct {
	repo         *Repository
	voucherSvc   *voucher.Service
	passpointSvc *passpoint.Service
	logger       *slog.Logger
}

func NewService(repo *Repository, voucherSvc *voucher.Service, logger *slog.Logger) *Service {
	return &Service{
		repo:       repo,
		voucherSvc: voucherSvc,
		logger:     logger,
	}
}

func (s *Service) SetPasspointService(svc *passpoint.Service) {
	s.passpointSvc = svc
}

func (s *Service) InquirePasspoint(ctx context.Context, agentID uuid.UUID, code string) (*passpoint.PasspointInquiryResult, error) {
	if s.passpointSvc == nil {
		return nil, apperrors.BadRequest("Fitur passpoint belum diaktifkan")
	}
	return s.passpointSvc.InquireCashierOrder(ctx, agentID, code)
}

func (s *Service) PayPasspoint(ctx context.Context, agentID uuid.UUID, req passpoint.PayPasspointByAgentRequest) (*passpoint.PasspointReceipt, error) {
	if s.passpointSvc == nil {
		return nil, apperrors.BadRequest("Fitur passpoint belum diaktifkan")
	}
	return s.passpointSvc.PayOrderWithAgentBalance(ctx, agentID, req)
}

func (s *Service) IssueManualPasspoint(ctx context.Context, agentID uuid.UUID, req passpoint.IssueManualPasspointRequest) (*passpoint.PasspointReceipt, error) {
	if s.passpointSvc == nil {
		return nil, apperrors.BadRequest("Fitur passpoint belum diaktifkan")
	}
	return s.passpointSvc.IssueManualPasspoint(ctx, agentID, req)
}

func (s *Service) Repo() *Repository {
	return s.repo
}

// ──────────────────────────────────────────
// Agent CRUD
// ──────────────────────────────────────────

func (s *Service) CreateAgent(ctx context.Context, req CreateAgentRequest, adminID *uuid.UUID) (*Agent, error) {
	// Check existing code
	existing, err := s.repo.GetAgentByCode(ctx, req.Code)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if existing != nil {
		return nil, apperrors.BadRequest("Kode agen sudah digunakan")
	}

	offlineCashback := 15.00
	if req.OfflineCashbackPct != nil {
		offlineCashback = *req.OfflineCashbackPct
	}
	onlineCashback := 10.00
	if req.OnlineCashbackPct != nil {
		onlineCashback = *req.OnlineCashbackPct
	}
	onlineDiscount := 10.00
	if req.OnlineDiscountPct != nil {
		onlineDiscount = *req.OnlineDiscountPct
	}
	isMaster := false
	if req.IsMaster != nil {
		isMaster = *req.IsMaster
	}
	overridePct := 3.00
	if req.OverridePct != nil {
		overridePct = *req.OverridePct
	}

	now := time.Now()
	agentID := uuid.New()

	var userID *uuid.UUID
	if req.CreateUserAccount && req.Email != nil && *req.Email != "" && req.UserPassword != nil && *req.UserPassword != "" {
		hash, err := crypto.HashPassword(*req.UserPassword)
		if err != nil {
			return nil, apperrors.Internal(fmt.Errorf("hash password: %w", err))
		}

		uID := uuid.New()
		const insertUserQ = `
			INSERT INTO users (id, email, password_hash, full_name, phone, is_active, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
			ON CONFLICT (email) DO NOTHING
		`
		res, err := s.repo.DB().Exec(ctx, insertUserQ, uID, *req.Email, hash, req.Name, req.Phone)
		if err != nil {
			return nil, apperrors.Internal(fmt.Errorf("create user: %w", err))
		}
		if res.RowsAffected() > 0 {
			userID = &uID
			// Assign role 'voucher_agent'
			const assignRoleQ = `
				INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by)
				SELECT $1, r.id, NOW(), $2 FROM roles r WHERE r.slug = 'voucher_agent'
				ON CONFLICT DO NOTHING
			`
			_, _ = s.repo.DB().Exec(ctx, assignRoleQ, uID, adminID)
		}
	}

	agent := &Agent{
		ID:                 agentID,
		UserID:             userID,
		Code:               req.Code,
		Name:               req.Name,
		CompanyName:        req.CompanyName,
		Phone:              req.Phone,
		Email:              req.Email,
		Address:            req.Address,
		IDCardNumber:       req.IDCardNumber,
		KtpURL:             req.KtpURL,
		BusinessPhotoURL:   req.BusinessPhotoURL,
		IsMaster:           isMaster,
		ParentAgentID:      req.ParentAgentID,
		OverridePct:        overridePct,
		Balance:            money.Amount(0),
		OfflineCashbackPct: offlineCashback,
		OnlineCashbackPct:  onlineCashback,
		OnlineDiscountPct:  onlineDiscount,
		BankName:           req.BankName,
		BankAccountNumber:  req.BankAccountNumber,
		BankAccountHolder:  req.BankAccountHolder,
		Status:             AgentStatusActive,
		Notes:              req.Notes,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := s.repo.CreateAgent(ctx, agent); err != nil {
		s.logger.Error("failed to create agent", "error", err)
		return nil, apperrors.Internal(err)
	}

	// Initial balance topup if specified
	if req.InitialBalance > 0 {
		ref := "INITIAL_TOPUP"
		desc := fmt.Sprintf("Saldo awal pendaftaran agen %s", req.Name)
		_, err = s.repo.CreditBalance(ctx, agentID, req.InitialBalance, MutationTopupManual, &ref, &desc)
		if err != nil {
			s.logger.Error("failed to credit initial balance", "error", err)
		} else {
			agent.Balance = money.Amount(req.InitialBalance)
		}
	}

	s.logger.Info("agent created successfully", "agent_id", agentID, "code", req.Code, "name", req.Name)
	return s.repo.GetAgentByID(ctx, agentID)
}

func (s *Service) GetAgent(ctx context.Context, id uuid.UUID) (*Agent, error) {
	a, err := s.repo.GetAgentByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if a == nil {
		return nil, apperrors.NotFound("Agen")
	}
	return a, nil
}

func (s *Service) GetAgentByUserID(ctx context.Context, userID uuid.UUID) (*Agent, error) {
	a, err := s.repo.GetAgentByUserID(ctx, userID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if a == nil {
		return nil, apperrors.NotFound("Profil Agen tidak ditemukan untuk akun ini")
	}
	return a, nil
}

func (s *Service) ListAgents(ctx context.Context, params pagination.Params, search, status string) ([]Agent, pagination.Meta, error) {
	return s.repo.ListAgents(ctx, params, search, status)
}

func (s *Service) UpdateAgent(ctx context.Context, id uuid.UUID, req UpdateAgentRequest) (*Agent, error) {
	a, err := s.repo.GetAgentByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if a == nil {
		return nil, apperrors.NotFound("Agen")
	}

	a.Name = req.Name
	a.CompanyName = req.CompanyName
	a.Phone = req.Phone
	a.Email = req.Email
	if req.Address != nil {
		a.Address = req.Address
	}
	if req.IDCardNumber != nil {
		a.IDCardNumber = req.IDCardNumber
	}
	if req.KtpURL != nil {
		a.KtpURL = req.KtpURL
	}
	if req.BusinessPhotoURL != nil {
		a.BusinessPhotoURL = req.BusinessPhotoURL
	}
	if req.OfflineCashbackPct != nil {
		a.OfflineCashbackPct = *req.OfflineCashbackPct
	}
	if req.OnlineCashbackPct != nil {
		a.OnlineCashbackPct = *req.OnlineCashbackPct
	}
	if req.OnlineDiscountPct != nil {
		a.OnlineDiscountPct = *req.OnlineDiscountPct
	}
	if req.BankName != nil {
		a.BankName = req.BankName
	}
	if req.BankAccountNumber != nil {
		a.BankAccountNumber = req.BankAccountNumber
	}
	if req.BankAccountHolder != nil {
		a.BankAccountHolder = req.BankAccountHolder
	}
	if req.Status != nil {
		a.Status = AgentStatus(*req.Status)
	}
	if req.Notes != nil {
		a.Notes = req.Notes
	}
	if req.IsMaster != nil {
		a.IsMaster = *req.IsMaster
	}
	if req.ClearParentAgent {
		a.ParentAgentID = nil
	} else if req.ParentAgentID != nil {
		if *req.ParentAgentID != a.ID {
			a.ParentAgentID = req.ParentAgentID
		}
	}
	if req.OverridePct != nil {
		a.OverridePct = *req.OverridePct
	}

	if err := s.repo.UpdateAgent(ctx, a); err != nil {
		return nil, apperrors.Internal(err)
	}

	return s.repo.GetAgentByID(ctx, id)
}

func (s *Service) RegisterAgent(ctx context.Context, req RegisterAgentRequest) (*Agent, error) {
	// Check existing email
	var count int
	_ = s.repo.DB().QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE LOWER(email) = LOWER($1)", req.Email).Scan(&count)
	if count > 0 {
		return nil, apperrors.BadRequest("Alamat email sudah terdaftar di sistem")
	}

	// Generate unique agent code
	var code string
	for i := 0; i < 10; i++ {
		b := make([]byte, 3)
		_, _ = rand.Read(b)
		code = fmt.Sprintf("AGN-%X", b)
		existing, _ := s.repo.GetAgentByCode(ctx, code)
		if existing == nil {
			break
		}
	}

	now := time.Now()
	agentID := uuid.New()
	uID := uuid.New()

	hash, err := crypto.HashPassword(req.Password)
	if err != nil {
		return nil, apperrors.Internal(fmt.Errorf("hash password: %w", err))
	}

	// Create user account with active=false until approved by admin
	const insertUserQ = `
		INSERT INTO users (id, email, password_hash, full_name, phone, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
	`
	_, err = s.repo.DB().Exec(ctx, insertUserQ, uID, req.Email, hash, req.Name, req.Phone)
	if err != nil {
		return nil, apperrors.Internal(fmt.Errorf("create user: %w", err))
	}

	// Assign role voucher_agent
	const assignRoleQ = `
		INSERT INTO user_roles (user_id, role_id, assigned_at)
		SELECT $1, r.id, NOW() FROM roles r WHERE r.slug = 'voucher_agent'
		ON CONFLICT DO NOTHING
	`
	_, _ = s.repo.DB().Exec(ctx, assignRoleQ, uID)

	var parentAgentID *uuid.UUID
	if req.ReferralCode != nil && *req.ReferralCode != "" {
		parent, _ := s.repo.GetAgentByCode(ctx, strings.TrimSpace(*req.ReferralCode))
		if parent != nil && parent.IsMaster && parent.Status == AgentStatusActive {
			parentAgentID = &parent.ID
		}
	}

	agent := &Agent{
		ID:                 agentID,
		UserID:             &uID,
		Code:               code,
		Name:               req.Name,
		CompanyName:        req.CompanyName,
		Phone:              req.Phone,
		Email:              &req.Email,
		Address:            req.Address,
		IDCardNumber:       req.IDCardNumber,
		KtpURL:             req.KtpURL,
		BusinessPhotoURL:   req.BusinessPhotoURL,
		IsMaster:           false,
		ParentAgentID:      parentAgentID,
		OverridePct:        3.00,
		Balance:            money.Amount(0),
		OfflineCashbackPct: 15.00,
		OnlineCashbackPct:  10.00,
		OnlineDiscountPct:  10.00,
		BankName:           req.BankName,
		BankAccountNumber:  req.BankAccountNumber,
		BankAccountHolder:  req.BankAccountHolder,
		Status:             AgentStatusPending,
		Notes:              req.Notes,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := s.repo.CreateAgent(ctx, agent); err != nil {
		s.logger.Error("failed to create registered agent", "error", err)
		return nil, apperrors.Internal(err)
	}

	s.logger.Info("agent registration submitted", "agent_id", agentID, "code", code, "name", req.Name, "email", req.Email)
	return s.repo.GetAgentByID(ctx, agentID)
}

func (s *Service) ApproveAgentRegistration(ctx context.Context, id uuid.UUID, adminID *uuid.UUID) (*Agent, error) {
	a, err := s.repo.GetAgentByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if a == nil {
		return nil, apperrors.NotFound("Agen")
	}

	note := "Pendaftaran agen telah disetujui oleh administrator"
	if err := s.repo.SetAgentStatus(ctx, id, AgentStatusActive, &note); err != nil {
		return nil, apperrors.Internal(err)
	}

	// Activate user account
	if a.UserID != nil {
		_, _ = s.repo.DB().Exec(ctx, "UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1", *a.UserID)
	}

	s.logger.Info("agent registration approved", "agent_id", id, "admin_id", adminID)
	return s.repo.GetAgentByID(ctx, id)
}

func (s *Service) RejectAgentRegistration(ctx context.Context, id uuid.UUID, reason string, adminID *uuid.UUID) (*Agent, error) {
	a, err := s.repo.GetAgentByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if a == nil {
		return nil, apperrors.NotFound("Agen")
	}

	note := "Pendaftaran agen ditolak"
	if reason != "" {
		note = fmt.Sprintf("Pendaftaran agen ditolak: %s", reason)
	}
	if err := s.repo.SetAgentStatus(ctx, id, AgentStatusRejected, &note); err != nil {
		return nil, apperrors.Internal(err)
	}

	// Deactivate user account
	if a.UserID != nil {
		_, _ = s.repo.DB().Exec(ctx, "UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1", *a.UserID)
	}

	s.logger.Info("agent registration rejected", "agent_id", id, "reason", reason, "admin_id", adminID)
	return s.repo.GetAgentByID(ctx, id)
}

// ──────────────────────────────────────────
// Top-Up Operations
// ──────────────────────────────────────────

func (s *Service) TopupManual(ctx context.Context, agentID uuid.UUID, req TopupManualRequest, adminID *uuid.UUID) (*AgentMutation, error) {
	a, err := s.repo.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if a == nil {
		return nil, apperrors.NotFound("Agen")
	}

	ref := fmt.Sprintf("TOPUP-MANUAL-%s", time.Now().Format("20060102150405"))
	desc := "Top-up saldo manual oleh Admin"
	if req.Notes != nil && *req.Notes != "" {
		desc = *req.Notes
	}

	mutation, err := s.repo.CreditBalance(ctx, agentID, req.Amount, MutationTopupManual, &ref, &desc)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	s.logger.Info("manual agent topup successful", "agent_id", agentID, "amount", req.Amount)
	return mutation, nil
}

func (s *Service) WithdrawManual(ctx context.Context, agentID uuid.UUID, req WithdrawManualRequest, adminID *uuid.UUID) (*AgentMutation, error) {
	a, err := s.repo.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if a == nil {
		return nil, apperrors.NotFound("Agen")
	}

	if a.Balance.Int64() < req.Amount {
		return nil, apperrors.BadRequest(fmt.Sprintf("Saldo agen tidak mencukupi (Saldo: Rp %d, Penarikan: Rp %d)", a.Balance.Int64(), req.Amount))
	}

	mutType := MutationWithdrawal
	if req.MutationType == string(MutationAdjustment) {
		mutType = MutationAdjustment
	}

	ref := fmt.Sprintf("WD-%s", time.Now().Format("20060102150405"))
	if req.ReferenceID != nil && *req.ReferenceID != "" {
		ref = *req.ReferenceID
	}

	desc := "Penarikan / pencairan saldo agen oleh Admin"
	if req.Notes != nil && *req.Notes != "" {
		desc = *req.Notes
	}

	mutation, err := s.repo.DebitBalance(ctx, agentID, req.Amount, mutType, &ref, &desc)
	if err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	s.logger.Info("manual agent withdrawal successful", "agent_id", agentID, "amount", req.Amount, "type", mutType)
	return mutation, nil
}

func (s *Service) SubmitTopupRequest(ctx context.Context, agentID uuid.UUID, req SubmitTopupRequest) (*TopupRequest, error) {
	a, err := s.repo.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if a == nil {
		return nil, apperrors.NotFound("Agen")
	}

	reqNum := fmt.Sprintf("TOP-%s-%04d", time.Now().Format("20060102"), time.Now().Unix()%10000)
	topup := &TopupRequest{
		ID:                uuid.New(),
		RequestNumber:     reqNum,
		AgentID:           agentID,
		Amount:            money.Amount(req.Amount),
		BankName:          req.BankName,
		BankAccountNumber: req.BankAccountNumber,
		BankAccountHolder: req.BankAccountHolder,
		ProofURL:          req.ProofURL,
		Status:            TopupStatusPending,
		Notes:             req.Notes,
		RequestedAt:       time.Now(),
	}

	if err := s.repo.CreateTopupRequest(ctx, topup); err != nil {
		return nil, apperrors.Internal(err)
	}

	return s.repo.GetTopupRequestByID(ctx, topup.ID)
}

func (s *Service) ListTopupRequests(ctx context.Context, params pagination.Params, agentID *uuid.UUID, status string) ([]TopupRequest, pagination.Meta, error) {
	return s.repo.ListTopupRequests(ctx, params, agentID, status)
}

func (s *Service) ProcessTopupRequest(ctx context.Context, reqID uuid.UUID, req ProcessTopupRequest, adminID *uuid.UUID) (*TopupRequest, error) {
	topup, err := s.repo.GetTopupRequestByID(ctx, reqID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if topup == nil {
		return nil, apperrors.NotFound("Permintaan top-up")
	}
	if topup.Status != TopupStatusPending {
		return nil, apperrors.BadRequest("Permintaan top-up ini sudah pernah diproses")
	}

	if req.Action == "APPROVE" {
		ref := topup.RequestNumber
		desc := fmt.Sprintf("Konfirmasi top-up transfer bank (%s - %s)", topup.BankName, topup.BankAccountHolder)
		_, err := s.repo.CreditBalance(ctx, topup.AgentID, int64(topup.Amount), MutationTopupBankTransfer, &ref, &desc)
		if err != nil {
			return nil, apperrors.Internal(fmt.Errorf("credit agent balance: %w", err))
		}

		if err := s.repo.UpdateTopupRequestStatus(ctx, reqID, TopupStatusApproved, req.AdminNotes, adminID); err != nil {
			return nil, apperrors.Internal(err)
		}
	} else {
		if err := s.repo.UpdateTopupRequestStatus(ctx, reqID, TopupStatusRejected, req.AdminNotes, adminID); err != nil {
			return nil, apperrors.Internal(err)
		}
	}

	return s.repo.GetTopupRequestByID(ctx, reqID)
}

func (s *Service) ListMutations(ctx context.Context, agentID *uuid.UUID, mutationType *string, params pagination.Params) ([]AgentMutation, pagination.Meta, error) {
	return s.repo.ListMutations(ctx, agentID, mutationType, params)
}

// ──────────────────────────────────────────
// Daily Promo Code Operations
// ──────────────────────────────────────────

func (s *Service) GetTodayPromo(ctx context.Context, agentID uuid.UUID) (*DailyPromo, error) {
	return s.repo.GetOrCreateDailyPromo(ctx, agentID)
}

func (s *Service) ValidatePromo(ctx context.Context, promoCode string) (*ValidatePromoResponse, *Agent, error) {
	return s.repo.ValidatePromoCode(ctx, promoCode)
}

// ──────────────────────────────────────────
// Offline Voucher Generation (with Cashback)
// ──────────────────────────────────────────

type AgentBatchResult struct {
	Batch          *voucher.Batch    `json:"batch"`
	Vouchers       []voucher.Voucher `json:"vouchers"`
	GrossAmount    money.Amount      `json:"gross_amount"`
	CashbackPct    float64           `json:"cashback_pct"`
	CashbackAmount money.Amount      `json:"cashback_amount"`
	NetCost        money.Amount      `json:"net_cost"`
	BalanceBefore  money.Amount      `json:"balance_before"`
	BalanceAfter   money.Amount      `json:"balance_after"`
}

func (s *Service) GenerateOfflineBatchForAgent(ctx context.Context, agentID uuid.UUID, req AgentGenerateBatchRequest, userID *uuid.UUID) (*AgentBatchResult, error) {
	agent, err := s.repo.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if agent == nil {
		return nil, apperrors.NotFound("Agen")
	}
	if agent.Status != AgentStatusActive {
		return nil, apperrors.BadRequest("Akun agen Anda sedang tidak aktif, tidak dapat generate voucher")
	}

	// Fetch template to calculate price
	var tplPrice int64
	var tplName string
	var isActive bool
	const tplQ = `SELECT price, name, is_active FROM voucher_templates WHERE id = $1`
	err = s.repo.DB().QueryRow(ctx, tplQ, req.TemplateID).Scan(&tplPrice, &tplName, &isActive)
	if err != nil {
		return nil, apperrors.NotFound("Template paket voucher")
	}
	if !isActive {
		return nil, apperrors.BadRequest("Template paket voucher ini sedang dinonaktifkan")
	}

	gross := tplPrice * int64(req.Quantity)
	cashback := int64(float64(gross) * (agent.OfflineCashbackPct / 100.0))
	netCost := gross - cashback

	if int64(agent.Balance) < netCost {
		return nil, apperrors.BadRequest(fmt.Sprintf(
			"Saldo Anda tidak mencukupi. Diperlukan Rp %d (setelah cashback %.0f%%), saldo Anda saat ini Rp %d. Silakan isi saldo terlebih dahulu.",
			netCost, agent.OfflineCashbackPct, agent.Balance,
		))
	}

	// Debit netCost from agent balance
	refDesc := fmt.Sprintf("Pembelian %d voucher offline paket '%s' (Nilai kotor: Rp %d, Cashback %.0f%%: Rp %d)",
		req.Quantity, tplName, gross, agent.OfflineCashbackPct, cashback,
	)
	batchRef := fmt.Sprintf("BATCH-%d", time.Now().Unix())
	mutation, err := s.repo.DebitBalance(ctx, agentID, netCost, MutationVoucherOfflineBuy, &batchRef, &refDesc)
	if err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	// Generate batch with voucher service
	vReq := voucher.GenerateBatchRequest{
		TemplateID: req.TemplateID,
		Quantity:   req.Quantity,
		Prefix:     req.Prefix,
		Notes:      req.Notes,
		CharType:   req.CharType,
		CodeLength: req.CodeLength,
		AgentID:    &agentID,
	}
	batch, vouchers, err := s.voucherSvc.GenerateBatch(ctx, vReq, userID)
	if err != nil {
		// Rollback agent balance debit if voucher generation fails
		rollDesc := fmt.Sprintf("Pengembalian dana gagal generate batch %s", batchRef)
		_, _ = s.repo.CreditBalance(ctx, agentID, netCost, MutationAdjustment, &batchRef, &rollDesc)
		return nil, apperrors.Internal(fmt.Errorf("gagal generate voucher: %w", err))
	}

	// If agent has a parent master agent, award overriding commission
	if agent.ParentAgentID != nil {
		parentAgent, pErr := s.repo.GetAgentByID(ctx, *agent.ParentAgentID)
		if pErr == nil && parentAgent != nil && parentAgent.Status == AgentStatusActive && parentAgent.IsMaster {
			pct := parentAgent.OverridePct
			if pct <= 0 {
				pct = 3.0
			}
			overrideAmount := int64(float64(gross) * (pct / 100.0))
			if overrideAmount > 0 {
				ref := batchRef
				desc := fmt.Sprintf("Overriding komisi %.1f%% dari omzet %d voucher sub-agen %s (%s)", pct, req.Quantity, agent.Name, agent.Code)
				_, cErr := s.repo.CreditBalance(ctx, parentAgent.ID, overrideAmount, MutationVoucherOverrideComm, &ref, &desc)
				if cErr != nil {
					s.logger.Error("failed to credit override commission to master agent", "master_id", parentAgent.ID, "sub_agent_id", agent.ID, "error", cErr)
				} else {
					s.logger.Info("master agent override commission credited", "master_id", parentAgent.ID, "sub_agent_id", agent.ID, "amount", overrideAmount)
				}
			}
		}
	}

	return &AgentBatchResult{
		Batch:          batch,
		Vouchers:       vouchers,
		GrossAmount:    money.Amount(gross),
		CashbackPct:    agent.OfflineCashbackPct,
		CashbackAmount: money.Amount(cashback),
		NetCost:        money.Amount(netCost),
		BalanceBefore:  mutation.BalanceBefore,
		BalanceAfter:   mutation.BalanceAfter,
	}, nil
}

// ──────────────────────────────────────────
// Online Voucher Commission
// ──────────────────────────────────────────

func (s *Service) CreditOnlineCommission(ctx context.Context, agentID uuid.UUID, orderID, promoCode, tplName string, commissionAmount int64) error {
	ref := orderID
	desc := fmt.Sprintf("Komisi penjualan voucher online paket '%s' via kode promo %s", tplName, promoCode)
	_, err := s.repo.CreditBalance(ctx, agentID, commissionAmount, MutationVoucherOnlineComm, &ref, &desc)
	if err != nil {
		s.logger.Error("failed to credit online commission to agent", "agent_id", agentID, "order_id", orderID, "error", err)
		return err
	}
	s.logger.Info("online commission credited to agent", "agent_id", agentID, "order_id", orderID, "amount", commissionAmount)

	// If agent has a Master Agent parent, credit overriding commission to the master agent
	agent, aErr := s.repo.GetAgentByID(ctx, agentID)
	if aErr == nil && agent != nil && agent.ParentAgentID != nil {
		parentAgent, pErr := s.repo.GetAgentByID(ctx, *agent.ParentAgentID)
		if pErr == nil && parentAgent != nil && parentAgent.Status == AgentStatusActive && parentAgent.IsMaster {
			pct := parentAgent.OverridePct
			if pct <= 0 {
				pct = 3.0
			}
			var tplPrice int64
			_ = s.repo.DB().QueryRow(ctx, "SELECT COALESCE(t.price, 0) FROM vouchers v JOIN voucher_templates t ON t.id = v.template_id WHERE v.order_id = $1 LIMIT 1", orderID).Scan(&tplPrice)
			if tplPrice == 0 {
				tplPrice = commissionAmount * 10
			}
			overrideAmount := int64(float64(tplPrice) * (pct / 100.0))
			if overrideAmount > 0 {
				mDesc := fmt.Sprintf("Overriding komisi %.1f%% penjualan online sub-agen %s (%s)", pct, agent.Name, agent.Code)
				_, _ = s.repo.CreditBalance(ctx, parentAgent.ID, overrideAmount, MutationVoucherOverrideComm, &ref, &mDesc)
			}
		}
	}

	return nil
}

// ──────────────────────────────────────────
// Agent Dashboard Summary
// ──────────────────────────────────────────

func (s *Service) GetAgentDashboard(ctx context.Context, agentID uuid.UUID) (*AgentDashboardSummary, error) {
	agent, err := s.repo.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if agent == nil {
		return nil, apperrors.NotFound("Agen")
	}

	promo, err := s.repo.GetOrCreateDailyPromo(ctx, agentID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	var offlineCount, onlineCount int
	const countQ = `
		SELECT 
			COUNT(*) FILTER (WHERE channel = 'OFFLINE') as offline_cnt,
			COUNT(*) FILTER (WHERE channel = 'ONLINE') as online_cnt
		FROM vouchers
		WHERE agent_id = $1
	`
	_ = s.repo.DB().QueryRow(ctx, countQ, agentID).Scan(&offlineCount, &onlineCount)

	var pendingTopups int
	_ = s.repo.DB().QueryRow(ctx, `SELECT COUNT(*) FROM agent_topup_requests WHERE agent_id = $1 AND status = 'PENDING'`, agentID).Scan(&pendingTopups)

	mutations, _, _ := s.repo.ListMutations(ctx, &agentID, nil, pagination.Params{Limit: 5, Offset: 0})

	summary := &AgentDashboardSummary{
		Agent:             *agent,
		TodayPromoCode:    promo.PromoCode,
		ValidDate:         promo.ValidDate,
		TotalVouchersSold: offlineCount + onlineCount,
		TotalOfflineCount: offlineCount,
		TotalOnlineCount:  onlineCount,
		RecentMutations:   mutations,
		PendingTopupCount: pendingTopups,
		IsMaster:          agent.IsMaster,
		OverridePct:       agent.OverridePct,
		SubAgentsCount:    agent.SubAgentsCount,
	}

	if agent.IsMaster {
		totalOmzet, totalOverride, _ := s.repo.GetMasterAgentNetworkStats(ctx, agent.ID)
		summary.TotalNetworkOmzet = totalOmzet
		summary.TotalOverrideEarned = totalOverride

		subAgents, err := s.repo.ListSubAgents(ctx, agent.ID)
		if err == nil {
			summary.SubAgents = subAgents
			summary.SubAgentsCount = len(subAgents)
		}
	}

	return summary, nil
}

func (s *Service) ListAgentVouchers(ctx context.Context, agentID uuid.UUID, params pagination.Params, channel string) ([]voucher.Voucher, pagination.Meta, error) {
	whereClause := "WHERE v.agent_id = $1"
	var args []interface{}
	args = append(args, agentID)
	argIdx := 2

	if channel != "" {
		whereClause += fmt.Sprintf(" AND v.channel = $%d", argIdx)
		args = append(args, channel)
		argIdx++
	}

	countQ := fmt.Sprintf("SELECT COUNT(*) FROM vouchers v %s", whereClause)
	var total int
	if err := s.repo.DB().QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, err
	}

	listQ := fmt.Sprintf(`
		SELECT 
			v.id, v.code, v.password, v.batch_id, b.batch_number, v.template_id, t.name as template_name,
			t.price, v.customer_id, v.status, v.channel, v.buyer_phone, v.order_id,
			v.promo_code, v.discount_amount, v.agent_commission,
			v.time_limit_seconds, v.data_limit_bytes, v.used_seconds, v.used_bytes,
			v.first_used_at, v.expires_at, v.revoked_at, v.revoked_reason,
			v.is_printed, v.printed_at, v.print_count,
			v.created_at, v.updated_at
		FROM vouchers v
		LEFT JOIN voucher_batches b ON b.id = v.batch_id
		LEFT JOIN voucher_templates t ON t.id = v.template_id
		%s
		ORDER BY v.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)
	rows, err := s.repo.DB().Query(ctx, listQ, args...)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	defer rows.Close()

	vouchers := make([]voucher.Voucher, 0)
	for rows.Next() {
		var v voucher.Voucher
		var price int64
		err := rows.Scan(
			&v.ID, &v.Code, &v.Password, &v.BatchID, &v.BatchNumber, &v.TemplateID, &v.TemplateName,
			&price, &v.CustomerID, &v.Status, &v.Channel, &v.BuyerPhone, &v.OrderID,
			&v.PromoCode, &v.DiscountAmount, &v.AgentCommission,
			&v.TimeLimitSeconds, &v.DataLimitBytes, &v.UsedSeconds, &v.UsedBytes,
			&v.FirstUsedAt, &v.ExpiresAt, &v.RevokedAt, &v.RevokedReason,
			&v.IsPrinted, &v.PrintedAt, &v.PrintCount,
			&v.CreatedAt, &v.UpdatedAt,
		)
		if err != nil {
			return nil, pagination.Meta{}, err
		}
		v.Price = money.Amount(price)

		// Sembunyikan kode voucher & password milik pelanggan online dari agen
		if v.Channel == "ONLINE" {
			v.Code = ""
			v.Password = ""
		}

		vouchers = append(vouchers, v)
	}

	meta := pagination.NewMeta(params, total)
	return vouchers, meta, nil
}

func (s *Service) ListTemplates(ctx context.Context) ([]voucher.Template, error) {
	return s.voucherSvc.ListTemplates(ctx)
}

func (s *Service) MarkVouchersPrinted(ctx context.Context, agentID uuid.UUID, voucherIDs []uuid.UUID) error {
	if len(voucherIDs) == 0 {
		return nil
	}

	const q = `
		UPDATE vouchers
		SET is_printed = true,
		    printed_at = NOW(),
		    print_count = print_count + 1,
		    updated_at = NOW()
		WHERE id = ANY($1) AND agent_id = $2
	`
	_, err := s.repo.DB().Exec(ctx, q, voucherIDs, agentID)
	if err != nil {
		s.logger.Error("failed to mark vouchers as printed", "error", err, "agent_id", agentID)
		return apperrors.Internal(err)
	}
	return nil
}

func (s *Service) InquireInvoice(ctx context.Context, agentID uuid.UUID, search string) (*InvoiceInquiryResult, error) {
	agent, err := s.repo.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if agent == nil {
		return nil, apperrors.NotFound("Agen")
	}

	fee := agent.LoketAdminFee
	if fee <= 0 {
		fee = 2500
	}

	res, err := s.repo.InquireInvoice(ctx, search, fee)
	if err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}
	return res, nil
}

func (s *Service) PayInvoiceByAgent(ctx context.Context, agentID uuid.UUID, req PayInvoiceByAgentRequest) (*PayInvoiceReceipt, error) {
	if req.InvoiceID == uuid.Nil {
		return nil, apperrors.BadRequest("ID tagihan tidak valid")
	}

	receipt, err := s.repo.PayInvoiceWithAgentBalance(ctx, agentID, req.InvoiceID, req.AdminFee)
	if err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	s.logger.Info("invoice paid via agent loket",
		"agent_id", agentID,
		"invoice_id", req.InvoiceID,
		"invoice_number", receipt.InvoiceNumber,
		"amount", receipt.TotalInvoice,
		"admin_fee", receipt.AdminFee,
	)

	return receipt, nil
}

func (s *Service) UpdateAgentSettings(ctx context.Context, agentID uuid.UUID, req UpdateAgentSettingsRequest) (*Agent, error) {
	if err := s.repo.UpdateAgentSettings(ctx, agentID, req.CompanyName, req.Phone, req.LoketAdminFee); err != nil {
		s.logger.Error("failed to update agent settings", "agent_id", agentID, "error", err)
		return nil, apperrors.Internal(err)
	}
	return s.repo.GetAgentByID(ctx, agentID)
}

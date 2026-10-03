package agent

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gigabill/isp/internal/shared/pagination"
	"github.com/gigabill/isp/pkg/money"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) DB() *pgxpool.Pool {
	return r.db
}

// ──────────────────────────────────────────
// Agent CRUD
// ──────────────────────────────────────────

func (r *Repository) CreateAgent(ctx context.Context, a *Agent) error {
	const q = `
		INSERT INTO agents (
			id, user_id, code, name, company_name, phone, email,
			balance, offline_cashback_pct, online_cashback_pct, online_discount_pct,
			bank_name, bank_account_number, bank_account_holder,
			status, notes, address, id_card_number, ktp_url, business_photo_url,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11,
			$12, $13, $14,
			$15, $16, $17, $18, $19, $20,
			$21, $22
		)
	`
	_, err := r.db.Exec(ctx, q,
		a.ID, a.UserID, a.Code, a.Name, a.CompanyName, a.Phone, a.Email,
		a.Balance, a.OfflineCashbackPct, a.OnlineCashbackPct, a.OnlineDiscountPct,
		a.BankName, a.BankAccountNumber, a.BankAccountHolder,
		a.Status, a.Notes, a.Address, a.IDCardNumber, a.KtpURL, a.BusinessPhotoURL,
		a.CreatedAt, a.UpdatedAt,
	)
	return err
}

func (r *Repository) GetAgentByID(ctx context.Context, id uuid.UUID) (*Agent, error) {
	const q = `
		SELECT 
			a.id, a.user_id, u.email as user_email, a.code, a.name, a.company_name, a.phone, a.email,
			a.balance, a.offline_cashback_pct, a.online_cashback_pct, a.online_discount_pct,
			COALESCE(a.loket_admin_fee, 2500),
			a.bank_name, a.bank_account_number, a.bank_account_holder,
			a.status, a.notes, a.address, a.id_card_number, a.ktp_url, a.business_photo_url,
			a.created_at, a.updated_at,
			(SELECT COUNT(*) FROM vouchers v WHERE v.agent_id = a.id) as total_sold,
			(SELECT COALESCE(SUM(amount), 0) FROM agent_balance_mutations m WHERE m.agent_id = a.id AND m.mutation_type = 'VOUCHER_ONLINE_COMMISSION') as total_comm
		FROM agents a
		LEFT JOIN users u ON u.id = a.user_id
		WHERE a.id = $1
	`
	var a Agent
	var balance, totalComm int64
	err := r.db.QueryRow(ctx, q, id).Scan(
		&a.ID, &a.UserID, &a.UserEmail, &a.Code, &a.Name, &a.CompanyName, &a.Phone, &a.Email,
		&balance, &a.OfflineCashbackPct, &a.OnlineCashbackPct, &a.OnlineDiscountPct,
		&a.LoketAdminFee,
		&a.BankName, &a.BankAccountNumber, &a.BankAccountHolder,
		&a.Status, &a.Notes, &a.Address, &a.IDCardNumber, &a.KtpURL, &a.BusinessPhotoURL,
		&a.CreatedAt, &a.UpdatedAt,
		&a.TotalVouchersSold, &totalComm,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get agent by id: %w", err)
	}
	a.Balance = money.Amount(balance)
	a.TotalCommission = money.Amount(totalComm)
	return &a, nil
}

func (r *Repository) GetAgentByUserID(ctx context.Context, userID uuid.UUID) (*Agent, error) {
	const q = `
		SELECT 
			a.id, a.user_id, u.email as user_email, a.code, a.name, a.company_name, a.phone, a.email,
			a.balance, a.offline_cashback_pct, a.online_cashback_pct, a.online_discount_pct,
			COALESCE(a.loket_admin_fee, 2500),
			a.bank_name, a.bank_account_number, a.bank_account_holder,
			a.status, a.notes, a.address, a.id_card_number, a.ktp_url, a.business_photo_url,
			a.created_at, a.updated_at,
			(SELECT COUNT(*) FROM vouchers v WHERE v.agent_id = a.id) as total_sold,
			(SELECT COALESCE(SUM(amount), 0) FROM agent_balance_mutations m WHERE m.agent_id = a.id AND m.mutation_type = 'VOUCHER_ONLINE_COMMISSION') as total_comm
		FROM agents a
		LEFT JOIN users u ON u.id = a.user_id
		WHERE a.user_id = $1
	`
	var a Agent
	var balance, totalComm int64
	err := r.db.QueryRow(ctx, q, userID).Scan(
		&a.ID, &a.UserID, &a.UserEmail, &a.Code, &a.Name, &a.CompanyName, &a.Phone, &a.Email,
		&balance, &a.OfflineCashbackPct, &a.OnlineCashbackPct, &a.OnlineDiscountPct,
		&a.LoketAdminFee,
		&a.BankName, &a.BankAccountNumber, &a.BankAccountHolder,
		&a.Status, &a.Notes, &a.Address, &a.IDCardNumber, &a.KtpURL, &a.BusinessPhotoURL,
		&a.CreatedAt, &a.UpdatedAt,
		&a.TotalVouchersSold, &totalComm,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get agent by user id: %w", err)
	}
	a.Balance = money.Amount(balance)
	a.TotalCommission = money.Amount(totalComm)
	return &a, nil
}

func (r *Repository) GetAgentByCode(ctx context.Context, code string) (*Agent, error) {
	const q = `SELECT id FROM agents WHERE LOWER(code) = LOWER($1)`
	var id uuid.UUID
	err := r.db.QueryRow(ctx, q, code).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return r.GetAgentByID(ctx, id)
}

func (r *Repository) ListAgents(ctx context.Context, params pagination.Params, search, status string) ([]Agent, pagination.Meta, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(a.name ILIKE $%d OR a.code ILIKE $%d OR a.phone ILIKE $%d OR a.company_name ILIKE $%d)", argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if status != "" {
		conditions = append(conditions, fmt.Sprintf("a.status = $%d", argIdx))
		args = append(args, status)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQ := fmt.Sprintf("SELECT COUNT(*) FROM agents a %s", whereClause)
	var total int
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, fmt.Errorf("count agents: %w", err)
	}

	listQ := fmt.Sprintf(`
		SELECT 
			a.id, a.user_id, u.email as user_email, a.code, a.name, a.company_name, a.phone, a.email,
			a.balance, a.offline_cashback_pct, a.online_cashback_pct, a.online_discount_pct,
			COALESCE(a.loket_admin_fee, 2500),
			a.bank_name, a.bank_account_number, a.bank_account_holder,
			a.status, a.notes, a.address, a.id_card_number, a.ktp_url, a.business_photo_url,
			a.created_at, a.updated_at,
			(SELECT COUNT(*) FROM vouchers v WHERE v.agent_id = a.id) as total_sold,
			(SELECT COALESCE(SUM(amount), 0) FROM agent_balance_mutations m WHERE m.agent_id = a.id AND m.mutation_type = 'VOUCHER_ONLINE_COMMISSION') as total_comm
		FROM agents a
		LEFT JOIN users u ON u.id = a.user_id
		%s
		ORDER BY a.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)
	rows, err := r.db.Query(ctx, listQ, args...)
	if err != nil {
		return nil, pagination.Meta{}, fmt.Errorf("list agents: %w", err)
	}
	defer rows.Close()

	agents := make([]Agent, 0)
	for rows.Next() {
		var a Agent
		var balance, totalComm int64
		err := rows.Scan(
			&a.ID, &a.UserID, &a.UserEmail, &a.Code, &a.Name, &a.CompanyName, &a.Phone, &a.Email,
			&balance, &a.OfflineCashbackPct, &a.OnlineCashbackPct, &a.OnlineDiscountPct,
			&a.LoketAdminFee,
			&a.BankName, &a.BankAccountNumber, &a.BankAccountHolder,
			&a.Status, &a.Notes, &a.Address, &a.IDCardNumber, &a.KtpURL, &a.BusinessPhotoURL,
			&a.CreatedAt, &a.UpdatedAt,
			&a.TotalVouchersSold, &totalComm,
		)
		if err != nil {
			return nil, pagination.Meta{}, fmt.Errorf("scan agent: %w", err)
		}
		a.Balance = money.Amount(balance)
		a.TotalCommission = money.Amount(totalComm)
		agents = append(agents, a)
	}

	meta := pagination.NewMeta(params, total)
	return agents, meta, nil
}

func (r *Repository) UpdateAgent(ctx context.Context, a *Agent) error {
	const q = `
		UPDATE agents SET
			name = $1, company_name = $2, phone = $3, email = $4,
			offline_cashback_pct = $5, online_cashback_pct = $6, online_discount_pct = $7,
			bank_name = $8, bank_account_number = $9, bank_account_holder = $10,
			status = $11, notes = $12, address = $13, id_card_number = $14,
			ktp_url = $15, business_photo_url = $16, updated_at = NOW()
		WHERE id = $17
	`
	_, err := r.db.Exec(ctx, q,
		a.Name, a.CompanyName, a.Phone, a.Email,
		a.OfflineCashbackPct, a.OnlineCashbackPct, a.OnlineDiscountPct,
		a.BankName, a.BankAccountNumber, a.BankAccountHolder,
		a.Status, a.Notes, a.Address, a.IDCardNumber,
		a.KtpURL, a.BusinessPhotoURL, a.ID,
	)
	return err
}

func (r *Repository) SetAgentStatus(ctx context.Context, id uuid.UUID, status AgentStatus, notes *string) error {
	const q = `
		UPDATE agents SET
			status = $1,
			notes = COALESCE($2, notes),
			updated_at = NOW()
		WHERE id = $3
	`
	_, err := r.db.Exec(ctx, q, status, notes, id)
	return err
}

// ──────────────────────────────────────────
// Balance Ledger & Mutations
// ──────────────────────────────────────────

func (r *Repository) CreditBalance(ctx context.Context, agentID uuid.UUID, amount int64, mutationType MutationType, refID, desc *string) (*AgentMutation, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var curBalance int64
	err = tx.QueryRow(ctx, `SELECT balance FROM agents WHERE id = $1 FOR UPDATE`, agentID).Scan(&curBalance)
	if err != nil {
		return nil, fmt.Errorf("agent not found or locked: %w", err)
	}

	newBalance := curBalance + amount
	_, err = tx.Exec(ctx, `UPDATE agents SET balance = $1, updated_at = NOW() WHERE id = $2`, newBalance, agentID)
	if err != nil {
		return nil, fmt.Errorf("update agent balance: %w", err)
	}

	mutID := uuid.New()
	now := time.Now()
	_, err = tx.Exec(ctx, `
		INSERT INTO agent_balance_mutations (
			id, agent_id, mutation_type, amount, balance_before, balance_after, reference_id, description, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, mutID, agentID, string(mutationType), amount, curBalance, newBalance, refID, desc, now)
	if err != nil {
		return nil, fmt.Errorf("record balance mutation: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &AgentMutation{
		ID:            mutID,
		AgentID:       agentID,
		MutationType:  mutationType,
		Amount:        money.Amount(amount),
		BalanceBefore: money.Amount(curBalance),
		BalanceAfter:  money.Amount(newBalance),
		ReferenceID:   refID,
		Description:   desc,
		CreatedAt:     now,
	}, nil
}

func (r *Repository) DebitBalance(ctx context.Context, agentID uuid.UUID, amount int64, mutationType MutationType, refID, desc *string) (*AgentMutation, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var curBalance int64
	err = tx.QueryRow(ctx, `SELECT balance FROM agents WHERE id = $1 FOR UPDATE`, agentID).Scan(&curBalance)
	if err != nil {
		return nil, fmt.Errorf("agent not found or locked: %w", err)
	}

	if curBalance < amount {
		return nil, fmt.Errorf("saldo tidak mencukupi (Saldo: Rp %d, Dibutuhkan: Rp %d)", curBalance, amount)
	}

	newBalance := curBalance - amount
	_, err = tx.Exec(ctx, `UPDATE agents SET balance = $1, updated_at = NOW() WHERE id = $2`, newBalance, agentID)
	if err != nil {
		return nil, fmt.Errorf("update agent balance: %w", err)
	}

	mutID := uuid.New()
	now := time.Now()
	_, err = tx.Exec(ctx, `
		INSERT INTO agent_balance_mutations (
			id, agent_id, mutation_type, amount, balance_before, balance_after, reference_id, description, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, mutID, agentID, string(mutationType), -amount, curBalance, newBalance, refID, desc, now)
	if err != nil {
		return nil, fmt.Errorf("record balance mutation: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &AgentMutation{
		ID:            mutID,
		AgentID:       agentID,
		MutationType:  mutationType,
		Amount:        money.Amount(-amount),
		BalanceBefore: money.Amount(curBalance),
		BalanceAfter:  money.Amount(newBalance),
		ReferenceID:   refID,
		Description:   desc,
		CreatedAt:     now,
	}, nil
}

func (r *Repository) ListMutations(ctx context.Context, agentID *uuid.UUID, mutationType *string, params pagination.Params) ([]AgentMutation, pagination.Meta, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	if agentID != nil {
		conditions = append(conditions, fmt.Sprintf("m.agent_id = $%d", argIdx))
		args = append(args, *agentID)
		argIdx++
	}

	if mutationType != nil && *mutationType != "" {
		conditions = append(conditions, fmt.Sprintf("m.mutation_type = $%d", argIdx))
		args = append(args, *mutationType)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQ := fmt.Sprintf("SELECT COUNT(*) FROM agent_balance_mutations m %s", whereClause)
	var total int
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, fmt.Errorf("count mutations: %w", err)
	}

	listQ := fmt.Sprintf(`
		SELECT m.id, m.agent_id, a.name as agent_name, a.code as agent_code, m.mutation_type, m.amount, m.balance_before, m.balance_after, m.reference_id, m.description, m.created_at
		FROM agent_balance_mutations m
		LEFT JOIN agents a ON a.id = m.agent_id
		%s
		ORDER BY m.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)
	rows, err := r.db.Query(ctx, listQ, args...)
	if err != nil {
		return nil, pagination.Meta{}, fmt.Errorf("list mutations: %w", err)
	}
	defer rows.Close()

	mutations := make([]AgentMutation, 0)
	for rows.Next() {
		var m AgentMutation
		var amount, before, after int64
		err := rows.Scan(
			&m.ID, &m.AgentID, &m.AgentName, &m.AgentCode, &m.MutationType, &amount, &before, &after, &m.ReferenceID, &m.Description, &m.CreatedAt,
		)
		if err != nil {
			return nil, pagination.Meta{}, err
		}
		m.Amount = money.Amount(amount)
		m.BalanceBefore = money.Amount(before)
		m.BalanceAfter = money.Amount(after)
		mutations = append(mutations, m)
	}

	meta := pagination.NewMeta(params, total)
	return mutations, meta, nil
}

// ──────────────────────────────────────────
// Top-Up Requests
// ──────────────────────────────────────────

func (r *Repository) CreateTopupRequest(ctx context.Context, req *TopupRequest) error {
	const q = `
		INSERT INTO agent_topup_requests (
			id, request_number, agent_id, amount, bank_name, bank_account_number, bank_account_holder,
			proof_url, status, notes, requested_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
	`
	_, err := r.db.Exec(ctx, q,
		req.ID, req.RequestNumber, req.AgentID, req.Amount,
		req.BankName, req.BankAccountNumber, req.BankAccountHolder,
		req.ProofURL, req.Status, req.Notes, req.RequestedAt,
	)
	return err
}

func (r *Repository) GetTopupRequestByID(ctx context.Context, id uuid.UUID) (*TopupRequest, error) {
	const q = `
		SELECT 
			tr.id, tr.request_number, tr.agent_id, a.name as agent_name, a.code as agent_code,
			tr.amount, tr.bank_name, tr.bank_account_number, tr.bank_account_holder,
			tr.proof_url, tr.status, tr.notes, tr.admin_notes,
			tr.requested_at, tr.processed_at, tr.processed_by
		FROM agent_topup_requests tr
		JOIN agents a ON a.id = tr.agent_id
		WHERE tr.id = $1
	`
	var t TopupRequest
	var amount int64
	err := r.db.QueryRow(ctx, q, id).Scan(
		&t.ID, &t.RequestNumber, &t.AgentID, &t.AgentName, &t.AgentCode,
		&amount, &t.BankName, &t.BankAccountNumber, &t.BankAccountHolder,
		&t.ProofURL, &t.Status, &t.Notes, &t.AdminNotes,
		&t.RequestedAt, &t.ProcessedAt, &t.ProcessedBy,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	t.Amount = money.Amount(amount)
	return &t, nil
}

func (r *Repository) ListTopupRequests(ctx context.Context, params pagination.Params, agentID *uuid.UUID, status string) ([]TopupRequest, pagination.Meta, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	if agentID != nil {
		conditions = append(conditions, fmt.Sprintf("tr.agent_id = $%d", argIdx))
		args = append(args, *agentID)
		argIdx++
	}
	if status != "" {
		conditions = append(conditions, fmt.Sprintf("tr.status = $%d", argIdx))
		args = append(args, status)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQ := fmt.Sprintf("SELECT COUNT(*) FROM agent_topup_requests tr %s", whereClause)
	var total int
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, fmt.Errorf("count topup requests: %w", err)
	}

	listQ := fmt.Sprintf(`
		SELECT 
			tr.id, tr.request_number, tr.agent_id, a.name as agent_name, a.code as agent_code,
			tr.amount, tr.bank_name, tr.bank_account_number, tr.bank_account_holder,
			tr.proof_url, tr.status, tr.notes, tr.admin_notes,
			tr.requested_at, tr.processed_at, tr.processed_by
		FROM agent_topup_requests tr
		JOIN agents a ON a.id = tr.agent_id
		%s
		ORDER BY tr.requested_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)
	rows, err := r.db.Query(ctx, listQ, args...)
	if err != nil {
		return nil, pagination.Meta{}, fmt.Errorf("list topup requests: %w", err)
	}
	defer rows.Close()

	items := make([]TopupRequest, 0)
	for rows.Next() {
		var t TopupRequest
		var amount int64
		err := rows.Scan(
			&t.ID, &t.RequestNumber, &t.AgentID, &t.AgentName, &t.AgentCode,
			&amount, &t.BankName, &t.BankAccountNumber, &t.BankAccountHolder,
			&t.ProofURL, &t.Status, &t.Notes, &t.AdminNotes,
			&t.RequestedAt, &t.ProcessedAt, &t.ProcessedBy,
		)
		if err != nil {
			return nil, pagination.Meta{}, err
		}
		t.Amount = money.Amount(amount)
		items = append(items, t)
	}

	meta := pagination.NewMeta(params, total)
	return items, meta, nil
}

func (r *Repository) UpdateTopupRequestStatus(ctx context.Context, id uuid.UUID, status TopupStatus, adminNotes *string, processedBy *uuid.UUID) error {
	const q = `
		UPDATE agent_topup_requests SET
			status = $1, admin_notes = $2, processed_by = $3, processed_at = NOW()
		WHERE id = $4
	`
	_, err := r.db.Exec(ctx, q, string(status), adminNotes, processedBy, id)
	return err
}

// ──────────────────────────────────────────
// Daily Promo Code (6-digit alphanumeric)
// ──────────────────────────────────────────

const promoCharset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ" // exclude 0, 1, O, I for clarity

func generateRandom6PromoCode() string {
	b := make([]byte, 6)
	charsetLen := big.NewInt(int64(len(promoCharset)))
	for i := 0; i < 6; i++ {
		idx, _ := rand.Int(rand.Reader, charsetLen)
		b[i] = promoCharset[idx.Int64()]
	}
	return string(b)
}

func (r *Repository) GetOrCreateDailyPromo(ctx context.Context, agentID uuid.UUID) (*DailyPromo, error) {
	todayStr := time.Now().Format("2006-01-02")
	const getQ = `
		SELECT id, agent_id, promo_code, valid_date::text, created_at
		FROM agent_daily_promos
		WHERE agent_id = $1 AND valid_date = CURRENT_DATE
	`
	var dp DailyPromo
	err := r.db.QueryRow(ctx, getQ, agentID).Scan(
		&dp.ID, &dp.AgentID, &dp.PromoCode, &dp.ValidDate, &dp.CreatedAt,
	)
	if err == nil {
		return &dp, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("query daily promo: %w", err)
	}

	// Buat kode promo 6 karakter acak baru untuk hari ini (retry on collision)
	for attempts := 0; attempts < 10; attempts++ {
		newCode := generateRandom6PromoCode()
		newID := uuid.New()
		const insertQ = `
			INSERT INTO agent_daily_promos (id, agent_id, promo_code, valid_date, created_at)
			VALUES ($1, $2, $3, CURRENT_DATE, NOW())
			ON CONFLICT (agent_id, valid_date) DO NOTHING
		`
		res, err := r.db.Exec(ctx, insertQ, newID, agentID, newCode)
		if err == nil && res.RowsAffected() > 0 {
			return &DailyPromo{
				ID:        newID,
				AgentID:   agentID,
				PromoCode: newCode,
				ValidDate: todayStr,
				CreatedAt: time.Now(),
			}, nil
		}

		// Conflict check: if another request inserted it concurrently, fetch it
		var concurrentPromo DailyPromo
		if scanErr := r.db.QueryRow(ctx, getQ, agentID).Scan(
			&concurrentPromo.ID, &concurrentPromo.AgentID, &concurrentPromo.PromoCode, &concurrentPromo.ValidDate, &concurrentPromo.CreatedAt,
		); scanErr == nil {
			return &concurrentPromo, nil
		}
	}

	return nil, fmt.Errorf("failed to generate unique daily promo code")
}

func (r *Repository) ValidatePromoCode(ctx context.Context, promoCode string) (*ValidatePromoResponse, *Agent, error) {
	cleaned := strings.ToUpper(strings.TrimSpace(promoCode))
	const q = `
		SELECT 
			a.id, a.code, a.name, a.online_discount_pct, a.online_cashback_pct, a.status
		FROM agents a
		LEFT JOIN agent_daily_promos p ON p.agent_id = a.id AND p.valid_date = CURRENT_DATE
		WHERE UPPER(a.code) = $1 OR UPPER(p.promo_code) = $1
		ORDER BY (CASE WHEN UPPER(p.promo_code) = $1 THEN 1 ELSE 2 END)
		LIMIT 1
	`
	var (
		agentID                                     uuid.UUID
		agentCode, agentName, status                string
		onlineDiscountPct, onlineCashbackPct        float64
	)
	err := r.db.QueryRow(ctx, q, cleaned).Scan(
		&agentID, &agentCode, &agentName, &onlineDiscountPct, &onlineCashbackPct, &status,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &ValidatePromoResponse{
				Valid:   false,
				Message: "Kode promo tidak ditemukan atau sudah kedaluwarsa hari ini",
			}, nil, nil
		}
		return nil, nil, err
	}

	if status != string(AgentStatusActive) {
		return &ValidatePromoResponse{
			Valid:   false,
			Message: "Agen pemilik kode promo ini sedang tidak aktif",
		}, nil, nil
	}

	return &ValidatePromoResponse{
		Valid:             true,
		AgentID:           agentID.String(),
		AgentName:         agentName,
		PromoCode:         cleaned,
		OnlineDiscountPct: onlineDiscountPct,
		Message:           fmt.Sprintf("Kode promo agen valid! Hemat %.1f%% untuk pembelian Anda.", onlineDiscountPct),
	}, &Agent{
		ID:                agentID,
		Code:              agentCode,
		Name:              agentName,
		OnlineDiscountPct: onlineDiscountPct,
		OnlineCashbackPct: onlineCashbackPct,
	}, nil
}

func (r *Repository) UpdateAgentSettings(ctx context.Context, agentID uuid.UUID, companyName, phone *string, loketAdminFee *int64) error {
	var sets []string
	var args []any
	argIdx := 1

	if companyName != nil {
		sets = append(sets, fmt.Sprintf("company_name = $%d", argIdx))
		args = append(args, *companyName)
		argIdx++
	}
	if phone != nil && *phone != "" {
		sets = append(sets, fmt.Sprintf("phone = $%d", argIdx))
		args = append(args, *phone)
		argIdx++
	}
	if loketAdminFee != nil && *loketAdminFee >= 0 {
		sets = append(sets, fmt.Sprintf("loket_admin_fee = $%d", argIdx))
		args = append(args, *loketAdminFee)
		argIdx++
	}

	if len(sets) == 0 {
		return nil
	}

	sets = append(sets, "updated_at = NOW()")
	q := fmt.Sprintf("UPDATE agents SET %s WHERE id = $%d", strings.Join(sets, ", "), argIdx)
	args = append(args, agentID)

	_, err := r.db.Exec(ctx, q, args...)
	return err
}

func (r *Repository) InquireInvoice(ctx context.Context, search string, defaultAdminFee int64) (*InvoiceInquiryResult, error) {
	trimmed := strings.TrimSpace(search)
	if trimmed == "" {
		return nil, errors.New("nomor tagihan atau ID pelanggan wajib diisi")
	}

	phoneVariant1 := trimmed
	phoneVariant2 := trimmed
	if strings.HasPrefix(trimmed, "08") {
		phoneVariant1 = "62" + trimmed[1:]
		phoneVariant2 = "+62" + trimmed[1:]
	} else if strings.HasPrefix(trimmed, "628") {
		phoneVariant1 = "0" + trimmed[2:]
		phoneVariant2 = "+" + trimmed
	} else if strings.HasPrefix(trimmed, "+628") {
		phoneVariant1 = "0" + trimmed[3:]
		phoneVariant2 = trimmed[1:]
	}

	// 1. Locate the customer
	const custQ = `
		SELECT
			c.id,
			c.customer_number,
			c.full_name,
			c.phone,
			COALESCE(c.address, ''),
			COALESCE(p.name, 'Layanan Internet Fiber')
		FROM customers c
		LEFT JOIN subscriptions s ON s.customer_id = c.id
		LEFT JOIN plans p ON p.id = s.plan_id
		LEFT JOIN invoices i ON i.customer_id = c.id
		WHERE (
			LOWER(i.invoice_number) = LOWER($1)
			OR LOWER(c.customer_number) = LOWER($1)
			OR c.phone = $1
			OR c.phone = $2
			OR c.phone = $3
		)
		ORDER BY c.created_at DESC
		LIMIT 1
	`
	var res InvoiceInquiryResult
	err := r.db.QueryRow(ctx, custQ, trimmed, phoneVariant1, phoneVariant2).Scan(
		&res.CustomerID,
		&res.CustomerCode,
		&res.CustomerName,
		&res.CustomerPhone,
		&res.CustomerAddress,
		&res.PlanName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("tagihan atau pelanggan tidak ditemukan dengan nomor/ID tersebut")
		}
		return nil, fmt.Errorf("inquire customer: %w", err)
	}

	res.DefaultAdminFee = defaultAdminFee
	res.AdminFee = defaultAdminFee
	res.Invoices = make([]InvoiceInquiryItem, 0)

	// Check if search was a specific invoice number
	isSpecificInvoice := strings.HasPrefix(strings.ToUpper(trimmed), "INV-")
	if isSpecificInvoice {
		const invQ = `
			SELECT
				i.id,
				i.invoice_number,
				TO_CHAR(i.issue_date, 'YYYY-MM-DD'),
				TO_CHAR(i.due_date, 'YYYY-MM-DD'),
				i.subtotal,
				i.tax_amount,
				i.total_amount,
				i.amount_paid,
				i.amount_due,
				i.status
			FROM invoices i
			WHERE LOWER(i.invoice_number) = LOWER($1) AND i.status != 'VOID'
			LIMIT 1
		`
		var invItem InvoiceInquiryItem
		err := r.db.QueryRow(ctx, invQ, trimmed).Scan(
			&invItem.InvoiceID,
			&invItem.InvoiceNumber,
			&invItem.IssueDate,
			&invItem.DueDate,
			&invItem.Subtotal,
			&invItem.TaxAmount,
			&invItem.TotalAmount,
			&invItem.AmountPaid,
			&invItem.AmountDue,
			&invItem.Status,
		)
		if err == nil {
			if t, err := time.Parse("2006-01-02", invItem.IssueDate); err == nil {
				invItem.BillingMonth = t.Format("01/2006")
			}
			if t, err := time.Parse("2006-01-02", invItem.DueDate); err == nil {
				invItem.IsOverdue = time.Now().After(t) && (invItem.Status == "ISSUED" || invItem.Status == "UNPAID" || invItem.Status == "OVERDUE" || invItem.Status == "PARTIALLY_PAID")
			}
			res.InvoiceID = invItem.InvoiceID
			res.InvoiceNumber = invItem.InvoiceNumber
			res.BillingMonth = invItem.BillingMonth
			res.IssueDate = invItem.IssueDate
			res.DueDate = invItem.DueDate
			res.Subtotal = invItem.Subtotal
			res.TaxAmount = invItem.TaxAmount
			res.TotalAmount = invItem.TotalAmount
			res.AmountPaid = invItem.AmountPaid
			res.AmountDue = invItem.AmountDue
			res.Status = invItem.Status
			res.IsOverdue = invItem.IsOverdue

			if invItem.Status == "PAID" {
				res.AmountDue = 0
				res.TotalInvoice = res.TotalAmount
				res.TotalCustomerPay = 0
				res.UnpaidCount = 0
				res.TotalUnpaidAmount = 0
			} else {
				if res.AmountDue <= 0 {
					res.AmountDue = res.TotalAmount
				}
				res.TotalInvoice = res.AmountDue
				res.TotalCustomerPay = res.TotalInvoice + res.AdminFee
				res.UnpaidCount = 1
				res.TotalUnpaidAmount = res.AmountDue
				res.Invoices = append(res.Invoices, invItem)
			}
			return &res, nil
		}
	}

	// 2. Query ALL unpaid invoices for this customer
	const unpaidQ = `
		SELECT
			i.id,
			i.invoice_number,
			TO_CHAR(i.issue_date, 'YYYY-MM-DD'),
			TO_CHAR(i.due_date, 'YYYY-MM-DD'),
			i.subtotal,
			i.tax_amount,
			i.total_amount,
			i.amount_paid,
			i.amount_due,
			i.status
		FROM invoices i
		WHERE i.customer_id = $1
		  AND i.status IN ('ISSUED', 'UNPAID', 'OVERDUE', 'PARTIALLY_PAID')
		  AND i.amount_due > 0
		ORDER BY i.due_date ASC, i.created_at ASC
	`
	rows, err := r.db.Query(ctx, unpaidQ, res.CustomerID)
	if err != nil {
		return nil, fmt.Errorf("query unpaid invoices: %w", err)
	}
	defer rows.Close()

	var totalUnpaid int64
	for rows.Next() {
		var item InvoiceInquiryItem
		if err := rows.Scan(
			&item.InvoiceID,
			&item.InvoiceNumber,
			&item.IssueDate,
			&item.DueDate,
			&item.Subtotal,
			&item.TaxAmount,
			&item.TotalAmount,
			&item.AmountPaid,
			&item.AmountDue,
			&item.Status,
		); err != nil {
			return nil, fmt.Errorf("scan unpaid invoice: %w", err)
		}
		if t, err := time.Parse("2006-01-02", item.IssueDate); err == nil {
			item.BillingMonth = t.Format("01/2006")
		}
		if t, err := time.Parse("2006-01-02", item.DueDate); err == nil {
			item.IsOverdue = time.Now().After(t) && (item.Status == "ISSUED" || item.Status == "UNPAID" || item.Status == "OVERDUE" || item.Status == "PARTIALLY_PAID")
		}
		if item.AmountDue <= 0 {
			item.AmountDue = item.TotalAmount
		}
		totalUnpaid += item.AmountDue
		res.Invoices = append(res.Invoices, item)
	}

	if len(res.Invoices) > 0 {
		// Oldest unpaid bill is primary
		primary := res.Invoices[0]
		res.InvoiceID = primary.InvoiceID
		res.InvoiceNumber = primary.InvoiceNumber
		res.BillingMonth = primary.BillingMonth
		res.IssueDate = primary.IssueDate
		res.DueDate = primary.DueDate
		res.Subtotal = primary.Subtotal
		res.TaxAmount = primary.TaxAmount
		res.TotalAmount = primary.TotalAmount
		res.AmountPaid = primary.AmountPaid
		res.AmountDue = primary.AmountDue
		res.Status = primary.Status
		res.IsOverdue = primary.IsOverdue
		res.TotalInvoice = primary.AmountDue
		res.TotalCustomerPay = res.TotalInvoice + res.AdminFee
		res.UnpaidCount = len(res.Invoices)
		res.TotalUnpaidAmount = totalUnpaid
		return &res, nil
	}

	// 3. If NO unpaid invoices, fetch the latest invoice as reference (Status = PAID)
	const lastInvQ = `
		SELECT
			i.id,
			i.invoice_number,
			TO_CHAR(i.issue_date, 'YYYY-MM-DD'),
			TO_CHAR(i.due_date, 'YYYY-MM-DD'),
			i.subtotal,
			i.tax_amount,
			i.total_amount,
			i.amount_paid,
			i.amount_due,
			i.status
		FROM invoices i
		WHERE i.customer_id = $1 AND i.status != 'VOID'
		ORDER BY i.created_at DESC
		LIMIT 1
	`
	var lastStatus string
	err = r.db.QueryRow(ctx, lastInvQ, res.CustomerID).Scan(
		&res.InvoiceID,
		&res.InvoiceNumber,
		&res.IssueDate,
		&res.DueDate,
		&res.Subtotal,
		&res.TaxAmount,
		&res.TotalAmount,
		&res.AmountPaid,
		&res.AmountDue,
		&lastStatus,
	)
	if err == nil {
		res.Status = lastStatus
		if t, err := time.Parse("2006-01-02", res.IssueDate); err == nil {
			res.BillingMonth = t.Format("01/2006")
		}
	} else {
		// No invoices found at all
		res.Status = "PAID"
	}

	res.AmountDue = 0
	res.TotalInvoice = 0
	res.TotalCustomerPay = 0
	res.IsOverdue = false
	res.UnpaidCount = 0
	res.TotalUnpaidAmount = 0
	return &res, nil
}

func (r *Repository) PayInvoiceWithAgentBalance(ctx context.Context, agentID uuid.UUID, invoiceID uuid.UUID, adminFee int64) (*PayInvoiceReceipt, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Lock & fetch agent
	const agentQ = `
		SELECT balance, code, name, COALESCE(loket_admin_fee, 2500), status
		FROM agents
		WHERE id = $1
		FOR UPDATE
	`
	var agentBalance int64
	var agentCode, agentName, agentStatus string
	var savedFee int64
	if err := tx.QueryRow(ctx, agentQ, agentID).Scan(&agentBalance, &agentCode, &agentName, &savedFee, &agentStatus); err != nil {
		return nil, fmt.Errorf("fetch agent: %w", err)
	}
	if agentStatus != "ACTIVE" {
		return nil, errors.New("akun agen Anda sedang dinonaktifkan")
	}

	// 2. Lock & fetch invoice
	const invQ = `
		SELECT
			i.id, i.invoice_number, i.customer_id, c.customer_number, c.full_name, c.phone,
			COALESCE(p.name, 'Layanan Internet Fiber'), i.subtotal, i.tax_amount,
			i.total_amount, i.amount_due, i.status, i.subscription_id
		FROM invoices i
		JOIN customers c ON c.id = i.customer_id
		LEFT JOIN subscriptions s ON s.id = i.subscription_id
		LEFT JOIN plans p ON p.id = s.plan_id
		WHERE i.id = $1
		FOR UPDATE OF i
	`
	var (
		invNum, custCode, custName, custPhone, planName, invStatus string
		custID                                                     uuid.UUID
		subtotal, taxAmount, totalAmount, amountDue                int64
		subID                                                      *uuid.UUID
	)
	if err := tx.QueryRow(ctx, invQ, invoiceID).Scan(
		&invoiceID, &invNum, &custID, &custCode, &custName, &custPhone,
		&planName, &subtotal, &taxAmount, &totalAmount, &amountDue, &invStatus, &subID,
	); err != nil {
		return nil, fmt.Errorf("fetch invoice: %w", err)
	}

	if invStatus == "PAID" {
		return nil, errors.New("tagihan ini sudah lunas sebelumnya")
	}
	if invStatus == "VOID" {
		return nil, errors.New("tagihan ini telah dibatalkan (VOID)")
	}
	if amountDue <= 0 {
		amountDue = totalAmount
	}

	if agentBalance < amountDue {
		return nil, fmt.Errorf("saldo dompet agen tidak mencukupi. Tagihan Rp %d, saldo Anda Rp %d. Silakan isi saldo terlebih dahulu.", amountDue, agentBalance)
	}

	// 3. Debit agent balance
	newBalance := agentBalance - amountDue
	const updateAgentQ = `UPDATE agents SET balance = $1, updated_at = NOW() WHERE id = $2`
	if _, err := tx.Exec(ctx, updateAgentQ, newBalance, agentID); err != nil {
		return nil, fmt.Errorf("debit agent balance: %w", err)
	}

	// 4. Record agent mutation
	mutDesc := fmt.Sprintf("Pelunasan tagihan %s (Pelanggan: %s / %s) via Loket Agen", invNum, custName, custCode)
	const mutQ = `
		INSERT INTO agent_balance_mutations (
			id, agent_id, mutation_type, amount, balance_before, balance_after,
			reference_id, description, created_at
		) VALUES (
			gen_random_uuid(), $1, 'INVOICE_PAYMENT_AGENT', $2, $3, $4,
			$5, $6, NOW()
		)
	`
	if _, err := tx.Exec(ctx, mutQ, agentID, -amountDue, agentBalance, newBalance, invNum, mutDesc); err != nil {
		return nil, fmt.Errorf("insert mutation: %w", err)
	}

	// 5. Update invoice to PAID
	const updateInvQ = `
		UPDATE invoices SET
			status = 'PAID',
			amount_paid = total_amount,
			amount_due = 0,
			updated_at = NOW()
		WHERE id = $1
	`
	if _, err := tx.Exec(ctx, updateInvQ, invoiceID); err != nil {
		return nil, fmt.Errorf("mark invoice paid: %w", err)
	}

	// 6. Record payment row
	payNotes := fmt.Sprintf("Dibayar tunai via Loket Agen %s (%s)", agentName, agentCode)
	payNum := fmt.Sprintf("PAY-%s-%04d", time.Now().Format("060102"), time.Now().Unix()%10000)
	const insertPayQ = `
		INSERT INTO payments (
			id, payment_number, customer_id, invoice_id, payment_method,
			status, amount, paid_at, notes, created_at, updated_at
		) VALUES (
			gen_random_uuid(), $1, $2, $3, 'MANUAL',
			'COMPLETED', $4, NOW(), $5, NOW(), NOW()
		)
	`
	if _, err := tx.Exec(ctx, insertPayQ, payNum, custID, invoiceID, amountDue, payNotes); err != nil {
		return nil, fmt.Errorf("record payment: %w", err)
	}

	// 7. Reactivate subscription & access account if linked
	if subID != nil {
		const subQ = `UPDATE subscriptions SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1`
		_, _ = tx.Exec(ctx, subQ, *subID)
		const accQ = `UPDATE access_accounts SET status = 'ACTIVE', updated_at = NOW() WHERE subscription_id = $1`
		_, _ = tx.Exec(ctx, accQ, *subID)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	now := time.Now()
	receiptNum := fmt.Sprintf("STR-%s-%04d", now.Format("20060102"), now.Unix()%10000)
	if adminFee <= 0 {
		adminFee = savedFee
	}

	return &PayInvoiceReceipt{
		ReceiptNumber:     receiptNum,
		InvoiceID:         invoiceID,
		InvoiceNumber:     invNum,
		CustomerCode:      custCode,
		CustomerName:      custName,
		CustomerPhone:     custPhone,
		PlanName:          planName,
		PaidAt:            now,
		Subtotal:          subtotal,
		TaxAmount:         taxAmount,
		TotalInvoice:      totalAmount,
		AdminFee:          adminFee,
		TotalCustomerPay:  amountDue + adminFee,
		AgentCode:         agentCode,
		AgentName:         agentName,
		AgentBalanceAfter: money.Amount(newBalance),
	}, nil
}

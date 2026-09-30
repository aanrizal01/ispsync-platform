package partner

import (
	"context"
	"errors"
	"fmt"
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

func (r *Repository) Create(ctx context.Context, p *Partner) error {
	const q = `
		INSERT INTO partners (
			id, code, name, company_name, contact_person, phone, email,
			share_type, partner_share_bps, isp_share_bps, flat_fee_amount,
			balance, bank_name, bank_account_number, bank_account_holder,
			status, notes, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
		)
	`
	_, err := r.db.Exec(ctx, q,
		p.ID, p.Code, p.Name, p.CompanyName, p.ContactPerson, p.Phone, p.Email,
		p.ShareType, p.PartnerShareBps, p.ISPShareBps, p.FlatFeeAmount.Int64(),
		p.Balance.Int64(), p.BankName, p.BankAccountNumber, p.BankAccountHolder,
		p.Status, p.Notes, p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Partner, error) {
	const q = `
		SELECT p.id, p.code, p.name, p.company_name,
		       COALESCE(p.contact_person, '') as contact_person,
		       COALESCE(p.phone, '') as phone,
		       p.email,
		       COALESCE(p.share_type, 'PERCENTAGE') as share_type,
		       p.partner_share_bps, p.isp_share_bps, p.flat_fee_amount,
		       p.balance,
		       p.bank_name, p.bank_account_number, p.bank_account_holder,
		       COALESCE(p.status, 'ACTIVE') as status,
		       p.notes, p.created_at, p.updated_at,
		       COALESCE((SELECT COUNT(*) FROM customers c WHERE c.partner_id = p.id), 0) as customer_count,
		       COALESCE((SELECT SUM(gross_amount) FROM revenue_shares rs WHERE rs.partner_id = p.id), 0) as total_revenue
		FROM partners p
		WHERE p.id = $1
	`
	var p Partner
	var flatFee, balance, totalRev int64

	err := r.db.QueryRow(ctx, q, id).Scan(
		&p.ID, &p.Code, &p.Name, &p.CompanyName, &p.ContactPerson, &p.Phone, &p.Email,
		&p.ShareType, &p.PartnerShareBps, &p.ISPShareBps, &flatFee,
		&balance, &p.BankName, &p.BankAccountNumber, &p.BankAccountHolder,
		&p.Status, &p.Notes, &p.CreatedAt, &p.UpdatedAt,
		&p.CustomerCount, &totalRev,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get partner by id: %w", err)
	}

	p.FlatFeeAmount = money.Amount(flatFee)
	p.Balance = money.Amount(balance)
	p.TotalRevenue = money.Amount(totalRev)
	return &p, nil
}

func (r *Repository) List(ctx context.Context, params pagination.Params, search string, status string) ([]Partner, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if search != "" {
		where += fmt.Sprintf(" AND (p.name ILIKE $%d OR p.code ILIKE $%d OR p.contact_person ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	if status != "" {
		where += fmt.Sprintf(" AND p.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM partners p %s", where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	orderBy := "ORDER BY p.created_at DESC"
	if params.Sort != "" {
		orderBy = fmt.Sprintf("ORDER BY p.%s %s", params.Sort, params.Order)
	}

	dataQuery := fmt.Sprintf(`
		SELECT p.id, p.code, p.name, p.company_name,
		       COALESCE(p.contact_person, '') as contact_person,
		       COALESCE(p.phone, '') as phone,
		       p.email,
		       COALESCE(p.share_type, 'PERCENTAGE') as share_type,
		       p.partner_share_bps, p.isp_share_bps, p.flat_fee_amount,
		       p.balance,
		       p.bank_name, p.bank_account_number, p.bank_account_holder,
		       COALESCE(p.status, 'ACTIVE') as status,
		       p.notes, p.created_at, p.updated_at,
		       COALESCE((SELECT COUNT(*) FROM customers c WHERE c.partner_id = p.id), 0) as customer_count,
		       COALESCE((SELECT SUM(gross_amount) FROM revenue_shares rs WHERE rs.partner_id = p.id), 0) as total_revenue
		FROM partners p
		%s
		%s
		LIMIT $%d OFFSET $%d
	`, where, orderBy, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var partners []Partner
	for rows.Next() {
		var p Partner
		var flatFee, balance, totalRev int64
		err := rows.Scan(
			&p.ID, &p.Code, &p.Name, &p.CompanyName, &p.ContactPerson, &p.Phone, &p.Email,
			&p.ShareType, &p.PartnerShareBps, &p.ISPShareBps, &flatFee,
			&balance, &p.BankName, &p.BankAccountNumber, &p.BankAccountHolder,
			&p.Status, &p.Notes, &p.CreatedAt, &p.UpdatedAt,
			&p.CustomerCount, &totalRev,
		)
		if err != nil {
			return nil, 0, err
		}
		p.FlatFeeAmount = money.Amount(flatFee)
		p.Balance = money.Amount(balance)
		p.TotalRevenue = money.Amount(totalRev)
		partners = append(partners, p)
	}

	return partners, total, nil
}

// REVENUE SHARING LOGIC

func (r *Repository) RecordRevenueShare(ctx context.Context, invoiceID uuid.UUID, grossAmount money.Amount) (*RevenueShare, error) {
	// Find if customer belongs to a partner
	const checkQuery = `
		SELECT c.partner_id, p.share_type, p.partner_share_bps, p.isp_share_bps, p.flat_fee_amount
		FROM invoices i
		JOIN customers c ON c.id = i.customer_id
		JOIN partners p ON p.id = c.partner_id
		WHERE i.id = $1 AND c.partner_id IS NOT NULL
	`
	var partnerID uuid.UUID
	var shareType string
	var partnerBps, ispBps int
	var flatFee int64

	err := r.db.QueryRow(ctx, checkQuery, invoiceID).Scan(&partnerID, &shareType, &partnerBps, &ispBps, &flatFee)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// No partner associated with this invoice's customer, nothing to share
			return nil, nil
		}
		return nil, fmt.Errorf("check customer partner: %w", err)
	}

	// Calculate shares
	var partnerAmt, ispAmt money.Amount
	if shareType == string(ShareTypeFlatFee) {
		// Core ISP gets flat fee, partner gets the remainder
		ispAmt = money.Amount(flatFee)
		if ispAmt > grossAmount {
			ispAmt = grossAmount
		}
		partnerAmt = grossAmount.Sub(ispAmt)
	} else {
		// Percentage basis points
		partnerAmt = grossAmount.Percentage(int64(partnerBps))
		ispAmt = grossAmount.Sub(partnerAmt)
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	rs := &RevenueShare{
		ID:            uuid.New(),
		PartnerID:     partnerID,
		InvoiceID:     invoiceID,
		GrossAmount:   grossAmount,
		PartnerAmount: partnerAmt,
		ISPAmount:     ispAmt,
		ShareType:     ShareType(shareType),
		Status:        "CREDITED",
		CreatedAt:     time.Now(),
	}

	const insertRS = `
		INSERT INTO revenue_shares (id, partner_id, invoice_id, gross_amount, partner_amount, isp_amount, share_type, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err = tx.Exec(ctx, insertRS,
		rs.ID, rs.PartnerID, rs.InvoiceID, rs.GrossAmount.Int64(),
		rs.PartnerAmount.Int64(), rs.ISPAmount.Int64(), rs.ShareType, rs.Status, rs.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert revenue share: %w", err)
	}

	// Increment partner withdrawable balance
	const updateBal = `UPDATE partners SET balance = balance + $1, updated_at = NOW() WHERE id = $2`
	_, err = tx.Exec(ctx, updateBal, rs.PartnerAmount.Int64(), rs.PartnerID)
	if err != nil {
		return nil, fmt.Errorf("update partner balance: %w", err)
	}

	return rs, tx.Commit(ctx)
}

func (r *Repository) ListRevenueShares(ctx context.Context, partnerID uuid.UUID, limit, offset int) ([]RevenueShare, error) {
	const q = `
		SELECT rs.id, rs.partner_id, rs.invoice_id, i.invoice_number, c.full_name,
		       rs.gross_amount, rs.partner_amount, rs.isp_amount, rs.share_type, rs.status, rs.created_at
		FROM revenue_shares rs
		JOIN invoices i ON i.id = rs.invoice_id
		JOIN customers c ON c.id = i.customer_id
		WHERE rs.partner_id = $1
		ORDER BY rs.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, q, partnerID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []RevenueShare
	for rows.Next() {
		var s RevenueShare
		var gross, partnerAmt, ispAmt int64
		err := rows.Scan(
			&s.ID, &s.PartnerID, &s.InvoiceID, &s.InvoiceNumber, &s.CustomerName,
			&gross, &partnerAmt, &ispAmt, &s.ShareType, &s.Status, &s.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		s.GrossAmount = money.Amount(gross)
		s.PartnerAmount = money.Amount(partnerAmt)
		s.ISPAmount = money.Amount(ispAmt)
		shares = append(shares, s)
	}
	return shares, nil
}

// SETTLEMENTS

func (r *Repository) CreateSettlement(ctx context.Context, s *Settlement) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Verify balance
	var currentBalance int64
	err = tx.QueryRow(ctx, "SELECT balance FROM partners WHERE id = $1 FOR UPDATE", s.PartnerID).Scan(&currentBalance)
	if err != nil {
		return fmt.Errorf("get partner balance: %w", err)
	}

	if currentBalance < s.Amount.Int64() {
		return errors.New("saldo tidak mencukupi untuk penarikan")
	}

	// Deduct balance
	_, err = tx.Exec(ctx, "UPDATE partners SET balance = balance - $1, updated_at = NOW() WHERE id = $2", s.Amount.Int64(), s.PartnerID)
	if err != nil {
		return err
	}

	const insertS = `
		INSERT INTO partner_settlements (
			id, settlement_number, partner_id, amount, status,
			bank_name, bank_account_number, bank_account_holder, notes, requested_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err = tx.Exec(ctx, insertS,
		s.ID, s.SettlementNumber, s.PartnerID, s.Amount.Int64(), s.Status,
		s.BankName, s.BankAccountNumber, s.BankAccountHolder, s.Notes, s.RequestedAt,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *Repository) ListSettlements(ctx context.Context, partnerID *uuid.UUID, limit, offset int) ([]Settlement, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if partnerID != nil {
		where += fmt.Sprintf(" AND st.partner_id = $%d", argIdx)
		args = append(args, *partnerID)
		argIdx++
	}

	q := fmt.Sprintf(`
		SELECT st.id, st.settlement_number, st.partner_id, p.name, st.amount, st.status,
		       st.bank_name, st.bank_account_number, st.bank_account_holder, st.proof_url, st.notes,
		       st.requested_at, st.processed_at, st.processed_by
		FROM partner_settlements st
		JOIN partners p ON p.id = st.partner_id
		%s
		ORDER BY st.requested_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var settlements []Settlement
	for rows.Next() {
		var s Settlement
		var amt int64
		err := rows.Scan(
			&s.ID, &s.SettlementNumber, &s.PartnerID, &s.PartnerName, &amt, &s.Status,
			&s.BankName, &s.BankAccountNumber, &s.BankAccountHolder, &s.ProofURL, &s.Notes,
			&s.RequestedAt, &s.ProcessedAt, &s.ProcessedBy,
		)
		if err != nil {
			return nil, err
		}
		s.Amount = money.Amount(amt)
		settlements = append(settlements, s)
	}
	return settlements, nil
}

func (r *Repository) ProcessSettlement(ctx context.Context, id uuid.UUID, status SettlementStatus, proofURL, notes *string, processedBy *uuid.UUID) error {
	const q = `
		UPDATE partner_settlements
		SET status = $1, proof_url = COALESCE($2, proof_url), notes = COALESCE($3, notes),
		    processed_at = NOW(), processed_by = $4
		WHERE id = $5
	`
	_, err := r.db.Exec(ctx, q, status, proofURL, notes, processedBy, id)
	return err
}

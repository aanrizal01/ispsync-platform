package voucher

import (
	"context"
	"errors"
	"fmt"
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

func (r *Repository) GenerateBatchNumber(ctx context.Context) (string, error) {
	var seqVal int64
	err := r.db.QueryRow(ctx, "SELECT nextval('voucher_batch_seq')").Scan(&seqVal)
	if err != nil {
		return "", fmt.Errorf("generate batch number: %w", err)
	}
	now := time.Now()
	return fmt.Sprintf("VB-%d-%02d-%04d", now.Year(), int(now.Month()), seqVal), nil
}

// Templates

func (r *Repository) CreateTemplate(ctx context.Context, t *Template) error {
	const q = `
		INSERT INTO voucher_templates (
			id, name, description, price, currency, duration_minutes,
			data_limit_bytes, download_kbps, upload_kbps, min_download_kbps, min_upload_kbps, validity_days,
			is_active, is_available_online, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`
	_, err := r.db.Exec(ctx, q,
		t.ID, t.Name, t.Description, t.Price.Int64(), t.Currency, t.DurationMinutes,
		t.DataLimitBytes, t.DownloadKbps, t.UploadKbps, t.MinDownloadKbps, t.MinUploadKbps, t.ValidityDays,
		t.IsActive, t.IsAvailableOnline, t.CreatedAt, t.UpdatedAt,
	)
	return err
}

func (r *Repository) GetTemplateByID(ctx context.Context, id uuid.UUID) (*Template, error) {
	const q = `
		SELECT id, name, description, price, currency, duration_minutes,
		       data_limit_bytes, download_kbps, upload_kbps, min_download_kbps, min_upload_kbps, validity_days,
		       is_active, is_available_online, created_at, updated_at
		FROM voucher_templates
		WHERE id = $1
	`
	var t Template
	var price int64

	err := r.db.QueryRow(ctx, q, id).Scan(
		&t.ID, &t.Name, &t.Description, &price, &t.Currency, &t.DurationMinutes,
		&t.DataLimitBytes, &t.DownloadKbps, &t.UploadKbps, &t.MinDownloadKbps, &t.MinUploadKbps, &t.ValidityDays,
		&t.IsActive, &t.IsAvailableOnline, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get template by id: %w", err)
	}
	t.Price = money.Amount(price)
	return &t, nil
}

func (r *Repository) ListTemplates(ctx context.Context) ([]Template, error) {
	const q = `
		SELECT id, name, description, price, currency, duration_minutes,
		       data_limit_bytes, download_kbps, upload_kbps, min_download_kbps, min_upload_kbps, validity_days,
		       is_active, is_available_online, created_at, updated_at
		FROM voucher_templates
		WHERE is_active = true
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []Template
	for rows.Next() {
		var t Template
		var price int64
		if err := rows.Scan(
			&t.ID, &t.Name, &t.Description, &price, &t.Currency, &t.DurationMinutes,
			&t.DataLimitBytes, &t.DownloadKbps, &t.UploadKbps, &t.MinDownloadKbps, &t.MinUploadKbps, &t.ValidityDays,
			&t.IsActive, &t.IsAvailableOnline, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, err
		}
		t.Price = money.Amount(price)
		templates = append(templates, t)
	}
	return templates, nil
}

func (r *Repository) UpdateTemplate(ctx context.Context, t *Template) error {
	const q = `
		UPDATE voucher_templates
		SET name = $1, description = $2, price = $3, duration_minutes = $4,
		    data_limit_bytes = $5, download_kbps = $6, upload_kbps = $7,
		    min_download_kbps = $8, min_upload_kbps = $9, validity_days = $10,
		    is_active = $11, is_available_online = $12, updated_at = $13
		WHERE id = $14
	`
	res, err := r.db.Exec(ctx, q,
		t.Name, t.Description, t.Price.Int64(), t.DurationMinutes,
		t.DataLimitBytes, t.DownloadKbps, t.UploadKbps,
		t.MinDownloadKbps, t.MinUploadKbps, t.ValidityDays,
		t.IsActive, t.IsAvailableOnline, t.UpdatedAt, t.ID,
	)
	if err != nil {
		return fmt.Errorf("update template: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("template not found")
	}
	return nil
}

func (r *Repository) DeleteTemplate(ctx context.Context, id uuid.UUID) error {
	var batchCount int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM voucher_batches WHERE template_id = $1", id).Scan(&batchCount)
	if err != nil {
		return fmt.Errorf("check template usage: %w", err)
	}

	if batchCount > 0 {
		const q = `UPDATE voucher_templates SET is_active = false, updated_at = NOW() WHERE id = $1`
		_, err = r.db.Exec(ctx, q, id)
		if err != nil {
			return fmt.Errorf("soft delete template: %w", err)
		}
		return nil
	}

	const q = `DELETE FROM voucher_templates WHERE id = $1`
	res, err := r.db.Exec(ctx, q, id)
	if err != nil {
		return fmt.Errorf("delete template: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("template not found")
	}
	return nil
}

// Batches & Vouchers

func (r *Repository) CreateBatchWithVouchers(ctx context.Context, batch *Batch, vouchers []Voucher) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	const insertBatch = `
		INSERT INTO voucher_batches (id, batch_number, template_id, quantity, notes, created_by, is_mac_locked, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err = tx.Exec(ctx, insertBatch,
		batch.ID, batch.BatchNumber, batch.TemplateID, batch.Quantity,
		batch.Notes, batch.CreatedBy, batch.IsMACLocked, batch.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert voucher batch: %w", err)
	}

	const insertVoucher = `
		INSERT INTO vouchers (
			id, code, password, batch_id, template_id, status, channel,
			agent_id, time_limit_seconds, data_limit_bytes, used_seconds, used_bytes,
			expires_at, created_at, updated_at, serial_number, is_blank, is_mac_locked
		) VALUES ($1, $2, $3, $4, $5, $6, 'OFFLINE', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`
	for _, v := range vouchers {
		_, err = tx.Exec(ctx, insertVoucher,
			v.ID, v.Code, v.Password, batch.ID, v.TemplateID, v.Status,
			v.AgentID, v.TimeLimitSeconds, v.DataLimitBytes, v.UsedSeconds, v.UsedBytes,
			v.ExpiresAt, v.CreatedAt, v.UpdatedAt, v.SerialNumber, v.IsBlank, v.IsMACLocked,
		)
		if err != nil {
			return fmt.Errorf("insert voucher item: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) ListBatches(ctx context.Context) ([]Batch, error) {
	const q = `
		SELECT b.id, b.batch_number, b.template_id, t.name, b.quantity, b.notes, b.created_by, b.created_at, COALESCE(b.is_mac_locked, true)
		FROM voucher_batches b
		LEFT JOIN voucher_templates t ON t.id = b.template_id
		ORDER BY b.created_at DESC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var batches []Batch
	for rows.Next() {
		var b Batch
		if err := rows.Scan(
			&b.ID, &b.BatchNumber, &b.TemplateID, &b.TemplateName, &b.Quantity,
			&b.Notes, &b.CreatedBy, &b.CreatedAt, &b.IsMACLocked,
		); err != nil {
			return nil, err
		}
		batches = append(batches, b)
	}
	return batches, nil
}

func (r *Repository) ListVouchers(ctx context.Context, params pagination.Params, batchID *uuid.UUID, status string, channel string, agentID string, search string, voucherType string) ([]Voucher, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if batchID != nil {
		where += fmt.Sprintf(" AND v.batch_id = $%d", argIdx)
		args = append(args, *batchID)
		argIdx++
	}

	if status != "" {
		where += fmt.Sprintf(" AND v.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	if channel != "" {
		where += fmt.Sprintf(" AND v.channel = $%d", argIdx)
		args = append(args, channel)
		argIdx++
	}

	if voucherType == "classic" {
		where += " AND (v.channel = 'OFFLINE' OR v.channel IS NULL) AND (v.is_blank IS FALSE OR v.is_blank IS NULL) AND v.serial_number IS NULL"
	} else if voucherType == "online" {
		where += " AND v.channel = 'ONLINE' AND (v.is_blank IS FALSE OR v.is_blank IS NULL)"
	} else if voucherType == "scratch" {
		where += " AND (v.is_blank IS TRUE OR v.serial_number IS NOT NULL)"
	}

	if agentID != "" {
		if agentID == "none" {
			where += " AND v.agent_id IS NULL"
		} else if agentID == "any" {
			where += " AND v.agent_id IS NOT NULL"
		} else if parsedUUID, err := uuid.Parse(agentID); err == nil {
			where += fmt.Sprintf(" AND v.agent_id = $%d", argIdx)
			args = append(args, parsedUUID)
			argIdx++
		}
	}

	if search = strings.TrimSpace(search); search != "" {
		searchParam := "%" + search + "%"
		where += fmt.Sprintf(" AND (v.code ILIKE $%d OR COALESCE(v.order_id, '') ILIKE $%d OR COALESCE(v.buyer_phone, '') ILIKE $%d OR COALESCE(v.promo_code, '') ILIKE $%d OR COALESCE(b.batch_number, '') ILIKE $%d OR COALESCE(a.name, '') ILIKE $%d OR COALESCE(a.code, '') ILIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx)
		args = append(args, searchParam)
		argIdx++
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM vouchers v
		LEFT JOIN voucher_batches b ON b.id = v.batch_id
		LEFT JOIN agents a ON a.id = v.agent_id
		%s
	`, where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	orderBy := "ORDER BY v.created_at DESC"
	if params.Sort != "" {
		orderBy = fmt.Sprintf("ORDER BY v.%s %s", params.Sort, params.Order)
	}

	dataQuery := fmt.Sprintf(`
		SELECT v.id, v.code, v.password, v.batch_id, b.batch_number,
		       v.template_id, t.name, COALESCE(t.price, 0), v.customer_id, v.status,
		       v.channel, v.buyer_phone, v.order_id,
		       v.agent_id, a.name, a.code,
		       v.promo_code, v.discount_amount, v.agent_commission,
		       v.time_limit_seconds, v.data_limit_bytes, v.used_seconds, v.used_bytes,
		       v.first_used_at, v.expires_at, v.revoked_at, v.revoked_reason,
		       v.created_at, v.updated_at,
		       v.serial_number, v.is_blank, v.activated_by_agent_id, v.activated_at,
		       v.buyer_mac, COALESCE(v.is_mac_locked, true)
		FROM vouchers v
		LEFT JOIN voucher_batches b ON b.id = v.batch_id
		LEFT JOIN voucher_templates t ON t.id = v.template_id
		LEFT JOIN agents a ON a.id = v.agent_id
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

	var vouchers []Voucher
	for rows.Next() {
		var v Voucher
		var price int64

		err := rows.Scan(
			&v.ID, &v.Code, &v.Password, &v.BatchID, &v.BatchNumber,
			&v.TemplateID, &v.TemplateName, &price, &v.CustomerID, &v.Status,
			&v.Channel, &v.BuyerPhone, &v.OrderID,
			&v.AgentID, &v.AgentName, &v.AgentCode,
			&v.PromoCode, &v.DiscountAmount, &v.AgentCommission,
			&v.TimeLimitSeconds, &v.DataLimitBytes, &v.UsedSeconds, &v.UsedBytes,
			&v.FirstUsedAt, &v.ExpiresAt, &v.RevokedAt, &v.RevokedReason,
			&v.CreatedAt, &v.UpdatedAt,
			&v.SerialNumber, &v.IsBlank, &v.ActivatedByAgentID, &v.ActivatedAt,
			&v.BuyerMAC, &v.IsMACLocked,
		)
		if err != nil {
			return nil, 0, err
		}
		v.Price = money.Amount(price)
		vouchers = append(vouchers, v)
	}

	return vouchers, total, nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Voucher, error) {
	const q = `
		SELECT v.id, v.code, v.password, v.batch_id, b.batch_number,
		       v.template_id, t.name, COALESCE(t.price, 0), v.customer_id, v.status,
		       v.channel, v.buyer_phone, v.order_id,
		       v.agent_id, a.name, a.code,
		       v.promo_code, v.discount_amount, v.agent_commission,
		       v.time_limit_seconds, v.data_limit_bytes, v.used_seconds, v.used_bytes,
		       v.first_used_at, v.expires_at, v.revoked_at, v.revoked_reason,
		       v.created_at, v.updated_at,
		       v.serial_number, v.is_blank, v.activated_by_agent_id, v.activated_at,
		       v.buyer_mac, COALESCE(v.is_mac_locked, true)
		FROM vouchers v
		LEFT JOIN voucher_batches b ON b.id = v.batch_id
		LEFT JOIN voucher_templates t ON t.id = v.template_id
		LEFT JOIN agents a ON a.id = v.agent_id
		WHERE v.id = $1
	`
	var v Voucher
	var price int64

	err := r.db.QueryRow(ctx, q, id).Scan(
		&v.ID, &v.Code, &v.Password, &v.BatchID, &v.BatchNumber,
		&v.TemplateID, &v.TemplateName, &price, &v.CustomerID, &v.Status,
		&v.Channel, &v.BuyerPhone, &v.OrderID,
		&v.AgentID, &v.AgentName, &v.AgentCode,
		&v.PromoCode, &v.DiscountAmount, &v.AgentCommission,
		&v.TimeLimitSeconds, &v.DataLimitBytes, &v.UsedSeconds, &v.UsedBytes,
		&v.FirstUsedAt, &v.ExpiresAt, &v.RevokedAt, &v.RevokedReason,
		&v.CreatedAt, &v.UpdatedAt,
		&v.SerialNumber, &v.IsBlank, &v.ActivatedByAgentID, &v.ActivatedAt,
		&v.BuyerMAC, &v.IsMACLocked,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get voucher by id: %w", err)
	}
	v.Price = money.Amount(price)
	return &v, nil
}

func (r *Repository) Revoke(ctx context.Context, id uuid.UUID, reason string) error {
	const q = `
		UPDATE vouchers
		SET status = 'REVOKED', revoked_at = NOW(), revoked_reason = $1, updated_at = NOW()
		WHERE id = $2 AND status != 'REVOKED'
	`
	_, err := r.db.Exec(ctx, q, reason, id)
	return err
}

func (r *Repository) ResetMAC(ctx context.Context, id uuid.UUID) error {
	const q = `
		UPDATE vouchers
		SET buyer_mac = NULL, updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, q, id)
	return err
}

// ExpireAndCleanupVouchers marks past-due vouchers as EXPIRED, and purges records older than 1 year.
func (r *Repository) ExpireAndCleanupVouchers(ctx context.Context) (int64, int64, error) {
	// 1. Tandai voucher UNUSED atau ACTIVE yang telah lewat expires_at menjadi EXPIRED
	const expireQ = `
		UPDATE vouchers
		SET status = 'EXPIRED', updated_at = NOW()
		WHERE status IN ('UNUSED', 'ACTIVE')
		  AND expires_at IS NOT NULL
		  AND expires_at < NOW()
	`
	tagExpire, err := r.db.Exec(ctx, expireQ)
	if err != nil {
		return 0, 0, fmt.Errorf("expire vouchers: %w", err)
	}
	expiredCount := tagExpire.RowsAffected()

	// 2. Bersihkan voucher lama yang dibuat lebih dari 1 tahun lalu (agar database tidak menumpuk)
	const purgeQ = `
		DELETE FROM vouchers
		WHERE created_at < NOW() - INTERVAL '1 year'
	`
	tagPurge, err := r.db.Exec(ctx, purgeQ)
	if err != nil {
		return expiredCount, 0, fmt.Errorf("purge old vouchers: %w", err)
	}
	purgedCount := tagPurge.RowsAffected()

	// 3. Bersihkan sisa credential FreeRADIUS yang sudah terhapus dari tabel vouchers
	if purgedCount > 0 {
		const cleanRadiusCheck = `
			DELETE FROM radcheck
			WHERE username NOT IN (SELECT code FROM vouchers)
			  AND username NOT IN (SELECT identity FROM access_accounts)
		`
		_, _ = r.db.Exec(ctx, cleanRadiusCheck)

		const cleanRadiusReply = `
			DELETE FROM radreply
			WHERE username NOT IN (SELECT code FROM vouchers)
			  AND username NOT IN (SELECT identity FROM access_accounts)
		`
		_, _ = r.db.Exec(ctx, cleanRadiusReply)
	}

	return expiredCount, purgedCount, nil
}

// GenerateSerialNumber generates a sequential, unique Serial Number using PostgreSQL sequence
func (r *Repository) GenerateSerialNumber(ctx context.Context, prefix string) (string, error) {
	var seqVal int64
	err := r.db.QueryRow(ctx, "SELECT nextval('voucher_sn_seq')").Scan(&seqVal)
	if err != nil {
		return "", fmt.Errorf("nextval voucher_sn_seq: %w", err)
	}
	if prefix != "" {
		return fmt.Sprintf("%s%010d", prefix, seqVal), nil
	}
	return fmt.Sprintf("%012d", seqVal), nil
}

// GetBySerialNumber fetches a voucher by its physical Serial Number
func (r *Repository) GetBySerialNumber(ctx context.Context, sn string) (*Voucher, error) {
	const q = `
		SELECT v.id, v.code, v.password, v.batch_id, b.batch_number,
		       v.template_id, t.name, COALESCE(t.price, 0), v.customer_id, v.status,
		       v.channel, v.buyer_phone, v.order_id,
		       v.agent_id, a.name, a.code,
		       v.promo_code, v.discount_amount, v.agent_commission,
		       v.time_limit_seconds, v.data_limit_bytes, v.used_seconds, v.used_bytes,
		       v.first_used_at, v.expires_at, v.revoked_at, v.revoked_reason,
		       v.created_at, v.updated_at,
		       v.serial_number, v.is_blank, v.activated_by_agent_id, v.activated_at,
		       COALESCE(v.is_mac_locked, true)
		FROM vouchers v
		LEFT JOIN voucher_batches b ON b.id = v.batch_id
		LEFT JOIN voucher_templates t ON t.id = v.template_id
		LEFT JOIN agents a ON a.id = v.agent_id
		WHERE v.serial_number = $1
	`
	var v Voucher
	var price int64
	err := r.db.QueryRow(ctx, q, sn).Scan(
		&v.ID, &v.Code, &v.Password, &v.BatchID, &v.BatchNumber,
		&v.TemplateID, &v.TemplateName, &price, &v.CustomerID, &v.Status,
		&v.Channel, &v.BuyerPhone, &v.OrderID,
		&v.AgentID, &v.AgentName, &v.AgentCode,
		&v.PromoCode, &v.DiscountAmount, &v.AgentCommission,
		&v.TimeLimitSeconds, &v.DataLimitBytes, &v.UsedSeconds, &v.UsedBytes,
		&v.FirstUsedAt, &v.ExpiresAt, &v.RevokedAt, &v.RevokedReason,
		&v.CreatedAt, &v.UpdatedAt,
		&v.SerialNumber, &v.IsBlank, &v.ActivatedByAgentID, &v.ActivatedAt,
		&v.IsMACLocked,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	v.Price = money.Amount(price)
	return &v, nil
}

// ActivateBlankVoucher activates a single blank voucher on-demand using agent's deposit
func (r *Repository) ActivateBlankVoucher(ctx context.Context, agentID uuid.UUID, sn string, tpl *Template, modalCost int64, commission int64) (*Voucher, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Check voucher status FOR UPDATE
	var voucherID uuid.UUID
	var isBlank bool
	var curStatus string
	err = tx.QueryRow(ctx, `
		SELECT id, is_blank, status FROM vouchers 
		WHERE serial_number = $1 FOR UPDATE
	`, sn).Scan(&voucherID, &isBlank, &curStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("voucher dengan nomor seri %s tidak ditemukan di sistem", sn)
		}
		return nil, err
	}
	if !isBlank || curStatus != "BLANK" {
		return nil, fmt.Errorf("voucher dengan nomor seri %s sudah pernah diaktifkan (status: %s)", sn, curStatus)
	}

	// Check agent balance FOR UPDATE
	var agentBalance int64
	var agentName string
	err = tx.QueryRow(ctx, `
		SELECT balance, name FROM agents WHERE id = $1 FOR UPDATE
	`, agentID).Scan(&agentBalance, &agentName)
	if err != nil {
		return nil, fmt.Errorf("mitra agen tidak ditemukan: %w", err)
	}

	if agentBalance < modalCost {
		return nil, fmt.Errorf("saldo dompet deposit tidak mencukupi (saldo Anda: Rp %d, modal paket: Rp %d)", agentBalance, modalCost)
	}

	// Deduct agent balance
	newBalance := agentBalance - modalCost
	_, err = tx.Exec(ctx, `
		UPDATE agents SET balance = $1, updated_at = NOW() WHERE id = $2
	`, newBalance, agentID)
	if err != nil {
		return nil, fmt.Errorf("update agent balance: %w", err)
	}

	// Record balance mutation
	_, err = tx.Exec(ctx, `
		INSERT INTO agent_balance_mutations (
			agent_id, mutation_type, amount, balance_before, balance_after, reference_id, description
		) VALUES ($1, 'VOUCHER_OFFLINE_BUY', $2, $3, $4, $5, $6)
	`, agentID, -modalCost, agentBalance, newBalance, sn, fmt.Sprintf("Aktivasi Kartu Gesek SN %s (%s)", sn, tpl.Name))
	if err != nil {
		return nil, fmt.Errorf("record balance mutation: %w", err)
	}

	// Activate voucher
	timeLimitSec := int64(tpl.DurationMinutes * 60)
	now := time.Now()
	_, err = tx.Exec(ctx, `
		UPDATE vouchers SET
			template_id = $1,
			price = $2,
			time_limit_seconds = $3,
			data_limit_bytes = $4,
			status = 'UNUSED',
			is_blank = FALSE,
			agent_id = $5,
			activated_by_agent_id = $5,
			agent_commission = $6,
			activated_at = $7,
			updated_at = $7
		WHERE id = $8
	`, tpl.ID, tpl.Price, timeLimitSec, tpl.DataLimitBytes, agentID, commission, now, voucherID)
	if err != nil {
		return nil, fmt.Errorf("activate voucher: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit activation: %w", err)
	}

	return r.GetBySerialNumber(ctx, sn)
}

// ActivateBlankRange activates a sequential range of blank vouchers atomically
func (r *Repository) ActivateBlankRange(ctx context.Context, agentID uuid.UUID, snStart string, snEnd string, tpl *Template, modalCostPerUnit int64, commissionPerUnit int64) (*RangeActivationResult, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Fetch all eligible vouchers in range
	rows, err := tx.Query(ctx, `
		SELECT id, serial_number FROM vouchers
		WHERE serial_number >= $1 AND serial_number <= $2 AND is_blank = TRUE AND status = 'BLANK'
		ORDER BY serial_number ASC
		FOR UPDATE
	`, snStart, snEnd)
	if err != nil {
		return nil, fmt.Errorf("query vouchers in range: %w", err)
	}
	defer rows.Close()

	var voucherIDs []uuid.UUID
	var sns []string
	for rows.Next() {
		var id uuid.UUID
		var sn string
		if err := rows.Scan(&id, &sn); err != nil {
			return nil, err
		}
		voucherIDs = append(voucherIDs, id)
		sns = append(sns, sn)
	}
	rows.Close()

	count := len(voucherIDs)
	if count == 0 {
		return nil, fmt.Errorf("tidak ada kartu blanko valid yang siap diaktifkan dalam rentang %s s/d %s", snStart, snEnd)
	}

	totalModal := int64(count) * modalCostPerUnit
	totalCommission := int64(count) * commissionPerUnit

	// Check agent balance FOR UPDATE
	var agentBalance int64
	err = tx.QueryRow(ctx, `
		SELECT balance FROM agents WHERE id = $1 FOR UPDATE
	`, agentID).Scan(&agentBalance)
	if err != nil {
		return nil, fmt.Errorf("agen tidak ditemukan: %w", err)
	}

	if agentBalance < totalModal {
		return nil, fmt.Errorf("saldo deposit agen tidak mencukupi untuk %d kartu (saldo Anda: Rp %d, total modal: Rp %d)", count, agentBalance, totalModal)
	}

	newBalance := agentBalance - totalModal
	_, err = tx.Exec(ctx, `
		UPDATE agents SET balance = $1, updated_at = NOW() WHERE id = $2
	`, newBalance, agentID)
	if err != nil {
		return nil, fmt.Errorf("update agent balance: %w", err)
	}

	ref := fmt.Sprintf("%s-%s", snStart, snEnd)
	_, err = tx.Exec(ctx, `
		INSERT INTO agent_balance_mutations (
			agent_id, mutation_type, amount, balance_before, balance_after, reference_id, description
		) VALUES ($1, 'VOUCHER_OFFLINE_BUY', $2, $3, $4, $5, $6)
	`, agentID, -totalModal, agentBalance, newBalance, ref, fmt.Sprintf("Aktivasi Rentang Kartu Gesek %s s/d %s (%d kartu %s)", snStart, snEnd, count, tpl.Name))
	if err != nil {
		return nil, fmt.Errorf("record balance mutation: %w", err)
	}

	timeLimitSec := int64(tpl.DurationMinutes * 60)
	now := time.Now()

	for _, vID := range voucherIDs {
		_, err = tx.Exec(ctx, `
			UPDATE vouchers SET
				template_id = $1,
				price = $2,
				time_limit_seconds = $3,
				data_limit_bytes = $4,
				status = 'UNUSED',
				is_blank = FALSE,
				agent_id = $5,
				activated_by_agent_id = $5,
				agent_commission = $6,
				activated_at = $7,
				updated_at = $7
			WHERE id = $8
		`, tpl.ID, tpl.Price, timeLimitSec, tpl.DataLimitBytes, agentID, commissionPerUnit, now, vID)
		if err != nil {
			return nil, fmt.Errorf("activate voucher %s: %w", vID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit range activation: %w", err)
	}

	return &RangeActivationResult{
		SuccessCount:    count,
		TotalCost:       totalModal,
		AgentCommission: totalCommission,
		ActivatedSNs:    sns,
	}, nil
}

// ReissueDamagedVoucher generates a new code and password for a physically damaged card without extra charge
func (r *Repository) ReissueDamagedVoucher(ctx context.Context, agentID uuid.UUID, sn string, newCode string, newPassword string, reason string) (*Voucher, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var vID uuid.UUID
	var status string
	var firstUsedAt *time.Time
	err = tx.QueryRow(ctx, `
		SELECT id, status, first_used_at FROM vouchers
		WHERE serial_number = $1 AND (agent_id = $2 OR activated_by_agent_id = $2)
		FOR UPDATE
	`, sn, agentID).Scan(&vID, &status, &firstUsedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("voucher dengan SN %s bukan milik agen ini atau tidak ditemukan", sn)
		}
		return nil, err
	}

	if status == "EXPIRED" || status == "REVOKED" {
		return nil, fmt.Errorf("voucher dengan status %s tidak dapat diterbitkan ulang", status)
	}

	now := time.Now()
	notes := fmt.Sprintf("Reissued (rusak fisik/sobek): %s", reason)
	_, err = tx.Exec(ctx, `
		UPDATE vouchers SET
			code = $1,
			password = $2,
			revoked_reason = $3,
			updated_at = $4
		WHERE id = $5
	`, newCode, newPassword, notes, now, vID)
	if err != nil {
		return nil, fmt.Errorf("update reissued voucher: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetBySerialNumber(ctx, sn)
}

// ListAgentActivatedVouchers returns paginated history of vouchers activated by this agent
func (r *Repository) ListAgentActivatedVouchers(ctx context.Context, agentID uuid.UUID, params pagination.Params, search string) ([]Voucher, int, error) {
	where := "WHERE (v.activated_by_agent_id = $1 OR v.agent_id = $1)"
	args := []interface{}{agentID}
	argIdx := 2

	if search = strings.TrimSpace(search); search != "" {
		searchParam := "%" + search + "%"
		where += fmt.Sprintf(" AND (v.code ILIKE $%d OR COALESCE(v.serial_number, '') ILIKE $%d OR COALESCE(t.name, '') ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, searchParam)
		argIdx++
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM vouchers v
		LEFT JOIN voucher_templates t ON t.id = v.template_id
		%s
	`, where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf(`
		SELECT v.id, v.code, v.password, v.batch_id, b.batch_number,
		       v.template_id, t.name, COALESCE(t.price, 0), v.customer_id, v.status,
		       v.channel, v.buyer_phone, v.order_id,
		       v.agent_id, a.name, a.code,
		       v.promo_code, v.discount_amount, v.agent_commission,
		       v.time_limit_seconds, v.data_limit_bytes, v.used_seconds, v.used_bytes,
		       v.first_used_at, v.expires_at, v.revoked_at, v.revoked_reason,
		       v.created_at, v.updated_at,
		       v.serial_number, v.is_blank, v.activated_by_agent_id, v.activated_at,
		       COALESCE(v.is_mac_locked, true)
		FROM vouchers v
		LEFT JOIN voucher_batches b ON b.id = v.batch_id
		LEFT JOIN voucher_templates t ON t.id = v.template_id
		LEFT JOIN agents a ON a.id = v.agent_id
		%s
		ORDER BY v.activated_at DESC NULLS LAST, v.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)
	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var vouchers []Voucher
	for rows.Next() {
		var v Voucher
		var price int64
		err := rows.Scan(
			&v.ID, &v.Code, &v.Password, &v.BatchID, &v.BatchNumber,
			&v.TemplateID, &v.TemplateName, &price, &v.CustomerID, &v.Status,
			&v.Channel, &v.BuyerPhone, &v.OrderID,
			&v.AgentID, &v.AgentName, &v.AgentCode,
			&v.PromoCode, &v.DiscountAmount, &v.AgentCommission,
			&v.TimeLimitSeconds, &v.DataLimitBytes, &v.UsedSeconds, &v.UsedBytes,
			&v.FirstUsedAt, &v.ExpiresAt, &v.RevokedAt, &v.RevokedReason,
			&v.CreatedAt, &v.UpdatedAt,
			&v.SerialNumber, &v.IsBlank, &v.ActivatedByAgentID, &v.ActivatedAt,
			&v.IsMACLocked,
		)
		if err != nil {
			return nil, 0, err
		}
		v.Price = money.Amount(price)
		vouchers = append(vouchers, v)
	}
	return vouchers, total, nil
}

// GetAgentDetails returns basic info for commission and balance checks
func (r *Repository) GetAgentDetails(ctx context.Context, agentID uuid.UUID) (name string, balance int64, offlineCashbackPct float64, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT name, balance, offline_cashback_pct 
		FROM agents 
		WHERE id = $1 AND status = 'ACTIVE'
	`, agentID).Scan(&name, &balance, &offlineCashbackPct)
	return
}

// GetAgentByUserID resolves agent record using the authenticated user's ID
func (r *Repository) GetAgentByUserID(ctx context.Context, userID uuid.UUID) (agentID uuid.UUID, name string, balance int64, offlineCashbackPct float64, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT id, name, balance, offline_cashback_pct 
		FROM agents 
		WHERE user_id = $1 AND status = 'ACTIVE'
	`, userID).Scan(&agentID, &name, &balance, &offlineCashbackPct)
	return
}

// Hotspot Orders

func (r *Repository) ListHotspotOrders(ctx context.Context, filter ListHotspotOrdersFilter) ([]HotspotOrder, int64, error) {
	// Auto expire orders that passed expiration time
	_, _ = r.db.Exec(ctx, `UPDATE public.hotspot_orders SET status = 'EXPIRED', updated_at = NOW() WHERE status = 'PENDING' AND expires_at < NOW()`)

	var conditions []string
	var args []interface{}
	argIdx := 1

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("o.status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}

	if filter.Search != "" {
		pattern := "%" + strings.TrimSpace(filter.Search) + "%"
		conditions = append(conditions, fmt.Sprintf("(o.order_id ILIKE $%d OR o.customer_phone ILIKE $%d OR o.package_name ILIKE $%d OR o.voucher_code ILIKE $%d OR o.promo_code ILIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx))
		args = append(args, pattern)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQ := fmt.Sprintf("SELECT COUNT(*) FROM public.hotspot_orders o %s", whereClause)
	var total int64
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	query := fmt.Sprintf(`
		SELECT o.id, o.order_id, o.template_id, o.package_name, o.amount, o.original_price, o.discount_amount,
		       o.customer_phone, o.payment_method, o.payment_url, o.snap_token, o.client_ip, o.client_mac,
		       o.promo_code, o.agent_id, COALESCE(a.name, '') as agent_name, o.agent_commission,
		       o.status, o.voucher_code, o.paid_at, o.expires_at, o.created_at, o.updated_at
		FROM public.hotspot_orders o
		LEFT JOIN agents a ON a.id = o.agent_id
		%s
		ORDER BY o.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []HotspotOrder
	for rows.Next() {
		var o HotspotOrder
		err := rows.Scan(
			&o.ID, &o.OrderID, &o.TemplateID, &o.PackageName, &o.Amount, &o.OriginalPrice, &o.DiscountAmount,
			&o.CustomerPhone, &o.PaymentMethod, &o.PaymentURL, &o.SnapToken, &o.ClientIP, &o.ClientMAC,
			&o.PromoCode, &o.AgentID, &o.AgentName, &o.AgentCommission,
			&o.Status, &o.VoucherCode, &o.PaidAt, &o.ExpiresAt, &o.CreatedAt, &o.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		orders = append(orders, o)
	}

	return orders, total, nil
}

func (r *Repository) GetHotspotOrdersSummary(ctx context.Context) (HotspotOrdersSummary, error) {
	// Auto expire first
	_, _ = r.db.Exec(ctx, `UPDATE public.hotspot_orders SET status = 'EXPIRED', updated_at = NOW() WHERE status = 'PENDING' AND expires_at < NOW()`)

	const q = `
		SELECT 
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'PAID'),
			COUNT(*) FILTER (WHERE status = 'PENDING'),
			COUNT(*) FILTER (WHERE status = 'EXPIRED'),
			COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0)
		FROM public.hotspot_orders
	`
	var s HotspotOrdersSummary
	err := r.db.QueryRow(ctx, q).Scan(&s.TotalOrders, &s.TotalPaid, &s.TotalPending, &s.TotalExpired, &s.TotalRevenue)
	return s, err
}



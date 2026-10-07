package billing

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
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

func (r *Repository) GenerateInvoiceNumber(ctx context.Context, branchCode ...string) (string, error) {
	var seqVal int64
	err := r.db.QueryRow(ctx, "SELECT nextval('invoice_number_seq')").Scan(&seqVal)
	if err != nil {
		return "", fmt.Errorf("generate invoice number: %w", err)
	}
	now := time.Now()
	b := "PYK"
	if len(branchCode) > 0 && strings.TrimSpace(branchCode[0]) != "" {
		clean := strings.ToUpper(strings.TrimSpace(branchCode[0]))
		clean = regexp.MustCompile(`[^A-Z0-9]`).ReplaceAllString(clean, "")
		if clean != "" {
			b = clean
		}
	}
	return fmt.Sprintf("INV-%s-%d-%02d-%05d", b, now.Year(), int(now.Month()), seqVal), nil
}

func (r *Repository) Create(ctx context.Context, inv *Invoice) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tenantSlug := inv.TenantSlug
	if tenantSlug == "" {
		tenantSlug = "dev"
	}

	const insertInvoice = `
		INSERT INTO invoices (
			id, tenant_slug, invoice_number, customer_id, subscription_id, plan_price_id,
			status, billing_period_start, billing_period_end, issue_date, due_date,
			subtotal, tax_amount, discount_amount, late_fee_amount, credit_applied,
			total_amount, amount_paid, amount_due, currency, notes, issued_by,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
			$23, $24
		)
	`
	_, err = tx.Exec(ctx, insertInvoice,
		inv.ID, tenantSlug, inv.InvoiceNumber, inv.CustomerID, inv.SubscriptionID, inv.PlanPriceID,
		inv.Status, inv.BillingPeriodStart, inv.BillingPeriodEnd, inv.IssueDate, inv.DueDate,
		inv.Subtotal.Int64(), inv.TaxAmount.Int64(), inv.DiscountAmount.Int64(),
		inv.LateFeeAmount.Int64(), inv.CreditApplied.Int64(), inv.TotalAmount.Int64(),
		inv.AmountPaid.Int64(), inv.AmountDue.Int64(), inv.Currency, inv.Notes, inv.IssuedBy,
		inv.CreatedAt, inv.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert invoice: %w", err)
	}

	const insertItem = `
		INSERT INTO invoice_items (
			id, invoice_id, item_type, description, quantity, unit_price,
			tax_percent, discount_percent, total, period_start, period_end, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	for _, item := range inv.Items {
		_, err = tx.Exec(ctx, insertItem,
			item.ID, inv.ID, item.ItemType, item.Description, item.Quantity,
			item.UnitPrice.Int64(), item.TaxPercent, item.DiscountPercent,
			item.Total.Int64(), item.PeriodStart, item.PeriodEnd, item.CreatedAt,
		)
		if err != nil {
			return fmt.Errorf("insert invoice item: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Invoice, error) {
	const q = `
		SELECT i.id, COALESCE(i.tenant_slug, 'dev'), i.invoice_number, i.customer_id, c.customer_number, c.full_name, c.phone,
		       i.subscription_id, i.plan_price_id, i.status,
		       i.billing_period_start, i.billing_period_end, i.issue_date, i.due_date,
		       i.subtotal, i.tax_amount, i.discount_amount, i.late_fee_amount, i.credit_applied,
		       i.total_amount, i.amount_paid, i.amount_due, i.currency, i.notes, i.issued_by,
		       i.voided_at, i.void_reason, i.created_at, i.updated_at
		FROM invoices i
		JOIN customers c ON c.id = i.customer_id
		WHERE i.id = $1
	`
	var inv Invoice
	var subtotal, tax, discount, lateFee, credit, total, paid, due int64

	err := r.db.QueryRow(ctx, q, id).Scan(
		&inv.ID, &inv.TenantSlug, &inv.InvoiceNumber, &inv.CustomerID, &inv.CustomerNumber, &inv.CustomerName, &inv.CustomerPhone,
		&inv.SubscriptionID, &inv.PlanPriceID, &inv.Status,
		&inv.BillingPeriodStart, &inv.BillingPeriodEnd, &inv.IssueDate, &inv.DueDate,
		&subtotal, &tax, &discount, &lateFee, &credit,
		&total, &paid, &due, &inv.Currency, &inv.Notes, &inv.IssuedBy,
		&inv.VoidedAt, &inv.VoidReason, &inv.CreatedAt, &inv.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get invoice by id: %w", err)
	}

	inv.Subtotal = money.Amount(subtotal)
	inv.TaxAmount = money.Amount(tax)
	inv.DiscountAmount = money.Amount(discount)
	inv.LateFeeAmount = money.Amount(lateFee)
	inv.CreditApplied = money.Amount(credit)
	inv.TotalAmount = money.Amount(total)
	inv.AmountPaid = money.Amount(paid)
	inv.AmountDue = money.Amount(due)

	// Fetch items
	const itemQ = `
		SELECT id, invoice_id, item_type, description, quantity, unit_price,
		       tax_percent, discount_percent, total, period_start, period_end, created_at
		FROM invoice_items
		WHERE invoice_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(ctx, itemQ, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var it InvoiceItem
			var unitPrice, itemTotal int64
			if err := rows.Scan(
				&it.ID, &it.InvoiceID, &it.ItemType, &it.Description, &it.Quantity,
				&unitPrice, &it.TaxPercent, &it.DiscountPercent, &itemTotal,
				&it.PeriodStart, &it.PeriodEnd, &it.CreatedAt,
			); err == nil {
				it.UnitPrice = money.Amount(unitPrice)
				it.Total = money.Amount(itemTotal)
				inv.Items = append(inv.Items, it)
			}
		}
	}

	return &inv, nil
}

func (r *Repository) GetByNumber(ctx context.Context, invoiceNumber string) (*Invoice, error) {
	const q = `
		SELECT i.id, i.invoice_number, i.customer_id, c.customer_number, c.full_name, c.phone,
		       i.subscription_id, i.plan_price_id, i.status,
		       i.billing_period_start, i.billing_period_end, i.issue_date, i.due_date,
		       i.subtotal, i.tax_amount, i.discount_amount, i.late_fee_amount, i.credit_applied,
		       i.total_amount, i.amount_paid, i.amount_due, i.currency, i.notes, i.issued_by,
		       i.voided_at, i.void_reason, i.created_at, i.updated_at
		FROM invoices i
		JOIN customers c ON c.id = i.customer_id
		WHERE i.invoice_number = $1
		LIMIT 1
	`
	var inv Invoice
	var subtotal, tax, discount, lateFee, credit, total, paid, due int64

	err := r.db.QueryRow(ctx, q, invoiceNumber).Scan(
		&inv.ID, &inv.InvoiceNumber, &inv.CustomerID, &inv.CustomerNumber, &inv.CustomerName, &inv.CustomerPhone,
		&inv.SubscriptionID, &inv.PlanPriceID, &inv.Status,
		&inv.BillingPeriodStart, &inv.BillingPeriodEnd, &inv.IssueDate, &inv.DueDate,
		&subtotal, &tax, &discount, &lateFee, &credit,
		&total, &paid, &due, &inv.Currency, &inv.Notes, &inv.IssuedBy,
		&inv.VoidedAt, &inv.VoidReason, &inv.CreatedAt, &inv.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get invoice by number: %w", err)
	}

	inv.Subtotal = money.Amount(subtotal)
	inv.TaxAmount = money.Amount(tax)
	inv.DiscountAmount = money.Amount(discount)
	inv.LateFeeAmount = money.Amount(lateFee)
	inv.CreditApplied = money.Amount(credit)
	inv.TotalAmount = money.Amount(total)
	inv.AmountPaid = money.Amount(paid)
	inv.AmountDue = money.Amount(due)

	const itemQ = `
		SELECT id, invoice_id, item_type, description, quantity, unit_price,
		       tax_percent, discount_percent, total, period_start, period_end, created_at
		FROM invoice_items
		WHERE invoice_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(ctx, itemQ, inv.ID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var it InvoiceItem
			var unitPrice, itemTotal int64
			if err := rows.Scan(
				&it.ID, &it.InvoiceID, &it.ItemType, &it.Description, &it.Quantity,
				&unitPrice, &it.TaxPercent, &it.DiscountPercent, &itemTotal,
				&it.PeriodStart, &it.PeriodEnd, &it.CreatedAt,
			); err == nil {
				it.UnitPrice = money.Amount(unitPrice)
				it.Total = money.Amount(itemTotal)
				inv.Items = append(inv.Items, it)
			}
		}
	}

	return &inv, nil
}

func (r *Repository) List(ctx context.Context, tenantSlug string, params pagination.Params, customerID *uuid.UUID, status string) ([]Invoice, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if tenantSlug != "" && tenantSlug != "superadmin" {
		where += fmt.Sprintf(" AND i.tenant_slug = $%d", argIdx)
		args = append(args, tenantSlug)
		argIdx++
	}

	if customerID != nil {
		where += fmt.Sprintf(" AND i.customer_id = $%d", argIdx)
		args = append(args, *customerID)
		argIdx++
	}

	if status != "" {
		where += fmt.Sprintf(" AND i.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM invoices i %s", where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	orderBy := "ORDER BY i.created_at DESC"
	if params.Sort != "" {
		orderBy = fmt.Sprintf("ORDER BY i.%s %s", params.Sort, params.Order)
	}

	dataQuery := fmt.Sprintf(`
		SELECT i.id, COALESCE(i.tenant_slug, 'dev'), i.invoice_number, i.customer_id, c.customer_number, c.full_name, c.phone,
		       i.subscription_id, i.plan_price_id, i.status,
		       i.billing_period_start, i.billing_period_end, i.issue_date, i.due_date,
		       i.subtotal, i.tax_amount, i.discount_amount, i.late_fee_amount, i.credit_applied,
		       i.total_amount, i.amount_paid, i.amount_due, i.currency, i.notes, i.issued_by,
		       i.voided_at, i.void_reason, i.created_at, i.updated_at
		FROM invoices i
		JOIN customers c ON c.id = i.customer_id
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

	var invoices []Invoice
	for rows.Next() {
		var inv Invoice
		var subtotal, tax, discount, lateFee, credit, totalAmount, paid, due int64

		err := rows.Scan(
			&inv.ID, &inv.TenantSlug, &inv.InvoiceNumber, &inv.CustomerID, &inv.CustomerNumber, &inv.CustomerName, &inv.CustomerPhone,
			&inv.SubscriptionID, &inv.PlanPriceID, &inv.Status,
			&inv.BillingPeriodStart, &inv.BillingPeriodEnd, &inv.IssueDate, &inv.DueDate,
			&subtotal, &tax, &discount, &lateFee, &credit,
			&totalAmount, &paid, &due, &inv.Currency, &inv.Notes, &inv.IssuedBy,
			&inv.VoidedAt, &inv.VoidReason, &inv.CreatedAt, &inv.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}

		inv.Subtotal = money.Amount(subtotal)
		inv.TaxAmount = money.Amount(tax)
		inv.DiscountAmount = money.Amount(discount)
		inv.LateFeeAmount = money.Amount(lateFee)
		inv.CreditApplied = money.Amount(credit)
		inv.TotalAmount = money.Amount(totalAmount)
		inv.AmountPaid = money.Amount(paid)
		inv.AmountDue = money.Amount(due)

		invoices = append(invoices, inv)
	}

	return invoices, total, nil
}

func (r *Repository) Issue(ctx context.Context, id uuid.UUID, issuedBy *uuid.UUID) error {
	const q = `
		UPDATE invoices
		SET status = 'ISSUED', issue_date = NOW(), issued_by = COALESCE($1, issued_by), updated_at = NOW()
		WHERE id = $2 AND status = 'DRAFT'
	`
	_, err := r.db.Exec(ctx, q, issuedBy, id)
	return err
}

func (r *Repository) Void(ctx context.Context, id uuid.UUID, reason string) error {
	const q = `
		UPDATE invoices
		SET status = 'VOID', voided_at = NOW(), void_reason = $1, updated_at = NOW()
		WHERE id = $2 AND status != 'PAID' AND status != 'VOID'
	`
	_, err := r.db.Exec(ctx, q, reason, id)
	return err
}

func (r *Repository) PublicLookup(ctx context.Context, tenantSlug string, query string) ([]Invoice, error) {
	where := `WHERE (
			c.customer_number ILIKE $1 
			OR c.phone ILIKE $1 
			OR i.invoice_number ILIKE $1
		)
		AND i.status IN ('ISSUED', 'OVERDUE', 'PARTIALLY_PAID', 'PAID')`
	args := []interface{}{"%" + query + "%"}
	if tenantSlug != "" && tenantSlug != "superadmin" {
		where += " AND i.tenant_slug = $2"
		args = append(args, tenantSlug)
	}

	q := fmt.Sprintf(`
		SELECT i.id, i.invoice_number, i.customer_id, c.customer_number, c.full_name, c.phone,
		       i.subscription_id, i.plan_price_id, i.status,
		       i.billing_period_start, i.billing_period_end, i.issue_date, i.due_date,
		       i.subtotal, i.tax_amount, i.discount_amount, i.late_fee_amount, i.credit_applied,
		       i.total_amount, i.amount_paid, i.amount_due, i.currency, i.notes, i.issued_by,
		       i.voided_at, i.void_reason, i.created_at, i.updated_at
		FROM invoices i
		JOIN customers c ON c.id = i.customer_id
		%s
		ORDER BY i.created_at DESC
		LIMIT 10
	`, where)
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invoices []Invoice
	for rows.Next() {
		var inv Invoice
		var subtotal, tax, discount, lateFee, credit, totalAmount, paid, due int64

		err := rows.Scan(
			&inv.ID, &inv.InvoiceNumber, &inv.CustomerID, &inv.CustomerNumber, &inv.CustomerName, &inv.CustomerPhone,
			&inv.SubscriptionID, &inv.PlanPriceID, &inv.Status,
			&inv.BillingPeriodStart, &inv.BillingPeriodEnd, &inv.IssueDate, &inv.DueDate,
			&subtotal, &tax, &discount, &lateFee, &credit,
			&totalAmount, &paid, &due, &inv.Currency, &inv.Notes, &inv.IssuedBy,
			&inv.VoidedAt, &inv.VoidReason, &inv.CreatedAt, &inv.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		inv.Subtotal = money.Amount(subtotal)
		inv.TaxAmount = money.Amount(tax)
		inv.DiscountAmount = money.Amount(discount)
		inv.LateFeeAmount = money.Amount(lateFee)
		inv.CreditApplied = money.Amount(credit)
		inv.TotalAmount = money.Amount(totalAmount)
		inv.AmountPaid = money.Amount(paid)
		inv.AmountDue = money.Amount(due)

		// Fetch items for each invoice
		itemRows, err := r.db.Query(ctx, `
			SELECT id, invoice_id, item_type, description, quantity, unit_price,
			       tax_percent, discount_percent, total, period_start, period_end, created_at
			FROM invoice_items
			WHERE invoice_id = $1
			ORDER BY created_at ASC
		`, inv.ID)
		if err == nil {
			for itemRows.Next() {
				var it InvoiceItem
				var unitPrice, itemTotal int64
				if err := itemRows.Scan(
					&it.ID, &it.InvoiceID, &it.ItemType, &it.Description, &it.Quantity,
					&unitPrice, &it.TaxPercent, &it.DiscountPercent, &itemTotal,
					&it.PeriodStart, &it.PeriodEnd, &it.CreatedAt,
				); err == nil {
					it.UnitPrice = money.Amount(unitPrice)
					it.Total = money.Amount(itemTotal)
					inv.Items = append(inv.Items, it)
				}
			}
			itemRows.Close()
		}

		invoices = append(invoices, inv)
	}

	return invoices, nil
}

func (r *Repository) MarkPaid(ctx context.Context, id uuid.UUID, amount money.Amount) error {
	const q = `
		UPDATE invoices
		SET status = 'PAID', amount_paid = amount_paid + $1, amount_due = 0, updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.db.Exec(ctx, q, amount.Int64(), id)
	return err
}

func (r *Repository) RecordPartnerRevenueShare(ctx context.Context, invoiceID uuid.UUID, grossAmount money.Amount) {
	_, _ = r.db.Exec(ctx, `
		DO $$
		DECLARE
			v_partner_id UUID;
			v_share_type VARCHAR;
			v_partner_bps INT;
			v_flat_fee BIGINT;
			v_subtotal BIGINT;
			v_total BIGINT;
			v_base_dpp BIGINT;
			v_partner_amt BIGINT;
			v_isp_amt BIGINT;
			v_already_shared BOOLEAN;
		BEGIN
			-- Cek apakah invoice ini sudah pernah dicatat bagi hasilnya (idempotency)
			SELECT EXISTS (SELECT 1 FROM revenue_shares WHERE invoice_id = $2) INTO v_already_shared;
			IF v_already_shared THEN
				RETURN;
			END IF;

			SELECT c.partner_id, p.share_type, p.partner_share_bps, p.flat_fee_amount, i.subtotal, i.total_amount
			INTO v_partner_id, v_share_type, v_partner_bps, v_flat_fee, v_subtotal, v_total
			FROM invoices i
			JOIN customers c ON c.id = i.customer_id
			JOIN partners p ON p.id = c.partner_id
			WHERE i.id = $2;

			IF v_partner_id IS NOT NULL THEN
				-- Dasar Pembagian Hasil = Subtotal (Dasar Pengenaan Pajak / DPP sebelum PPN)
				-- PPN 11% adalah titipan kas negara dan bukan omset yang dibagi hasilkan.
				v_base_dpp := COALESCE(NULLIF(v_subtotal, 0), v_total, $1);

				IF v_share_type = 'FLAT_FEE' THEN
					v_isp_amt := LEAST(v_flat_fee, v_base_dpp);
					v_partner_amt := v_base_dpp - v_isp_amt;
				ELSE
					-- PERCENTAGE: Dihitung dari DPP (Subtotal sebelum PPN)
					v_partner_amt := (v_base_dpp * v_partner_bps) / 10000;
					v_isp_amt := v_base_dpp - v_partner_amt;
				END IF;

				INSERT INTO revenue_shares (partner_id, invoice_id, gross_amount, partner_amount, isp_amount, share_type, status)
				VALUES (v_partner_id, $2, v_base_dpp, v_partner_amt, v_isp_amt, v_share_type, 'CREDITED');

				UPDATE partners SET balance = balance + v_partner_amt, updated_at = NOW() WHERE id = v_partner_id;
			END IF;
		END $$;
	`, grossAmount.Int64(), invoiceID)
}



// Worker Batch Queries

type DueSubscription struct {
	SubscriptionID  uuid.UUID
	CustomerID      uuid.UUID
	PlanPriceID     uuid.UUID
	MonthlyPrice    int64
	TaxPercent      int
	GracePeriodDays int
	BillingCycle    string
	NextBillingDate time.Time
	StaticIP        string
}

func (r *Repository) GetSubscriptionsDueForBilling(ctx context.Context) ([]DueSubscription, error) {
	const q = `
		SELECT s.id, s.customer_id, s.plan_price_id, pr.monthly_price, pr.tax_percent,
		       s.grace_period_days, s.billing_cycle, s.next_billing_date,
		       COALESCE((
		           SELECT a.static_ip FROM access_accounts a
		           WHERE a.subscription_id = s.id AND a.static_ip IS NOT NULL AND a.static_ip != ''
		           LIMIT 1
		       ), '') AS static_ip
		FROM subscriptions s
		JOIN plan_prices pr ON pr.id = s.plan_price_id
		WHERE s.status IN ('ACTIVE', 'GRACE')
		  AND s.next_billing_date <= (NOW() + INTERVAL '5 days')
		  AND NOT EXISTS (
		      SELECT 1 FROM invoices i 
		      WHERE i.subscription_id = s.id 
		        AND i.status IN ('DRAFT', 'ISSUED', 'OVERDUE', 'PARTIALLY_PAID')
		  )
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []DueSubscription
	for rows.Next() {
		var d DueSubscription
		if err := rows.Scan(
			&d.SubscriptionID, &d.CustomerID, &d.PlanPriceID, &d.MonthlyPrice,
			&d.TaxPercent, &d.GracePeriodDays, &d.BillingCycle, &d.NextBillingDate,
			&d.StaticIP,
		); err == nil {
			results = append(results, d)
		}
	}
	return results, nil
}

func (r *Repository) GetPublicIPAddonPrice(ctx context.Context) (int64, string) {
	const query = `SELECT value FROM app_settings WHERE key = 'billing_addons'`
	var valBytes []byte
	err := r.db.QueryRow(ctx, query).Scan(&valBytes)
	if err != nil {
		return 50000, "Sewa Add-on IP Publik Statik"
	}

	var data struct {
		Price int64  `json:"public_ip_monthly_price"`
		Desc  string `json:"public_ip_description"`
	}
	if err := json.Unmarshal(valBytes, &data); err != nil {
		return 50000, "Sewa Add-on IP Publik Statik"
	}
	if data.Desc == "" {
		data.Desc = "Sewa Add-on IP Publik Statik"
	}
	return data.Price, data.Desc
}

func (r *Repository) GetSubscriptionStaticIP(ctx context.Context, subID uuid.UUID) (string, error) {
	const q = `
		SELECT a.static_ip
		FROM access_accounts a
		WHERE a.subscription_id = $1 AND a.static_ip IS NOT NULL AND a.static_ip != ''
		LIMIT 1
	`
	var ip string
	err := r.db.QueryRow(ctx, q, subID).Scan(&ip)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return ip, nil
}

func (r *Repository) MarkOverdueInvoices(ctx context.Context) (int64, error) {
	const q = `
		UPDATE invoices
		SET status = 'OVERDUE', updated_at = NOW()
		WHERE status IN ('ISSUED', 'PARTIALLY_PAID')
		  AND due_date < NOW()
	`
	tag, err := r.db.Exec(ctx, q)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

type OverdueGraceSubscription struct {
	SubscriptionID uuid.UUID
	CustomerID     uuid.UUID
}

func (r *Repository) GetSubscriptionsExceedingGrace(ctx context.Context) ([]OverdueGraceSubscription, error) {
	const q = `
		SELECT DISTINCT s.id, s.customer_id
		FROM subscriptions s
		JOIN invoices i ON i.subscription_id = s.id
		WHERE s.status IN ('ACTIVE', 'GRACE')
		  AND i.status = 'OVERDUE'
		  AND NOW() > (i.due_date + (s.grace_period_days || ' days')::INTERVAL)
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []OverdueGraceSubscription
	for rows.Next() {
		var item OverdueGraceSubscription
		if err := rows.Scan(&item.SubscriptionID, &item.CustomerID); err == nil {
			results = append(results, item)
		}
	}
	return results, nil
}

func (r *Repository) GetInvoicesApproachingDue(ctx context.Context, targetDays int) ([]Invoice, error) {
	const q = `
		SELECT i.id, i.invoice_number, i.customer_id, c.customer_number, c.full_name, c.phone,
		       i.subscription_id, i.plan_price_id, i.status,
		       i.billing_period_start, i.billing_period_end, i.issue_date, i.due_date,
		       i.subtotal, i.tax_amount, i.discount_amount, i.late_fee_amount, i.credit_applied,
		       i.total_amount, i.amount_paid, i.amount_due, i.currency, i.notes
		FROM invoices i
		JOIN customers c ON c.id = i.customer_id
		WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID')
		  AND i.due_date::date = (CURRENT_DATE + ($1 * INTERVAL '1 day'))::date
	`
	rows, err := r.db.Query(ctx, q, targetDays)
	if err != nil {
		return nil, fmt.Errorf("get invoices approaching due: %w", err)
	}
	defer rows.Close()

	var invoices []Invoice
	for rows.Next() {
		var inv Invoice
		var subtotal, tax, discount, lateFee, credit, total, paid, due int64
		var custNumber, fullName, phone *string
		if err := rows.Scan(
			&inv.ID, &inv.InvoiceNumber, &inv.CustomerID, &custNumber, &fullName, &phone,
			&inv.SubscriptionID, &inv.PlanPriceID, &inv.Status,
			&inv.BillingPeriodStart, &inv.BillingPeriodEnd, &inv.IssueDate, &inv.DueDate,
			&subtotal, &tax, &discount, &lateFee, &credit,
			&total, &paid, &due, &inv.Currency, &inv.Notes,
		); err == nil {
			inv.Subtotal = money.Amount(subtotal)
			inv.TaxAmount = money.Amount(tax)
			inv.DiscountAmount = money.Amount(discount)
			inv.LateFeeAmount = money.Amount(lateFee)
			inv.CreditApplied = money.Amount(credit)
			inv.TotalAmount = money.Amount(total)
			inv.AmountPaid = money.Amount(paid)
			inv.AmountDue = money.Amount(due)
			inv.CustomerNumber = custNumber
			inv.CustomerName = fullName
			inv.CustomerPhone = phone
			invoices = append(invoices, inv)
		}
	}
	return invoices, nil
}

func (r *Repository) HasNotificationBeenSentToday(ctx context.Context, customerID uuid.UUID, invoiceNumber string) bool {
	const q = `
		SELECT 1 FROM notifications
		WHERE customer_id = $1
		  AND channel = 'WHATSAPP'
		  AND body LIKE '%' || $2 || '%'
		  AND created_at::date = CURRENT_DATE
		LIMIT 1
	`
	var dummy int
	err := r.db.QueryRow(ctx, q, customerID, invoiceNumber).Scan(&dummy)
	return err == nil
}


func (r *Repository) GetCustomerCreditBalance(ctx context.Context, customerID uuid.UUID) (int64, int64, *time.Time, []CreditNote, error) {
	const q = `
		SELECT id, customer_id, reason, amount, currency, status, expires_at, created_at, hold_until, deposit_type
		FROM credit_notes
		WHERE customer_id = $1 AND status IN ('ACTIVE', 'HOLD')
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, q, customerID)
	if err != nil {
		return 0, 0, nil, nil, err
	}
	defer rows.Close()

	var usableTotal int64
	var heldTotal int64
	var latestHoldUntil *time.Time
	var notes []CreditNote
	now := time.Now()

	for rows.Next() {
		var cn CreditNote
		var amt int64
		var depType *string
		if err := rows.Scan(&cn.ID, &cn.CustomerID, &cn.Reason, &amt, &cn.Currency, &cn.Status, &cn.ExpiresAt, &cn.CreatedAt, &cn.HoldUntil, &depType); err == nil {
			cn.Amount = money.Amount(amt)
			if depType != nil {
				cn.DepositType = *depType
			}
			notes = append(notes, cn)

			// Cek apakah sedang dibekukan (Status HOLD)
			isFrozen := cn.Status == "HOLD"
			if isFrozen {
				heldTotal += amt
				if cn.HoldUntil != nil {
					if latestHoldUntil == nil || cn.HoldUntil.After(*latestHoldUntil) {
						latestHoldUntil = cn.HoldUntil
					}
				}
			} else if cn.Status == "ACTIVE" && (cn.ExpiresAt == nil || cn.ExpiresAt.After(now)) {
				usableTotal += amt
			}
		}
	}
	return usableTotal, heldTotal, latestHoldUntil, notes, nil
}

func (r *Repository) AddSecurityDeposit(ctx context.Context, customerID uuid.UUID, amount int64, durationMonths int, reason string, depositType string) (*CreditNote, error) {
	if depositType == "" {
		depositType = "SECURITY_DEPOSIT"
	}
	now := time.Now()
	holdUntil := now.AddDate(0, durationMonths, 0)
	expiresAt := now.AddDate(5, 0, 0)

	const q = `
		INSERT INTO credit_notes (customer_id, reason, amount, currency, status, expires_at, created_at, hold_until, deposit_type)
		VALUES ($1, $2, $3, 'IDR', 'HOLD', $4, NOW(), $5, $6)
		RETURNING id, customer_id, reason, amount, currency, status, expires_at, created_at, hold_until, deposit_type
	`
	var cn CreditNote
	var amt int64
	var depType string
	err := r.db.QueryRow(ctx, q, customerID, reason, amount, expiresAt, holdUntil, depositType).
		Scan(&cn.ID, &cn.CustomerID, &cn.Reason, &amt, &cn.Currency, &cn.Status, &cn.ExpiresAt, &cn.CreatedAt, &cn.HoldUntil, &depType)
	if err != nil {
		return nil, err
	}
	cn.Amount = money.Amount(amt)
	cn.DepositType = depType
	return &cn, nil
}

func (r *Repository) ReleaseSecurityDeposit(ctx context.Context, id uuid.UUID, reason string) error {
	const q = `
		UPDATE credit_notes
		SET status = 'ACTIVE',
		    hold_until = NULL,
		    reason = CASE WHEN $2 <> '' THEN reason || ' (Dicairkan: ' || $2 || ')' ELSE reason END
		WHERE id = $1 AND status = 'HOLD'
	`
	tag, err := r.db.Exec(ctx, q, id, reason)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("deposit tidak ditemukan atau sudah dicairkan")
	}
	return nil
}

func (r *Repository) ForfeitSecurityDeposit(ctx context.Context, id uuid.UUID, penaltyReason string) error {
	const q = `
		UPDATE credit_notes
		SET status = 'FORFEITED',
		    reason = reason || ' (Disita sebagai pinalti: ' || $2 || ')'
		WHERE id = $1 AND status = 'HOLD'
	`
	tag, err := r.db.Exec(ctx, q, id, penaltyReason)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("deposit tidak ditemukan atau sudah diproses")
	}
	return nil
}

func (r *Repository) RefundSecurityDeposit(ctx context.Context, id uuid.UUID, refundReason string) error {
	const q = `
		UPDATE credit_notes
		SET status = 'REFUNDED',
		    reason = reason || ' (Dikembalikan ke pelanggan: ' || $2 || ')'
		WHERE id = $1 AND status = 'HOLD'
	`
	tag, err := r.db.Exec(ctx, q, id, refundReason)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("deposit tidak ditemukan atau sudah diproses")
	}
	return nil
}

func (r *Repository) ReleaseMaturedDeposits(ctx context.Context) (int64, error) {
	const q = `
		UPDATE credit_notes
		SET status = 'ACTIVE'
		WHERE status = 'HOLD' AND hold_until IS NOT NULL AND hold_until <= NOW()
	`
	tag, err := r.db.Exec(ctx, q)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

type CustomerSummary struct {
	ID             uuid.UUID
	CustomerNumber string
	FullName       string
	Phone          string
	Email          *string
}

func (r *Repository) FindCustomerByQuery(ctx context.Context, query string) (*CustomerSummary, error) {
	const q = `
		SELECT id, customer_number, full_name, phone, email
		FROM customers
		WHERE (
			id::text = $1
			OR customer_number ILIKE $1
			OR phone ILIKE $1
			OR email ILIKE $1
		) AND deleted_at IS NULL
		ORDER BY created_at ASC
		LIMIT 1
	`
	var c CustomerSummary
	err := r.db.QueryRow(ctx, q, query).Scan(&c.ID, &c.CustomerNumber, &c.FullName, &c.Phone, &c.Email)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) AddCreditNote(ctx context.Context, customerID uuid.UUID, amount int64, reason string, expiresAt *time.Time) (*CreditNote, error) {
	const q = `
		INSERT INTO credit_notes (customer_id, reason, amount, currency, status, expires_at, created_at)
		VALUES ($1, $2, $3, 'IDR', 'ACTIVE', $4, NOW())
		RETURNING id, customer_id, reason, amount, currency, status, expires_at, created_at
	`
	var cn CreditNote
	var amt int64
	err := r.db.QueryRow(ctx, q, customerID, reason, amount, expiresAt).
		Scan(&cn.ID, &cn.CustomerID, &cn.Reason, &amt, &cn.Currency, &cn.Status, &cn.ExpiresAt, &cn.CreatedAt)
	if err != nil {
		return nil, err
	}
	cn.Amount = money.Amount(amt)
	return &cn, nil
}



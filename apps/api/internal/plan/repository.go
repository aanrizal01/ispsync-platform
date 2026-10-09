package plan

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

func (r *Repository) Create(ctx context.Context, p *Plan, initialPrice *Price) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if p.PackageGroup == "" {
		p.PackageGroup = "UMUM"
	}

	const insertPlan = `
		INSERT INTO plans (id, name, description, plan_type, download_kbps, upload_kbps, min_download_kbps, min_upload_kbps, billing_cycle, grace_period_days, status, group_id, package_group, is_visible, framed_pool, tenant_slug, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	`
	tenantSlug := p.TenantSlug
	if tenantSlug == "" {
		tenantSlug = "dev"
	}
	_, err = tx.Exec(ctx, insertPlan,
		p.ID, p.Name, p.Description, p.PlanType, p.DownloadKbps, p.UploadKbps, p.MinDownloadKbps, p.MinUploadKbps,
		p.BillingCycle, p.GracePeriodDays, p.Status, p.GroupID, p.PackageGroup, p.IsVisible, p.FramedPool, tenantSlug, p.CreatedAt, p.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert plan: %w", err)
	}

	const insertPrice = `
		INSERT INTO plan_prices (id, plan_id, monthly_price, installation_fee, activation_fee, tax_percent, late_fee_percent, currency, effective_from, effective_until, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err = tx.Exec(ctx, insertPrice,
		initialPrice.ID, p.ID, initialPrice.MonthlyPrice.Int64(), initialPrice.InstallationFee.Int64(),
		initialPrice.ActivationFee.Int64(), initialPrice.TaxPercent, initialPrice.LateFeePercent,
		initialPrice.Currency, initialPrice.EffectiveFrom, initialPrice.EffectiveUntil,
		initialPrice.CreatedBy, initialPrice.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert plan initial price: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Plan, error) {
	const q = `
		SELECT p.id, p.name, p.description, p.plan_type, p.download_kbps, p.upload_kbps, 
		       p.min_download_kbps, p.min_upload_kbps,
		       p.billing_cycle, p.grace_period_days, p.status, p.group_id, 
		       COALESCE(pg.name, ''), COALESCE(p.package_group, 'UMUM'), 
		       COALESCE(pg.cluster_code, ''), COALESCE(pg.cluster_area, ''), 
		       p.is_visible, p.framed_pool, COALESCE(p.tenant_slug, 'dev'), p.created_at, p.updated_at
		FROM plans p
		LEFT JOIN plan_groups pg ON p.group_id = pg.id
		WHERE p.id = $1
	`
	var p Plan
	err := r.db.QueryRow(ctx, q, id).Scan(
		&p.ID, &p.Name, &p.Description, &p.PlanType, &p.DownloadKbps, &p.UploadKbps,
		&p.MinDownloadKbps, &p.MinUploadKbps,
		&p.BillingCycle, &p.GracePeriodDays, &p.Status, &p.GroupID,
		&p.GroupName, &p.PackageGroup, &p.ClusterCode, &p.ClusterArea,
		&p.IsVisible, &p.FramedPool, &p.TenantSlug, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get plan by id: %w", err)
	}

	// Fetch price history (ordered newest first)
	const priceQ = `
		SELECT id, plan_id, monthly_price, installation_fee, activation_fee, tax_percent, late_fee_percent, currency, effective_from, effective_until, created_by, created_at
		FROM plan_prices
		WHERE plan_id = $1
		ORDER BY effective_from DESC
	`
	rows, err := r.db.Query(ctx, priceQ, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var pr Price
			var monthly, install, activ int64
			if err := rows.Scan(
				&pr.ID, &pr.PlanID, &monthly, &install, &activ, &pr.TaxPercent,
				&pr.LateFeePercent, &pr.Currency, &pr.EffectiveFrom, &pr.EffectiveUntil,
				&pr.CreatedBy, &pr.CreatedAt,
			); err == nil {
				pr.MonthlyPrice = money.Amount(monthly)
				pr.InstallationFee = money.Amount(install)
				pr.ActivationFee = money.Amount(activ)
				if pr.EffectiveUntil == nil && p.CurrentPrice == nil {
					curr := pr
					p.CurrentPrice = &curr
				}
				p.PriceHistory = append(p.PriceHistory, pr)
			}
		}
	}

	return &p, nil
}

func (r *Repository) List(ctx context.Context, tenantSlug string, params pagination.Params, status, planType, group, cluster string, visibleOnly *bool) ([]Plan, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if tenantSlug != "" && tenantSlug != "superadmin" {
		where += fmt.Sprintf(" AND p.tenant_slug = $%d", argIdx)
		args = append(args, tenantSlug)
		argIdx++
	}

	if status != "" {
		where += fmt.Sprintf(" AND p.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	if planType != "" {
		where += fmt.Sprintf(" AND p.plan_type = $%d", argIdx)
		args = append(args, planType)
		argIdx++
	}

	if group != "" {
		where += fmt.Sprintf(" AND (p.package_group ILIKE $%d OR pg.code ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+group+"%")
		argIdx++
	}

	if cluster != "" {
		where += fmt.Sprintf(" AND (pg.cluster_code = $%d OR pg.cluster_area ILIKE $%d OR p.package_group ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+cluster+"%")
		argIdx++
	}

	if visibleOnly != nil {
		where += fmt.Sprintf(" AND p.is_visible = $%d", argIdx)
		args = append(args, *visibleOnly)
		argIdx++
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM plans p 
		LEFT JOIN plan_groups pg ON p.group_id = pg.id
		%s
	`, where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count plans: %w", err)
	}

	orderBy := "ORDER BY p.created_at DESC"
	if params.Sort != "" {
		orderBy = fmt.Sprintf("ORDER BY p.%s %s", params.Sort, params.Order)
	}

	dataQuery := fmt.Sprintf(`
		SELECT p.id, p.name, p.description, p.plan_type, p.download_kbps, p.upload_kbps,
		       p.min_download_kbps, p.min_upload_kbps,
		       p.billing_cycle, p.grace_period_days, p.status, p.group_id,
		       COALESCE(pg.name, ''), COALESCE(p.package_group, 'UMUM'),
		       COALESCE(pg.cluster_code, ''), COALESCE(pg.cluster_area, ''),
		       p.is_visible, p.framed_pool, COALESCE(p.tenant_slug, 'dev'), p.created_at, p.updated_at,
		       pr.id, pr.monthly_price, pr.installation_fee, pr.activation_fee,
		       pr.tax_percent, pr.late_fee_percent, pr.currency, pr.effective_from, pr.effective_until
		FROM plans p
		LEFT JOIN plan_groups pg ON p.group_id = pg.id
		LEFT JOIN LATERAL (
			SELECT * FROM plan_prices
			WHERE plan_id = p.id AND effective_until IS NULL
			ORDER BY effective_from DESC
			LIMIT 1
		) pr ON true
		%s
		%s
		LIMIT $%d OFFSET $%d
	`, where, orderBy, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query plans: %w", err)
	}
	defer rows.Close()

	var plans []Plan
	for rows.Next() {
		var p Plan
		var prID *uuid.UUID
		var monthly, install, activ *int64
		var tax, late *int
		var curr *string
		var effFrom, effUntil *time.Time

		err := rows.Scan(
			&p.ID, &p.Name, &p.Description, &p.PlanType, &p.DownloadKbps, &p.UploadKbps,
			&p.MinDownloadKbps, &p.MinUploadKbps,
			&p.BillingCycle, &p.GracePeriodDays, &p.Status, &p.GroupID,
			&p.GroupName, &p.PackageGroup, &p.ClusterCode, &p.ClusterArea,
			&p.IsVisible, &p.FramedPool, &p.TenantSlug, &p.CreatedAt, &p.UpdatedAt,
			&prID, &monthly, &install, &activ, &tax, &late, &curr, &effFrom, &effUntil,
		)
		if err != nil {
			return nil, 0, err
		}

		if prID != nil && monthly != nil {
			p.CurrentPrice = &Price{
				ID:              *prID,
				PlanID:          p.ID,
				MonthlyPrice:    money.Amount(*monthly),
				InstallationFee: money.Amount(*install),
				ActivationFee:   money.Amount(*activ),
				TaxPercent:      *tax,
				LateFeePercent:  *late,
				Currency:        *curr,
				EffectiveFrom:   *effFrom,
				EffectiveUntil:  effUntil,
			}
		}

		plans = append(plans, p)
	}

	return plans, total, nil
}

func (r *Repository) Update(ctx context.Context, p *Plan) error {
	const q = `
		UPDATE plans
		SET name = $1, description = $2, status = $3, grace_period_days = $4, group_id = $5, package_group = $6, is_visible = $7,
		    download_kbps = $8, upload_kbps = $9, min_download_kbps = $10, min_upload_kbps = $11, plan_type = $12, billing_cycle = $13, framed_pool = $14, updated_at = NOW()
		WHERE id = $15
	`
	_, err := r.db.Exec(ctx, q,
		p.Name, p.Description, p.Status, p.GracePeriodDays, p.GroupID, p.PackageGroup, p.IsVisible,
		p.DownloadKbps, p.UploadKbps, p.MinDownloadKbps, p.MinUploadKbps, p.PlanType, p.BillingCycle, p.FramedPool, p.ID,
	)
	return err
}

func (r *Repository) UpdateVisibility(ctx context.Context, id uuid.UUID, isVisible bool) error {
	const q = `
		UPDATE plans
		SET is_visible = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.db.Exec(ctx, q, isVisible, id)
	return err
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM subscriptions s
		WHERE s.plan_id = $1 
		   OR s.plan_price_id IN (SELECT id FROM plan_prices WHERE plan_id = $1)
	`, id).Scan(&count)
	if err != nil {
		return fmt.Errorf("check subscriptions: %w", err)
	}

	var invoiceCount int
	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM invoices i
		WHERE i.plan_price_id IN (SELECT id FROM plan_prices WHERE plan_id = $1)
	`, id).Scan(&invoiceCount)
	if err != nil {
		return fmt.Errorf("check invoices: %w", err)
	}

	if count > 0 || invoiceCount > 0 {
		// Soft delete / deprecate so existing subscriptions & invoices are preserved
		_, err := r.db.Exec(ctx, "UPDATE plans SET status = 'DEPRECATED', updated_at = NOW() WHERE id = $1", id)
		return err
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var name string
	_ = tx.QueryRow(ctx, "SELECT name FROM plans WHERE id = $1", id).Scan(&name)

	if _, err = tx.Exec(ctx, "DELETE FROM plan_prices WHERE plan_id = $1", id); err != nil {
		return fmt.Errorf("delete plan prices: %w", err)
	}

	if _, err = tx.Exec(ctx, "DELETE FROM plans WHERE id = $1", id); err != nil {
		return fmt.Errorf("delete plan: %w", err)
	}

	if name != "" {
		_, _ = tx.Exec(ctx, "DELETE FROM radgroupreply WHERE groupname = $1", name)
	}

	return tx.Commit(ctx)
}

func (r *Repository) AddPriceVersion(ctx context.Context, newPrice *Price) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	now := time.Now()

	// Close old current price
	const closeOldPrice = `
		UPDATE plan_prices
		SET effective_until = $1
		WHERE plan_id = $2 AND effective_until IS NULL
	`
	_, err = tx.Exec(ctx, closeOldPrice, now, newPrice.PlanID)
	if err != nil {
		return fmt.Errorf("close previous price: %w", err)
	}

	// Insert new price
	const insertNewPrice = `
		INSERT INTO plan_prices (id, plan_id, monthly_price, installation_fee, activation_fee, tax_percent, late_fee_percent, currency, effective_from, effective_until, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10, $11)
	`
	_, err = tx.Exec(ctx, insertNewPrice,
		newPrice.ID, newPrice.PlanID, newPrice.MonthlyPrice.Int64(), newPrice.InstallationFee.Int64(),
		newPrice.ActivationFee.Int64(), newPrice.TaxPercent, newPrice.LateFeePercent,
		newPrice.Currency, now, newPrice.CreatedBy, now,
	)
	if err != nil {
		return fmt.Errorf("insert new price version: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetCurrentPrice(ctx context.Context, planID uuid.UUID) (*Price, error) {
	const q = `
		SELECT id, plan_id, monthly_price, installation_fee, activation_fee, tax_percent, late_fee_percent, currency, effective_from, effective_until, created_by, created_at
		FROM plan_prices
		WHERE plan_id = $1 AND effective_until IS NULL
		ORDER BY effective_from DESC
		LIMIT 1
	`
	var pr Price
	var monthly, install, activ int64
	err := r.db.QueryRow(ctx, q, planID).Scan(
		&pr.ID, &pr.PlanID, &monthly, &install, &activ, &pr.TaxPercent,
		&pr.LateFeePercent, &pr.Currency, &pr.EffectiveFrom, &pr.EffectiveUntil,
		&pr.CreatedBy, &pr.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get current price: %w", err)
	}
	pr.MonthlyPrice = money.Amount(monthly)
	pr.InstallationFee = money.Amount(install)
	pr.ActivationFee = money.Amount(activ)
	return &pr, nil
}

// Plan Groups repository methods:

func (r *Repository) ListPlanGroups(ctx context.Context, tenantSlug string) ([]PlanGroup, error) {
	const q = `
		SELECT pg.id, pg.name, pg.code, pg.description, pg.cluster_code, pg.cluster_area, pg.is_active,
		       COUNT(p.id) as plan_count, COALESCE(pg.tenant_slug, 'dev'), pg.created_at, pg.updated_at
		FROM plan_groups pg
		LEFT JOIN plans p ON p.group_id = pg.id
		WHERE ($1 = '' OR $1 = 'superadmin' OR pg.tenant_slug = $1)
		GROUP BY pg.id
		ORDER BY pg.cluster_code ASC, pg.created_at ASC
	`
	rows, err := r.db.Query(ctx, q, tenantSlug)
	if err != nil {
		return nil, fmt.Errorf("list plan groups: %w", err)
	}
	defer rows.Close()

	var groups []PlanGroup
	for rows.Next() {
		var g PlanGroup
		if err := rows.Scan(
			&g.ID, &g.Name, &g.Code, &g.Description, &g.ClusterCode, &g.ClusterArea, &g.IsActive,
			&g.PlanCount, &g.TenantSlug, &g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}
	return groups, nil
}

func (r *Repository) GetPlanGroupByID(ctx context.Context, id uuid.UUID) (*PlanGroup, error) {
	const q = `
		SELECT pg.id, pg.name, pg.code, pg.description, pg.cluster_code, pg.cluster_area, pg.is_active,
		       COUNT(p.id) as plan_count, COALESCE(pg.tenant_slug, 'dev'), pg.created_at, pg.updated_at
		FROM plan_groups pg
		LEFT JOIN plans p ON p.group_id = pg.id
		WHERE pg.id = $1
		GROUP BY pg.id
	`
	var g PlanGroup
	err := r.db.QueryRow(ctx, q, id).Scan(
		&g.ID, &g.Name, &g.Code, &g.Description, &g.ClusterCode, &g.ClusterArea, &g.IsActive,
		&g.PlanCount, &g.TenantSlug, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get plan group by id: %w", err)
	}
	return &g, nil
}

func (r *Repository) CreatePlanGroup(ctx context.Context, g *PlanGroup) error {
	tenantSlug := g.TenantSlug
	if tenantSlug == "" {
		tenantSlug = "dev"
	}
	const q = `
		INSERT INTO plan_groups (id, name, code, description, cluster_code, cluster_area, is_active, tenant_slug, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(ctx, q,
		g.ID, g.Name, g.Code, g.Description, g.ClusterCode, g.ClusterArea, g.IsActive, tenantSlug, g.CreatedAt, g.UpdatedAt,
	)
	return err
}

func (r *Repository) UpdatePlanGroup(ctx context.Context, g *PlanGroup) error {
	const q = `
		UPDATE plan_groups
		SET name = $1, description = $2, cluster_code = $3, cluster_area = $4, is_active = $5, updated_at = NOW()
		WHERE id = $6
	`
	_, err := r.db.Exec(ctx, q,
		g.Name, g.Description, g.ClusterCode, g.ClusterArea, g.IsActive, g.ID,
	)
	return err
}

func (r *Repository) DeletePlanGroup(ctx context.Context, id uuid.UUID) error {
	const q = `DELETE FROM plan_groups WHERE id = $1`
	_, err := r.db.Exec(ctx, q, id)
	return err
}

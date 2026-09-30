package subscription

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

func (r *Repository) Create(ctx context.Context, s *Subscription, acc *AccessAccount) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	const insertSub = `
		INSERT INTO subscriptions (
			id, customer_id, plan_id, plan_price_id, status, start_date, end_date,
			next_billing_date, billing_cycle, auto_renewal, grace_period_days,
			notes, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	_, err = tx.Exec(ctx, insertSub,
		s.ID, s.CustomerID, s.PlanID, s.PlanPriceID, s.Status, s.StartDate, s.EndDate,
		s.NextBillingDate, s.BillingCycle, s.AutoRenewal, s.GracePeriodDays,
		s.Notes, s.CreatedAt, s.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert subscription: %w", err)
	}

	if acc != nil {
		acc.SubscriptionID = &s.ID
		const insertAcc = `
			INSERT INTO access_accounts (
				id, customer_id, subscription_id, access_type, identity, password_hash,
				display_name, status, nas_port_type, static_ip, simultaneous_use_limit, notes, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		`
		_, err = tx.Exec(ctx, insertAcc,
			acc.ID, acc.CustomerID, acc.SubscriptionID, acc.AccessType, acc.Identity,
			acc.PasswordHash, acc.DisplayName, acc.Status, acc.NasPortType, acc.StaticIP,
			acc.SimultaneousUseLimit, acc.Notes, acc.CreatedAt, acc.UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("insert initial access account: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Subscription, error) {
	const q = `
		SELECT s.id, s.customer_id, c.customer_number, c.full_name,
		       s.plan_id, p.name, s.plan_price_id,
		       s.status, s.start_date, s.end_date, s.next_billing_date,
		       s.billing_cycle, s.auto_renewal, s.grace_period_days,
		       s.cancelled_at, s.cancellation_reason, s.notes, s.created_at, s.updated_at,
		       pr.monthly_price, pr.installation_fee, pr.activation_fee, pr.tax_percent, pr.late_fee_percent, pr.currency
		FROM subscriptions s
		JOIN customers c ON c.id = s.customer_id
		JOIN plans p ON p.id = s.plan_id
		JOIN plan_prices pr ON pr.id = s.plan_price_id
		WHERE s.id = $1
	`
	var s Subscription
	var monthly, install, activ int64
	var pr PriceSnapshot

	err := r.db.QueryRow(ctx, q, id).Scan(
		&s.ID, &s.CustomerID, &s.CustomerNumber, &s.CustomerName,
		&s.PlanID, &s.PlanName, &s.PlanPriceID,
		&s.Status, &s.StartDate, &s.EndDate, &s.NextBillingDate,
		&s.BillingCycle, &s.AutoRenewal, &s.GracePeriodDays,
		&s.CancelledAt, &s.CancellationReason, &s.Notes, &s.CreatedAt, &s.UpdatedAt,
		&monthly, &install, &activ, &pr.TaxPercent, &pr.LateFeePercent, &pr.Currency,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get subscription by id: %w", err)
	}

	pr.ID = s.PlanPriceID
	pr.MonthlyPrice = money.Amount(monthly)
	pr.InstallationFee = money.Amount(install)
	pr.ActivationFee = money.Amount(activ)
	s.PriceSnapshot = &pr

	// Fetch access accounts
	accs, err := r.GetAccessAccountsBySubscriptionID(ctx, s.ID)
	if err == nil {
		s.AccessAccounts = accs
	}

	return &s, nil
}

func (r *Repository) List(ctx context.Context, params pagination.Params, customerID *uuid.UUID, status string, search string) ([]Subscription, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if customerID != nil {
		where += fmt.Sprintf(" AND s.customer_id = $%d", argIdx)
		args = append(args, *customerID)
		argIdx++
	}

	if status != "" {
		where += fmt.Sprintf(" AND s.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	if search != "" {
		where += fmt.Sprintf(` AND (
			c.full_name ILIKE $%d 
			OR c.customer_number ILIKE $%d 
			OR c.phone ILIKE $%d 
			OR p.name ILIKE $%d 
			OR EXISTS (SELECT 1 FROM access_accounts a WHERE a.subscription_id = s.id AND a.identity ILIKE $%d)
		)`, argIdx, argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM subscriptions s 
		JOIN customers c ON c.id = s.customer_id 
		JOIN plans p ON p.id = s.plan_id 
		%s
	`, where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count subscriptions: %w", err)
	}

	orderBy := "ORDER BY s.created_at DESC"
	if params.Sort != "" {
		orderBy = fmt.Sprintf("ORDER BY s.%s %s", params.Sort, params.Order)
	}

	dataQuery := fmt.Sprintf(`
		SELECT s.id, s.customer_id, c.customer_number, c.full_name,
		       s.plan_id, p.name, s.plan_price_id,
		       s.status, s.start_date, s.end_date, s.next_billing_date,
		       s.billing_cycle, s.auto_renewal, s.grace_period_days,
		       s.cancelled_at, s.cancellation_reason, s.notes, s.created_at, s.updated_at,
		       pr.monthly_price, pr.installation_fee, pr.activation_fee, pr.tax_percent, pr.late_fee_percent, pr.currency
		FROM subscriptions s
		JOIN customers c ON c.id = s.customer_id
		JOIN plans p ON p.id = s.plan_id
		JOIN plan_prices pr ON pr.id = s.plan_price_id
		%s
		%s
		LIMIT $%d OFFSET $%d
	`, where, orderBy, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query subscriptions: %w", err)
	}
	defer rows.Close()

	var subscriptions []Subscription
	for rows.Next() {
		var s Subscription
		var monthly, install, activ int64
		var pr PriceSnapshot

		err := rows.Scan(
			&s.ID, &s.CustomerID, &s.CustomerNumber, &s.CustomerName,
			&s.PlanID, &s.PlanName, &s.PlanPriceID,
			&s.Status, &s.StartDate, &s.EndDate, &s.NextBillingDate,
			&s.BillingCycle, &s.AutoRenewal, &s.GracePeriodDays,
			&s.CancelledAt, &s.CancellationReason, &s.Notes, &s.CreatedAt, &s.UpdatedAt,
			&monthly, &install, &activ, &pr.TaxPercent, &pr.LateFeePercent, &pr.Currency,
		)
		if err != nil {
			return nil, 0, err
		}

		pr.ID = s.PlanPriceID
		pr.MonthlyPrice = money.Amount(monthly)
		pr.InstallationFee = money.Amount(install)
		pr.ActivationFee = money.Amount(activ)
		s.PriceSnapshot = &pr

		subscriptions = append(subscriptions, s)
	}

	// Populate access accounts (PPPoE / AAA) for all subscriptions in list
	if len(subscriptions) > 0 {
		subIDs := make([]uuid.UUID, len(subscriptions))
		subMap := make(map[uuid.UUID]int)
		for i, sub := range subscriptions {
			subIDs[i] = sub.ID
			subMap[sub.ID] = i
		}

		accQuery := `
			SELECT a.id, a.customer_id, a.subscription_id, a.access_type, a.identity, rc.value,
			       a.display_name, a.status, a.nas_port_type, a.static_ip, a.simultaneous_use_limit, a.notes, a.created_at, a.updated_at,
			       (sess.ip IS NOT NULL) AS is_online, sess.ip, sess.callingstationid, sess.acctsessiontime
			FROM access_accounts a
			LEFT JOIN radcheck rc ON rc.username = a.identity AND rc.attribute = 'Cleartext-Password'
			LEFT JOIN LATERAL (
				SELECT HOST(rs.framedipaddress) AS ip, rs.callingstationid::TEXT AS callingstationid, rs.acctsessiontime
				FROM radius_sessions rs
				WHERE rs.username = a.identity AND rs.acctstoptime IS NULL
				ORDER BY rs.acctstarttime DESC
				LIMIT 1
			) sess ON true
			WHERE a.subscription_id = ANY($1)
			ORDER BY a.created_at ASC
		`
		accRows, err := r.db.Query(ctx, accQuery, subIDs)
		if err == nil {
			defer accRows.Close()
			for accRows.Next() {
				var a AccessAccount
				var subID *uuid.UUID
				var clearPwd *string
				if err := accRows.Scan(
					&a.ID, &a.CustomerID, &subID, &a.AccessType, &a.Identity, &clearPwd,
					&a.DisplayName, &a.Status, &a.NasPortType, &a.StaticIP, &a.SimultaneousUseLimit, &a.Notes,
					&a.CreatedAt, &a.UpdatedAt,
					&a.IsOnline, &a.CurrentIP, &a.CallingStationID, &a.OnlineDurationSec,
				); err != nil {
					continue
				}
				if subID != nil {
					a.SubscriptionID = subID
					a.Password = clearPwd
					if idx, ok := subMap[*subID]; ok {
						subscriptions[idx].AccessAccounts = append(subscriptions[idx].AccessAccounts, a)
					}
				}
			}
		}
	}

	return subscriptions, total, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, id uuid.UUID, status Status, startDate, nextBillingDate *time.Time) error {
	const q = `
		UPDATE subscriptions
		SET status = $1,
		    start_date = COALESCE($2, start_date),
		    next_billing_date = COALESCE($3, next_billing_date),
		    updated_at = NOW()
		WHERE id = $4
	`
	_, err := r.db.Exec(ctx, q, status, startDate, nextBillingDate, id)
	return err
}

func (r *Repository) RevertToPending(ctx context.Context, id uuid.UUID) error {
	const q = `
		UPDATE subscriptions
		SET status = 'PENDING',
		    start_date = NULL,
		    next_billing_date = NULL,
		    updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, q, id)
	return err
}

func (r *Repository) UpdatePlan(ctx context.Context, id uuid.UUID, planID uuid.UUID, planPriceID uuid.UUID) error {
	const q = `
		UPDATE subscriptions
		SET plan_id = $1,
		    plan_price_id = $2,
		    updated_at = NOW()
		WHERE id = $3
	`
	_, err := r.db.Exec(ctx, q, planID, planPriceID, id)
	return err
}

func (r *Repository) Cancel(ctx context.Context, id uuid.UUID, reason string) error {
	const q = `
		UPDATE subscriptions
		SET status = 'CANCELLED',
		    cancelled_at = NOW(),
		    cancellation_reason = $1,
		    updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.db.Exec(ctx, q, reason, id)
	return err
}

func (r *Repository) Suspend(ctx context.Context, id uuid.UUID) error {
	if err := r.UpdateStatus(ctx, id, StatusSuspended, nil, nil); err != nil {
		return err
	}
	return r.UpdateAccessAccountsBySubscriptionID(ctx, id, AccessAccountSuspended)
}

// Access Accounts

func (r *Repository) CreateAccessAccount(ctx context.Context, acc *AccessAccount) error {
	const q = `
		INSERT INTO access_accounts (
			id, customer_id, subscription_id, access_type, identity, password_hash,
			display_name, status, nas_port_type, static_ip, simultaneous_use_limit, notes, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	_, err := r.db.Exec(ctx, q,
		acc.ID, acc.CustomerID, acc.SubscriptionID, acc.AccessType, acc.Identity,
		acc.PasswordHash, acc.DisplayName, acc.Status, acc.NasPortType, acc.StaticIP,
		acc.SimultaneousUseLimit, acc.Notes, acc.CreatedAt, acc.UpdatedAt,
	)
	return err
}

func (r *Repository) GetAccessAccountsBySubscriptionID(ctx context.Context, subID uuid.UUID) ([]AccessAccount, error) {
	const q = `
		SELECT a.id, a.customer_id, a.subscription_id, a.access_type, a.identity, rc.value,
		       a.display_name, a.status, a.nas_port_type, a.static_ip, a.simultaneous_use_limit, a.notes, a.created_at, a.updated_at,
		       (sess.ip IS NOT NULL) AS is_online, sess.ip, sess.callingstationid, sess.acctsessiontime
		FROM access_accounts a
		LEFT JOIN radcheck rc ON rc.username = a.identity AND rc.attribute = 'Cleartext-Password'
		LEFT JOIN LATERAL (
			SELECT HOST(rs.framedipaddress) AS ip, rs.callingstationid::TEXT AS callingstationid, rs.acctsessiontime
			FROM radius_sessions rs
			WHERE rs.username = a.identity AND rs.acctstoptime IS NULL
			ORDER BY rs.acctstarttime DESC
			LIMIT 1
		) sess ON true
		WHERE a.subscription_id = $1
		ORDER BY a.created_at ASC
	`
	rows, err := r.db.Query(ctx, q, subID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accs []AccessAccount
	for rows.Next() {
		var a AccessAccount
		var clearPwd *string
		if err := rows.Scan(
			&a.ID, &a.CustomerID, &a.SubscriptionID, &a.AccessType, &a.Identity, &clearPwd,
			&a.DisplayName, &a.Status, &a.NasPortType, &a.StaticIP, &a.SimultaneousUseLimit, &a.Notes,
			&a.CreatedAt, &a.UpdatedAt,
			&a.IsOnline, &a.CurrentIP, &a.CallingStationID, &a.OnlineDurationSec,
		); err != nil {
			return nil, err
		}
		a.Password = clearPwd
		accs = append(accs, a)
	}
	return accs, nil
}

func (r *Repository) ListAccessAccounts(ctx context.Context, params pagination.Params, customerID *uuid.UUID, accessType string) ([]AccessAccount, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if customerID != nil {
		where += fmt.Sprintf(" AND customer_id = $%d", argIdx)
		args = append(args, *customerID)
		argIdx++
	}

	if accessType != "" {
		where += fmt.Sprintf(" AND access_type = $%d", argIdx)
		args = append(args, accessType)
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM access_accounts %s", where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf(`
		SELECT a.id, a.customer_id, a.subscription_id, a.access_type, a.identity, a.password_hash,
		       a.display_name, a.status, a.nas_port_type, a.static_ip, a.simultaneous_use_limit, a.notes, a.created_at, a.updated_at,
		       (sess.ip IS NOT NULL) AS is_online, sess.ip, sess.callingstationid, sess.acctsessiontime
		FROM access_accounts a
		LEFT JOIN LATERAL (
			SELECT HOST(rs.framedipaddress) AS ip, rs.callingstationid::TEXT AS callingstationid, rs.acctsessiontime
			FROM radius_sessions rs
			WHERE rs.username = a.identity AND rs.acctstoptime IS NULL
			ORDER BY rs.acctstarttime DESC
			LIMIT 1
		) sess ON true
		%s
		ORDER BY a.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var accs []AccessAccount
	for rows.Next() {
		var a AccessAccount
		if err := rows.Scan(
			&a.ID, &a.CustomerID, &a.SubscriptionID, &a.AccessType, &a.Identity, &a.PasswordHash,
			&a.DisplayName, &a.Status, &a.NasPortType, &a.StaticIP, &a.SimultaneousUseLimit, &a.Notes,
			&a.CreatedAt, &a.UpdatedAt,
			&a.IsOnline, &a.CurrentIP, &a.CallingStationID, &a.OnlineDurationSec,
		); err != nil {
			return nil, 0, err
		}
		accs = append(accs, a)
	}
	return accs, total, nil
}

func (r *Repository) UpdateAccessAccountStatus(ctx context.Context, id uuid.UUID, status AccessAccountStatus) error {
	const q = `UPDATE access_accounts SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(ctx, q, status, id)
	return err
}

func (r *Repository) UpdateAccessAccountsBySubscriptionID(ctx context.Context, subID uuid.UUID, status AccessAccountStatus) error {
	const q = `UPDATE access_accounts SET status = $1, updated_at = NOW() WHERE subscription_id = $2`
	_, err := r.db.Exec(ctx, q, status, subID)
	return err
}

func (r *Repository) GetAccessAccountByID(ctx context.Context, id uuid.UUID) (*AccessAccount, error) {
	const q = `
		SELECT a.id, a.customer_id, a.subscription_id, a.access_type, a.identity, a.password_hash, rc.value,
		       a.display_name, a.status, a.nas_port_type, a.static_ip, a.simultaneous_use_limit, a.notes, a.created_at, a.updated_at,
		       (sess.ip IS NOT NULL) AS is_online, sess.ip, sess.callingstationid, sess.acctsessiontime
		FROM access_accounts a
		LEFT JOIN radcheck rc ON rc.username = a.identity AND rc.attribute = 'Cleartext-Password'
		LEFT JOIN LATERAL (
			SELECT HOST(rs.framedipaddress) AS ip, rs.callingstationid::TEXT AS callingstationid, rs.acctsessiontime
			FROM radius_sessions rs
			WHERE rs.username = a.identity AND rs.acctstoptime IS NULL
			ORDER BY rs.acctstarttime DESC
			LIMIT 1
		) sess ON true
		WHERE a.id = $1
	`
	var a AccessAccount
	var clearPwd *string
	err := r.db.QueryRow(ctx, q, id).Scan(
		&a.ID, &a.CustomerID, &a.SubscriptionID, &a.AccessType, &a.Identity, &a.PasswordHash, &clearPwd,
		&a.DisplayName, &a.Status, &a.NasPortType, &a.StaticIP, &a.SimultaneousUseLimit, &a.Notes,
		&a.CreatedAt, &a.UpdatedAt,
		&a.IsOnline, &a.CurrentIP, &a.CallingStationID, &a.OnlineDurationSec,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get access account by id: %w", err)
	}
	a.Password = clearPwd
	return &a, nil
}

func (r *Repository) UpdateAccessAccountIP(ctx context.Context, id uuid.UUID, staticIP *string) (*AccessAccount, error) {
	const q = `
		UPDATE access_accounts
		SET static_ip = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, customer_id, subscription_id, access_type, identity, password_hash,
		          display_name, status, nas_port_type, static_ip, simultaneous_use_limit, notes, created_at, updated_at
	`
	var a AccessAccount
	err := r.db.QueryRow(ctx, q, staticIP, id).Scan(
		&a.ID, &a.CustomerID, &a.SubscriptionID, &a.AccessType, &a.Identity, &a.PasswordHash,
		&a.DisplayName, &a.Status, &a.NasPortType, &a.StaticIP, &a.SimultaneousUseLimit, &a.Notes,
		&a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("update access account ip: %w", err)
	}
	return &a, nil
}

package report

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetFinancialSummary(ctx context.Context, tenantSlug string) (*FinancialSummary, error) {
	var summary FinancialSummary

	// 1. Active subscribers & Total customers
	const custQuery = `
		SELECT
			(SELECT COUNT(*) FROM subscriptions WHERE status = 'ACTIVE' AND ($1 = '' OR $1 = 'superadmin' OR tenant_slug = $1)),
			(SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL AND ($1 = '' OR $1 = 'superadmin' OR tenant_slug = $1))
	`
	if err := r.db.QueryRow(ctx, custQuery, tenantSlug).Scan(&summary.ActiveSubscribers, &summary.TotalCustomers); err != nil {
		return nil, fmt.Errorf("query customer counts: %w", err)
	}

	// 2. MRR (Monthly Recurring Revenue)
	const mrrQuery = `
		SELECT COALESCE(SUM(pr.monthly_price), 0)
		FROM subscriptions s
		JOIN plan_prices pr ON pr.id = s.plan_price_id
		WHERE s.status = 'ACTIVE' AND ($1 = '' OR $1 = 'superadmin' OR s.tenant_slug = $1)
	`
	if err := r.db.QueryRow(ctx, mrrQuery, tenantSlug).Scan(&summary.MRR); err != nil {
		return nil, fmt.Errorf("query MRR: %w", err)
	}
	summary.ARR = summary.MRR * 12

	// 3. ARPU (Average Revenue Per User)
	if summary.ActiveSubscribers > 0 {
		summary.ARPU = summary.MRR / int64(summary.ActiveSubscribers)
	}

	// 4. Invoices and payments collection totals (subscription only)
	const invQuery = `
		SELECT
			COALESCE(SUM(amount_due), 0),
			COALESCE(SUM(amount_paid), 0),
			COALESCE(SUM(tax_amount) FILTER (WHERE status = 'PAID'), 0)
		FROM invoices
		WHERE status != 'VOID' AND ($1 = '' OR $1 = 'superadmin' OR tenant_slug = $1)
	`
	if err := r.db.QueryRow(ctx, invQuery, tenantSlug).Scan(&summary.TotalInvoiced, &summary.SubscriptionCollected, &summary.SubscriptionTax); err != nil {
		return nil, fmt.Errorf("query invoice totals: %w", err)
	}

	// 5. Hotspot Vouchers Online (direct retail to end-user)
	const voucherOnlineQuery = `
		SELECT
			COALESCE(SUM(vt.price - v.discount_amount), 0),
			COALESCE(SUM(v.agent_commission), 0)
		FROM vouchers v
		JOIN voucher_templates vt ON vt.id = v.template_id
		WHERE v.channel = 'ONLINE' AND v.status != 'REVOKED'
		  AND ($1 = '' OR $1 = 'superadmin' OR v.tenant_slug = $1)
	`
	var onlineGrossPaid int64
	var onlineCommission int64
	if err := r.db.QueryRow(ctx, voucherOnlineQuery, tenantSlug).Scan(&onlineGrossPaid, &onlineCommission); err != nil {
		onlineGrossPaid = 0
		onlineCommission = 0
	}

	// 5b. Passpoint Orders (WiFi Roaming / Hotspot 2.0 - dipotong diskon via final_price)
	const passpointOrdersQuery = `
		SELECT
			COALESCE(SUM(final_price), 0),
			COALESCE(SUM(agent_commission), 0)
		FROM passpoint_orders
		WHERE status = 'PAID'
		  AND ($1 = '' OR $1 = 'superadmin' OR tenant_slug = $1)
	`
	var passpointGrossPaid int64
	var passpointCommission int64
	if err := r.db.QueryRow(ctx, passpointOrdersQuery, tenantSlug).Scan(&passpointGrossPaid, &passpointCommission); err != nil {
		passpointGrossPaid = 0
		passpointCommission = 0
	}

	summary.VoucherOnlineCollected = onlineGrossPaid + passpointGrossPaid
	summary.TotalAgentCommission = onlineCommission + passpointCommission

	// 6. Hotspot Vouchers Offline (agent batch purchases debited from balance)
	const voucherOfflineQuery = `
		SELECT
			COALESCE(SUM(ABS(m.amount)), 0)
		FROM agent_balance_mutations m
		JOIN agents a ON a.id = m.agent_id
		WHERE m.mutation_type = 'VOUCHER_OFFLINE_BUY'
		  AND ($1 = '' OR $1 = 'superadmin' OR a.tenant_slug = $1)
	`
	var offlineNetCost int64
	if err := r.db.QueryRow(ctx, voucherOfflineQuery, tenantSlug).Scan(&offlineNetCost); err != nil {
		offlineNetCost = 0
	}
	summary.VoucherOfflineCollected = offlineNetCost

	// 7. Calculate PPN 11% on Vouchers per PMK 6/2021
	voucherTotalCollected := summary.VoucherOnlineCollected + summary.VoucherOfflineCollected
	if voucherTotalCollected > 0 {
		voucherDPP := int64(float64(voucherTotalCollected) / 1.11)
		summary.VoucherTax = voucherTotalCollected - voucherDPP
	}

	// 8. Consolidated Totals
	summary.TotalCollected = summary.SubscriptionCollected + summary.VoucherOnlineCollected + summary.VoucherOfflineCollected
	summary.TotalTaxCollected = summary.SubscriptionTax + summary.VoucherTax

	if summary.TotalInvoiced > summary.SubscriptionCollected {
		summary.OutstandingDue = summary.TotalInvoiced - summary.SubscriptionCollected
	}
	if summary.TotalInvoiced > 0 {
		summary.CollectionRate = float64(summary.SubscriptionCollected) / float64(summary.TotalInvoiced) * 100
	}

	// 5. Churn rate (last 30 days)
	const churnQuery = `
		SELECT COUNT(*)
		FROM subscriptions
		WHERE status = 'CANCELLED'
		  AND cancelled_at >= NOW() - INTERVAL '30 days'
		  AND ($1 = '' OR $1 = 'superadmin' OR tenant_slug = $1)
	`
	var cancelled30d int
	if err := r.db.QueryRow(ctx, churnQuery, tenantSlug).Scan(&cancelled30d); err == nil && summary.ActiveSubscribers > 0 {
		summary.ChurnRatePercent = (float64(cancelled30d) / float64(summary.ActiveSubscribers+cancelled30d)) * 100
	}

	// 6. Deposit and Credit balances summary (Unearned revenue, held security deposits, and forfeited income)
	const creditNotesQuery = `
		SELECT
			COALESCE(SUM(amount) FILTER (WHERE status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > NOW())), 0),
			COALESCE(SUM(amount) FILTER (WHERE status = 'HOLD'), 0),
			COALESCE(SUM(amount) FILTER (WHERE status = 'FORFEITED'), 0)
		FROM credit_notes
		WHERE ($1 = '' OR $1 = 'superadmin' OR tenant_slug = $1)
	`
	if err := r.db.QueryRow(ctx, creditNotesQuery, tenantSlug).Scan(
		&summary.TotalActiveCredits,
		&summary.TotalHeldDeposits,
		&summary.TotalForfeitedDeposits,
	); err != nil {
		return nil, fmt.Errorf("query credit notes totals: %w", err)
	}

	// 7. Total Agent Deposits (Liabilitas / Saldo Mengendap Dompet Mitra Agen)
	const agentDepositsQuery = `
		SELECT COALESCE(SUM(balance), 0)
		FROM agents
		WHERE status != 'TERMINATED'
		  AND ($1 = '' OR $1 = 'superadmin' OR tenant_slug = $1)
	`
	if err := r.db.QueryRow(ctx, agentDepositsQuery, tenantSlug).Scan(&summary.TotalAgentDeposits); err != nil {
		summary.TotalAgentDeposits = 0
	}

	// 8. Total Operational Expenses
	const expensesQuery = `SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE ($1 = '' OR $1 = 'superadmin' OR tenant_slug = $1)`
	if err := r.db.QueryRow(ctx, expensesQuery, tenantSlug).Scan(&summary.TotalOperationalExpenses); err != nil {
		summary.TotalOperationalExpenses = 0
	}

	return &summary, nil
}

func (r *Repository) GetRevenueByPlan(ctx context.Context, tenantSlug string) ([]PlanRevenue, error) {
	const q = `
		SELECT
			p.id,
			p.name,
			COUNT(s.id) AS sub_count,
			COALESCE(pr.monthly_price, 0) AS price,
			COALESCE(SUM(pr.monthly_price), 0) AS total_revenue
		FROM plans p
		JOIN subscriptions s ON s.plan_id = p.id AND s.status = 'ACTIVE'
		LEFT JOIN plan_prices pr ON pr.id = s.plan_price_id
		WHERE ($1 = '' OR $1 = 'superadmin' OR s.tenant_slug = $1)
		GROUP BY p.id, p.name, pr.monthly_price
		ORDER BY total_revenue DESC, p.name ASC
	`
	rows, err := r.db.Query(ctx, q, tenantSlug)
	if err != nil {
		return nil, fmt.Errorf("query revenue by plan: %w", err)
	}
	defer rows.Close()

	plans := make([]PlanRevenue, 0)
	for rows.Next() {
		var pr PlanRevenue
		if err := rows.Scan(&pr.PlanID, &pr.PlanName, &pr.SubscriberCount, &pr.MonthlyPrice, &pr.MonthlyRevenue); err != nil {
			return nil, fmt.Errorf("scan plan revenue: %w", err)
		}
		plans = append(plans, pr)
	}
	return plans, nil
}

func (r *Repository) GetRevenueTrends(ctx context.Context, tenantSlug string, limitMonths int) ([]RevenueTrend, error) {
	if limitMonths <= 0 {
		limitMonths = 6
	}

	const q = `
		SELECT
			TO_CHAR(created_at, 'YYYY-MM') AS month_str,
			COALESCE(SUM(amount_due), 0) AS total_invoiced,
			COALESCE(SUM(amount_paid), 0) AS total_paid
		FROM invoices
		WHERE status != 'VOID'
		  AND ($1 = '' OR $1 = 'superadmin' OR tenant_slug = $1)
		  AND created_at >= NOW() - (INTERVAL '1 month' * $2)
		GROUP BY TO_CHAR(created_at, 'YYYY-MM')
		ORDER BY month_str ASC
	`
	rows, err := r.db.Query(ctx, q, tenantSlug, limitMonths)
	if err != nil {
		return nil, fmt.Errorf("query revenue trends: %w", err)
	}
	defer rows.Close()

	trends := make([]RevenueTrend, 0)
	for rows.Next() {
		var t RevenueTrend
		if err := rows.Scan(&t.Month, &t.Invoiced, &t.Collected); err != nil {
			return nil, fmt.Errorf("scan revenue trend: %w", err)
		}
		trends = append(trends, t)
	}
	return trends, nil
}

func (r *Repository) GetTrafficStats(ctx context.Context, tenantSlug string) (*TrafficStats, error) {
	const q = `
		SELECT
			COALESCE(SUM(rs.acctinputoctets), 0),
			COALESCE(SUM(rs.acctoutputoctets), 0),
			COUNT(*) FILTER (WHERE rs.acctstoptime IS NULL),
			COALESCE(AVG(rs.acctsessiontime), 0)
		FROM radius_sessions rs
		WHERE ($1 = '' OR $1 = 'superadmin' OR rs.username IN (
			SELECT aa.identity FROM access_accounts aa JOIN customers c ON c.id = aa.customer_id WHERE c.tenant_slug = $1
			UNION
			SELECT v.code FROM vouchers v WHERE v.tenant_slug = $1
		))
	`
	var inBytes, outBytes int64
	var activeSessions int
	var avgSessionSec float64

	err := r.db.QueryRow(ctx, q, tenantSlug).Scan(&inBytes, &outBytes, &activeSessions, &avgSessionSec)
	if err != nil {
		return nil, fmt.Errorf("query traffic stats: %w", err)
	}

	const bytesPerGB = 1024 * 1024 * 1024
	inGB := float64(inBytes) / bytesPerGB
	outGB := float64(outBytes) / bytesPerGB

	return &TrafficStats{
		TotalGigabytes:    inGB + outGB,
		UploadGigabytes:   inGB,
		DownloadGigabytes: outGB,
		ActiveSessions:    activeSessions,
		AvgSessionMinutes: int(avgSessionSec / 60),
	}, nil
}

func (r *Repository) GetInvoiceTransactions(ctx context.Context, tenantSlug, from, to string) ([]InvoiceTransaction, error) {
	q := `
		SELECT
			i.invoice_number,
			c.full_name,
			c.customer_number,
			COALESCE(TO_CHAR(i.issue_date, 'YYYY-MM-DD HH24:MI'), ''),
			TO_CHAR(i.due_date, 'YYYY-MM-DD'),
			i.status,
			i.subtotal,
			i.tax_amount,
			i.total_amount,
			i.amount_paid,
			i.amount_due
		FROM invoices i
		JOIN customers c ON c.id = i.customer_id
		WHERE ($1 = '' OR $1 = 'superadmin' OR i.tenant_slug = $1)
	`
	args := []any{tenantSlug}
	argIdx := 2
	if from != "" {
		q += fmt.Sprintf(" AND i.created_at >= $%d::timestamptz", argIdx)
		args = append(args, from)
		argIdx++
	}
	if to != "" {
		q += fmt.Sprintf(" AND i.created_at <= $%d::timestamptz", argIdx)
		args = append(args, to)
		argIdx++
	}
	q += " ORDER BY i.created_at DESC LIMIT 500"

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query invoice transactions: %w", err)
	}
	defer rows.Close()

	list := make([]InvoiceTransaction, 0)
	for rows.Next() {
		var it InvoiceTransaction
		if err := rows.Scan(
			&it.InvoiceNumber,
			&it.CustomerName,
			&it.CustomerCode,
			&it.IssueDate,
			&it.DueDate,
			&it.Status,
			&it.Subtotal,
			&it.TaxAmount,
			&it.TotalAmount,
			&it.AmountPaid,
			&it.AmountDue,
		); err != nil {
			return nil, fmt.Errorf("scan invoice transaction: %w", err)
		}
		list = append(list, it)
	}
	return list, nil
}

func (r *Repository) GetVoucherTaxTransactions(ctx context.Context, tenantSlug, from, to string) ([]VoucherTaxTransaction, error) {
	unionQ := `
		SELECT
			TO_CHAR(v.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
			COALESCE(v.order_id, v.code) AS ref_num,
			'ONLINE' AS channel,
			COALESCE(a.name, 'Direct / Mandiri') AS agent_name,
			COALESCE(vt.name, 'Hotspot Voucher') AS template_name,
			COALESCE(vt.price, 0) AS face_value,
			v.discount_amount AS discount_amount,
			(COALESCE(vt.price, 0) - v.discount_amount) AS net_paid,
			v.agent_commission AS agent_commission,
			v.created_at AS raw_time,
			v.tenant_slug AS tenant_slug
		FROM vouchers v
		LEFT JOIN agents a ON a.id = v.agent_id
		LEFT JOIN voucher_templates vt ON vt.id = v.template_id
		WHERE v.channel = 'ONLINE' AND v.status != 'REVOKED'

		UNION ALL

		SELECT
			TO_CHAR(m.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
			COALESCE(m.reference_id, 'BATCH-OFFLINE') AS ref_num,
			'OFFLINE' AS channel,
			COALESCE(a.name, 'Agen Offline') AS agent_name,
			COALESCE(m.description, 'Pembelian Batch Voucher Offline') AS template_name,
			ABS(m.amount) AS face_value,
			0 AS discount_amount,
			ABS(m.amount) AS net_paid,
			0 AS agent_commission,
			m.created_at AS raw_time,
			a.tenant_slug AS tenant_slug
		FROM agent_balance_mutations m
		JOIN agents a ON a.id = m.agent_id
		WHERE m.mutation_type = 'VOUCHER_OFFLINE_BUY'

		UNION ALL

		SELECT
			TO_CHAR(COALESCE(po.paid_at, po.created_at), 'YYYY-MM-DD HH24:MI') AS created_at,
			po.order_id AS ref_num,
			'PASSPOINT' AS channel,
			COALESCE(a.name, 'Direct Passpoint') AS agent_name,
			po.package_name AS template_name,
			po.original_price AS face_value,
			po.discount_amount AS discount_amount,
			po.final_price AS net_paid,
			po.agent_commission AS agent_commission,
			COALESCE(po.paid_at, po.created_at) AS raw_time,
			po.tenant_slug AS tenant_slug
		FROM passpoint_orders po
		LEFT JOIN agents a ON a.id = po.agent_id
		WHERE po.status = 'PAID'
	`

	wrapQ := fmt.Sprintf(`
		SELECT
			t.created_at,
			t.ref_num,
			t.channel,
			t.agent_name,
			t.template_name,
			t.face_value,
			t.discount_amount,
			t.net_paid,
			t.agent_commission
		FROM (%s) t
		WHERE ($1 = '' OR $1 = 'superadmin' OR t.tenant_slug = $1)
	`, unionQ)

	args := []any{tenantSlug}
	argIdx := 2
	if from != "" {
		wrapQ += fmt.Sprintf(" AND t.raw_time >= $%d::timestamptz", argIdx)
		args = append(args, from)
		argIdx++
	}
	if to != "" {
		wrapQ += fmt.Sprintf(" AND t.raw_time <= $%d::timestamptz", argIdx)
		args = append(args, to)
		argIdx++
	}
	wrapQ += " ORDER BY t.raw_time DESC LIMIT 1000"

	rows, err := r.db.Query(ctx, wrapQ, args...)
	if err != nil {
		return nil, fmt.Errorf("query voucher tax transactions: %w", err)
	}
	defer rows.Close()

	list := make([]VoucherTaxTransaction, 0)
	for rows.Next() {
		var vt VoucherTaxTransaction
		if err := rows.Scan(
			&vt.CreatedAt,
			&vt.ReferenceNumber,
			&vt.Channel,
			&vt.AgentName,
			&vt.TemplateName,
			&vt.FaceValue,
			&vt.DiscountAmount,
			&vt.NetAmountPaid,
			&vt.AgentCommission,
		); err != nil {
			return nil, fmt.Errorf("scan voucher tax transaction: %w", err)
		}
		// Hitung DPP dan PPN 11% (PMK 6/2021)
		if vt.NetAmountPaid > 0 {
			vt.DPPAmount = int64(float64(vt.NetAmountPaid) / 1.11)
			vt.TaxAmount = vt.NetAmountPaid - vt.DPPAmount
		}
		list = append(list, vt)
	}
	return list, nil
}

func (r *Repository) GetMonthlyRevenueData(ctx context.Context, tenantSlug string, year int) ([]MonthlyRevenueData, error) {
	// 1. Query Subscription Invoices
	const invQuery = `
		SELECT
			TO_CHAR(i.created_at, 'YYYY-MM') AS month_str,
			COALESCE(SUM(i.amount_paid), 0) AS total_paid,
			COALESCE(SUM(i.tax_amount) FILTER (WHERE i.status = 'PAID'), 0) AS total_tax,
			COALESCE(SUM(i.amount_paid) FILTER (WHERE c.partner_id IS NULL), 0) AS self_paid,
			COALESCE(SUM(i.amount_paid) FILTER (WHERE c.partner_id IS NOT NULL), 0) AS partner_paid,
			COALESCE(SUM(i.amount_due) FILTER (WHERE i.status = 'VOID'), 0) AS bad_debt
		FROM invoices i
		LEFT JOIN customers c ON c.id = i.customer_id
		WHERE EXTRACT(YEAR FROM i.created_at) = $1
		  AND ($2 = '' OR $2 = 'superadmin' OR i.tenant_slug = $2)
		GROUP BY TO_CHAR(i.created_at, 'YYYY-MM')
	`
	rowsInv, err := r.db.Query(ctx, invQuery, year, tenantSlug)
	if err != nil {
		return nil, fmt.Errorf("query monthly invoice revenue: %w", err)
	}
	defer rowsInv.Close()

	dataMap := make(map[string]*MonthlyRevenueData)
	for m := 1; m <= 12; m++ {
		mStr := fmt.Sprintf("%04d-%02d", year, m)
		dataMap[mStr] = &MonthlyRevenueData{MonthStr: mStr}
	}

	for rowsInv.Next() {
		var mStr string
		var totalPaid, totalTax, selfPaid, partnerPaid, badDebt int64
		if err := rowsInv.Scan(&mStr, &totalPaid, &totalTax, &selfPaid, &partnerPaid, &badDebt); err == nil {
			if item, exists := dataMap[mStr]; exists {
				item.SubscriptionPaid = totalPaid
				item.SubscriptionTax = totalTax
				item.SelfSubscriptionPaid = selfPaid
				item.PartnerKSORevenue = partnerPaid
				item.BadDebtAmount = badDebt
			}
		}
	}

	// 2. Query Online Vouchers
	const onlineQuery = `
		SELECT
			TO_CHAR(v.created_at, 'YYYY-MM') AS month_str,
			COALESCE(SUM(vt.price - v.discount_amount), 0) AS online_paid
		FROM vouchers v
		JOIN voucher_templates vt ON vt.id = v.template_id
		WHERE v.channel = 'ONLINE' AND v.status != 'REVOKED'
		  AND EXTRACT(YEAR FROM v.created_at) = $1
		  AND ($2 = '' OR $2 = 'superadmin' OR v.tenant_slug = $2)
		GROUP BY TO_CHAR(v.created_at, 'YYYY-MM')
	`
	rowsOnline, err := r.db.Query(ctx, onlineQuery, year, tenantSlug)
	if err == nil {
		defer rowsOnline.Close()
		for rowsOnline.Next() {
			var mStr string
			var onlinePaid int64
			if err := rowsOnline.Scan(&mStr, &onlinePaid); err == nil {
				if item, exists := dataMap[mStr]; exists {
					item.VoucherOnlinePaid = onlinePaid
				}
			}
		}
	}

	// 2b. Query Passpoint Orders (WiFi Roaming / Hotspot 2.0 - final_price setelah diskon)
	const passpointQuery = `
		SELECT
			TO_CHAR(COALESCE(paid_at, created_at), 'YYYY-MM') AS month_str,
			COALESCE(SUM(final_price), 0) AS passpoint_paid
		FROM passpoint_orders
		WHERE status = 'PAID'
		  AND EXTRACT(YEAR FROM COALESCE(paid_at, created_at)) = $1
		  AND ($2 = '' OR $2 = 'superadmin' OR tenant_slug = $2)
		GROUP BY TO_CHAR(COALESCE(paid_at, created_at), 'YYYY-MM')
	`
	rowsPasspoint, err := r.db.Query(ctx, passpointQuery, year, tenantSlug)
	if err == nil {
		defer rowsPasspoint.Close()
		for rowsPasspoint.Next() {
			var mStr string
			var passpointPaid int64
			if err := rowsPasspoint.Scan(&mStr, &passpointPaid); err == nil {
				if item, exists := dataMap[mStr]; exists {
					item.VoucherOnlinePaid += passpointPaid
				}
			}
		}
	}

	// 3. Query Offline Vouchers
	const offlineQuery = `
		SELECT
			TO_CHAR(created_at, 'YYYY-MM') AS month_str,
			COALESCE(SUM(ABS(m.amount)), 0) AS offline_paid
		FROM agent_balance_mutations m
		JOIN agents a ON a.id = m.agent_id
		WHERE m.mutation_type = 'VOUCHER_OFFLINE_BUY'
		  AND EXTRACT(YEAR FROM m.created_at) = $1
		  AND ($2 = '' OR $2 = 'superadmin' OR a.tenant_slug = $2)
		GROUP BY TO_CHAR(created_at, 'YYYY-MM')
	`
	rowsOffline, err := r.db.Query(ctx, offlineQuery, year, tenantSlug)
	if err == nil {
		defer rowsOffline.Close()
		for rowsOffline.Next() {
			var mStr string
			var offlinePaid int64
			if err := rowsOffline.Scan(&mStr, &offlinePaid); err == nil {
				if item, exists := dataMap[mStr]; exists {
					item.VoucherOfflinePaid = offlinePaid
				}
			}
		}
	}

	// 4. Query Deductible Expenses (is_bhp_deductible = true)
	const expenseQuery = `
		SELECT
			TO_CHAR(expense_date, 'YYYY-MM') AS month_str,
			COALESCE(SUM(amount), 0) AS deductible_paid
		FROM expenses
		WHERE is_bhp_deductible = true
		  AND EXTRACT(YEAR FROM expense_date) = $1
		  AND ($2 = '' OR $2 = 'superadmin' OR tenant_slug = $2)
		GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
	`
	rowsExp, err := r.db.Query(ctx, expenseQuery, year, tenantSlug)
	if err == nil {
		defer rowsExp.Close()
		for rowsExp.Next() {
			var mStr string
			var deductiblePaid int64
			if err := rowsExp.Scan(&mStr, &deductiblePaid); err == nil {
				if item, exists := dataMap[mStr]; exists {
					item.DeductibleExpenses = deductiblePaid
				}
			}
		}
	}

	// Assemble chronological list for all 12 months
	result := make([]MonthlyRevenueData, 12)
	for m := 1; m <= 12; m++ {
		mStr := fmt.Sprintf("%04d-%02d", year, m)
		result[m-1] = *dataMap[mStr]
	}
	return result, nil
}

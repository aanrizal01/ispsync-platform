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

func (r *Repository) GetFinancialSummary(ctx context.Context) (*FinancialSummary, error) {
	var summary FinancialSummary

	// 1. Active subscribers & Total customers
	const custQuery = `
		SELECT
			(SELECT COUNT(*) FROM subscriptions WHERE status = 'ACTIVE'),
			(SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL)
	`
	if err := r.db.QueryRow(ctx, custQuery).Scan(&summary.ActiveSubscribers, &summary.TotalCustomers); err != nil {
		return nil, fmt.Errorf("query customer counts: %w", err)
	}

	// 2. MRR (Monthly Recurring Revenue)
	const mrrQuery = `
		SELECT COALESCE(SUM(pr.monthly_price), 0)
		FROM subscriptions s
		JOIN plan_prices pr ON pr.id = s.plan_price_id
		WHERE s.status = 'ACTIVE'
	`
	if err := r.db.QueryRow(ctx, mrrQuery).Scan(&summary.MRR); err != nil {
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
		WHERE status != 'VOID'
	`
	if err := r.db.QueryRow(ctx, invQuery).Scan(&summary.TotalInvoiced, &summary.SubscriptionCollected, &summary.SubscriptionTax); err != nil {
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
	`
	var onlineGrossPaid int64
	var onlineCommission int64
	if err := r.db.QueryRow(ctx, voucherOnlineQuery).Scan(&onlineGrossPaid, &onlineCommission); err != nil {
		onlineGrossPaid = 0
		onlineCommission = 0
	}
	summary.VoucherOnlineCollected = onlineGrossPaid
	summary.TotalAgentCommission = onlineCommission

	// 6. Hotspot Vouchers Offline (agent batch purchases debited from balance)
	const voucherOfflineQuery = `
		SELECT
			COALESCE(SUM(ABS(amount)), 0)
		FROM agent_balance_mutations
		WHERE mutation_type = 'VOUCHER_OFFLINE_BUY'
	`
	var offlineNetCost int64
	if err := r.db.QueryRow(ctx, voucherOfflineQuery).Scan(&offlineNetCost); err != nil {
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
	`
	var cancelled30d int
	if err := r.db.QueryRow(ctx, churnQuery).Scan(&cancelled30d); err == nil && summary.ActiveSubscribers > 0 {
		summary.ChurnRatePercent = (float64(cancelled30d) / float64(summary.ActiveSubscribers+cancelled30d)) * 100
	}

	// 6. Deposit and Credit balances summary (Unearned revenue, held security deposits, and forfeited income)
	const creditNotesQuery = `
		SELECT
			COALESCE(SUM(amount) FILTER (WHERE status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > NOW())), 0),
			COALESCE(SUM(amount) FILTER (WHERE status = 'HOLD'), 0),
			COALESCE(SUM(amount) FILTER (WHERE status = 'FORFEITED'), 0)
		FROM credit_notes
	`
	if err := r.db.QueryRow(ctx, creditNotesQuery).Scan(
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
	`
	if err := r.db.QueryRow(ctx, agentDepositsQuery).Scan(&summary.TotalAgentDeposits); err != nil {
		summary.TotalAgentDeposits = 0
	}

	// 8. Total Operational Expenses
	const expensesQuery = `SELECT COALESCE(SUM(amount), 0) FROM expenses`
	if err := r.db.QueryRow(ctx, expensesQuery).Scan(&summary.TotalOperationalExpenses); err != nil {
		summary.TotalOperationalExpenses = 0
	}

	return &summary, nil
}

func (r *Repository) GetRevenueByPlan(ctx context.Context) ([]PlanRevenue, error) {
	const q = `
		SELECT
			p.id,
			p.name,
			COUNT(s.id) AS sub_count,
			COALESCE(pr.monthly_price, 0) AS price,
			COALESCE(SUM(pr.monthly_price), 0) AS total_revenue
		FROM plans p
		LEFT JOIN subscriptions s ON s.plan_id = p.id AND s.status = 'ACTIVE'
		LEFT JOIN plan_prices pr ON pr.id = s.plan_price_id
		GROUP BY p.id, p.name, pr.monthly_price
		ORDER BY total_revenue DESC, p.name ASC
	`
	rows, err := r.db.Query(ctx, q)
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

func (r *Repository) GetRevenueTrends(ctx context.Context, limitMonths int) ([]RevenueTrend, error) {
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
		  AND created_at >= NOW() - (INTERVAL '1 month' * $1)
		GROUP BY TO_CHAR(created_at, 'YYYY-MM')
		ORDER BY month_str ASC
	`
	rows, err := r.db.Query(ctx, q, limitMonths)
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

func (r *Repository) GetTrafficStats(ctx context.Context) (*TrafficStats, error) {
	const q = `
		SELECT
			COALESCE(SUM(acctinputoctets), 0),
			COALESCE(SUM(acctoutputoctets), 0),
			COUNT(*) FILTER (WHERE acctstoptime IS NULL),
			COALESCE(AVG(acctsessiontime), 0)
		FROM radius_sessions
	`
	var inBytes, outBytes int64
	var activeSessions int
	var avgSessionSec float64

	err := r.db.QueryRow(ctx, q).Scan(&inBytes, &outBytes, &activeSessions, &avgSessionSec)
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

func (r *Repository) GetInvoiceTransactions(ctx context.Context, from, to string) ([]InvoiceTransaction, error) {
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
		WHERE 1=1
	`
	var args []any
	argIdx := 1
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

func (r *Repository) GetVoucherTaxTransactions(ctx context.Context, from, to string) ([]VoucherTaxTransaction, error) {
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
			v.created_at AS raw_time
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
			m.created_at AS raw_time
		FROM agent_balance_mutations m
		JOIN agents a ON a.id = m.agent_id
		WHERE m.mutation_type = 'VOUCHER_OFFLINE_BUY'
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
		WHERE 1=1
	`, unionQ)

	var args []any
	argIdx := 1
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

func (r *Repository) GetMonthlyRevenueData(ctx context.Context, year int) ([]MonthlyRevenueData, error) {
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
		GROUP BY TO_CHAR(i.created_at, 'YYYY-MM')
	`
	rowsInv, err := r.db.Query(ctx, invQuery, year)
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
		GROUP BY TO_CHAR(v.created_at, 'YYYY-MM')
	`
	rowsOnline, err := r.db.Query(ctx, onlineQuery, year)
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

	// 3. Query Offline Vouchers
	const offlineQuery = `
		SELECT
			TO_CHAR(created_at, 'YYYY-MM') AS month_str,
			COALESCE(SUM(ABS(amount)), 0) AS offline_paid
		FROM agent_balance_mutations
		WHERE mutation_type = 'VOUCHER_OFFLINE_BUY'
		  AND EXTRACT(YEAR FROM created_at) = $1
		GROUP BY TO_CHAR(created_at, 'YYYY-MM')
	`
	rowsOffline, err := r.db.Query(ctx, offlineQuery, year)
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
		GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
	`
	rowsExp, err := r.db.Query(ctx, expenseQuery, year)
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


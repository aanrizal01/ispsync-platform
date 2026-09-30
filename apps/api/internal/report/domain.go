package report

import (
	"github.com/google/uuid"
)

type FinancialSummary struct {
	MRR               int64   `json:"mrr"`                // Monthly Recurring Revenue (Rupiah)
	ARR               int64   `json:"arr"`                // Annual Run Rate (Rupiah)
	ARPU              int64   `json:"arpu"`               // Average Revenue Per User (Rupiah)
	ActiveSubscribers int     `json:"active_subscribers"`
	TotalCustomers    int     `json:"total_customers"`
	TotalInvoiced     int64   `json:"total_invoiced"`     // Total tagihan terbit
	TotalCollected         int64   `json:"total_collected"`          // Total keseluruhan pembayaran diterima (Invoice + Voucher)
	SubscriptionCollected  int64   `json:"subscription_collected"`   // Pembayaran invoice langganan bulanan
	VoucherOnlineCollected int64   `json:"voucher_online_collected"` // Pembelian voucher online pelanggan (setelah diskon)
	VoucherOfflineCollected int64  `json:"voucher_offline_collected"`// Pembelian grosir batch voucher oleh agen
	OutstandingDue         int64   `json:"outstanding_due"`          // Total tunggakan belum dibayar
	ChurnRatePercent       float64 `json:"churn_rate_percent"`
	CollectionRate         float64 `json:"collection_rate_percent"`
	TotalActiveCredits     int64   `json:"total_active_credits"`     // Total saldo titipan aktif pelanggan (Hutang Layanan / Unearned Revenue)
	TotalAgentDeposits     int64   `json:"total_agent_deposits"`     // Total deposit saldo mengendap di dompet mitra agen (Liabilitas / Unearned Revenue)
	TotalHeldDeposits      int64   `json:"total_held_deposits"`      // Total deposit jaminan dibekukan (Titipan Jaminan Pelanggan)
	TotalForfeitedDeposits int64   `json:"total_forfeited_deposits"` // Total deposit disita sebagai pinalti (Pendapatan Lain-lain)
	TotalTaxCollected      int64   `json:"total_tax_collected"`      // Total seluruh PPN 11% (Invoice + Voucher)
	SubscriptionTax        int64   `json:"subscription_tax"`         // PPN 11% dari invoice langganan
	VoucherTax             int64   `json:"voucher_tax"`              // PPN 11% dari voucher (PMK 6/2021)
	TotalAgentCommission   int64   `json:"total_agent_commission"`   // Beban Komisi / Cashback Agen Hotspot
	JartaplokCOGS          int64   `json:"jartaplok_cogs"`           // Beban Pokok Sewa Port Jartaplok (HPP)
	GrossProfit            int64   `json:"gross_profit"`             // Laba Kotor (TotalCollected - TotalTax - JartaplokCOGS - TotalAgentCommission)
	GrossMarginPercent     float64 `json:"gross_margin_percent"`     // Margin Laba Kotor (%)
	TotalOperationalExpenses int64 `json:"total_operational_expenses"` // Total Beban Pengeluaran Operasional
	NetProfit              int64   `json:"net_profit"`               // Laba Bersih (GrossProfit - TotalOperationalExpenses)
	JartaplokPartnerName   string  `json:"jartaplok_partner_name,omitempty"`
	JartaplokActivePorts   int     `json:"jartaplok_active_ports"`
}

type PlanRevenue struct {
	PlanID          uuid.UUID `json:"plan_id"`
	PlanName        string    `json:"plan_name"`
	SubscriberCount int       `json:"subscriber_count"`
	MonthlyPrice    int64     `json:"monthly_price"`
	MonthlyRevenue  int64     `json:"monthly_revenue"`
}

type RevenueTrend struct {
	Month     string `json:"month"` // Format: YYYY-MM
	Invoiced  int64  `json:"invoiced"`
	Collected int64  `json:"collected"`
}

type TrafficStats struct {
	TotalGigabytes        float64 `json:"total_gigabytes"`
	DownloadGigabytes     float64 `json:"download_gigabytes"`
	UploadGigabytes       float64 `json:"upload_gigabytes"`
	ActiveSessions        int     `json:"active_sessions"`
	AvgSessionMinutes     int     `json:"avg_session_minutes"`
}

type InvoiceTransaction struct {
	InvoiceNumber string  `json:"invoice_number"`
	CustomerName  string  `json:"customer_name"`
	CustomerCode  string  `json:"customer_code"`
	IssueDate     string  `json:"issue_date"`
	DueDate       string  `json:"due_date"`
	Status        string  `json:"status"`
	Subtotal      int64   `json:"subtotal"`
	TaxAmount     int64   `json:"tax_amount"`
	TotalAmount   int64   `json:"total_amount"`
	AmountPaid    int64   `json:"amount_paid"`
	AmountDue     int64   `json:"amount_due"`
}

type VoucherTaxTransaction struct {
	CreatedAt       string `json:"created_at"`
	ReferenceNumber string `json:"reference_number"`
	Channel         string `json:"channel"` // ONLINE / OFFLINE
	AgentName       string `json:"agent_name"`
	TemplateName    string `json:"template_name"`
	FaceValue       int64  `json:"face_value"`
	DiscountAmount  int64  `json:"discount_amount"`
	NetAmountPaid   int64  `json:"net_amount_paid"`
	DPPAmount       int64  `json:"dpp_amount"`
	TaxAmount       int64  `json:"tax_amount"` // PPN 11%
	AgentCommission int64  `json:"agent_commission"`
}

type MonthlyRevenueData struct {
	MonthStr             string `json:"month_str"` // Format: YYYY-MM
	SubscriptionPaid     int64  `json:"subscription_paid"`
	SubscriptionTax      int64  `json:"subscription_tax"`
	SelfSubscriptionPaid int64  `json:"self_subscription_paid"`
	PartnerKSORevenue    int64  `json:"partner_kso_revenue"`
	VoucherOnlinePaid    int64  `json:"voucher_online_paid"`
	VoucherOfflinePaid   int64  `json:"voucher_offline_paid"`
	BadDebtAmount        int64  `json:"bad_debt_amount"`
	DeductibleExpenses   int64  `json:"deductible_expenses"` // Dari tabel expenses dengan is_bhp_deductible = true
}

type BHPUSOPeriodSummary struct {
	PeriodName             string  `json:"period_name"`              // e.g. "Triwulan I (Q1)", "Januari 2026", "Tahun 2026"
	PeriodCode             string  `json:"period_code"`              // e.g. "Q1", "2026-01", "2026"
	StartDate              string  `json:"start_date"`
	EndDate                string  `json:"end_date"`
	GrossRevenue           int64   `json:"gross_revenue"`            // Total Pendapatan Kotor Objek Telko (DPP Subscription + Voucher)
	SubscriptionRevenue    int64   `json:"subscription_revenue"`     // Pendapatan Invoice Langganan (Net tanpa PPN)
	SelfSubscriptionRevenue int64  `json:"self_subscription_revenue"`// Porsi Pelanggan Mandiri ISP
	PartnerKSORevenue      int64   `json:"partner_kso_revenue"`      // Porsi Pelanggan Mitra KSO
	VoucherRevenue         int64   `json:"voucher_revenue"`          // Penjualan Voucher Hotspot & Passpoint (DPP)
	DeductibleJartaplok    int64   `json:"deductible_jartaplok"`     // Pengurang Sah: Beban Sewa Jaringan/Jartaplok/Transmisi Upstream
	DeductibleBadDebt      int64   `json:"deductible_bad_debt"`      // Pengurang Sah: Piutang Macet/Hapus Buku
	TotalDeductibles       int64   `json:"total_deductibles"`        // Total Pengurang Sah
	TariffBaseAmount       int64   `json:"tariff_base_amount"`       // DPT (Dasar Pengenaan Tarif) = Gross - Deductibles (Min 0)
	BHPRatePercent         float64 `json:"bhp_rate_percent"`         // 0.5%
	BHPAmount              int64   `json:"bhp_amount"`               // 0.5% x DPT
	USORatePercent         float64 `json:"uso_rate_percent"`         // 1.25%
	USOAmount              int64   `json:"uso_amount"`               // 1.25% x DPT
	TotalPayable           int64   `json:"total_payable"`            // 1.75% x DPT (BHP + USO)
	DueDate                string  `json:"due_date"`                 // Tanggal Jatuh Tempo Setor & Lapor
	Status                 string  `json:"status"`                   // "UPCOMING", "ACTIVE", "PAST_DUE", "CLOSED"
}

type BHPUSOReport struct {
	Year                 int                   `json:"year"`
	AnnualSummary        BHPUSOPeriodSummary   `json:"annual_summary"`
	Quarters             []BHPUSOPeriodSummary `json:"quarters"`
	MonthlyBreakdown     []BHPUSOPeriodSummary `json:"monthly_breakdown"`
	RegulationReference  string                `json:"regulation_reference"`
}


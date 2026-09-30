package report

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

type Service struct {
	repo            *Repository
	ispBaseURL      string
	ispJartaplokKey string
	httpClient      *http.Client
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo:       repo,
		httpClient: &http.Client{Timeout: 3 * time.Second},
	}
}

func (s *Service) SetISPIntegration(baseURL, jartaplokKey string) {
	s.ispBaseURL = baseURL
	s.ispJartaplokKey = jartaplokKey
}

func (s *Service) GetFinancialSummary(ctx context.Context) (*FinancialSummary, error) {
	summary, err := s.repo.GetFinancialSummary(ctx)
	if err != nil {
		return nil, err
	}

	// Fetch Jartaplok Wholesale COGS from ISP service
	s.fetchJartaplokCOGS(ctx, summary)

	// Hitung Laba Kotor (Gross Profit): (Total Pembayaran Diterima - Pajak PPN) - Beban Jartaplok (HPP) - Komisi Agen
	summary.GrossProfit = (summary.TotalCollected - summary.TotalTaxCollected) - summary.JartaplokCOGS - summary.TotalAgentCommission
	if summary.TotalCollected > 0 {
		summary.GrossMarginPercent = (float64(summary.GrossProfit) / float64(summary.TotalCollected)) * 100
	}
	// Hitung Laba Bersih (Net Profit): Laba Kotor - Total Pengeluaran Operasional
	summary.NetProfit = summary.GrossProfit - summary.TotalOperationalExpenses

	return summary, nil
}

type jartaplokBillingAPIResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    struct {
		PartnerName        string `json:"partner_name"`
		ServiceType        string `json:"service_type"`
		TotalActivePorts   int    `json:"total_active_ports"`
		TotalBillingAmount int64  `json:"total_billing_amount"`
	} `json:"data"`
}

func (s *Service) fetchJartaplokCOGS(ctx context.Context, summary *FinancialSummary) {
	if s.ispBaseURL == "" {
		return
	}
	url := fmt.Sprintf("%s/api/v1/partner/jartaplok/billing", s.ispBaseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return
	}
	key := s.ispJartaplokKey
	if key == "" {
		key = "jartaplok2026"
	}
	req.Header.Set("X-Partner-Key", key)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return
	}

	var res jartaplokBillingAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return
	}

	if res.Success {
		summary.JartaplokCOGS = res.Data.TotalBillingAmount
		summary.JartaplokPartnerName = res.Data.PartnerName
		summary.JartaplokActivePorts = res.Data.TotalActivePorts
	}
}

func (s *Service) GetRevenueByPlan(ctx context.Context) ([]PlanRevenue, error) {
	return s.repo.GetRevenueByPlan(ctx)
}

func (s *Service) GetRevenueTrends(ctx context.Context, months int) ([]RevenueTrend, error) {
	if months <= 0 {
		months = 6
	}
	return s.repo.GetRevenueTrends(ctx, months)
}

func (s *Service) GetTrafficStats(ctx context.Context) (*TrafficStats, error) {
	return s.repo.GetTrafficStats(ctx)
}

func (s *Service) ExportInvoicesCSV(ctx context.Context, from, to string) ([]byte, error) {
	txs, err := s.repo.GetInvoiceTransactions(ctx, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch transactions: %w", err)
	}

	return FormatInvoicesCSV(txs)
}

func FormatInvoicesCSV(txs []InvoiceTransaction) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	// UTF-8 BOM agar Excel dapat membuka file dengan karakter UTF-8 secara otomatis
	buf.WriteString("\xEF\xBB\xBF")

	headers := []string{
		"Nomor Tagihan",
		"Nama Pelanggan",
		"Nomor Akun",
		"Tanggal Terbit",
		"Jatuh Tempo",
		"Status",
		"Subtotal (IDR)",
		"Pajak (IDR)",
		"Total (IDR)",
		"Terbayar (IDR)",
		"Sisa Tagihan (IDR)",
	}
	if err := w.Write(headers); err != nil {
		return nil, fmt.Errorf("write csv header: %w", err)
	}

	for _, t := range txs {
		row := []string{
			t.InvoiceNumber,
			t.CustomerName,
			t.CustomerCode,
			t.IssueDate,
			t.DueDate,
			t.Status,
			strconv.FormatInt(t.Subtotal, 10),
			strconv.FormatInt(t.TaxAmount, 10),
			strconv.FormatInt(t.TotalAmount, 10),
			strconv.FormatInt(t.AmountPaid, 10),
			strconv.FormatInt(t.AmountDue, 10),
		}
		if err := w.Write(row); err != nil {
			return nil, fmt.Errorf("write csv row: %w", err)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("flush csv: %w", err)
	}

	return buf.Bytes(), nil
}

func (s *Service) ExportVoucherTaxCSV(ctx context.Context, from, to string) ([]byte, error) {
	txs, err := s.repo.GetVoucherTaxTransactions(ctx, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch voucher tax transactions: %w", err)
	}

	return FormatVoucherTaxCSV(txs)
}

func FormatVoucherTaxCSV(txs []VoucherTaxTransaction) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	// UTF-8 BOM agar Excel dapat membuka file dengan karakter UTF-8 secara otomatis
	buf.WriteString("\xEF\xBB\xBF")

	headers := []string{
		"Tanggal & Waktu",
		"No. Referensi / Kode",
		"Channel",
		"Nama Agen / Pengambil",
		"Paket Voucher",
		"Harga Banderol (IDR)",
		"Diskon Promo (IDR)",
		"Total Diterima / Net Paid (IDR)",
		"DPP - Dasar Pajak (IDR)",
		"PPN 11% (IDR)",
		"Komisi / Cashback Agen (IDR)",
	}
	if err := w.Write(headers); err != nil {
		return nil, fmt.Errorf("write csv header: %w", err)
	}

	for _, t := range txs {
		row := []string{
			t.CreatedAt,
			t.ReferenceNumber,
			t.Channel,
			t.AgentName,
			t.TemplateName,
			strconv.FormatInt(t.FaceValue, 10),
			strconv.FormatInt(t.DiscountAmount, 10),
			strconv.FormatInt(t.NetAmountPaid, 10),
			strconv.FormatInt(t.DPPAmount, 10),
			strconv.FormatInt(t.TaxAmount, 10),
			strconv.FormatInt(t.AgentCommission, 10),
		}
		if err := w.Write(row); err != nil {
			return nil, fmt.Errorf("write csv row: %w", err)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("flush csv: %w", err)
	}

	return buf.Bytes(), nil
}

func (s *Service) GetBHPUSOReport(ctx context.Context, year int) (*BHPUSOReport, error) {
	if year <= 2000 || year > 2100 {
		year = time.Now().Year()
	}

	rawMonths, err := s.repo.GetMonthlyRevenueData(ctx, year)
	if err != nil {
		return nil, fmt.Errorf("get monthly revenue for bhp/uso: %w", err)
	}

	monthNames := []string{
		"Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember",
	}

	now := time.Now()
	currentYear := now.Year()
	currentMonth := int(now.Month())

	var monthlySummaries []BHPUSOPeriodSummary
	for i, m := range rawMonths {
		monthIdx := i + 1 // 1..12
		mName := fmt.Sprintf("%s %d", monthNames[i], year)

		// DPP Langganan (tanpa PPN 11%)
		subNet := m.SubscriptionPaid - m.SubscriptionTax
		if subNet < 0 {
			subNet = 0
		}

		// DPP Voucher (tanpa PPN 11% sesuai PMK 6/2021)
		voucherGross := m.VoucherOnlinePaid + m.VoucherOfflinePaid
		voucherDPP := int64(float64(voucherGross) / 1.11)

		gross := subNet + voucherDPP
		deductibleJartaplok := m.DeductibleExpenses
		totDeduct := m.BadDebtAmount + deductibleJartaplok
		dpt := gross - totDeduct
		if dpt < 0 {
			dpt = 0
		}

		bhp := int64(float64(dpt) * 0.005)
		uso := int64(float64(dpt) * 0.0125)
		totPayable := bhp + uso

		startDate := fmt.Sprintf("%04d-%02d-01", year, monthIdx)
		endDate := fmt.Sprintf("%04d-%02d-%02d", year, monthIdx, daysInMonth(year, monthIdx))

		status := "UPCOMING"
		if year < currentYear || (year == currentYear && monthIdx < currentMonth) {
			status = "CLOSED"
		} else if year == currentYear && monthIdx == currentMonth {
			status = "ACTIVE"
		}

		monthlySummaries = append(monthlySummaries, BHPUSOPeriodSummary{
			PeriodName:              mName,
			PeriodCode:              m.MonthStr,
			StartDate:               startDate,
			EndDate:                 endDate,
			GrossRevenue:            gross,
			SubscriptionRevenue:     subNet,
			SelfSubscriptionRevenue: m.SelfSubscriptionPaid,
			PartnerKSORevenue:       m.PartnerKSORevenue,
			VoucherRevenue:          voucherDPP,
			DeductibleJartaplok:     deductibleJartaplok,
			DeductibleBadDebt:       m.BadDebtAmount,
			TotalDeductibles:        totDeduct,
			TariffBaseAmount:        dpt,
			BHPRatePercent:          0.5,
			BHPAmount:               bhp,
			USORatePercent:          1.25,
			USOAmount:               uso,
			TotalPayable:            totPayable,
			DueDate:                 "",
			Status:                  status,
		})
	}

	// 4 Quarters setup
	quarterDefs := []struct {
		code      string
		name      string
		startM    int
		endM      int
		dueDay    int
		dueMonth  string
		dueYear   int
	}{
		{"Q1", "Triwulan I (Q1)", 1, 3, 30, "April", year},
		{"Q2", "Triwulan II (Q2)", 4, 6, 31, "Juli", year},
		{"Q3", "Triwulan III (Q3)", 7, 9, 31, "Oktober", year},
		{"Q4", "Triwulan IV (Q4)", 10, 12, 31, "Januari", year + 1},
	}

	var quarters []BHPUSOPeriodSummary
	for _, qd := range quarterDefs {
		var q BHPUSOPeriodSummary
		q.PeriodCode = qd.code
		q.PeriodName = fmt.Sprintf("%s %d", qd.name, year)
		q.StartDate = fmt.Sprintf("%04d-%02d-01", year, qd.startM)
		q.EndDate = fmt.Sprintf("%04d-%02d-%02d", year, qd.endM, daysInMonth(year, qd.endM))
		q.DueDate = fmt.Sprintf("%d %s %d", qd.dueDay, qd.dueMonth, qd.dueYear)
		q.BHPRatePercent = 0.5
		q.USORatePercent = 1.25

		for m := qd.startM - 1; m < qd.endM; m++ {
			ms := monthlySummaries[m]
			q.GrossRevenue += ms.GrossRevenue
			q.SubscriptionRevenue += ms.SubscriptionRevenue
			q.SelfSubscriptionRevenue += ms.SelfSubscriptionRevenue
			q.PartnerKSORevenue += ms.PartnerKSORevenue
			q.VoucherRevenue += ms.VoucherRevenue
			q.DeductibleJartaplok += ms.DeductibleJartaplok
			q.DeductibleBadDebt += ms.DeductibleBadDebt
			q.TotalDeductibles += ms.TotalDeductibles
		}

		q.TariffBaseAmount = q.GrossRevenue - q.TotalDeductibles
		if q.TariffBaseAmount < 0 {
			q.TariffBaseAmount = 0
		}
		q.BHPAmount = int64(float64(q.TariffBaseAmount) * 0.005)
		q.USOAmount = int64(float64(q.TariffBaseAmount) * 0.0125)
		q.TotalPayable = q.BHPAmount + q.USOAmount

		// Status calculation based on quarter end
		if year < currentYear || (year == currentYear && currentMonth > qd.endM) {
			q.Status = "PAST_DUE"
		} else if year == currentYear && currentMonth >= qd.startM && currentMonth <= qd.endM {
			q.Status = "ACTIVE"
		} else {
			q.Status = "UPCOMING"
		}

		quarters = append(quarters, q)
	}

	// Annual Summary
	var annual BHPUSOPeriodSummary
	annual.PeriodCode = fmt.Sprintf("%d", year)
	annual.PeriodName = fmt.Sprintf("Rekapitulasi Tahunan %d", year)
	annual.StartDate = fmt.Sprintf("%04d-01-01", year)
	annual.EndDate = fmt.Sprintf("%04d-12-31", year)
	annual.DueDate = fmt.Sprintf("31 Januari %d", year+1)
	annual.BHPRatePercent = 0.5
	annual.USORatePercent = 1.25
	annual.Status = "ACTIVE"
	if year < currentYear {
		annual.Status = "CLOSED"
	}

	for _, q := range quarters {
		annual.GrossRevenue += q.GrossRevenue
		annual.SubscriptionRevenue += q.SubscriptionRevenue
		annual.SelfSubscriptionRevenue += q.SelfSubscriptionRevenue
		annual.PartnerKSORevenue += q.PartnerKSORevenue
		annual.VoucherRevenue += q.VoucherRevenue
		annual.DeductibleJartaplok += q.DeductibleJartaplok
		annual.DeductibleBadDebt += q.DeductibleBadDebt
		annual.TotalDeductibles += q.TotalDeductibles
	}
	annual.TariffBaseAmount = annual.GrossRevenue - annual.TotalDeductibles
	if annual.TariffBaseAmount < 0 {
		annual.TariffBaseAmount = 0
	}
	annual.BHPAmount = int64(float64(annual.TariffBaseAmount) * 0.005)
	annual.USOAmount = int64(float64(annual.TariffBaseAmount) * 0.0125)
	annual.TotalPayable = annual.BHPAmount + annual.USOAmount

	return &BHPUSOReport{
		Year:                year,
		AnnualSummary:       annual,
		Quarters:            quarters,
		MonthlyBreakdown:    monthlySummaries,
		RegulationReference: "PP No. 43 Tahun 2023 & PM Kominfo No. 13 Tahun 2019 (Tarif BHP Telko 0,5% & Kontribusi KPU/USO 1,25%)",
	}, nil
}

func daysInMonth(year, month int) int {
	return time.Date(year, time.Month(month)+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

func (s *Service) ExportBHPUSOCSV(ctx context.Context, year int) ([]byte, error) {
	report, err := s.GetBHPUSOReport(ctx, year)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	buf.WriteString("\xEF\xBB\xBF") // UTF-8 BOM

	headers := []string{
		"Periode Pelaporan",
		"Rentang Tanggal",
		"Jatuh Tempo Lapor/Setor",
		"Pendapatan Langganan (DPP IDR)",
		"Porsi Pelanggan Mandiri (IDR)",
		"Porsi Pelanggan Mitra KSO (IDR)",
		"Penjualan Voucher Hotspot (DPP IDR)",
		"Total Pendapatan Kotor Objek Telko (IDR)",
		"Pengurang: Sewa Transmisi/Jartaplok (IDR)",
		"Pengurang: Piutang Macet/Hapus Buku (IDR)",
		"Total Pengurang yang Sah (IDR)",
		"Dasar Pengenaan Tarif / DPT (IDR)",
		"Tarif BHP Telko (%)",
		"Kewajiban BHP Telekomunikasi (IDR)",
		"Tarif Kontribusi USO (%)",
		"Kewajiban Kontribusi USO/KPU (IDR)",
		"Total Setoran PNBP Kominfo (1,75% IDR)",
	}
	if err := w.Write(headers); err != nil {
		return nil, err
	}

	// 1. Quarters Rows
	for _, q := range report.Quarters {
		row := []string{
			q.PeriodName,
			fmt.Sprintf("%s s/d %s", q.StartDate, q.EndDate),
			q.DueDate,
			strconv.FormatInt(q.SubscriptionRevenue, 10),
			strconv.FormatInt(q.SelfSubscriptionRevenue, 10),
			strconv.FormatInt(q.PartnerKSORevenue, 10),
			strconv.FormatInt(q.VoucherRevenue, 10),
			strconv.FormatInt(q.GrossRevenue, 10),
			strconv.FormatInt(q.DeductibleJartaplok, 10),
			strconv.FormatInt(q.DeductibleBadDebt, 10),
			strconv.FormatInt(q.TotalDeductibles, 10),
			strconv.FormatInt(q.TariffBaseAmount, 10),
			"0.50%",
			strconv.FormatInt(q.BHPAmount, 10),
			"1.25%",
			strconv.FormatInt(q.USOAmount, 10),
			strconv.FormatInt(q.TotalPayable, 10),
		}
		if err := w.Write(row); err != nil {
			return nil, err
		}
	}

	// 2. Annual Total Row
	ann := report.AnnualSummary
	annualRow := []string{
		fmt.Sprintf("TOTAL TAHUNAN (%s)", ann.PeriodName),
		fmt.Sprintf("%s s/d %s", ann.StartDate, ann.EndDate),
		ann.DueDate,
		strconv.FormatInt(ann.SubscriptionRevenue, 10),
		strconv.FormatInt(ann.SelfSubscriptionRevenue, 10),
		strconv.FormatInt(ann.PartnerKSORevenue, 10),
		strconv.FormatInt(ann.VoucherRevenue, 10),
		strconv.FormatInt(ann.GrossRevenue, 10),
		strconv.FormatInt(ann.DeductibleJartaplok, 10),
		strconv.FormatInt(ann.DeductibleBadDebt, 10),
		strconv.FormatInt(ann.TotalDeductibles, 10),
		strconv.FormatInt(ann.TariffBaseAmount, 10),
		"0.50%",
		strconv.FormatInt(ann.BHPAmount, 10),
		"1.25%",
		strconv.FormatInt(ann.USOAmount, 10),
		strconv.FormatInt(ann.TotalPayable, 10),
	}
	if err := w.Write(annualRow); err != nil {
		return nil, err
	}

	// Empty separator line
	_ = w.Write([]string{})

	// 3. Monthly Breakdown Rows
	_ = w.Write([]string{"--- RINCIAN BULANAN (12 BULAN) ---"})
	for _, m := range report.MonthlyBreakdown {
		row := []string{
			m.PeriodName,
			fmt.Sprintf("%s s/d %s", m.StartDate, m.EndDate),
			"-",
			strconv.FormatInt(m.SubscriptionRevenue, 10),
			strconv.FormatInt(m.SelfSubscriptionRevenue, 10),
			strconv.FormatInt(m.PartnerKSORevenue, 10),
			strconv.FormatInt(m.VoucherRevenue, 10),
			strconv.FormatInt(m.GrossRevenue, 10),
			strconv.FormatInt(m.DeductibleJartaplok, 10),
			strconv.FormatInt(m.DeductibleBadDebt, 10),
			strconv.FormatInt(m.TotalDeductibles, 10),
			strconv.FormatInt(m.TariffBaseAmount, 10),
			"0.50%",
			strconv.FormatInt(m.BHPAmount, 10),
			"1.25%",
			strconv.FormatInt(m.USOAmount, 10),
			strconv.FormatInt(m.TotalPayable, 10),
		}
		if err := w.Write(row); err != nil {
			return nil, err
		}
	}

	w.Flush()
	return buf.Bytes(), w.Error()
}


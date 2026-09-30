package report

import (
	"bytes"
	"strings"
	"testing"
)

func TestFormatInvoicesCSV(t *testing.T) {
	txs := []InvoiceTransaction{
		{
			InvoiceNumber: "INV-2026-0001",
			CustomerName:  "PT Solusi Net Nusantara",
			CustomerCode:  "CUST-1001",
			IssueDate:     "2026-04-01",
			DueDate:       "2026-04-15",
			Status:        "PAID",
			Subtotal:      1500000,
			TaxAmount:     165000,
			TotalAmount:   1665000,
			AmountPaid:    1665000,
			AmountDue:     0,
		},
	}

	csvBytes, err := FormatInvoicesCSV(txs)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 1. Verifikasi UTF-8 BOM
	bom := []byte("\xEF\xBB\xBF")
	if !bytes.HasPrefix(csvBytes, bom) {
		t.Errorf("expected CSV to start with UTF-8 BOM")
	}

	// 2. Verifikasi konten teks
	content := string(csvBytes[len(bom):])
	lines := strings.Split(strings.TrimSpace(content), "\n")
	if len(lines) != 2 {
		t.Fatalf("expected 2 lines (header + 1 data row), got %d", len(lines))
	}

	// 3. Verifikasi Header
	if !strings.Contains(lines[0], "Nomor Tagihan") || !strings.Contains(lines[0], "Total (IDR)") {
		t.Errorf("header does not contain expected columns: %s", lines[0])
	}

	// 4. Verifikasi Data Row
	if !strings.Contains(lines[1], "INV-2026-0001") || !strings.Contains(lines[1], "1665000") {
		t.Errorf("data row does not contain expected values: %s", lines[1])
	}
}

func TestFormatInvoicesCSVEmpty(t *testing.T) {
	csvBytes, err := FormatInvoicesCSV(nil)
	if err != nil {
		t.Fatalf("unexpected error on empty list: %v", err)
	}

	bom := []byte("\xEF\xBB\xBF")
	if !bytes.HasPrefix(csvBytes, bom) {
		t.Errorf("expected CSV to start with UTF-8 BOM")
	}
}

func TestBHPUSORatesAndCalculation(t *testing.T) {
	// Skenario simulasi:
	// Gross Revenue: Rp 100.000.000
	// Deductible Jartaplok (HPP): Rp 20.000.000
	// DPT: Rp 80.000.000
	gross := int64(100_000_000)
	deductible := int64(20_000_000)
	dpt := gross - deductible

	if dpt != 80_000_000 {
		t.Fatalf("expected DPT 80.000.000, got %d", dpt)
	}

	bhp := int64(float64(dpt) * 0.005)
	uso := int64(float64(dpt) * 0.0125)
	total := bhp + uso

	// 0.5% dari 80jt = 400.000
	if bhp != 400_000 {
		t.Errorf("expected BHP 400.000, got %d", bhp)
	}

	// 1.25% dari 80jt = 1.000.000
	if uso != 1_000_000 {
		t.Errorf("expected USO 1.000.000, got %d", uso)
	}

	// Total 1.75% = 1.400.000
	if total != 1_400_000 {
		t.Errorf("expected Total PNBP 1.400.000, got %d", total)
	}
}


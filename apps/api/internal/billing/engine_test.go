package billing

import (
	"testing"
	"time"

	"github.com/gigabill/isp/pkg/money"
)

func TestCalculateProration(t *testing.T) {
	engine := NewEngine()

	// April 2026 (30 hari)
	// Start: 16 April, End: 30 April -> 15 hari pemakaian
	start := time.Date(2026, 4, 16, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 4, 30, 23, 59, 59, 0, time.UTC)

	monthlyPrice := money.Amount(300000)
	prorated := engine.CalculateProration(monthlyPrice, start, end)

	// (300,000 * 15) / 30 = 150,000
	expected := money.Amount(150000)
	if prorated != expected {
		t.Fatalf("expected prorated %v, got %v", expected, prorated)
	}

	// Kasus invalid: start after end
	invalidProration := engine.CalculateProration(monthlyPrice, end, start)
	if invalidProration != money.Zero {
		t.Fatalf("expected zero for start after end, got %v", invalidProration)
	}
}

func TestCalculateTax(t *testing.T) {
	engine := NewEngine()

	subtotal := money.Amount(100000)
	taxBasisPoints := 1100 // 11.00% PPN
	tax := engine.CalculateTax(subtotal, taxBasisPoints)

	expected := money.Amount(11000)
	if tax != expected {
		t.Fatalf("expected tax %v, got %v", expected, tax)
	}
}

func TestCalculateLateFee(t *testing.T) {
	engine := NewEngine()

	subtotal := money.Amount(200000)
	lateFeeBasisPoints := 250 // 2.50% denda
	fee := engine.CalculateLateFee(subtotal, lateFeeBasisPoints)

	// 200,000 * 250 / 10,000 = 5,000
	expected := money.Amount(5000)
	if fee != expected {
		t.Fatalf("expected late fee %v, got %v", expected, fee)
	}
}

func TestRecalculateTotals(t *testing.T) {
	engine := NewEngine()

	inv := &Invoice{
		Items: []InvoiceItem{
			{
				Description: "Internet Dedicated 50 Mbps",
				Quantity:    1,
				UnitPrice:   money.Amount(300000),
				TaxPercent:  1100, // 11%
			},
			{
				Description: "Instalasi Fiber Optic",
				Quantity:    1,
				UnitPrice:   money.Amount(150000),
				TaxPercent:  0,
			},
		},
		LateFeeAmount:  money.Amount(10000),
		DiscountAmount: money.Amount(20000),
		CreditApplied:  money.Amount(5000),
		AmountPaid:     money.Amount(100000),
	}

	engine.RecalculateTotals(inv)

	// Subtotal: 300,000 + 150,000 = 450,000
	if inv.Subtotal != money.Amount(450000) {
		t.Errorf("expected subtotal 450,000, got %v", inv.Subtotal)
	}

	// Tax: 11% dari 300,000 = 33,000
	if inv.TaxAmount != money.Amount(33000) {
		t.Errorf("expected tax 33,000, got %v", inv.TaxAmount)
	}

	// Total: 450,000 + 33,000 + 10,000 (fee) - 20,000 (disc) - 5,000 (credit) = 468,000
	if inv.TotalAmount != money.Amount(468000) {
		t.Errorf("expected total 468,000, got %v", inv.TotalAmount)
	}

	// AmountDue: 468,000 - 100,000 (paid) = 368,000
	if inv.AmountDue != money.Amount(368000) {
		t.Errorf("expected amount due 368,000, got %v", inv.AmountDue)
	}
}

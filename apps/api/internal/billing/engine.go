package billing

import (
	"time"

	"github.com/gigabill/isp/pkg/money"
)

// Engine encapsulating core accounting, proration, and tax calculation rules.
type Engine struct{}

func NewEngine() *Engine {
	return &Engine{}
}

// CalculateProration computes the pro-rated price for a given subscription period.
// Formula: (MonthlyPrice * DaysUsed) / TotalDaysInMonth
func (e *Engine) CalculateProration(monthlyPrice money.Amount, startDate, periodEnd time.Time) money.Amount {
	if startDate.After(periodEnd) {
		return money.Zero
	}

	// Calculate total days in the month of startDate
	year, month, _ := startDate.Date()
	firstOfMonth := time.Date(year, month, 1, 0, 0, 0, 0, startDate.Location())
	firstOfNextMonth := firstOfMonth.AddDate(0, 1, 0)
	totalDaysInMonth := int(firstOfNextMonth.Sub(firstOfMonth).Hours() / 24)

	if totalDaysInMonth <= 0 {
		totalDaysInMonth = 30
	}

	// Days used inclusive
	daysUsed := int(periodEnd.Sub(startDate).Hours()/24) + 1
	if daysUsed > totalDaysInMonth {
		daysUsed = totalDaysInMonth
	}
	if daysUsed <= 0 {
		return money.Zero
	}

	return money.Prorate(monthlyPrice, daysUsed, totalDaysInMonth)
}

// CalculateItemTotal computes the final total for an invoice line item: (Quantity * UnitPrice)
func (e *Engine) CalculateItemTotal(qty int, unitPrice money.Amount) money.Amount {
	if qty <= 0 {
		qty = 1
	}
	return unitPrice.Mul(int64(qty))
}

// CalculateTax computes tax using basis points (e.g. 1100 = 11.00%).
func (e *Engine) CalculateTax(amount money.Amount, taxBasisPoints int) money.Amount {
	if taxBasisPoints <= 0 {
		return money.Zero
	}
	return money.Amount((int64(amount)*int64(taxBasisPoints) + 5000) / 10000)
}

// CalculateLateFee computes penalty amount for overdue invoice.
func (e *Engine) CalculateLateFee(subtotal money.Amount, lateFeeBasisPoints int) money.Amount {
	return subtotal.Percentage(int64(lateFeeBasisPoints))
}

// RecalculateTotals computes subtotal, taxes, and amount due for the invoice.
func (e *Engine) RecalculateTotals(inv *Invoice) {
	var subtotal money.Amount
	var taxTotal money.Amount

	for i := range inv.Items {
		item := &inv.Items[i]
		itemTotal := e.CalculateItemTotal(item.Quantity, item.UnitPrice)
		item.Total = itemTotal

		if item.TaxPercent > 0 {
			taxTotal = taxTotal.Add(e.CalculateTax(itemTotal, item.TaxPercent))
		}
		subtotal = subtotal.Add(itemTotal)
	}

	inv.Subtotal = subtotal
	inv.TaxAmount = taxTotal

	// Total = Subtotal + Tax + LateFee - Discount - CreditApplied
	total := subtotal.Add(taxTotal).Add(inv.LateFeeAmount).Sub(inv.DiscountAmount).Sub(inv.CreditApplied)
	if total.IsNegative() {
		total = money.Zero
	}

	inv.TotalAmount = total
	inv.AmountDue = total.Sub(inv.AmountPaid)
	if inv.AmountDue.IsNegative() {
		inv.AmountDue = money.Zero
	}
}

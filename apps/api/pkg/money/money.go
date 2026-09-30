// Package money provides safe integer-based currency arithmetic for IDR.
// All amounts are stored as int64 representing Rupiah (no decimal).
// Never use float64 for monetary calculations.
package money

import (
	"fmt"
	"strings"
)

// Amount represents a monetary value in Rupiah (smallest unit).
// Use this type everywhere money is handled to prevent accidental float usage.
type Amount int64

const (
	Zero Amount = 0
)

// Add returns a + b.
func (a Amount) Add(b Amount) Amount { return a + b }

// Sub returns a - b.
func (a Amount) Sub(b Amount) Amount { return a - b }

// Mul multiplies by an integer multiplier (e.g., quantity).
func (a Amount) Mul(n int64) Amount { return Amount(int64(a) * n) }

// Percentage returns the percentage of the amount (basis points: 1000 = 10.00%).
// taxPercent is stored as integer * 100, e.g., 1100 = 11.00%
func (a Amount) Percentage(basisPoints int64) Amount {
	// basisPoints: e.g., 1100 means 11.00% → divide by 10000
	return Amount((int64(a) * basisPoints) / 10000)
}

// IsZero returns true if the amount is zero.
func (a Amount) IsZero() bool { return a == 0 }

// IsNegative returns true if the amount is negative.
func (a Amount) IsNegative() bool { return a < 0 }

// IsPositive returns true if the amount is positive.
func (a Amount) IsPositive() bool { return a > 0 }

// Abs returns the absolute value.
func (a Amount) Abs() Amount {
	if a < 0 {
		return -a
	}
	return a
}

// Int64 returns the underlying int64 value.
func (a Amount) Int64() int64 { return int64(a) }

// String formats the amount as Indonesian Rupiah string (e.g., "Rp 150.000").
func (a Amount) String() string {
	s := fmt.Sprintf("%d", int64(a))
	return "Rp " + formatThousands(s)
}

// Prorate calculates a pro-rated amount given days used out of total days in period.
func Prorate(total Amount, daysUsed, totalDays int) Amount {
	if totalDays == 0 {
		return Zero
	}
	return Amount((int64(total) * int64(daysUsed)) / int64(totalDays))
}

// Max returns the larger of two amounts.
func Max(a, b Amount) Amount {
	if a > b {
		return a
	}
	return b
}

// Min returns the smaller of two amounts.
func Min(a, b Amount) Amount {
	if a < b {
		return a
	}
	return b
}

func formatThousands(s string) string {
	negative := false
	if strings.HasPrefix(s, "-") {
		negative = true
		s = s[1:]
	}

	n := len(s)
	if n <= 3 {
		if negative {
			return "-" + s
		}
		return s
	}

	var b strings.Builder
	for i, ch := range s {
		if i > 0 && (n-i)%3 == 0 {
			b.WriteRune('.')
		}
		b.WriteRune(ch)
	}

	result := b.String()
	if negative {
		return "-" + result
	}
	return result
}

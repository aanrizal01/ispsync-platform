package expense

import (
	"time"

	"github.com/google/uuid"
)

type ExpenseCategory string

const (
	CategoryUpstreamBandwidth ExpenseCategory = "UPSTREAM_BANDWIDTH"
	CategoryInfrastructurePole ExpenseCategory = "INFRASTRUCTURE_POLE"
	CategoryMaintenanceRepair  ExpenseCategory = "MAINTENANCE_REPAIR"
	CategorySalaryWages        ExpenseCategory = "SALARY_WAGES"
	CategoryNOCElectricity     ExpenseCategory = "NOC_ELECTRICITY"
	CategoryEquipmentMaterial  ExpenseCategory = "EQUIPMENT_MATERIAL"
	CategoryMarketingSales     ExpenseCategory = "MARKETING_SALES"
	CategoryOperationalGeneral ExpenseCategory = "OPERATIONAL_GENERAL"
	CategoryOther              ExpenseCategory = "OTHER"
)

type PaymentMethod string

const (
	PaymentMethodBankTransfer PaymentMethod = "BANK_TRANSFER"
	PaymentMethodCash         PaymentMethod = "CASH"
	PaymentMethodPettyCash    PaymentMethod = "PETTY_CASH"
	PaymentMethodOther        PaymentMethod = "OTHER"
)

type Expense struct {
	ID              uuid.UUID       `json:"id"`
	ExpenseNumber   string          `json:"expense_number"`
	Category        ExpenseCategory `json:"category"`
	Title           string          `json:"title"`
	Amount          int64           `json:"amount"` // in IDR Rupiah
	ExpenseDate     string          `json:"expense_date"` // YYYY-MM-DD
	VendorName      *string         `json:"vendor_name,omitempty"`
	PaymentMethod   PaymentMethod   `json:"payment_method"`
	BankAccount     *string         `json:"bank_account,omitempty"`
	ReferenceNumber *string         `json:"reference_number,omitempty"`
	IsBHPDeductible bool            `json:"is_bhp_deductible"`
	Notes           *string         `json:"notes,omitempty"`
	RecordedBy      *uuid.UUID      `json:"recorded_by,omitempty"`
	RecordedByName  *string         `json:"recorded_by_name,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type CreateExpenseInput struct {
	Category        ExpenseCategory `json:"category"`
	Title           string          `json:"title"`
	Amount          int64           `json:"amount"`
	ExpenseDate     string          `json:"expense_date"`
	VendorName      *string         `json:"vendor_name,omitempty"`
	PaymentMethod   PaymentMethod   `json:"payment_method"`
	BankAccount     *string         `json:"bank_account,omitempty"`
	ReferenceNumber *string         `json:"reference_number,omitempty"`
	IsBHPDeductible bool            `json:"is_bhp_deductible"`
	Notes           *string         `json:"notes,omitempty"`
}

type UpdateExpenseInput struct {
	Category        ExpenseCategory `json:"category"`
	Title           string          `json:"title"`
	Amount          int64           `json:"amount"`
	ExpenseDate     string          `json:"expense_date"`
	VendorName      *string         `json:"vendor_name,omitempty"`
	PaymentMethod   PaymentMethod   `json:"payment_method"`
	BankAccount     *string         `json:"bank_account,omitempty"`
	ReferenceNumber *string         `json:"reference_number,omitempty"`
	IsBHPDeductible bool            `json:"is_bhp_deductible"`
	Notes           *string         `json:"notes,omitempty"`
}

type ExpenseFilter struct {
	StartDate       string           `json:"start_date,omitempty"` // YYYY-MM-DD
	EndDate         string           `json:"end_date,omitempty"`   // YYYY-MM-DD
	Category        *ExpenseCategory `json:"category,omitempty"`
	Search          string           `json:"search,omitempty"`
	IsBHPDeductible *bool            `json:"is_bhp_deductible,omitempty"`
	Page            int              `json:"page"`
	Limit           int              `json:"limit"`
}

type ExpenseSummary struct {
	TotalExpensesMonth int64            `json:"total_expenses_month"`
	TotalExpensesYear  int64            `json:"total_expenses_year"`
	TotalBHPDeductible int64            `json:"total_bhp_deductible"`
	CountMonth         int              `json:"count_month"`
	TopCategoryMonth   string           `json:"top_category_month"`
	TopCategoryAmount  int64            `json:"top_category_amount"`
	CategoryBreakdown  map[string]int64 `json:"category_breakdown"`
}

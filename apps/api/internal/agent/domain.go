package agent

import (
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/pkg/money"
)

type AgentStatus string

const (
	AgentStatusActive     AgentStatus = "ACTIVE"
	AgentStatusSuspended  AgentStatus = "SUSPENDED"
	AgentStatusTerminated AgentStatus = "TERMINATED"
)

type MutationType string

const (
	MutationTopupManual          MutationType = "TOPUP_MANUAL"
	MutationTopupBankTransfer    MutationType = "TOPUP_BANK_TRANSFER"
	MutationVoucherOfflineBuy    MutationType = "VOUCHER_OFFLINE_BUY"
	MutationVoucherOnlineComm    MutationType = "VOUCHER_ONLINE_COMMISSION"
	MutationPasspointCounterPay  MutationType = "PASSPOINT_COUNTER_PAY"
	MutationPasspointOfflineBuy  MutationType = "PASSPOINT_OFFLINE_BUY"
	MutationInvoicePaymentAgent  MutationType = "INVOICE_PAYMENT_AGENT"
	MutationWithdrawal           MutationType = "WITHDRAWAL"
	MutationAdjustment           MutationType = "ADJUSTMENT"
)

type TopupStatus string

const (
	TopupStatusPending  TopupStatus = "PENDING"
	TopupStatusApproved TopupStatus = "APPROVED"
	TopupStatusRejected TopupStatus = "REJECTED"
)

type Agent struct {
	ID                 uuid.UUID    `json:"id"`
	UserID             *uuid.UUID   `json:"user_id,omitempty"`
	UserEmail          *string      `json:"user_email,omitempty"`
	Code               string       `json:"code"`
	Name               string       `json:"name"`
	CompanyName        *string      `json:"company_name,omitempty"`
	Phone              string       `json:"phone"`
	Email              *string      `json:"email,omitempty"`
	Balance            money.Amount `json:"balance"`
	OfflineCashbackPct float64      `json:"offline_cashback_pct"`
	OnlineCashbackPct  float64      `json:"online_cashback_pct"`
	OnlineDiscountPct  float64      `json:"online_discount_pct"`
	LoketAdminFee      int64        `json:"loket_admin_fee"`
	BankName           *string      `json:"bank_name,omitempty"`
	BankAccountNumber  *string      `json:"bank_account_number,omitempty"`
	BankAccountHolder  *string      `json:"bank_account_holder,omitempty"`
	Status             AgentStatus  `json:"status"`
	Notes              *string      `json:"notes,omitempty"`
	TotalVouchersSold  int          `json:"total_vouchers_sold"`
	TotalCommission    money.Amount `json:"total_commission"`
	CreatedAt          time.Time    `json:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at"`
}

type AgentMutation struct {
	ID            uuid.UUID    `json:"id"`
	AgentID       uuid.UUID    `json:"agent_id"`
	AgentName     *string      `json:"agent_name,omitempty"`
	AgentCode     *string      `json:"agent_code,omitempty"`
	MutationType  MutationType `json:"mutation_type"`
	Amount        money.Amount `json:"amount"` // Positif atau negatif
	BalanceBefore money.Amount `json:"balance_before"`
	BalanceAfter  money.Amount `json:"balance_after"`
	ReferenceID   *string      `json:"reference_id,omitempty"`
	Description   *string      `json:"description,omitempty"`
	CreatedAt     time.Time    `json:"created_at"`
}

type TopupRequest struct {
	ID                uuid.UUID    `json:"id"`
	RequestNumber     string       `json:"request_number"`
	AgentID           uuid.UUID    `json:"agent_id"`
	AgentName         string       `json:"agent_name"`
	AgentCode         string       `json:"agent_code"`
	Amount            money.Amount `json:"amount"`
	BankName          string       `json:"bank_name"`
	BankAccountNumber string       `json:"bank_account_number"`
	BankAccountHolder string       `json:"bank_account_holder"`
	ProofURL          *string      `json:"proof_url,omitempty"`
	Status            TopupStatus  `json:"status"`
	Notes             *string      `json:"notes,omitempty"`
	AdminNotes        *string      `json:"admin_notes,omitempty"`
	RequestedAt       time.Time    `json:"requested_at"`
	ProcessedAt       *time.Time   `json:"processed_at,omitempty"`
	ProcessedBy       *uuid.UUID   `json:"processed_by,omitempty"`
}

type DailyPromo struct {
	ID        uuid.UUID `json:"id"`
	AgentID   uuid.UUID `json:"agent_id"`
	PromoCode string    `json:"promo_code"`
	ValidDate string    `json:"valid_date"` // YYYY-MM-DD
	CreatedAt time.Time `json:"created_at"`
}

// Request / Response DTOs

type CreateAgentRequest struct {
	Code               string   `json:"code" validate:"required,min=2,max=32"`
	Name               string   `json:"name" validate:"required,min=2"`
	CompanyName        *string  `json:"company_name"`
	Phone              string   `json:"phone" validate:"required"`
	Email              *string  `json:"email"`
	InitialBalance     int64    `json:"initial_balance" validate:"min=0"`
	OfflineCashbackPct *float64 `json:"offline_cashback_pct"`
	OnlineCashbackPct  *float64 `json:"online_cashback_pct"`
	OnlineDiscountPct  *float64 `json:"online_discount_pct"`
	BankName           *string  `json:"bank_name"`
	BankAccountNumber  *string  `json:"bank_account_number"`
	BankAccountHolder  *string  `json:"bank_account_holder"`
	Notes              *string  `json:"notes"`
	CreateUserAccount  bool     `json:"create_user_account"`
	UserPassword       *string  `json:"user_password"`
}

type UpdateAgentRequest struct {
	Name               string   `json:"name" validate:"required,min=2"`
	CompanyName        *string  `json:"company_name"`
	Phone              string   `json:"phone" validate:"required"`
	Email              *string  `json:"email"`
	OfflineCashbackPct *float64 `json:"offline_cashback_pct"`
	OnlineCashbackPct  *float64 `json:"online_cashback_pct"`
	OnlineDiscountPct  *float64 `json:"online_discount_pct"`
	BankName           *string  `json:"bank_name"`
	BankAccountNumber  *string  `json:"bank_account_number"`
	BankAccountHolder  *string  `json:"bank_account_holder"`
	Status             *string  `json:"status"`
	Notes              *string  `json:"notes"`
}

type TopupManualRequest struct {
	Amount int64   `json:"amount" validate:"required,gt=0"`
	Notes  *string `json:"notes"`
}

type WithdrawManualRequest struct {
	Amount       int64   `json:"amount" validate:"required,gt=0"`
	MutationType string  `json:"mutation_type"` // WITHDRAWAL or ADJUSTMENT
	ReferenceID  *string `json:"reference_id"`
	Notes        *string `json:"notes"`
}

type SubmitTopupRequest struct {
	Amount            int64   `json:"amount" validate:"required,gt=0"`
	BankName          string  `json:"bank_name" validate:"required"`
	BankAccountNumber string  `json:"bank_account_number" validate:"required"`
	BankAccountHolder string  `json:"bank_account_holder" validate:"required"`
	ProofURL          *string `json:"proof_url"`
	Notes             *string `json:"notes"`
}

type ProcessTopupRequest struct {
	Action     string  `json:"action" validate:"required,oneof=APPROVE REJECT"`
	AdminNotes *string `json:"admin_notes"`
}

type AgentGenerateBatchRequest struct {
	TemplateID uuid.UUID `json:"template_id" validate:"required"`
	Quantity   int       `json:"quantity" validate:"required,min=1,max=200"`
	Prefix     string    `json:"prefix"`
	CharType   string    `json:"char_type"`   // alphanumeric_upper, numeric, etc.
	CodeLength int       `json:"code_length"` // default 6
	Notes      *string   `json:"notes"`
}

type AgentDashboardSummary struct {
	Agent             Agent            `json:"agent"`
	TodayPromoCode    string           `json:"today_promo_code"`
	ValidDate         string           `json:"valid_date"`
	TotalVouchersSold int              `json:"total_vouchers_sold"`
	TotalOfflineCount int              `json:"total_offline_count"`
	TotalOnlineCount  int              `json:"total_online_count"`
	RecentMutations   []AgentMutation  `json:"recent_mutations"`
	PendingTopupCount int              `json:"pending_topup_count"`
}

type ValidatePromoResponse struct {
	Valid             bool    `json:"valid"`
	AgentID           string  `json:"agent_id"`
	AgentName         string  `json:"agent_name"`
	PromoCode         string  `json:"promo_code"`
	OnlineDiscountPct float64 `json:"online_discount_pct"`
	Message           string  `json:"message"`
}

type InvoiceInquiryItem struct {
	InvoiceID    uuid.UUID `json:"invoice_id"`
	InvoiceNumber string    `json:"invoice_number"`
	BillingMonth string    `json:"billing_month"`
	IssueDate    string    `json:"issue_date"`
	DueDate      string    `json:"due_date"`
	Subtotal     int64     `json:"subtotal"`
	TaxAmount    int64     `json:"tax_amount"`
	TotalAmount  int64     `json:"total_amount"`
	AmountPaid   int64     `json:"amount_paid"`
	AmountDue    int64     `json:"amount_due"`
	Status       string    `json:"status"`
	IsOverdue    bool      `json:"is_overdue"`
}

type InvoiceInquiryResult struct {
	InvoiceID         uuid.UUID            `json:"invoice_id"`
	InvoiceNumber     string               `json:"invoice_number"`
	CustomerID        uuid.UUID            `json:"customer_id"`
	CustomerCode      string               `json:"customer_code"`
	CustomerName      string               `json:"customer_name"`
	CustomerPhone     string               `json:"customer_phone"`
	CustomerAddress   string               `json:"customer_address"`
	PlanName          string               `json:"plan_name"`
	BillingMonth      string               `json:"billing_month"`
	IssueDate         string               `json:"issue_date"`
	DueDate           string               `json:"due_date"`
	Subtotal          int64                `json:"subtotal"`
	TaxAmount         int64                `json:"tax_amount"`
	TotalAmount       int64                `json:"total_amount"`
	TotalInvoice      int64                `json:"total_invoice"`
	AmountPaid        int64                `json:"amount_paid"`
	AmountDue         int64                `json:"amount_due"`
	Status            string               `json:"status"`
	IsOverdue         bool                 `json:"is_overdue"`
	DefaultAdminFee   int64                `json:"default_admin_fee"`
	AdminFee          int64                `json:"admin_fee"`
	TotalCustomerPay  int64                `json:"total_customer_pay"`
	UnpaidCount       int                  `json:"unpaid_count"`
	TotalUnpaidAmount int64                `json:"total_unpaid_amount"`
	Invoices          []InvoiceInquiryItem `json:"invoices"`
}

type PayInvoiceByAgentRequest struct {
	InvoiceID uuid.UUID `json:"invoice_id" validate:"required"`
	AdminFee  int64     `json:"admin_fee" validate:"min=0"`
}

type PayInvoiceReceipt struct {
	ReceiptNumber     string       `json:"receipt_number"`
	InvoiceID         uuid.UUID    `json:"invoice_id"`
	InvoiceNumber     string       `json:"invoice_number"`
	CustomerCode      string       `json:"customer_code"`
	CustomerName      string       `json:"customer_name"`
	CustomerPhone     string       `json:"customer_phone"`
	PlanName          string       `json:"plan_name"`
	PaidAt            time.Time    `json:"paid_at"`
	Subtotal          int64        `json:"subtotal"`
	TaxAmount         int64        `json:"tax_amount"`
	TotalInvoice      int64        `json:"total_invoice"`
	AdminFee          int64        `json:"admin_fee"`
	TotalCustomerPay  int64        `json:"total_customer_pay"`
	AgentCode         string       `json:"agent_code"`
	AgentName         string       `json:"agent_name"`
	AgentBalanceAfter money.Amount `json:"agent_balance_after"`
}

type UpdateAgentSettingsRequest struct {
	CompanyName   *string `json:"company_name"`
	Phone         *string `json:"phone"`
	LoketAdminFee *int64  `json:"loket_admin_fee"`
}

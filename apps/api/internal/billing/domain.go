package billing

import (
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/pkg/money"
)

type Status string

const (
	StatusDraft         Status = "DRAFT"
	StatusIssued        Status = "ISSUED"
	StatusPartiallyPaid Status = "PARTIALLY_PAID"
	StatusPaid          Status = "PAID"
	StatusOverdue       Status = "OVERDUE"
	StatusVoid          Status = "VOID"
	StatusCancelled     Status = "CANCELLED"
)

type ItemType string

const (
	ItemTypeSubscription ItemType = "SUBSCRIPTION"
	ItemTypeInstallation ItemType = "INSTALLATION"
	ItemTypeActivation   ItemType = "ACTIVATION"
	ItemTypeLateFee      ItemType = "LATE_FEE"
	ItemTypeCredit       ItemType = "CREDIT"
	ItemTypeTax          ItemType = "TAX"
	ItemTypeDiscount     ItemType = "DISCOUNT"
	ItemTypeOther        ItemType = "OTHER"
)

type Invoice struct {
	ID                 uuid.UUID     `json:"id"`
	TenantSlug         string        `json:"tenant_slug,omitempty"`
	InvoiceNumber      string        `json:"invoice_number"`
	CustomerID         uuid.UUID     `json:"customer_id"`
	CustomerNumber     *string       `json:"customer_number,omitempty"`
	CustomerName       *string       `json:"customer_name,omitempty"`
	CustomerPhone      *string       `json:"customer_phone,omitempty"`
	SubscriptionID     *uuid.UUID    `json:"subscription_id,omitempty"`
	PlanPriceID        *uuid.UUID    `json:"plan_price_id,omitempty"`
	Status             Status        `json:"status"`
	BillingPeriodStart *time.Time    `json:"billing_period_start,omitempty"`
	BillingPeriodEnd   *time.Time    `json:"billing_period_end,omitempty"`
	IssueDate          *time.Time    `json:"issue_date,omitempty"`
	DueDate            time.Time     `json:"due_date"`
	Subtotal           money.Amount  `json:"subtotal"`
	TaxAmount          money.Amount  `json:"tax_amount"`
	DiscountAmount     money.Amount  `json:"discount_amount"`
	LateFeeAmount      money.Amount  `json:"late_fee_amount"`
	CreditApplied      money.Amount  `json:"credit_applied"`
	TotalAmount        money.Amount  `json:"total_amount"`
	AmountPaid         money.Amount  `json:"amount_paid"`
	AmountDue          money.Amount  `json:"amount_due"`
	Currency           string        `json:"currency"`
	Notes              *string       `json:"notes,omitempty"`
	IssuedBy           *uuid.UUID    `json:"issued_by,omitempty"`
	VoidedAt           *time.Time    `json:"voided_at,omitempty"`
	VoidReason         *string       `json:"void_reason,omitempty"`
	Items              []InvoiceItem `json:"items,omitempty"`
	CreatedAt          time.Time     `json:"created_at"`
	UpdatedAt          time.Time     `json:"updated_at"`
}

type InvoiceItem struct {
	ID              uuid.UUID    `json:"id"`
	InvoiceID       uuid.UUID    `json:"invoice_id"`
	ItemType        ItemType     `json:"item_type"`
	Description     string       `json:"description"`
	Quantity        int          `json:"quantity"`
	UnitPrice       money.Amount `json:"unit_price"`
	TaxPercent      int          `json:"tax_percent"`     // basis points: 1100 = 11.00%
	DiscountPercent int          `json:"discount_percent"`// basis points: 500 = 5.00%
	Total           money.Amount `json:"total"`
	PeriodStart     *time.Time   `json:"period_start,omitempty"`
	PeriodEnd       *time.Time   `json:"period_end,omitempty"`
	CreatedAt       time.Time    `json:"created_at"`
}

type CreditNote struct {
	ID          uuid.UUID    `json:"id"`
	CustomerID  uuid.UUID    `json:"customer_id"`
	Reason      string       `json:"reason"`
	Amount      money.Amount `json:"amount"`
	Currency    string       `json:"currency"`
	Status      string       `json:"status"` // ACTIVE, HOLD, USED, EXPIRED, REFUNDED, FORFEITED
	HoldUntil   *time.Time   `json:"hold_until,omitempty"`
	DepositType string       `json:"deposit_type"` // GENERAL_CREDIT, SECURITY_DEPOSIT, DEVICE_HOLD
	ExpiresAt   *time.Time   `json:"expires_at,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
}

type Refund struct {
	ID         uuid.UUID    `json:"id"`
	InvoiceID  *uuid.UUID   `json:"invoice_id,omitempty"`
	Amount     money.Amount `json:"amount"`
	Reason     string       `json:"reason"`
	Status     string       `json:"status"` // PENDING, COMPLETED, FAILED
	RefundedAt *time.Time   `json:"refunded_at,omitempty"`
	CreatedAt  time.Time    `json:"created_at"`
}

// Request / Response DTOs

type CreateManualInvoiceRequest struct {
	CustomerID     uuid.UUID          `json:"customer_id" validate:"required"`
	SubscriptionID *uuid.UUID         `json:"subscription_id"`
	DueDate        time.Time          `json:"due_date" validate:"required"`
	Notes          *string            `json:"notes"`
	Items          []CreateItemRequest `json:"items" validate:"required,min=1,dive"`
}

type CreateItemRequest struct {
	ItemType    ItemType `json:"item_type" validate:"required,oneof=SUBSCRIPTION INSTALLATION ACTIVATION LATE_FEE CREDIT TAX DISCOUNT OTHER"`
	Description string   `json:"description" validate:"required,min=2"`
	Quantity    int      `json:"quantity" validate:"min=1"`
	UnitPrice   int64    `json:"unit_price" validate:"min=0"`
	TaxPercent  int      `json:"tax_percent" validate:"min=0,max=10000"`
}

type VoidInvoiceRequest struct {
	Reason string `json:"reason" validate:"required,min=3"`
}

type PublicInvoiceLookupRequest struct {
	Query string `json:"query" validate:"required,min=3"` // Nomor Pelanggan, Nomor HP, atau Nomor Invoice
}

type PublicInvoiceLookupResponse struct {
	CustomerID     uuid.UUID    `json:"customer_id"`
	CustomerName   string       `json:"customer_name"`
	CustomerNumber string       `json:"customer_number"`
	Phone          string       `json:"phone"`
	CreditBalance  int64        `json:"credit_balance"` // Saldo aktif siap pakai
	HeldBalance    int64        `json:"held_balance"`   // Saldo deposit jaminan terkunci
	HoldUntil      *time.Time   `json:"hold_until,omitempty"`
	CreditNotes    []CreditNote `json:"credit_notes,omitempty"`
	Invoices       []Invoice    `json:"invoices"`
}

type CreateSecurityDepositRequest struct {
	CustomerID     uuid.UUID `json:"customer_id" validate:"required"`
	Amount         int64     `json:"amount" validate:"required,min=10000"`
	DurationMonths int       `json:"duration_months" validate:"required,min=1,max=60"`
	Reason         string    `json:"reason" validate:"required,min=3"`
	DepositType    string    `json:"deposit_type"` // SECURITY_DEPOSIT, DEVICE_HOLD
}

type ReleaseDepositRequest struct {
	Reason string `json:"reason,omitempty"`
}

type ForfeitDepositRequest struct {
	Reason string `json:"reason" validate:"required,min=3"`
}

type PublicPayInvoiceRequest struct {
	InvoiceID   uuid.UUID `json:"invoice_id" validate:"required"`
	SimulatePay bool      `json:"simulate_pay"`
}

type PublicPayInvoiceResponse struct {
	InvoiceID     uuid.UUID `json:"invoice_id"`
	InvoiceNumber string    `json:"invoice_number"`
	Amount        int64     `json:"amount"`
	QRString      string    `json:"qr_string"`
	QRImageUrl    string    `json:"qr_image_url"`
	PaymentURL    string    `json:"payment_url,omitempty"`
	SnapToken     string    `json:"snap_token,omitempty"`
	Status        string    `json:"status"`
	Message       string    `json:"message"`
}

type PublicTopUpDepositRequest struct {
	CustomerID  *uuid.UUID `json:"customer_id,omitempty"`
	Query       string     `json:"query,omitempty"` // Phone, Customer Number, or Email
	Amount      int64      `json:"amount" validate:"required,min=10000"`
	Notes       string     `json:"notes,omitempty"`
	SimulatePay bool       `json:"simulate_pay"`
}

type PublicTopUpDepositResponse struct {
	CustomerID    uuid.UUID    `json:"customer_id"`
	CustomerName  string       `json:"customer_name"`
	DepositAmount int64        `json:"deposit_amount"`
	CreditBalance int64        `json:"credit_balance"`
	QRString      string       `json:"qr_string,omitempty"`
	QRImageUrl    string       `json:"qr_image_url,omitempty"`
	PaymentURL    string       `json:"payment_url,omitempty"`
	SnapToken     string       `json:"snap_token,omitempty"`
	Status        string       `json:"status"` // PENDING, SUCCESS
	Message       string       `json:"message"`
	CreditNote    *CreditNote  `json:"credit_note,omitempty"`
}


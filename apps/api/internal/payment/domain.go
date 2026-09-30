package payment

import (
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/pkg/money"
)

type Method string

const (
	MethodManual     Method = "MANUAL"
	MethodQRIS       Method = "QRIS"
	MethodVABCA      Method = "VA_BCA"
	MethodVABNI      Method = "VA_BNI"
	MethodVAMandiri  Method = "VA_MANDIRI"
	MethodVABRI      Method = "VA_BRI"
	MethodMidtrans   Method = "MIDTRANS"
	MethodXendit     Method = "XENDIT"
	MethodDuitku     Method = "DUITKU"
	MethodTripay     Method = "TRIPAY"
	MethodNicepay    Method = "NICEPAY"
)

type Status string

const (
	StatusPending    Status = "PENDING"
	StatusProcessing Status = "PROCESSING"
	StatusCompleted  Status = "COMPLETED"
	StatusFailed     Status = "FAILED"
	StatusRefunded   Status = "REFUNDED"
	StatusCancelled  Status = "CANCELLED"
)

type Payment struct {
	ID              uuid.UUID     `json:"id"`
	PaymentNumber   string        `json:"payment_number"`
	CustomerID      uuid.UUID     `json:"customer_id"`
	CustomerNumber  *string       `json:"customer_number,omitempty"`
	CustomerName    *string       `json:"customer_name,omitempty"`
	InvoiceID       *uuid.UUID    `json:"invoice_id,omitempty"`
	InvoiceNumber   *string       `json:"invoice_number,omitempty"`
	PaymentMethod   Method        `json:"payment_method"`
	ExternalID      *string       `json:"external_id,omitempty"`
	Status          Status        `json:"status"`
	Amount          money.Amount  `json:"amount"`
	Currency        string        `json:"currency"`
	PaidAt          *time.Time    `json:"paid_at,omitempty"`
	Notes           *string       `json:"notes,omitempty"`
	ReceiptURL      *string       `json:"receipt_url,omitempty"`
	GatewayResponse interface{}   `json:"gateway_response,omitempty"`
	IdempotencyKey  *string       `json:"idempotency_key,omitempty"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
}

type Allocation struct {
	ID          uuid.UUID    `json:"id"`
	PaymentID   uuid.UUID    `json:"payment_id"`
	InvoiceID   uuid.UUID    `json:"invoice_id"`
	Amount      money.Amount `json:"amount"`
	AllocatedAt time.Time    `json:"allocated_at"`
}

// Request / Response DTOs

type CreateManualPaymentRequest struct {
	InvoiceID     uuid.UUID `json:"invoice_id" validate:"required"`
	Amount        int64     `json:"amount" validate:"required,gt=0"`
	PaymentMethod Method    `json:"payment_method" validate:"required,oneof=MANUAL QRIS VA_BCA VA_BNI VA_MANDIRI VA_BRI"`
	Notes         *string   `json:"notes"`
}

type InitiateOnlinePaymentRequest struct {
	InvoiceID     uuid.UUID `json:"invoice_id" validate:"required"`
	PaymentMethod Method    `json:"payment_method" validate:"required"`
}

type PaymentGatewayResponse struct {
	PaymentID     uuid.UUID `json:"payment_id"`
	ExternalID    string    `json:"external_id"`
	Token         *string   `json:"token,omitempty"`
	RedirectURL   *string   `json:"redirect_url,omitempty"`
	QRCodeURL     *string   `json:"qr_code_url,omitempty"`
	VANumber      *string   `json:"va_number,omitempty"`
	ExpiredAt     time.Time `json:"expired_at"`
}

type WebhookEvent struct {
	Provider        string
	ExternalID      string
	IdempotencyKey  string
	Status          Status
	Amount          money.Amount
	PaidAt          time.Time
	RawPayload      []byte
	GatewayResponse interface{}
}

package partner

import (
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/pkg/money"
)

type ShareType string

const (
	ShareTypePercentage ShareType = "PERCENTAGE"
	ShareTypeFlatFee    ShareType = "FLAT_FEE"
)

type PartnerStatus string

const (
	PartnerStatusActive     PartnerStatus = "ACTIVE"
	PartnerStatusSuspended  PartnerStatus = "SUSPENDED"
	PartnerStatusTerminated PartnerStatus = "TERMINATED"
)

type SettlementStatus string

const (
	SettlementStatusPending  SettlementStatus = "PENDING"
	SettlementStatusApproved SettlementStatus = "APPROVED"
	SettlementStatusRejected SettlementStatus = "REJECTED"
	SettlementStatusPaid     SettlementStatus = "PAID"
)

type Partner struct {
	ID                uuid.UUID     `json:"id"`
	Code              string        `json:"code"`
	Name              string        `json:"name"`
	CompanyName       *string       `json:"company_name,omitempty"`
	ContactPerson     string        `json:"contact_person"`
	Phone             string        `json:"phone"`
	Email             *string       `json:"email,omitempty"`
	ShareType         ShareType     `json:"share_type"`
	PartnerShareBps   int           `json:"partner_share_bps"` // e.g. 7000 = 70.00%
	ISPShareBps       int           `json:"isp_share_bps"`     // e.g. 3000 = 30.00%
	FlatFeeAmount     money.Amount  `json:"flat_fee_amount"`
	Balance           money.Amount  `json:"balance"`
	BankName          *string       `json:"bank_name,omitempty"`
	BankAccountNumber *string       `json:"bank_account_number,omitempty"`
	BankAccountHolder *string       `json:"bank_account_holder,omitempty"`
	Status            PartnerStatus `json:"status"`
	Notes             *string       `json:"notes,omitempty"`
	CustomerCount     int           `json:"customer_count"`
	TotalRevenue      money.Amount  `json:"total_revenue"`
	CreatedAt         time.Time     `json:"created_at"`
	UpdatedAt         time.Time     `json:"updated_at"`
}

type RevenueShare struct {
	ID            uuid.UUID    `json:"id"`
	PartnerID     uuid.UUID    `json:"partner_id"`
	InvoiceID     uuid.UUID    `json:"invoice_id"`
	InvoiceNumber string       `json:"invoice_number"`
	CustomerName  string       `json:"customer_name"`
	GrossAmount   money.Amount `json:"gross_amount"`
	PartnerAmount money.Amount `json:"partner_amount"`
	ISPAmount     money.Amount `json:"isp_amount"`
	ShareType     ShareType    `json:"share_type"`
	Status        string       `json:"status"`
	CreatedAt     time.Time    `json:"created_at"`
}

type Settlement struct {
	ID                uuid.UUID        `json:"id"`
	SettlementNumber  string           `json:"settlement_number"`
	PartnerID         uuid.UUID        `json:"partner_id"`
	PartnerName       string           `json:"partner_name"`
	Amount            money.Amount     `json:"amount"`
	Status            SettlementStatus `json:"status"`
	BankName          string           `json:"bank_name"`
	BankAccountNumber string           `json:"bank_account_number"`
	BankAccountHolder string           `json:"bank_account_holder"`
	ProofURL          *string          `json:"proof_url,omitempty"`
	Notes             *string          `json:"notes,omitempty"`
	RequestedAt       time.Time        `json:"requested_at"`
	ProcessedAt       *time.Time       `json:"processed_at,omitempty"`
	ProcessedBy       *uuid.UUID       `json:"processed_by,omitempty"`
}

// Request / Response DTOs

type CreatePartnerRequest struct {
	Code              string    `json:"code" validate:"required,min=3"`
	Name              string    `json:"name" validate:"required,min=2"`
	CompanyName       *string   `json:"company_name"`
	ContactPerson     string    `json:"contact_person" validate:"required"`
	Phone             string    `json:"phone" validate:"required"`
	Email             *string   `json:"email"`
	ShareType         ShareType `json:"share_type" validate:"required,oneof=PERCENTAGE FLAT_FEE"`
	PartnerShareBps   int       `json:"partner_share_bps" validate:"min=0,max=10000"`
	ISPShareBps       int       `json:"isp_share_bps" validate:"min=0,max=10000"`
	FlatFeeAmount     int64     `json:"flat_fee_amount" validate:"min=0"`
	BankName          *string   `json:"bank_name"`
	BankAccountNumber *string   `json:"bank_account_number"`
	BankAccountHolder *string   `json:"bank_account_holder"`
	Notes             *string   `json:"notes"`
}

type CreateSettlementRequest struct {
	PartnerID         uuid.UUID `json:"partner_id" validate:"required"`
	Amount            int64     `json:"amount" validate:"required,min=50000"`
	BankName          string    `json:"bank_name" validate:"required"`
	BankAccountNumber string    `json:"bank_account_number" validate:"required"`
	BankAccountHolder string    `json:"bank_account_holder" validate:"required"`
	Notes             *string   `json:"notes"`
}

type ProcessSettlementRequest struct {
	Status   SettlementStatus `json:"status" validate:"required,oneof=APPROVED REJECTED PAID"`
	ProofURL *string          `json:"proof_url"`
	Notes    *string          `json:"notes"`
}

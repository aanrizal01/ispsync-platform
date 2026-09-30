package voucher

import (
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/pkg/money"
)

type Status string

const (
	StatusBlank    Status = "BLANK"
	StatusCreated  Status = "CREATED"
	StatusUnused   Status = "UNUSED"
	StatusActive   Status = "ACTIVE"
	StatusExpired  Status = "EXPIRED"
	StatusDepleted Status = "DEPLETED"
	StatusRevoked  Status = "REVOKED"
)

type Template struct {
	ID              uuid.UUID    `json:"id"`
	Name            string       `json:"name"`
	Description     *string      `json:"description,omitempty"`
	Price           money.Amount `json:"price"`
	Currency        string       `json:"currency"`
	DurationMinutes int          `json:"duration_minutes"`
	DataLimitBytes  int64        `json:"data_limit_bytes"` // 0 = unlimited
	DownloadKbps    int64        `json:"download_kbps"`
	UploadKbps      int64        `json:"upload_kbps"`
	MinDownloadKbps int64        `json:"min_download_kbps"`
	MinUploadKbps   int64        `json:"min_upload_kbps"`
	ValidityDays    int          `json:"validity_days"`
	IsActive        bool         `json:"is_active"`
	IsAvailableOnline bool       `json:"is_available_online"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
}

type Batch struct {
	ID           uuid.UUID  `json:"id"`
	BatchNumber  string     `json:"batch_number"`
	TemplateID   *uuid.UUID `json:"template_id,omitempty"`
	TemplateName *string    `json:"template_name,omitempty"`
	Quantity     int        `json:"quantity"`
	IsMACLocked  bool       `json:"is_mac_locked"`
	Notes        *string    `json:"notes,omitempty"`
	CreatedBy    *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

type Voucher struct {
	ID                  uuid.UUID    `json:"id"`
	Code                string       `json:"code"`
	Password            string       `json:"password"`
	BatchID             *uuid.UUID   `json:"batch_id,omitempty"`
	BatchNumber         *string      `json:"batch_number,omitempty"`
	TemplateID          *uuid.UUID   `json:"template_id,omitempty"`
	TemplateName        *string      `json:"template_name,omitempty"`
	Price               money.Amount `json:"price"`
	CustomerID          *uuid.UUID   `json:"customer_id,omitempty"`
	Status              Status       `json:"status"`
	Channel             string       `json:"channel"` // "ONLINE" or "OFFLINE"
	BuyerPhone          *string      `json:"buyer_phone,omitempty"`
	OrderID             *string      `json:"order_id,omitempty"`
	BuyerMAC            *string      `json:"buyer_mac,omitempty"`
	IsMACLocked         bool         `json:"is_mac_locked"`
	AgentID             *uuid.UUID   `json:"agent_id,omitempty"`
	AgentName           *string      `json:"agent_name,omitempty"`
	AgentCode           *string      `json:"agent_code,omitempty"`
	PromoCode           *string      `json:"promo_code,omitempty"`
	DiscountAmount      int64        `json:"discount_amount"`
	AgentCommission     int64        `json:"agent_commission"`
	SerialNumber        *string      `json:"serial_number,omitempty"`
	IsBlank             bool         `json:"is_blank"`
	ActivatedByAgentID  *uuid.UUID   `json:"activated_by_agent_id,omitempty"`
	ActivatedAt         *time.Time   `json:"activated_at,omitempty"`
	TimeLimitSeconds    int64        `json:"time_limit_seconds"`
	DataLimitBytes      int64        `json:"data_limit_bytes"`
	UsedSeconds         int64        `json:"used_seconds"`
	UsedBytes           int64        `json:"used_bytes"`
	FirstUsedAt         *time.Time   `json:"first_used_at,omitempty"`
	ExpiresAt           *time.Time   `json:"expires_at,omitempty"`
	RevokedAt           *time.Time   `json:"revoked_at,omitempty"`
	RevokedReason       *string      `json:"revoked_reason,omitempty"`
	IsPrinted           bool         `json:"is_printed"`
	PrintedAt           *time.Time   `json:"printed_at,omitempty"`
	PrintCount          int          `json:"print_count"`
	CreatedAt           time.Time    `json:"created_at"`
	UpdatedAt           time.Time    `json:"updated_at"`
}

// Request / Response DTOs

type CreateTemplateRequest struct {
	Name            string  `json:"name" validate:"required,min=2,max=100"`
	Description     *string `json:"description"`
	Price           int64   `json:"price" validate:"min=0"`
	DurationMinutes int     `json:"duration_minutes" validate:"required,gt=0"`
	DataLimitBytes  int64   `json:"data_limit_bytes" validate:"min=0"`
	DownloadKbps    int64   `json:"download_kbps" validate:"required,gt=0"`
	UploadKbps      int64   `json:"upload_kbps" validate:"required,gt=0"`
	MinDownloadKbps int64   `json:"min_download_kbps" validate:"min=0"`
	MinUploadKbps   int64   `json:"min_upload_kbps" validate:"min=0"`
	ValidityDays    int     `json:"validity_days" validate:"required,gt=0"`
	IsAvailableOnline *bool `json:"is_available_online,omitempty"`
}

type UpdateTemplateRequest struct {
	Name            string  `json:"name" validate:"required,min=2,max=100"`
	Description     *string `json:"description"`
	Price           int64   `json:"price" validate:"min=0"`
	DurationMinutes int     `json:"duration_minutes" validate:"required,gt=0"`
	DataLimitBytes  int64   `json:"data_limit_bytes" validate:"min=0"`
	DownloadKbps    int64   `json:"download_kbps" validate:"required,gt=0"`
	UploadKbps      int64   `json:"upload_kbps" validate:"required,gt=0"`
	MinDownloadKbps int64   `json:"min_download_kbps" validate:"min=0"`
	MinUploadKbps   int64   `json:"min_upload_kbps" validate:"min=0"`
	ValidityDays    int     `json:"validity_days" validate:"required,gt=0"`
	IsActive        *bool   `json:"is_active,omitempty"`
	IsAvailableOnline *bool `json:"is_available_online,omitempty"`
}

type GenerateBatchRequest struct {
	TemplateID  uuid.UUID  `json:"template_id" validate:"required"`
	Quantity    int        `json:"quantity" validate:"required,min=1,max=1000"`
	Prefix      string     `json:"prefix" validate:"max=8"`
	Notes       *string    `json:"notes"`
	UserMode    string     `json:"user_mode"`   // "same" (username=password) or "separate"
	CharType    string     `json:"char_type"`   // "numeric", "alpha_lower", "alpha_upper", "alphanumeric_lower", "alphanumeric_upper", "alphanumeric_mixed"
	CodeLength  int        `json:"code_length"` // length of random part (default 6)
	AgentID     *uuid.UUID `json:"agent_id,omitempty"`
	IsMACLocked *bool      `json:"is_mac_locked,omitempty"`
}

type RevokeVoucherRequest struct {
	Reason string `json:"reason" validate:"required,min=3"`
}

type GenerateBlankBatchRequest struct {
	Quantity    int     `json:"quantity" validate:"required,min=1,max=1000"`
	Prefix      string  `json:"prefix" validate:"max=8"` // e.g. "SN", or blank
	CodeLength  int     `json:"code_length"`            // e.g. 6, 8, 10 (default 10)
	Notes       *string `json:"notes"`
	IsMACLocked *bool   `json:"is_mac_locked,omitempty"`
}

type ActivateBlankVoucherRequest struct {
	SerialNumber string    `json:"serial_number" validate:"required"`
	TemplateID   uuid.UUID `json:"template_id" validate:"required"`
}

type ActivateBlankRangeRequest struct {
	SNStart    string    `json:"sn_start" validate:"required"`
	SNEnd      string    `json:"sn_end" validate:"required"`
	TemplateID uuid.UUID `json:"template_id" validate:"required"`
}

type ReissueDamagedVoucherRequest struct {
	SerialNumber string `json:"serial_number" validate:"required"`
	Reason       string `json:"reason"`
}

type BlankVoucherInquiry struct {
	SerialNumber       string     `json:"serial_number"`
	Code               string     `json:"code,omitempty"`
	Status             Status     `json:"status"`
	IsBlank            bool       `json:"is_blank"`
	TemplateID         *uuid.UUID `json:"template_id,omitempty"`
	TemplateName       *string    `json:"template_name,omitempty"`
	Price              int64      `json:"price"`
	ActivatedAt        *time.Time `json:"activated_at,omitempty"`
	ActivatedByAgentID *uuid.UUID `json:"activated_by_agent_id,omitempty"`
	ActivatedByAgent   *string    `json:"activated_by_agent,omitempty"`
	TimeLimitSeconds   int64      `json:"time_limit_seconds"`
	DataLimitBytes     int64      `json:"data_limit_bytes"`
	FirstUsedAt        *time.Time `json:"first_used_at,omitempty"`
	ExpiresAt          *time.Time `json:"expires_at,omitempty"`
	UsedSeconds        int64      `json:"used_seconds"`
	UsedBytes          int64      `json:"used_bytes"`
}

type RangeActivationResult struct {
	SuccessCount    int      `json:"success_count"`
	TotalCost       int64    `json:"total_cost"`
	AgentCommission int64    `json:"agent_commission"`
	ActivatedSNs    []string `json:"activated_sns"`
}


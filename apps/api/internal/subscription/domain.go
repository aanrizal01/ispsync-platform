package subscription

import (
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/plan"
	"github.com/gigabill/isp/pkg/money"
)

type Status string

const (
	StatusPending   Status = "PENDING"
	StatusActive    Status = "ACTIVE"
	StatusGrace     Status = "GRACE"
	StatusSuspended Status = "SUSPENDED"
	StatusCancelled Status = "CANCELLED"
	StatusExpired   Status = "EXPIRED"
)

type AccessType string

const (
	AccessTypePPPoE     AccessType = "PPPOE"
	AccessTypeHotspot   AccessType = "HOTSPOT"
	AccessTypeVoucher   AccessType = "VOUCHER"
	AccessTypePasspoint AccessType = "PASSPOINT"
	AccessTypeIPoE      AccessType = "IPOE"
)

type AccessAccountStatus string

const (
	AccessAccountPending   AccessAccountStatus = "PENDING"
	AccessAccountActive    AccessAccountStatus = "ACTIVE"
	AccessAccountSuspended AccessAccountStatus = "SUSPENDED"
	AccessAccountDisabled  AccessAccountStatus = "DISABLED"
	AccessAccountExpired   AccessAccountStatus = "EXPIRED"
)

type Subscription struct {
	ID                 uuid.UUID       `json:"id"`
	CustomerID         uuid.UUID       `json:"customer_id"`
	CustomerNumber     *string         `json:"customer_number,omitempty"`
	CustomerName       *string         `json:"customer_name,omitempty"`
	PlanID             uuid.UUID       `json:"plan_id"`
	PlanName           *string         `json:"plan_name,omitempty"`
	PlanPriceID        uuid.UUID       `json:"plan_price_id"`
	PriceSnapshot      *PriceSnapshot  `json:"price_snapshot,omitempty"`
	Status             Status          `json:"status"`
	StartDate          *time.Time      `json:"start_date,omitempty"`
	EndDate            *time.Time      `json:"end_date,omitempty"`
	NextBillingDate    *time.Time      `json:"next_billing_date,omitempty"`
	BillingCycle       plan.BillingCycle `json:"billing_cycle"`
	AutoRenewal        bool            `json:"auto_renewal"`
	GracePeriodDays    int             `json:"grace_period_days"`
	CancelledAt        *time.Time      `json:"cancelled_at,omitempty"`
	CancellationReason *string         `json:"cancellation_reason,omitempty"`
	Notes              *string         `json:"notes,omitempty"`
	AccessAccounts     []AccessAccount `json:"access_accounts,omitempty"`
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

type PriceSnapshot struct {
	ID              uuid.UUID    `json:"id"`
	MonthlyPrice    money.Amount `json:"monthly_price"`
	InstallationFee money.Amount `json:"installation_fee"`
	ActivationFee   money.Amount `json:"activation_fee"`
	TaxPercent      int          `json:"tax_percent"`
	LateFeePercent  int          `json:"late_fee_percent"`
	Currency        string       `json:"currency"`
}

type AccessAccount struct {
	ID                   uuid.UUID           `json:"id"`
	CustomerID           uuid.UUID           `json:"customer_id"`
	SubscriptionID       *uuid.UUID          `json:"subscription_id,omitempty"`
	AccessType           AccessType          `json:"access_type"`
	Identity             string              `json:"identity"` // Username
	Password             *string             `json:"password,omitempty"`
	PasswordHash         *string             `json:"-"`        // Hide from JSON
	DisplayName          *string             `json:"display_name,omitempty"`
	Status               AccessAccountStatus `json:"status"`
	NasPortType          *string             `json:"nas_port_type,omitempty"`
	StaticIP             *string             `json:"static_ip,omitempty"`
	SimultaneousUseLimit int                 `json:"simultaneous_use_limit"`
	Notes                *string             `json:"notes,omitempty"`
	CreatedAt            time.Time           `json:"created_at"`
	UpdatedAt            time.Time           `json:"updated_at"`

	// Live Session Telemetry
	IsOnline          bool    `json:"is_online"`
	CurrentIP         *string `json:"current_ip,omitempty"`
	CallingStationID  *string `json:"calling_station_id,omitempty"`
	OnlineDurationSec *int64  `json:"online_duration_seconds,omitempty"`
}

// Request / Response DTOs

type CreateSubscriptionRequest struct {
	CustomerID         uuid.UUID  `json:"customer_id" validate:"required"`
	PlanID             uuid.UUID  `json:"plan_id" validate:"required"`
	BillingCycle       *plan.BillingCycle `json:"billing_cycle"`
	AutoRenewal        *bool      `json:"auto_renewal"`
	Notes              *string    `json:"notes"`
	InitialAccessType  *AccessType `json:"initial_access_type"` // Optional: e.g. PPPOE or HOTSPOT
	InitialUsername    *string    `json:"initial_username"`
	InitialPassword    *string    `json:"initial_password"`
	InitialStaticIP    *string    `json:"initial_static_ip"`
}

type CancelSubscriptionRequest struct {
	Reason string `json:"reason" validate:"required,min=3"`
}

type ChangePlanRequest struct {
	PlanID uuid.UUID `json:"plan_id" validate:"required"`
}

type CreateAccessAccountRequest struct {
	CustomerID           uuid.UUID  `json:"customer_id" validate:"required"`
	SubscriptionID       *uuid.UUID `json:"subscription_id"`
	AccessType           AccessType `json:"access_type" validate:"required,oneof=PPPOE HOTSPOT VOUCHER PASSPOINT IPOE"`
	Identity             string     `json:"identity" validate:"required,min=3,max=128"`
	Password             string     `json:"password" validate:"required,min=4"`
	StaticIP             *string    `json:"static_ip"`
	DisplayName          *string    `json:"display_name"`
	SimultaneousUseLimit int        `json:"simultaneous_use_limit" validate:"min=1,max=100"`
	Notes                *string    `json:"notes"`
}

type UpdateAccessAccountStatusRequest struct {
	Status AccessAccountStatus `json:"status" validate:"required,oneof=PENDING ACTIVE SUSPENDED DISABLED EXPIRED"`
}

type UpdateAccessAccountIPRequest struct {
	StaticIP          *string `json:"static_ip"`
	DisconnectSession bool    `json:"disconnect_session"`
}

package plan

import (
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/pkg/money"
)

type PlanType string

const (
	PlanTypeHome      PlanType = "HOME"
	PlanTypeBusiness  PlanType = "BUSINESS"
	PlanTypeHotspot   PlanType = "HOTSPOT"
	PlanTypeVoucher   PlanType = "VOUCHER"
	PlanTypePasspoint PlanType = "PASSPOINT"
)

type Status string

const (
	StatusActive     Status = "ACTIVE"
	StatusInactive   Status = "INACTIVE"
	StatusDeprecated Status = "DEPRECATED"
)

type BillingCycle string

const (
	BillingCycleDaily     BillingCycle = "DAILY"
	BillingCycleWeekly    BillingCycle = "WEEKLY"
	BillingCycleMonthly   BillingCycle = "MONTHLY"
	BillingCycleQuarterly BillingCycle = "QUARTERLY"
	BillingCycleAnnual    BillingCycle = "ANNUAL"
	BillingCyclePrepaid   BillingCycle = "PREPAID"
)

type Plan struct {
	ID              uuid.UUID    `json:"id"`
	Name            string       `json:"name"`
	Description     *string      `json:"description,omitempty"`
	PlanType        PlanType     `json:"plan_type"`
	DownloadKbps    int64        `json:"download_kbps"`
	UploadKbps      int64        `json:"upload_kbps"`
	MinDownloadKbps int64        `json:"min_download_kbps"`
	MinUploadKbps   int64        `json:"min_upload_kbps"`
	BillingCycle    BillingCycle `json:"billing_cycle"`
	GracePeriodDays int          `json:"grace_period_days"`
	Status          Status       `json:"status"`
	IsVisible       bool         `json:"is_visible"`
	FramedPool      *string      `json:"framed_pool,omitempty"`
	GroupID         *uuid.UUID   `json:"group_id,omitempty"`
	GroupName       string       `json:"group_name,omitempty"`
	PackageGroup    string       `json:"package_group"`
	ClusterCode     string       `json:"cluster_code,omitempty"`
	ClusterArea     string       `json:"cluster_area,omitempty"`
	CurrentPrice    *Price       `json:"current_price,omitempty"`
	PriceHistory    []Price      `json:"price_history,omitempty"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
}

type Price struct {
	ID              uuid.UUID    `json:"id"`
	PlanID          uuid.UUID    `json:"plan_id"`
	MonthlyPrice    money.Amount `json:"monthly_price"`
	InstallationFee money.Amount `json:"installation_fee"`
	ActivationFee   money.Amount `json:"activation_fee"`
	TaxPercent      int          `json:"tax_percent"`     // 1100 = 11.00%
	LateFeePercent  int          `json:"late_fee_percent"`// 500 = 5.00%
	Currency        string       `json:"currency"`
	EffectiveFrom   time.Time    `json:"effective_from"`
	EffectiveUntil  *time.Time   `json:"effective_until,omitempty"`
	CreatedBy       *uuid.UUID   `json:"created_by,omitempty"`
	CreatedAt       time.Time    `json:"created_at"`
}

// PlanGroup represents a regional or cluster tier grouping of plans
type PlanGroup struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	Description *string   `json:"description,omitempty"`
	ClusterCode string    `json:"cluster_code"`
	ClusterArea string    `json:"cluster_area"`
	IsActive    bool      `json:"is_active"`
	PlanCount   int       `json:"plan_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Request / Response DTOs

type CreatePlanRequest struct {
	Name            string       `json:"name" validate:"required,min=2,max=100"`
	Description     *string      `json:"description"`
	PlanType        PlanType     `json:"plan_type" validate:"required,oneof=HOME BUSINESS HOTSPOT VOUCHER PASSPOINT"`
	DownloadKbps    int64        `json:"download_kbps" validate:"required,gt=0"`
	UploadKbps      int64        `json:"upload_kbps" validate:"required,gt=0"`
	MinDownloadKbps int64        `json:"min_download_kbps" validate:"min=0"`
	MinUploadKbps   int64        `json:"min_upload_kbps" validate:"min=0"`
	BillingCycle    BillingCycle `json:"billing_cycle" validate:"required,oneof=DAILY WEEKLY MONTHLY QUARTERLY ANNUAL PREPAID"`
	GracePeriodDays int          `json:"grace_period_days" validate:"min=0,max=30"`
	GroupID         *uuid.UUID   `json:"group_id"`
	PackageGroup    string       `json:"package_group"`
	FramedPool      *string      `json:"framed_pool"`
	MonthlyPrice    int64        `json:"monthly_price" validate:"min=0"`
	InstallationFee int64        `json:"installation_fee" validate:"min=0"`
	ActivationFee   int64        `json:"activation_fee" validate:"min=0"`
	TaxPercent      int          `json:"tax_percent" validate:"min=0,max=10000"`
	LateFeePercent  int          `json:"late_fee_percent" validate:"min=0,max=10000"`
}

type UpdatePlanRequest struct {
	Name            string        `json:"name" validate:"required,min=2,max=100"`
	Description     *string       `json:"description"`
	PlanType        *PlanType     `json:"plan_type"`
	DownloadKbps    *int64        `json:"download_kbps"`
	UploadKbps      *int64        `json:"upload_kbps"`
	MinDownloadKbps *int64        `json:"min_download_kbps"`
	MinUploadKbps   *int64        `json:"min_upload_kbps"`
	BillingCycle    *BillingCycle `json:"billing_cycle"`
	Status          Status        `json:"status" validate:"required,oneof=ACTIVE INACTIVE DEPRECATED"`
	GracePeriodDays int           `json:"grace_period_days" validate:"min=0,max=30"`
	GroupID         *uuid.UUID    `json:"group_id"`
	PackageGroup    string        `json:"package_group"`
	FramedPool      *string       `json:"framed_pool"`
	IsVisible       *bool         `json:"is_visible"`
}

type ToggleVisibilityRequest struct {
	IsVisible bool `json:"is_visible"`
}

type CreatePlanGroupRequest struct {
	Name        string  `json:"name" validate:"required,min=2,max=100"`
	Code        string  `json:"code" validate:"required,min=2,max=50"`
	Description *string `json:"description"`
	ClusterCode string  `json:"cluster_code" validate:"required"`
	ClusterArea string  `json:"cluster_area" validate:"required"`
}

type UpdatePlanGroupRequest struct {
	Name        string  `json:"name" validate:"required,min=2,max=100"`
	Description *string `json:"description"`
	ClusterCode string  `json:"cluster_code" validate:"required"`
	ClusterArea string  `json:"cluster_area" validate:"required"`
	IsActive    bool    `json:"is_active"`
}

type CreatePriceVersionRequest struct {
	MonthlyPrice    int64 `json:"monthly_price" validate:"min=0"`
	InstallationFee int64 `json:"installation_fee" validate:"min=0"`
	ActivationFee   int64 `json:"activation_fee" validate:"min=0"`
	TaxPercent      int   `json:"tax_percent" validate:"min=0,max=10000"`
	LateFeePercent  int   `json:"late_fee_percent" validate:"min=0,max=10000"`
}

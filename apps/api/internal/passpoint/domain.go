package passpoint

import (
	"time"

	"github.com/google/uuid"
)

type Profile struct {
	ID                   uuid.UUID `json:"id"`
	Name                 string    `json:"name"`
	OperatorFriendlyName string    `json:"operator_friendly_name"`
	DomainName           string    `json:"domain_name"`
	Realm                string    `json:"realm"`
	RoamingConsortiumOIs []string  `json:"roaming_consortium_ois"`
	EAPMethod            string    `json:"eap_method"` // EAP-TTLS
	InnerAuth            string    `json:"inner_auth"` // MSCHAPv2
	VenueName            *string   `json:"venue_name,omitempty"`
	VenueGroup           int       `json:"venue_group"`
	VenueType            int       `json:"venue_type"`
	IsDefault            bool      `json:"is_default"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type Credential struct {
	ID                  uuid.UUID  `json:"id"`
	CustomerID          uuid.UUID  `json:"customer_id"`
	CustomerName        *string    `json:"customer_name,omitempty"`
	CustomerNumber      *string    `json:"customer_number,omitempty"`
	CustomerPhone       *string    `json:"customer_phone,omitempty"`
	ProfileID           uuid.UUID  `json:"profile_id"`
	ProfileName         *string    `json:"profile_name,omitempty"`
	Username            string     `json:"username"`
	Password            string     `json:"password"`
	Status              string     `json:"status"` // ACTIVE, SUSPENDED, REVOKED
	LastAuthenticatedAt *time.Time `json:"last_authenticated_at,omitempty"`
	ExpiresAt           *time.Time `json:"expires_at,omitempty"`
	PackageName         *string    `json:"package_name,omitempty"`
	IssuerName          *string    `json:"issuer_name,omitempty"`
	IssuerType          *string    `json:"issuer_type,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

// Request / Response DTOs

type CreateProfileRequest struct {
	Name                 string   `json:"name" validate:"required,min=2"`
	OperatorFriendlyName string   `json:"operator_friendly_name" validate:"required"`
	DomainName           string   `json:"domain_name" validate:"required"`
	Realm                string   `json:"realm" validate:"required"`
	RoamingConsortiumOIs []string `json:"roaming_consortium_ois"`
	EAPMethod            string   `json:"eap_method" validate:"required,oneof=EAP-TTLS EAP-TLS EAP-PEAP"`
	InnerAuth            string   `json:"inner_auth" validate:"required,oneof=MSCHAPv2 PAP CHAP"`
	IsDefault            bool     `json:"is_default"`
}

type IssueCredentialRequest struct {
	ProfileID *uuid.UUID `json:"profile_id"` // Optional: fallback to default profile
}

type PasspointPackage struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	DurationDays int       `json:"duration_days"`
	Price        int64     `json:"price"` // IDR
	SpeedLimit   string    `json:"speed_limit"`
	IsPopular    bool      `json:"is_popular"`
	IsActive     bool      `json:"is_active"`
	SortOrder    int       `json:"sort_order"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type CreatePasspointPackageRequest struct {
	ID           string `json:"id" validate:"required,min=2"`
	Name         string `json:"name" validate:"required,min=2"`
	Description  string `json:"description"`
	DurationDays int    `json:"duration_days" validate:"required,min=1"`
	Price        int64  `json:"price" validate:"min=0"`
	SpeedLimit   string `json:"speed_limit" validate:"required"`
	IsPopular    bool   `json:"is_popular"`
	IsActive     *bool  `json:"is_active"`
	SortOrder    *int   `json:"sort_order"`
}

type UpdatePasspointPackageRequest struct {
	Name         string `json:"name" validate:"required,min=2"`
	Description  string `json:"description"`
	DurationDays int    `json:"duration_days" validate:"required,min=1"`
	Price        int64  `json:"price" validate:"min=0"`
	SpeedLimit   string `json:"speed_limit" validate:"required"`
	IsPopular    bool   `json:"is_popular"`
	IsActive     bool   `json:"is_active"`
	SortOrder    int    `json:"sort_order"`
}

type PasspointPurchaseRequest struct {
	PackageID     string `json:"package_id"`
	CustomerName  string `json:"customer_name"`
	Phone         string `json:"phone"`
	Email         string `json:"email,omitempty"`
	PaymentMethod string `json:"payment_method"`
	PromoCode     string `json:"promo_code,omitempty"`
}

type PasspointOrder struct {
	ID              uuid.UUID  `json:"id"`
	OrderID         string     `json:"order_id"`
	CashierCode     string     `json:"cashier_code"`
	OrderType       string     `json:"order_type"`
	PackageID       string     `json:"package_id"`
	PackageName     string     `json:"package_name"`
	DurationDays    int        `json:"duration_days"`
	CustomerName    string     `json:"customer_name"`
	CustomerPhone   string     `json:"customer_phone"`
	CustomerEmail   string     `json:"customer_email"`
	OriginalPrice   int64      `json:"original_price"`
	DiscountAmount  int64      `json:"discount_amount"`
	AdminFee        int64      `json:"admin_fee"`
	FinalPrice      int64      `json:"final_price"`
	AgentID         *uuid.UUID `json:"agent_id,omitempty"`
	PromoCode       string     `json:"promo_code,omitempty"`
	AgentCommission int64      `json:"agent_commission"`
	PaymentMethod   string     `json:"payment_method"`
	Status          string     `json:"status"`
	CredentialID    *uuid.UUID `json:"credential_id,omitempty"`
	PaidByAgentID   *uuid.UUID `json:"paid_by_agent_id,omitempty"`
	PaidAt          *time.Time `json:"paid_at,omitempty"`
	ExpiresAt       time.Time  `json:"expires_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type PasspointPurchaseResponse struct {
	OrderID        string    `json:"order_id"`
	CashierCode    string    `json:"cashier_code,omitempty"`
	PackageName    string    `json:"package_name"`
	Amount         int64     `json:"amount"`
	AdminFee       int64     `json:"admin_fee,omitempty"`
	TotalToPay     int64     `json:"total_to_pay,omitempty"`
	OriginalPrice  int64     `json:"original_price,omitempty"`
	DiscountAmount int64     `json:"discount_amount,omitempty"`
	PromoCode      string    `json:"promo_code,omitempty"`
	AgentName      string    `json:"agent_name,omitempty"`
	PaymentMethod  string    `json:"payment_method"`
	PaymentURL     string    `json:"payment_url,omitempty"`
	SnapToken      string    `json:"snap_token,omitempty"`
	QrString       string    `json:"qr_string"`
	QrImageURL     string    `json:"qr_image_url"`
	ExpiresAt      time.Time `json:"expires_at"`
	Status         string    `json:"status"`
}

type PasspointCheckRequest struct {
	OrderID     string `json:"order_id"`
	SimulatePay bool   `json:"simulate_pay,omitempty"`
}

type PasspointCheckResponse struct {
	Status          string `json:"status"`
	CredentialID    string `json:"credential_id"`
	Username        string `json:"username"`
	Password        string `json:"password"`
	Realm           string `json:"realm"`
	DomainName      string `json:"domain_name"`
	AppleProfileURL string `json:"apple_profile_url"`
	Message         string `json:"message"`
}

type PasspointRenewRequest struct {
	CredentialID  string `json:"credential_id"`
	PackageID     string `json:"package_id"`
	PaymentMethod string `json:"payment_method"`
	PromoCode     string `json:"promo_code,omitempty"`
}

type PasspointRenewResponse struct {
	OrderID        string    `json:"order_id"`
	CashierCode    string    `json:"cashier_code,omitempty"`
	CredentialID   string    `json:"credential_id"`
	PackageName    string    `json:"package_name"`
	DurationDays   int       `json:"duration_days"`
	Amount         int64     `json:"amount"`
	AdminFee       int64     `json:"admin_fee,omitempty"`
	TotalToPay     int64     `json:"total_to_pay,omitempty"`
	OriginalPrice  int64     `json:"original_price,omitempty"`
	DiscountAmount int64     `json:"discount_amount,omitempty"`
	PromoCode      string    `json:"promo_code,omitempty"`
	AgentName      string    `json:"agent_name,omitempty"`
	PaymentMethod  string    `json:"payment_method"`
	QrString       string    `json:"qr_string"`
	QrImageURL     string    `json:"qr_image_url"`
	ExpiresAt      time.Time `json:"expires_at"`
	Status         string    `json:"status"`
}

type PasspointCheckRenewRequest struct {
	OrderID     string `json:"order_id"`
	SimulatePay bool   `json:"simulate_pay,omitempty"`
}

type PasspointCheckRenewResponse struct {
	Status       string `json:"status"`
	CredentialID string `json:"credential_id"`
	NewExpiresAt string `json:"new_expires_at"`
	Message      string `json:"message"`
}

type PasspointInquiryResult struct {
	OrderID           string `json:"order_id"`
	CashierCode       string `json:"cashier_code"`
	OrderType         string `json:"order_type"`
	PackageID         string `json:"package_id"`
	PackageName       string `json:"package_name"`
	DurationDays      int    `json:"duration_days"`
	CustomerName      string `json:"customer_name"`
	CustomerPhone     string `json:"customer_phone"`
	OriginalPrice     int64  `json:"original_price"`
	DiscountAmount    int64  `json:"discount_amount"`
	PackagePrice      int64  `json:"package_price"`
	AdminFee          int64  `json:"admin_fee"`
	TotalCustomerPays int64  `json:"total_customer_pays"`
	AgentCommission   int64  `json:"agent_commission"`
	AgentDebitAmount  int64  `json:"agent_debit_amount"`
	AgentProfit       int64  `json:"agent_profit"`
	Status            string `json:"status"`
	ExpiresAt         string `json:"expires_at"`
}

type PayPasspointByAgentRequest struct {
	CashierCode string `json:"cashier_code"`
	OrderID     string `json:"order_id,omitempty"`
}

type IssueManualPasspointRequest struct {
	PackageID    string `json:"package_id"`
	CustomerName string `json:"customer_name"`
	Phone        string `json:"phone"`
	Email        string `json:"email,omitempty"`
}

type PasspointReceipt struct {
	ReceiptNumber     string `json:"receipt_number"`
	TransactionTime   string `json:"transaction_time"`
	CashierCode       string `json:"cashier_code"`
	AgentName         string `json:"agent_name"`
	AgentCode         string `json:"agent_code"`
	CustomerName      string `json:"customer_name"`
	CustomerPhone     string `json:"customer_phone"`
	PackageName       string `json:"package_name"`
	DurationDays      int    `json:"duration_days"`
	TotalCustomerPays int64  `json:"total_customer_pays"`
	AgentDebitAmount  int64  `json:"agent_debit_amount"`
	AgentProfit       int64  `json:"agent_profit"`
	Username          string `json:"username"`
	Password          string `json:"password"`
	Realm             string `json:"realm"`
	DomainName        string `json:"domain_name"`
	AppleProfileURL   string `json:"apple_profile_url"`
	BalanceAfter      int64  `json:"balance_after"`
}

// ──────────────────────────────────────────
// Live Sessions (Radacct)
// ──────────────────────────────────────────

type PasspointActiveSession struct {
	RadAcctID        int64      `json:"radacctid"`
	AcctSessionID    string     `json:"acctsessionid"`
	Username         string     `json:"username"`
	NasIPAddress     string     `json:"nasipaddress"`
	FramedIPAddress  string     `json:"framedipaddress"`
	CallingStationID string     `json:"callingstationid"` // MAC Address
	AcctStartTime    time.Time  `json:"acctstarttime"`
	AcctSessionTime  int64      `json:"acctsessiontime"` // seconds
	AcctInputOctets  int64      `json:"acctinputoctets"` // bytes uploaded
	AcctOutputOctets int64      `json:"acctoutputoctets"` // bytes downloaded
	CredentialID     *uuid.UUID `json:"credential_id,omitempty"`
	CustomerName     *string    `json:"customer_name,omitempty"`
	CustomerPhone    *string    `json:"customer_phone,omitempty"`
	ProfileName      *string    `json:"profile_name,omitempty"`
}

type DisconnectSessionRequest struct {
	Username      string `json:"username" validate:"required"`
	NasIPAddress  string `json:"nasipaddress" validate:"required"`
	AcctSessionID string `json:"acctsessionid" validate:"required"`
}

// ──────────────────────────────────────────
// Customer Self-Care Status
// ──────────────────────────────────────────

type PasspointCustomerStatus struct {
	CredentialID        string     `json:"credential_id"`
	Username            string     `json:"username"`
	CustomerName        string     `json:"customer_name"`
	CustomerPhone       string     `json:"customer_phone"`
	ProfileName         string     `json:"profile_name"`
	Realm               string     `json:"realm"`
	Status              string     `json:"status"` // ACTIVE, EXPIRED, REVOKED
	PackageName         string     `json:"package_name"`
	ExpiresAt           *time.Time `json:"expires_at,omitempty"`
	DaysRemaining       int        `json:"days_remaining"`
	HoursRemaining      int        `json:"hours_remaining"`
	LastAuthenticatedAt *time.Time `json:"last_authenticated_at,omitempty"`
	AppleProfileURL     string     `json:"apple_profile_url"`
	CanRenew            bool       `json:"can_renew"`
	LastOrderID         string     `json:"last_order_id,omitempty"`
}

type CheckCustomerStatusRequest struct {
	Query string `json:"query" validate:"required"`
}

// ──────────────────────────────────────────
// Financial & Sales Analytics
// ──────────────────────────────────────────

type DailyRevenueItem struct {
	Date        string `json:"date"`
	Revenue     int64  `json:"revenue"`
	TotalOrders int    `json:"total_orders"`
}

type ChannelAnalytics struct {
	OnlineCount     int   `json:"online_count"`
	OnlineRevenue   int64 `json:"online_revenue"`
	AgentCount      int   `json:"agent_count"`
	AgentRevenue    int64 `json:"agent_revenue"`
	AgentCommission int64 `json:"agent_commission"`
	AdminCount      int   `json:"admin_count"`
}

type PasspointAnalytics struct {
	TotalRevenueToday    int64              `json:"total_revenue_today"`
	TotalRevenueMonth    int64              `json:"total_revenue_month"`
	TotalRevenueAllTime  int64              `json:"total_revenue_all_time"`
	TotalOrdersToday     int                `json:"total_orders_today"`
	TotalOrdersMonth     int                `json:"total_orders_month"`
	TotalOrdersAllTime   int                `json:"total_orders_all_time"`
	ActiveCredentials    int                `json:"active_credentials"`
	ExpiredCredentials   int                `json:"expired_credentials"`
	TotalAgentCommission int64              `json:"total_agent_commission"`
	ChannelBreakdown     ChannelAnalytics   `json:"channel_breakdown"`
	RecentDailyRevenue   []DailyRevenueItem `json:"recent_daily_revenue"`
}



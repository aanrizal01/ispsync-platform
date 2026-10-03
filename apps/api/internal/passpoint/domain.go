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
	ProfileID           uuid.UUID  `json:"profile_id"`
	ProfileName         *string    `json:"profile_name,omitempty"`
	Username            string     `json:"username"`
	Password            string     `json:"password"`
	Status              string     `json:"status"` // ACTIVE, SUSPENDED, REVOKED
	LastAuthenticatedAt *time.Time `json:"last_authenticated_at,omitempty"`
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
	ID           string `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	DurationDays int    `json:"duration_days"`
	Price        int64  `json:"price"` // IDR
	SpeedLimit   string `json:"speed_limit"`
	IsPopular    bool   `json:"is_popular"`
}

type PasspointPurchaseRequest struct {
	PackageID     string `json:"package_id"`
	CustomerName  string `json:"customer_name"`
	Phone         string `json:"phone"`
	Email         string `json:"email,omitempty"`
	PaymentMethod string `json:"payment_method"`
	PromoCode     string `json:"promo_code,omitempty"`
}

type PasspointPurchaseResponse struct {
	OrderID        string    `json:"order_id"`
	PackageName    string    `json:"package_name"`
	Amount         int64     `json:"amount"`
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
	CredentialID   string    `json:"credential_id"`
	PackageName    string    `json:"package_name"`
	DurationDays   int       `json:"duration_days"`
	Amount         int64     `json:"amount"`
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



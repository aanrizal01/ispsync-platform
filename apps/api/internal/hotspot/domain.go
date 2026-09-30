package hotspot

import (
	"time"
)

type LoginMode string

const (
	LoginModeVoucher LoginMode = "VOUCHER"
	LoginModeMember  LoginMode = "MEMBER"
)

type LoginRequest struct {
	Mode      LoginMode `json:"mode" validate:"required,oneof=VOUCHER MEMBER"`
	Code      string    `json:"code"`     // Used for Voucher mode
	Username  string    `json:"username"` // Used for Member mode
	Password  string    `json:"password"` // Used for both (optional for voucher if passwordless)
	ClientIP  string    `json:"client_ip"`
	ClientMAC string    `json:"client_mac"`
	RouterIP  string    `json:"router_ip"`
}

type LoginResponse struct {
	Success      bool       `json:"success"`
	Message      string     `json:"message"`
	Username     string     `json:"username"`
	Password     string     `json:"password"`
	PlanName     string     `json:"plan_name"`
	TimeLimit    int64      `json:"time_limit_seconds"` // 0 = unlimited
	DataLimit    int64      `json:"data_limit_bytes"`   // 0 = unlimited
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
	RedirectURL  *string    `json:"redirect_url,omitempty"`
	RequireReset bool       `json:"require_reset,omitempty"`
	Channel      string     `json:"channel,omitempty"`
	BoundMAC     string     `json:"bound_mac,omitempty"`
}

type StatusResponse struct {
	IsOnline         bool       `json:"is_online"`
	Username         string     `json:"username"`
	ClientIP         string     `json:"client_ip"`
	ClientMAC        string     `json:"client_mac"`
	SessionTime      int64      `json:"session_time_seconds"`
	RemainingTime    *int64     `json:"remaining_time_seconds,omitempty"`
	BytesIn          int64      `json:"bytes_in"`  // Upload
	BytesOut         int64      `json:"bytes_out"` // Download
	RemainingBytes   *int64     `json:"remaining_bytes,omitempty"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
}

type LogoutRequest struct {
	Username  string `json:"username" validate:"required"`
	ClientIP  string `json:"client_ip"`
	ClientMAC string `json:"client_mac"`
	RouterIP  string `json:"router_ip"`
}

type VoucherPackage struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Description     string  `json:"description"`
	Price           int64   `json:"price"` // IDR
	DurationMinutes int     `json:"duration_minutes"`
	DataLimitBytes  int64   `json:"data_limit_bytes"`
	DownloadKbps    int     `json:"download_kbps"`
	UploadKbps      int     `json:"upload_kbps"`
	ValidityDays    int     `json:"validity_days"`
}

type PurchaseRequest struct {
	TemplateID    string `json:"template_id"`
	Phone         string `json:"phone,omitempty"`
	PaymentMethod string `json:"payment_method"` // "QRIS", "GOPAY", "OVO", "VA"
	ClientIP      string `json:"client_ip,omitempty"`
	ClientMAC     string `json:"client_mac,omitempty"`
	PromoCode     string `json:"promo_code,omitempty"`
}

type PurchaseResponse struct {
	OrderID        string    `json:"order_id"`
	TemplateName   string    `json:"template_name"`
	Amount         int64     `json:"amount"` // Harga akhir yang dibayar
	OriginalPrice  int64     `json:"original_price"`
	DiscountAmount int64     `json:"discount_amount"`
	PromoCode      string    `json:"promo_code,omitempty"`
	AgentName      string    `json:"agent_name,omitempty"`
	PaymentMethod  string    `json:"payment_method"`
	PaymentURL     string    `json:"payment_url,omitempty"`
	SnapToken      string    `json:"snap_token,omitempty"`
	QrString       string    `json:"qr_string,omitempty"`
	QrImageURL     string    `json:"qr_image_url,omitempty"`
	ExpiresAt      time.Time `json:"expires_at"`
	Status         string    `json:"status"` // "PENDING", "PAID"
}

type ClaimPurchaseRequest struct {
	OrderID     string `json:"order_id"`
	TemplateID  string `json:"template_id,omitempty"`
	Phone       string `json:"phone,omitempty"`
	ClientIP    string `json:"client_ip,omitempty"`
	ClientMAC   string `json:"client_mac,omitempty"`
	PromoCode   string `json:"promo_code,omitempty"`
	SimulatePay bool   `json:"simulate_pay,omitempty"`
}

type ClaimPurchaseResponse struct {
	Status       string `json:"status"` // "PENDING", "PAID"
	Code         string `json:"code,omitempty"`
	Password     string `json:"password,omitempty"`
	PlanName     string `json:"plan_name,omitempty"`
	TimeLimitSec int64  `json:"time_limit_seconds,omitempty"`
	Message      string `json:"message"`
}

type RecoverVoucherRequest struct {
	Phone     string `json:"phone,omitempty"`
	OrderID   string `json:"order_id,omitempty"`
	ClientMAC string `json:"client_mac,omitempty"`
	ClientIP  string `json:"client_ip,omitempty"`
}

type RecoverVoucherResponse struct {
	Success        bool   `json:"success"`
	Authorized     bool   `json:"authorized"`
	Code           string `json:"code,omitempty"`
	Password       string `json:"password,omitempty"`
	PlanName       string `json:"plan_name,omitempty"`
	TimeLimitSec   int64  `json:"time_limit_seconds,omitempty"`
	MaskedPhone    string `json:"masked_phone,omitempty"`
	Message        string `json:"message"`
	SentToWhatsApp bool   `json:"sent_to_whatsapp"`
}

type ResetDeviceRequest struct {
	Code      string `json:"code" validate:"required"`
	ResetKey  string `json:"reset_key" validate:"required"`
	ClientMAC string `json:"client_mac" validate:"required"`
	ClientIP  string `json:"client_ip,omitempty"`
}

type ResetDeviceResponse struct {
	Success  bool   `json:"success"`
	Message  string `json:"message"`
	Channel  string `json:"channel"`
	NewMAC   string `json:"new_mac"`
	Username string `json:"username"`
	Password string `json:"password"`
}


package domain

import (
	"time"
)

// AppType merepresentasikan peran portal berdasarkan subdomain
// Contoh: cms.ispku.ispsync.id -> CMS
//         portal.ispku.ispsync.id -> PORTAL
//         noc.ispku.ispsync.id -> NOC
//         sales.ispku.ispsync.id -> SALES
//         teknisi.ispku.ispsync.id -> TEKNISI
type AppType string

const (
	AppCMS       AppType = "cms"
	AppPortal    AppType = "portal"
	AppNOC       AppType = "noc"
	AppSales     AppType = "sales"
	AppTeknisi   AppType = "teknisi"
	AppWifi      AppType = "wifi"
	AppIsolir    AppType = "isolir"
	AppPlatform  AppType = "platform" // Admin master SaaS ISPSYNC
)

// Tenant merepresentasikan ISP / Provider yang berlangganan platform SaaS ISPSYNC
type Tenant struct {
	ID           string    `json:"id"`
	Slug         string    `json:"slug"`         // "ispku", "nusantara", dll.
	Name         string    `json:"name"`         // "PT. ISP Kita Nusantara"
	ShortName    string    `json:"short_name"`   // "ISPKU"
	PrefixID     string    `json:"prefix_id"`    // Prefix untuk Subscriber No, misal "ISPKU"
	LogoURL      string    `json:"logo_url"`
	BrandColor   string    `json:"brand_color"`  // Hex color, misal "#1e40af"
	ContactPhone string    `json:"contact_phone"`
	ContactEmail string    `json:"contact_email"`
	Address      string    `json:"address"`
	CustomDomain   string    `json:"custom_domain,omitempty"`
	BaseStaffQuota int       `json:"base_staff_quota,omitempty"` // Batas dasar akun staf (default 3)
	Status         string    `json:"status"`                     // "ACTIVE", "SUSPENDED"
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// TenantAddon merepresentasikan add-on berbayar milik tenant (misal: kuota staf, slot OLT, dll)
type TenantAddon struct {
	ID           string     `json:"id"`
	TenantID     string     `json:"tenant_id"`
	AddonCode    string     `json:"addon_code"`     // e.g. "ADDON_STAFF_5"
	AddonType    string     `json:"addon_type"`     // "STAFF_SEAT", "OLT_SLOT", "ODP_LIMIT"
	Name         string     `json:"name"`           // e.g. "Add-on +5 Akun Staf"
	Quantity     int        `json:"quantity"`       // 5
	MonthlyPrice float64    `json:"monthly_price"`  // 50000
	Status       string     `json:"status"`         // "ACTIVE", "EXPIRED", "SUSPENDED"
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// StaffQuotaStatus merepresentasikan status dan penggunaan kuota akun staf tenant
type StaffQuotaStatus struct {
	TenantID       string `json:"tenant_id"`
	BaseQuota      int    `json:"base_quota"`       // Default 3
	AddonQuota     int    `json:"addon_quota"`      // Sum dari ACTIVE addon quantity
	TotalQuota     int    `json:"total_quota"`      // BaseQuota + AddonQuota
	UsedStaffCount int    `json:"used_staff_count"` // Jumlah akun staf aktif (role != 'OWNER')
	RemainingQuota int    `json:"remaining_quota"`  // TotalQuota - UsedStaffCount
	CanAddStaff    bool   `json:"can_add_staff"`    // RemainingQuota > 0
}


// User merepresentasikan staf atau akun pada masing-masing Tenant
type User struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenant_id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	Email        string    `json:"email"`
	Phone        string    `json:"phone"`
	Role         string    `json:"role"` // "OWNER", "NOC", "SALES", "TECHNICIAN", "FINANCE"
	BranchCode   string    `json:"branch_code"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

// Plan paket internet tenant
type Plan struct {
	ID            string  `json:"id"`
	TenantID      string  `json:"tenant_id"`
	Code          string  `json:"code"`
	Name          string  `json:"name"`
	SpeedDownMbps int     `json:"speed_down_mbps"`
	SpeedUpMbps   int     `json:"speed_up_mbps"`
	MonthlyPrice  float64 `json:"monthly_price"`
	Description   string  `json:"description"`
	IsActive      bool    `json:"is_active"`
}

// ODP titik distribusi fiber optik
type ODP struct {
	ID                string  `json:"id"`
	TenantID          string  `json:"tenant_id"`
	Code              string  `json:"code"` // "ODP-PYK-001"
	Name              string  `json:"name"`
	Latitude          float64 `json:"latitude"`
	Longitude         float64 `json:"longitude"`
	TotalPorts        int     `json:"total_ports"`
	UsedPorts         int     `json:"used_ports"`
	Status            string  `json:"status"`
	IsSharedJartaplok bool    `json:"is_shared_jartaplok,omitempty"`
	OwnerTenantSlug   string  `json:"owner_tenant_slug,omitempty"`
	OwnerTenantName   string  `json:"owner_tenant_name,omitempty"`
}

// JartaplokAgreement merepresentasikan perjanjian bagi pakai infrastruktur jaringan tetap lokal (ODP/Feeder) antar-ISP tenant
type JartaplokAgreement struct {
	ID                    string    `json:"id"`
	AgreementNo           string    `json:"agreement_no"`
	ProviderTenantID      string    `json:"provider_tenant_id"`
	ProviderTenantSlug    string    `json:"provider_tenant_slug"`
	ProviderTenantName    string    `json:"provider_tenant_name"`
	ClientTenantID        string    `json:"client_tenant_id"`
	ClientTenantSlug      string    `json:"client_tenant_slug"`
	ClientTenantName      string    `json:"client_tenant_name"`
	ScopeArea             string    `json:"scope_area"`
	TotalSharedODPs       int       `json:"total_shared_odps"`
	AllocatedPorts        int       `json:"allocated_ports"`
	UsedPorts             int       `json:"used_ports"`
	SettlementRatePerPort float64   `json:"settlement_rate_per_port"`
	MonthlyBill           float64   `json:"monthly_bill"`
	Status                string    `json:"status"`
	CreatedAt             time.Time `json:"created_at"`
}

// JartaplokPartner profil perusahaan rekanan penyelenggara JARTAPLOK / Bitstream Wholesale
type JartaplokPartner struct {
	ID                string    `json:"id"`
	TenantID          string    `json:"tenant_id,omitempty"`
	Code              string    `json:"code"`
	Name              string    `json:"name"`
	APIKey            string    `json:"api_key"`
	ContactPhone      string    `json:"contact_phone"`
	CoverageArea      string    `json:"coverage_area"`
	ServiceType       string    `json:"service_type"`
	SuspensionPolicy  string    `json:"suspension_policy"`
	PricingModel      string    `json:"pricing_model"`
	Rate20M           int64     `json:"rate_20m"`
	Rate30M           int64     `json:"rate_30m"`
	Rate40M           int64     `json:"rate_40m"`
	Rate50M           int64     `json:"rate_50m"`
	Rate100M          int64     `json:"rate_100m"`
	Rate150M          int64     `json:"rate_150m"`
	Rate200M          int64     `json:"rate_200m"`
	Rate300M          int64     `json:"rate_300m"`
	OTCFee            int64     `json:"otc_fee"`
	MaxDistanceMeters float64   `json:"max_distance_meters"`
	TotalODPs         int       `json:"total_odps,omitempty"`
	TotalPorts        int       `json:"total_ports,omitempty"`
	ActivePorts       int       `json:"active_ports,omitempty"`
	BranchCode        string    `json:"branch_code,omitempty"`
	IsActive          bool      `json:"is_active"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// OLT perangkat OLT di jaringan tenant
type OLT struct {
	ID        string `json:"id"`
	TenantID  string `json:"tenant_id"`
	Name      string `json:"name"`
	Vendor    string `json:"vendor"` // "HUAWEI", "ZTE", "VSOL", "JOLINK", "FIBERHOME"
	HostIP    string `json:"host_ip"`
	Port          int    `json:"port"`
	SNMPPort      int    `json:"snmp_port"`
	SNMPCommunity string `json:"snmp_community"`
	RouterID      string `json:"router_id"`
	Username      string `json:"username"`
	Password  string `json:"-"`
	Status    string `json:"status"`
	TotalPONs int    `json:"total_pons"`
}

// Subscriber data pelanggan dengan ID mandiri yang mencakup layer profil, fisik FTTX, dan logika network
type Subscriber struct {
	ID               string     `json:"id"`
	TenantID         string     `json:"tenant_id"`
	SubscriberNo     string     `json:"subscriber_no"` // Universal Tenant-Scoped ID: "ISPKU-2026-0001"
	FullName         string     `json:"full_name"`
	IdentityNumber   string     `json:"identity_number"` // KTP / NIK
	Email            string     `json:"email"`
	Phone            string     `json:"phone"`
	Address          string     `json:"address"`
	Latitude         float64    `json:"latitude"`
	Longitude        float64    `json:"longitude"`
	DistanceToODP    float64    `json:"distance_to_odp"`
	SelectedPlanID   string     `json:"selected_plan_id"`
	SelectedPlanName string     `json:"selected_plan_name"`
	NearestODPID     string     `json:"nearest_odp_id"`
	NearestODPCode   string     `json:"nearest_odp_code"`
	OLTID            *string    `json:"olt_id,omitempty"`
	PONPort          *string    `json:"pon_port,omitempty"`
	ONUID            *int       `json:"onu_id,omitempty"`
	SerialNumber     *string    `json:"serial_number,omitempty"` // ONT SN
	MACAddress       *string    `json:"mac_address,omitempty"`
	RxOpticalPower   *float64   `json:"rx_optical_power,omitempty"` // dBm
	PPPoEUsername    *string    `json:"pppoe_username,omitempty"`
	PPPoEPassword    *string    `json:"pppoe_password,omitempty"`
	VLANID           *int       `json:"vlan_id,omitempty"`
	IPAddress        *string    `json:"ip_address,omitempty"`
	Status           string     `json:"status"` // "REGISTERED", "SURVEY_SCHEDULED", "INSTALLATION_SCHEDULED", "ACTIVE", "RESTRICTED", "TERMINATED"
	BillingType      string     `json:"billing_type"` // "PREPAID", "POSTPAID"
	ActivatedAt      *time.Time `json:"activated_at,omitempty"`
	SuspendedAt      *time.Time `json:"suspended_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`

	// Enriched registration documents & BAST info
	IDCardNumber         string     `json:"id_card_number,omitempty"`
	KTPPhotoURL          string     `json:"ktp_photo_url,omitempty"`
	ContractSignatureURL string     `json:"contract_signature_url,omitempty"`
	ContractSignedAt     *time.Time `json:"contract_signed_at,omitempty"`
	WorkOrderID          string     `json:"work_order_id,omitempty"`
	WorkOrderNo          string     `json:"work_order_no,omitempty"`
	WorkOrderStatus      string     `json:"work_order_status,omitempty"`
	TechnicianName       string     `json:"technician_name,omitempty"`
	MonthlyPrice         float64    `json:"monthly_price,omitempty"`
	OTCFee               float64    `json:"otc_fee,omitempty"`
	TaxID                string     `json:"tax_id,omitempty"`
	PartnerCode          string     `json:"partner_code,omitempty"`
	CustomNotes          string     `json:"custom_notes,omitempty"`
}

// WorkOrder surat perintah kerja teknisi lapangan
type WorkOrder struct {
	ID               string                 `json:"id"`
	TenantID         string                 `json:"tenant_id"`
	OrderNo          string                 `json:"order_no"` // "SPK-2026-0001"
	SubscriberID     string                 `json:"subscriber_id"`
	SubscriberNo     string                 `json:"subscriber_no"`
	CustomerName     string                 `json:"customer_name"`
	CustomerPhone    string                 `json:"customer_phone"`
	CustomerAddress  string                 `json:"customer_address"`
	CustomerLat      float64                `json:"customer_lat"`
	CustomerLng      float64                `json:"customer_lng"`
	ODPCode          string                 `json:"odp_code"`
	PlanName         string                 `json:"plan_name"`
	OrderType        string                 `json:"order_type"` // "SURVEY", "INSTALLATION", "REPAIR"
	TechnicianID     *string                `json:"technician_id,omitempty"`
	TechnicianName   string                 `json:"technician_name"`
	Status           string                 `json:"status"` // "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"
	RxPowerDBM       *float64               `json:"rx_power_dbm,omitempty"`
	SerialNumber     string                 `json:"serial_number,omitempty"`
	MACAddress       string                 `json:"mac_address,omitempty"`
	Notes            string                 `json:"notes"`
	BASTCompletedAt  *time.Time             `json:"bast_completed_at,omitempty"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
	Registration     map[string]interface{} `json:"registration,omitempty"`
	BAST             map[string]interface{} `json:"bast,omitempty"`
}

// Invoice tagihan siklus bulanan pelanggan
type Invoice struct {
	ID           string     `json:"id"`
	TenantID     string     `json:"tenant_id"`
	InvoiceNo    string     `json:"invoice_no"` // "INV-202609-0001"
	SubscriberID string     `json:"subscriber_id"`
	SubscriberNo string     `json:"subscriber_no"`
	CustomerName string     `json:"customer_name"`
	PlanName     string     `json:"plan_name"`
	Amount       float64    `json:"amount"`
	Status       string     `json:"status"` // "UNPAID", "PAID", "OVERDUE", "CANCELLED"
	DueDate      time.Time  `json:"due_date"`
	PaidAt       *time.Time `json:"paid_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// VoucherBatch kumpulan voucher cetak fisik / loket kasir
type VoucherBatch struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	BatchNo       string    `json:"batch_no"` // "BATCH-2026-01"
	ProfileName   string    `json:"profile_name"` // "5JAM-5000", "24JAM-10000"
	SpeedDownMbps int       `json:"speed_down_mbps"`
	SpeedUpMbps   int       `json:"speed_up_mbps"`
	Price         float64   `json:"price"`
	TotalVouchers int       `json:"total_vouchers"`
	UsedVouchers  int       `json:"used_vouchers"`
	CreatedAt     time.Time `json:"created_at"`
}

// Voucher item voucher internet hotspot
type Voucher struct {
	ID          string     `json:"id"`
	TenantID    string     `json:"tenant_id"`
	BatchID     string     `json:"batch_id"`
	Code        string     `json:"code"` // Kode unik voucher
	Password    string     `json:"password"`
	Price       float64    `json:"price"`
	ProfileName string     `json:"profile_name"`
	Status      string     `json:"status"` // "AVAILABLE", "SOLD", "USED", "EXPIRED"
	UsedAt      *time.Time `json:"used_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// TenantContext konteks tenant yang dilewatkan di HTTP request context
type TenantContext struct {
	Tenant    *Tenant
	AppType   AppType
	Subdomain string
	Host      string
	IsMaster  bool
}



type MikrotikRouter struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenant_id"`
	Name        string    `json:"name"`
	WgPubkey    string    `json:"wg_pubkey"`
	WgIP        string    `json:"wg_ip"`
	APIPort     int       `json:"api_port"`
	APIUser     string    `json:"api_user"`
	APIPassword string    `json:"api_password"`
	Status      string    `json:"status"`
	LastSeen    time.Time `json:"last_seen"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TenantCapabilities flag kemampuan per tenant (FiberGrid & infrastruktur sendiri).
type TenantCapabilities struct {
	TenantID           string `json:"tenant_id"`
	UsesFiberGrid      bool   `json:"uses_fibergrid"`
	OwnInfrastructure bool   `json:"own_infrastructure"`
}

// TenantIntegrationSettings menyimpan kunci API Maps & Telegram bot per tenant serta format penomoran PPPoE
type TenantIntegrationSettings struct {
	TenantID              string    `json:"tenant_id"`
	GoogleMapsAPIKey      string    `json:"google_maps_api_key"`
	TelegramBotToken      string    `json:"telegram_bot_token"`
	TelegramChatID        string    `json:"telegram_chat_id"`
	NotifyNewRegistration bool      `json:"notify_new_registration"`
	NotifyODPFull         bool      `json:"notify_odp_full"`
	NotifyRouterDown      bool      `json:"notify_router_down"`
	PPPoEPrefix           string    `json:"pppoe_prefix"`
	PPPoEIdSource         string    `json:"pppoe_id_source"`
	PPPoERealm            string    `json:"pppoe_realm"`
	PPPoEPassFormat       string    `json:"pppoe_pass_format"`
	PPPoEPassStatic       string    `json:"pppoe_pass_static"`
	PPPoEPassCharType     string    `json:"pppoe_pass_char_type"`
	PPPoEPassLength       int       `json:"pppoe_pass_length"`
	TaxMode               string    `json:"tax_mode"`       // "NON_PKP", "PKP_INCLUSIVE", "PKP_EXCLUSIVE"
	TaxRatePPN            float64   `json:"tax_rate_ppn"`   // Basis persen, misal 11.0 untuk PPN 11%
	NPWP                  string    `json:"npwp"`           // NPWP resmi entitas ISP
	UpdatedAt             time.Time `json:"updated_at"`
}

// ClusterSmartOLTConfig konfigurasi SmartOLT per klaster wilayah
type ClusterSmartOLTConfig struct {
	ID              string    `json:"id"`
	TenantID        string    `json:"tenant_id,omitempty"`
	ClusterName     string    `json:"cluster_name"`
	ProviderID      string    `json:"provider_id"`
	PartnerCode     string    `json:"partner_code,omitempty"`
	IntegrationType string    `json:"integration_type"`
	SmartOLTURL     string    `json:"smartolt_url"`
	SmartOLTKey     string    `json:"smartolt_api_key"`
	OLTID           string    `json:"olt_id"`
	ZoneID          string    `json:"zone_id"`
	ZoneName        string    `json:"zone_name"`
	IsActive        bool      `json:"is_active"`
	Notes           string    `json:"notes,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// LiveSessionInfo data sesi aktif PPPoE / Hotspot dari FreeRADIUS / MikroTik
type LiveSessionInfo struct {
	RadAcctID        int64     `json:"radacctid"`
	AcctSessionID    string    `json:"acctsessionid"`
	Username         string    `json:"username"`
	GroupName        string    `json:"groupname"`
	NasIPAddress     string    `json:"nasipaddress"`
	NasPortID        string    `json:"nasportid"`
	AcctStartTime    time.Time `json:"acctstarttime"`
	AcctSessionTime  int64     `json:"acctsessiontime"` // detik
	CallingStationID string    `json:"callingstationid"` // MAC modem
	FramedIPAddress  string    `json:"framedipaddress"`  // IP pelanggan
	IsOnline         bool      `json:"is_online"`
}

// CustomerBASTReport laporan BAST digital instalasi teknisi
type CustomerBASTReport struct {
	ID                   string    `json:"id"`
	WorkOrderID          string    `json:"work_order_id"`
	OpticalPowerDBM      float64   `json:"optical_power_dbm"`
	ONTSerialNumber      string    `json:"ont_serial_number"`
	ONTMACAddress        string    `json:"ont_mac_address"`
	DropcoreLengthMeters int       `json:"dropcore_length_meters"`
	CustomerSignatureURL *string   `json:"customer_signature_url,omitempty"`
	ProofPhotoURL        *string   `json:"proof_photo_url,omitempty"`
	HousePhotoURL        *string   `json:"house_photo_url,omitempty"`
	SpeedtestDownMbps    float64   `json:"speedtest_down_mbps"`
	SpeedtestUpMbps      float64   `json:"speedtest_up_mbps"`
	Notes                string    `json:"notes,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
}

// CustomerWorkOrder surat perintah kerja terkait lokasi pelanggan
type CustomerWorkOrder struct {
	ID             string              `json:"id"`
	OrderNo        string              `json:"order_no"`
	RegistrationID string              `json:"registration_id"`
	Type           string              `json:"type"`
	TechnicianName string              `json:"technician_name"`
	ScheduledAt    time.Time           `json:"scheduled_at"`
	Status         string              `json:"status"`
	Notes          string              `json:"notes,omitempty"`
	CreatedAt      time.Time           `json:"created_at"`
	BAST           *CustomerBASTReport `json:"bast,omitempty"`
}

// CustomerDocumentSite berkas identitas, kontrak, dan BAST per lokasi pasang
type CustomerDocumentSite struct {
	RegistrationID       string             `json:"registration_id"`
	RegistrationNo       string             `json:"registration_no"`
	FullName             string             `json:"full_name"`
	IDCardNumber         string             `json:"id_card_number"`
	TaxID                string             `json:"tax_id,omitempty"`
	Phone                string             `json:"phone"`
	Email                string             `json:"email"`
	Address              string             `json:"address"`
	Latitude             float64            `json:"latitude"`
	Longitude            float64            `json:"longitude"`
	SelectedPlanID       string             `json:"selected_plan_id"`
	SelectedPlanName     string             `json:"selected_plan_name"`
	NearestODPCode       *string            `json:"nearest_odp_code,omitempty"`
	DistanceToODPMeters  float64            `json:"distance_to_odp_meters"`
	Status               string             `json:"status"`
	KTPPhotoURL          string             `json:"ktp_photo_url,omitempty"`
	HousePhotoURL        string             `json:"house_photo_url,omitempty"`
	ContractSignatureURL string             `json:"contract_signature_url,omitempty"`
	ContractSignedAt     *time.Time         `json:"contract_signed_at,omitempty"`
	WorkOrder            *CustomerWorkOrder `json:"work_order,omitempty"`
	CreatedAt            time.Time          `json:"created_at"`
}

// CustomerDocumentsResponse dokumen lengkap pelanggan untuk Portal Ledger & Admin
type CustomerDocumentsResponse struct {
	CustomerID   string                 `json:"customer_id"`
	FullName     string                 `json:"full_name"`
	Phone        string                 `json:"phone"`
	Email        *string                `json:"email,omitempty"`
	IDCardNumber string                 `json:"id_card_number,omitempty"`
	Sites        []CustomerDocumentSite `json:"sites"`
}




type Ticket struct {
	ID          string    json:"id"
	TenantID    string    json:"tenant_id"
	CustomerID  string    json:"customer_id"
	Title       string    json:"title"
	Description string    json:"description"
	Status      string    json:"status"
	Priority    string    json:"priority"
	Category    string    json:"category"
	AssigneeID  string    json:"assignee_id"
	CreatedAt   time.Time json:"created_at"
	UpdatedAt   time.Time json:"updated_at"
}

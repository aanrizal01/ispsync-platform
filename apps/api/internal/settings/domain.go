package settings

import (
	"os"
	"time"
)

type BankAccountItem struct {
    BankName          string `json:"bank_name"`
    BankAccountNumber string `json:"bank_account_number"`
    BankAccountHolder string `json:"bank_account_holder"`
    Branch            string `json:"branch,omitempty"`
}

type InvoiceTemplateSettings struct {
    BrandName         string            `json:"brand_name"`
    CompanyName       string            `json:"company_name"`
    LicenseNo         string            `json:"license_no"`
    TaxID             string            `json:"tax_id"`
    Address           string            `json:"address"`
    Phone             string            `json:"phone"`
    Email             string            `json:"email"`
    Website           string            `json:"website"`
    LogoURL           string            `json:"logo_url"`
    BankName          string            `json:"bank_name"`
    BankAccountNumber string            `json:"bank_account_number"`
    BankAccountHolder string            `json:"bank_account_holder"`
    BankAccounts      []BankAccountItem `json:"bank_accounts,omitempty"`
    FooterNotes       string            `json:"footer_notes"`
    AccentColor       string            `json:"accent_color"`
    Layout            string            `json:"layout,omitempty"`
    HeaderImageURL       string         `json:"header_image_url,omitempty"`
    LetterheadHTML       string         `json:"letterhead_html,omitempty"`
    EnableQRVerification bool           `json:"enable_qr_verification"`
    UpdatedAt            time.Time      `json:"updated_at,omitempty"`
}

func DefaultInvoiceTemplateSettings() InvoiceTemplateSettings {
    return InvoiceTemplateSettings{
        BrandName:            "ISPSYNC",
        CompanyName:          "PT Inovasi Sistem Pintar",
        LicenseNo:            "Izin Penyelenggaraan Jasa Telekomunikasi & Jaringan Internet (ISP)",
        TaxID:                "03.882.194.5-014.000",
        Address:              "Gedung Cyber 1 Lt. 3, Jl. Kuningan Barat No. 8, Jakarta Selatan 12710",
        Phone:                "+62 811-660-1234",
        Email:                "info@ispsync.id",
        Website:              "https://ledger.ispsync.id",
        LogoURL:              "/logo.png",
        BankName:             "Bank Central Asia (BCA)",
        BankAccountNumber:    "8001234567",
        BankAccountHolder:    "PT Inovasi Sistem Pintar",
        BankAccounts: []BankAccountItem{
            {
                BankName:          "Bank Central Asia (BCA)",
                BankAccountNumber: "8001234567",
                BankAccountHolder: "PT Inovasi Sistem Pintar",
                Branch:            "KCU Jakarta Mampang",
            },
        },
        FooterNotes:          "Faktur ini diterbitkan secara elektronik dan sah tanpa memerlukan stempel basah.\nMohon melakukan pembayaran sebelum tanggal jatuh tempo guna menghindari isolir otomatis.\nHubungi Helpdesk Layanan di +62 811-660-1234 jika membutuhkan bantuan pembayaran.",
        AccentColor:          "#2563eb",
        HeaderImageURL:       "",
        LetterheadHTML:       "",
        EnableQRVerification: true,
        Layout:               "modern",
    }
}

type BillingAddonSettings struct {
    PublicIPMonthlyPrice int64     `json:"public_ip_monthly_price"`
    PublicIPDescription  string    `json:"public_ip_description"`
    UpdatedAt            time.Time `json:"updated_at,omitempty"`
}

func DefaultBillingAddonSettings() BillingAddonSettings {
    return BillingAddonSettings{
        PublicIPMonthlyPrice: 50000,
        PublicIPDescription:  "Sewa Add-on IP Publik Statik",
    }
}

type SecuritySettings struct {
    JWTExpiryHours     int       `json:"jwt_expiry_hours"`
    EnableIPWhitelist  bool      `json:"enable_ip_whitelist"`
    AllowedNOCSubnets  string    `json:"allowed_noc_subnets"`
    EnableWalledGarden bool      `json:"enable_walled_garden"`
    WalledGardenHosts  string    `json:"walled_garden_hosts"`
    EnableMACLock      bool      `json:"enable_mac_lock"`
    GoogleMapsAPIKey   string    `json:"google_maps_api_key"`
    UpdatedAt          time.Time `json:"updated_at,omitempty"`
}

func DefaultSecuritySettings() SecuritySettings {
    gmapsKey := os.Getenv("GOOGLE_MAPS_API_KEY")
    if gmapsKey == "" {
        gmapsKey = "AIzaSyBJQS0oth3gW6P0aKsZGG5FiDbVhmZI6yA"
    }
    return SecuritySettings{
        JWTExpiryHours:     8,
        EnableIPWhitelist:  false,
        AllowedNOCSubnets:  "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1/32",
        EnableWalledGarden: false,
        WalledGardenHosts:  "ledger.ispsync.id, nexus.ispsync.id, fibergrid.ispsync.id, api.midtrans.com, app.midtrans.com",
        EnableMACLock:      true,
        GoogleMapsAPIKey:   gmapsKey,
    }
}

type PaymentGatewaySettings struct {
    PPPoEProvider      string    `json:"pppoe_provider"`      // "midtrans", "duitku", "xendit", "tripay", "nicepay", "manual"
    VoucherProvider    string    `json:"voucher_provider"`    // "duitku", "midtrans", "xendit", "tripay", "nicepay", "manual"
    PasspointProvider  string    `json:"passpoint_provider"`  // "duitku", "midtrans", "xendit", "tripay", "nicepay", "manual"

    // Midtrans Credentials & Env
    MidtransMerchantID string    `json:"midtrans_merchant_id"`
    MidtransServerKey  string    `json:"midtrans_server_key"`
    MidtransClientKey  string    `json:"midtrans_client_key"`
    MidtransEnv        string    `json:"midtrans_env"`        // "sandbox" or "production"

    // Duitku Credentials & Env
    DuitkuMerchantCode string    `json:"duitku_merchant_code"`
    DuitkuAPIKey       string    `json:"duitku_api_key"`
    DuitkuEnv          string    `json:"duitku_env"`          // "sandbox" or "production"

    // Xendit Credentials
    XenditSecretKey    string    `json:"xendit_secret_key"`
    XenditWebhookToken string    `json:"xendit_webhook_token"`

    // Tripay Credentials & Env
    TripayApiKey       string    `json:"tripay_api_key"`
    TripayPrivateKey   string    `json:"tripay_private_key"`
    TripayMerchantCode string    `json:"tripay_merchant_code"`
    TripayEnv          string    `json:"tripay_env"`          // "sandbox" or "production"

    // Nicepay Credentials & Env
    NicepayImid        string    `json:"nicepay_imid"`
    NicepayMerchantKey string    `json:"nicepay_merchant_key"`
    NicepayEnv         string    `json:"nicepay_env"`         // "sandbox" or "production"

    UpdatedAt          time.Time `json:"updated_at,omitempty"`
}

func DefaultPaymentGatewaySettings() PaymentGatewaySettings {
    mtEnv := os.Getenv("MIDTRANS_ENV")
    if mtEnv == "" {
        mtEnv = "production"
    }
    dkEnv := os.Getenv("DUITKU_ENV")
    if dkEnv == "" {
        dkEnv = "sandbox"
    }

    return PaymentGatewaySettings{
        PPPoEProvider:      "midtrans",
        VoucherProvider:    "duitku",
        PasspointProvider:  "duitku",
        MidtransMerchantID: os.Getenv("MIDTRANS_MERCHANT_ID"),
        MidtransServerKey:  os.Getenv("MIDTRANS_SERVER_KEY"),
        MidtransClientKey:  os.Getenv("MIDTRANS_CLIENT_KEY"),
        MidtransEnv:        mtEnv,
        DuitkuMerchantCode: os.Getenv("DUITKU_MERCHANT_CODE"),
        DuitkuAPIKey:       os.Getenv("DUITKU_API_KEY"),
        DuitkuEnv:          dkEnv,
        XenditSecretKey:    os.Getenv("XENDIT_SECRET_KEY"),
        XenditWebhookToken: os.Getenv("XENDIT_WEBHOOK_TOKEN"),
        TripayApiKey:       os.Getenv("TRIPAY_API_KEY"),
        TripayPrivateKey:   os.Getenv("TRIPAY_PRIVATE_KEY"),
        TripayMerchantCode: os.Getenv("TRIPAY_MERCHANT_CODE"),
        TripayEnv:          "sandbox",
        NicepayImid:        os.Getenv("NICEPAY_IMID"),
        NicepayMerchantKey: os.Getenv("NICEPAY_MERCHANT_KEY"),
        NicepayEnv:         "sandbox",
    }
}

type DomainSettings struct {
    PrimaryDomain   string    `json:"primary_domain"`
    LedgerDomain    string    `json:"ledger_domain"`
    WifiDomain      string    `json:"wifi_domain"`
    WifiBrandName   string    `json:"wifi_brand_name"`
    PortalDomain    string    `json:"portal_domain"`
    FibergridDomain string    `json:"fibergrid_domain,omitempty"`
    ServerIP        string    `json:"server_ip"`
    UpdatedAt       time.Time `json:"updated_at,omitempty"`
}

func DefaultDomainSettings() DomainSettings {
    return DomainSettings{
        PrimaryDomain:   "gogiga.net.id",
        LedgerDomain:    "ledger.dev.ispsync.id",
        WifiDomain:      "wifi.dev.ispsync.id",
        WifiBrandName:   "@gowifi",
        PortalDomain:    "portal.dev.ispsync.id",
        FibergridDomain: "fibergrid.dev.ispsync.id",
        ServerIP:        "103.179.65.73",
    }
}

type NotificationSettings struct {
    WAProvider             string    `json:"wa_provider"`              // "FONNTE", "WABLAS", "INTERNAL"
    WAApiToken             string    `json:"wa_api_token"`             // Token API Fonnte / Wablas
    WAServerURL            string    `json:"wa_server_url"`            // Wablas Server Domain (e.g. https://api.wablas.com, https://phone.wablas.com)
    NotifyDueDateH3        bool      `json:"notify_due_date_h3"`
    NotifyInvoiceIssued    bool      `json:"notify_invoice_issued"`
    NotifyPaymentPaid      bool      `json:"notify_payment_paid"`
    NotifyAccountSuspended bool      `json:"notify_account_suspended"`
    SMTPHost               string    `json:"smtp_host"`
    SMTPPort               int       `json:"smtp_port"`
    SMTPUser               string    `json:"smtp_user"`
    SMTPPassword           string    `json:"smtp_password"`
    SMTPFrom               string    `json:"smtp_from"`
    UpdatedAt              time.Time `json:"updated_at,omitempty"`
}

func DefaultNotificationSettings() NotificationSettings {
    return NotificationSettings{
        WAProvider:             "FONNTE",
        WAApiToken:             os.Getenv("FONNTE_TOKEN"),
        WAServerURL:            "https://api.wablas.com",
        NotifyDueDateH3:        true,
        NotifyInvoiceIssued:    true,
        NotifyPaymentPaid:      true,
        NotifyAccountSuspended: true,
        SMTPPort:               587,
    }
}

type TestWhatsAppRequest struct {
    Provider  string `json:"provider"`              // "FONNTE" | "WABLAS"
    APIToken  string `json:"api_token"`             // Optional: override token being tested
    ServerURL string `json:"server_url"`            // Optional: Wablas server url
    Recipient string `json:"recipient"`             // Destination phone number e.g. 081234567890
    Message   string `json:"message,omitempty"`     // Optional custom message body
}



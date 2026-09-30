import { request } from "./client";

export interface BankAccountItem {
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  branch?: string;
}

export interface InvoiceTemplateSettings {
  brand_name: string;
  company_name: string;
  license_no: string;
  tax_id: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  bank_accounts?: BankAccountItem[];
  footer_notes: string;
  accent_color: string;
  header_image_url?: string;
  letterhead_html?: string;
  enable_qr_verification?: boolean;
  layout?: "modern" | "classic" | "banner" | "compact";
  updated_at?: string;
}

export const defaultInvoiceTemplateSettings: InvoiceTemplateSettings = {
  brand_name: "GOGIGANET",
  company_name: "PT GOGIGA MEDIA TEKNOLOGI",
  license_no: "Izin Penyelenggaraan Jasa Telekomunikasi & Jaringan Internet (ISP)",
  tax_id: "03.882.194.5-014.000",
  address: "Jl. Pulutan, Koto Tuo, Kec. Harau, Kab. 50 Kota, Sumatera Barat 26271",
  phone: "+62 811-660-1234",
  email: "info@ispsync.id",
  website: "https://ispsync.id",
  logo_url: "/logo.png",
  bank_name: "Bank Central Asia (BCA)",
  bank_account_number: "8001234567",
  bank_account_holder: "PT GOGIGA MEDIA TEKNOLOGI",
  bank_accounts: [
    {
      bank_name: "Bank Central Asia (BCA)",
      bank_account_number: "8001234567",
      bank_account_holder: "PT GOGIGA MEDIA TEKNOLOGI",
      branch: "KCU Harau",
    },
  ],
  footer_notes:
    "Faktur ini diterbitkan secara elektronik dan sah tanpa memerlukan stempel basah.\nMohon melakukan pembayaran sebelum tanggal jatuh tempo guna menghindari isolir otomatis.\nHubungi Helpdesk Layanan di +62 811-660-1234 jika membutuhkan bantuan pembayaran.",
  accent_color: "#2563eb",
  header_image_url: "",
  letterhead_html: "",
  enable_qr_verification: true,
  layout: "modern",
};

export const settingsApi = {
  getInvoiceTemplate: () =>
    request<InvoiceTemplateSettings>("/settings/invoice-template"),

  updateInvoiceTemplate: (data: InvoiceTemplateSettings) =>
    request<{ success: boolean; message: string; data: InvoiceTemplateSettings }>(
      "/settings/invoice-template",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),

  getBillingAddons: () =>
    request<BillingAddonSettings>("/settings/billing-addons"),

  updateBillingAddons: (data: BillingAddonSettings) =>
    request<{ success: boolean; message: string; data: BillingAddonSettings }>(
      "/settings/billing-addons",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),

  getSecuritySettings: () =>
    request<SecuritySettings>("/settings/security"),

  updateSecuritySettings: (data: SecuritySettings) =>
    request<{ success: boolean; message: string; data: SecuritySettings }>(
      "/settings/security",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),

  getClientIP: () =>
    request<{ success: boolean; ip: string }>("/settings/client-ip"),

  getPaymentGatewaySettings: () =>
    request<PaymentGatewaySettings>("/settings/payment-gateway"),

  updatePaymentGatewaySettings: (data: PaymentGatewaySettings) =>
    request<{ success: boolean; message: string; data: PaymentGatewaySettings }>(
      "/settings/payment-gateway",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),
};

export interface BillingAddonSettings {
  public_ip_monthly_price: number;
  public_ip_description: string;
  updated_at?: string;
}

export const defaultBillingAddonSettings: BillingAddonSettings = {
  public_ip_monthly_price: 50000,
  public_ip_description: "Sewa Add-on IP Publik Statik",
};

export interface SecuritySettings {
  jwt_expiry_hours: number;
  enable_ip_whitelist: boolean;
  allowed_noc_subnets: string;
  enable_walled_garden: boolean;
  walled_garden_hosts: string;
  enable_mac_lock: boolean;
  updated_at?: string;
}

export const defaultSecuritySettings: SecuritySettings = {
  jwt_expiry_hours: 8,
  enable_ip_whitelist: false,
  allowed_noc_subnets: "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1/32",
  enable_walled_garden: false,
  walled_garden_hosts: "ispsync.id, portal.ispsync.id, api.midtrans.com, app.midtrans.com",
  enable_mac_lock: true,
};

export type PaymentProviderOption = "midtrans" | "duitku" | "xendit" | "tripay" | "nicepay" | "manual";

export interface PaymentGatewaySettings {
  pppoe_provider: PaymentProviderOption;
  voucher_provider: PaymentProviderOption;
  passpoint_provider: PaymentProviderOption;

  midtrans_merchant_id: string;
  midtrans_server_key: string;
  midtrans_client_key: string;
  midtrans_env: "sandbox" | "production";

  duitku_merchant_code: string;
  duitku_api_key: string;
  duitku_env: "sandbox" | "production";

  xendit_secret_key: string;
  xendit_webhook_token: string;

  tripay_api_key: string;
  tripay_private_key: string;
  tripay_merchant_code: string;
  tripay_env: "sandbox" | "production";

  nicepay_imid: string;
  nicepay_merchant_key: string;
  nicepay_env: "sandbox" | "production";

  updated_at?: string;
}

export const defaultPaymentGatewaySettings: PaymentGatewaySettings = {
  pppoe_provider: "midtrans",
  voucher_provider: "duitku",
  passpoint_provider: "duitku",
  midtrans_merchant_id: "",
  midtrans_server_key: "",
  midtrans_client_key: "",
  midtrans_env: "sandbox",
  duitku_merchant_code: "",
  duitku_api_key: "",
  duitku_env: "sandbox",
  xendit_secret_key: "",
  xendit_webhook_token: "",
  tripay_api_key: "",
  tripay_private_key: "",
  tripay_merchant_code: "",
  tripay_env: "sandbox",
  nicepay_imid: "",
  nicepay_merchant_key: "",
  nicepay_env: "sandbox",
};



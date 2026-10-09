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

export function getTenantDefaultLogo(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    const parts = host.split(".");
    let slug = "";
    if (parts.length >= 4) {
      slug = parts[1];
    } else if (parts.length === 3 && parts[1] === "ispsync") {
      slug = parts[0];
    }
    if (slug && slug !== "dev") {
      return `/web/${slug}_logo.svg`;
    }
  }
  return "/web/dev_logo.svg";
}

export const defaultInvoiceTemplateSettings: InvoiceTemplateSettings = {
  brand_name: "ISPSYNC",
  company_name: "PT Inovasi Sistem Pintar",
  license_no: "Izin Penyelenggaraan Jasa Telekomunikasi & Jaringan Internet (ISP)",
  tax_id: "03.882.194.5-014.000",
  address: "Jl. Pulutan, Koto Tuo, Kec. Harau, Kab. 50 Kota, Sumatera Barat 26271",
  phone: "+62 811-660-1234",
  email: "info@ispsync.id",
  website: "https://ispsync.id",
  logo_url: "/logo.png",
  bank_name: "Bank Central Asia (BCA)",
  bank_account_number: "8001234567",
  bank_account_holder: "PT Inovasi Sistem Pintar",
  bank_accounts: [
    {
      bank_name: "Bank Central Asia (BCA)",
      bank_account_number: "8001234567",
      bank_account_holder: "PT Inovasi Sistem Pintar",
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

  getMapsSettings: () =>
    request<{ success: boolean; google_maps_api_key: string }>("/settings/maps"),

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

  getDomainSettings: () =>
    request<DomainSettings>("/settings/domain"),

  updateDomainSettings: (data: DomainSettings) =>
    request<{ success: boolean; message: string; data: DomainSettings }>(
      "/settings/domain",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),

  getNotificationSettings: () =>
    request<NotificationSettings>("/settings/notification"),

  updateNotificationSettings: (data: NotificationSettings) =>
    request<{ success: boolean; message: string; data: NotificationSettings }>(
      "/settings/notification",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),

  testWhatsApp: (data: {
    provider: string;
    api_token?: string;
    server_url?: string;
    recipient: string;
    message?: string;
  }) =>
    request<{ success: boolean; message: string }>("/settings/test-whatsapp", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getFiberGridSettings: () =>
    request<FiberGridIntegrationSettings>("/settings/fibergrid-integration"),

  updateFiberGridSettings: (data: FiberGridIntegrationSettings) =>
    request<{ success: boolean; message: string; data: FiberGridIntegrationSettings }>(
      "/settings/fibergrid-integration",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),

  testFiberGrid: (data: { api_url: string; api_key: string; tenant_code?: string }) =>
    request<{ success: boolean; message: string; latency_ms: number; routes_count: number }>(
      "/settings/test-fibergrid",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  getTenantSettings: async () => {
    try {
      const headers: Record<string, string> = {};
      if (typeof window !== "undefined") {
        const host = window.location.hostname.toLowerCase();
        const parts = host.split(".");
        let slug = "";
        if (parts.length >= 4) {
          slug = parts[1];
        } else if (parts.length === 3 && parts[1] === "ispsync") {
          slug = parts[0];
        }
        if (slug) headers["X-Tenant-Slug"] = slug;
      }
      const res = await fetch("/api/tenant/settings", { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return (json.data || json) as TenantIntegrationSettings;
    } catch (err) {
      console.warn("Proxy tenant settings fetch failed, falling back to direct API:", err);
      return request<TenantIntegrationSettings>("/tenant/settings");
    }
  },

  updateTenantSettings: async (data: Partial<TenantIntegrationSettings>) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (typeof window !== "undefined") {
        const host = window.location.hostname.toLowerCase();
        const parts = host.split(".");
        let slug = "";
        if (parts.length >= 4) {
          slug = parts[1];
        } else if (parts.length === 3 && parts[1] === "ispsync") {
          slug = parts[0];
        }
        if (slug) headers["X-Tenant-Slug"] = slug;
      }
      const res = await fetch("/api/tenant/settings", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return (json.data || json) as TenantIntegrationSettings;
    } catch (err) {
      console.warn("Proxy tenant settings update failed, falling back to direct API:", err);
      return request<TenantIntegrationSettings>("/tenant/settings", {
        method: "POST",
        body: JSON.stringify(data),
      });
    }
  },
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
  google_maps_api_key?: string;
  updated_at?: string;
}

export const defaultSecuritySettings: SecuritySettings = {
  jwt_expiry_hours: 8,
  enable_ip_whitelist: false,
  allowed_noc_subnets: "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1/32",
  enable_walled_garden: false,
  walled_garden_hosts: "ispsync.id, portal.ispsync.id, api.midtrans.com, app.midtrans.com",
  enable_mac_lock: true,
  google_maps_api_key: "",
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

export interface DomainSettings {
  primary_domain: string;
  ledger_domain: string;
  wifi_domain: string;
  wifi_brand_name: string;
  portal_domain: string;
  fibergrid_domain?: string;
  server_ip: string;
  updated_at?: string;
}

export const defaultDomainSettings: DomainSettings = {
  primary_domain: "ispsync.id",
  ledger_domain: "ledger.dev.ispsync.id",
  wifi_domain: "wifi.dev.ispsync.id",
  wifi_brand_name: "@isphotspot",
  portal_domain: "portal.dev.ispsync.id",
  fibergrid_domain: "fibergrid.dev.ispsync.id",
  server_ip: "103.179.65.73",
};

export interface NotificationSettings {
  wa_provider: "FONNTE" | "WABLAS" | "INTERNAL";
  wa_api_token: string;
  wa_server_url: string;
  notify_due_date_h3: boolean;
  notify_invoice_issued: boolean;
  notify_payment_paid: boolean;
  notify_account_suspended: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password?: string;
  smtp_from: string;
  updated_at?: string;
}

export const defaultNotificationSettings: NotificationSettings = {
  wa_provider: "FONNTE",
  wa_api_token: "",
  wa_server_url: "https://api.wablas.com",
  notify_due_date_h3: true,
  notify_invoice_issued: true,
  notify_payment_paid: true,
  notify_account_suspended: true,
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_from: "",
};

export interface FiberGridIntegrationSettings {
  enabled: boolean;
  api_url: string;
  api_key: string;
  tenant_code?: string;
  auto_sync_routes: boolean;
  updated_at?: string;
}

export const defaultFiberGridIntegrationSettings: FiberGridIntegrationSettings = {
  enabled: false,
  api_url: "",
  api_key: "",
  tenant_code: "",
  auto_sync_routes: true,
};

export type TaxRegimeMode = "NON_PKP" | "PKP_INCLUSIVE" | "PKP_EXCLUSIVE";

export interface TenantIntegrationSettings {
  tenant_id?: string;
  google_maps_api_key?: string;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  notify_on_new_registration?: boolean;
  notify_on_odp_full?: boolean;
  notify_on_router_down?: boolean;
  pppoe_prefix?: string;
  pppoe_id_source?: string;
  pppoe_realm?: string;
  pppoe_pass_format?: string;
  pppoe_pass_static?: string;
  pppoe_pass_char_type?: string;
  pppoe_pass_length?: number;
  tax_mode?: TaxRegimeMode;
  tax_rate_ppn?: number;
  npwp?: string;
  updated_at?: string;
}

export const defaultTenantIntegrationSettings: TenantIntegrationSettings = {
  tax_mode: "NON_PKP",
  tax_rate_ppn: 11.0,
  npwp: "",
};


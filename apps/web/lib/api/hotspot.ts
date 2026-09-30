import { request } from "./client";

export interface HotspotLoginInput {
  mode: "VOUCHER" | "MEMBER";
  code?: string;
  username?: string;
  password?: string;
  client_ip?: string;
  client_mac?: string;
  router_ip?: string;
}

export interface HotspotLoginResponse {
  success: boolean;
  message: string;
  username: string;
  password?: string;
  plan_name: string;
  time_limit_seconds: number;
  data_limit_bytes: number;
  expires_at?: string;
  redirect_url?: string;
  require_reset?: boolean;
  channel?: "ONLINE" | "OFFLINE";
  bound_mac?: string;
}

export interface HotspotStatusResponse {
  is_online: boolean;
  username: string;
  client_ip: string;
  client_mac: string;
  session_time_seconds: number;
  remaining_time_seconds?: number;
  bytes_in: number;
  bytes_out: number;
  remaining_bytes?: number;
  expires_at?: string;
}

export interface VoucherPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  data_limit_bytes: number;
  download_kbps: number;
  upload_kbps: number;
  validity_days: number;
}

export interface PurchaseInput {
  template_id: string;
  phone?: string;
  payment_method: string;
  client_ip?: string;
  client_mac?: string;
  promo_code?: string;
}

export interface PurchaseResponse {
  order_id: string;
  template_name: string;
  amount: number;
  original_price?: number;
  discount_amount?: number;
  promo_code?: string;
  agent_name?: string;
  payment_method: string;
  payment_url?: string;
  snap_token?: string;
  qr_string?: string;
  qr_image_url?: string;
  expires_at: string;
  status: string;
}

export interface ClaimInput {
  order_id: string;
  template_id?: string;
  phone?: string;
  client_ip?: string;
  client_mac?: string;
  promo_code?: string;
  simulate_pay?: boolean;
}

export interface ClaimResponse {
  status: string;
  code: string;
  password?: string;
  plan_name: string;
  time_limit_seconds: number;
  message: string;
}

export interface RecoverVoucherInput {
  phone?: string;
  order_id?: string;
  client_mac?: string;
  client_ip?: string;
}

export interface RecoverVoucherResponse {
  success: boolean;
  authorized: boolean;
  code?: string;
  password?: string;
  plan_name?: string;
  time_limit_seconds?: number;
  masked_phone?: string;
  message: string;
  sent_to_whatsapp: boolean;
}

export interface ValidatePromoResponse {
  valid: boolean;
  agent_id: string;
  agent_name: string;
  promo_code: string;
  online_discount_pct: number;
  message: string;
}

export interface ResetDeviceInput {
  code: string;
  reset_key: string;
  client_mac: string;
  client_ip?: string;
}

export interface ResetDeviceResponse {
  success: boolean;
  message: string;
  channel?: string;
  new_mac?: string;
  username: string;
  password?: string;
}

export const hotspotApi = {
  login: (data: HotspotLoginInput) =>
    request<HotspotLoginResponse>("/hotspot/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getStatus: (params?: { username?: string; ip?: string; mac?: string }) => {
    const query = new URLSearchParams();
    if (params?.username) query.set("username", params.username);
    if (params?.ip) query.set("ip", params.ip);
    if (params?.mac) query.set("mac", params.mac);
    return request<HotspotStatusResponse>(`/hotspot/status?${query.toString()}`);
  },

  logout: (data: { username: string; client_ip?: string; client_mac?: string; router_ip?: string }) =>
    request<{ message: string }>("/hotspot/logout", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPackages: () =>
    request<VoucherPackage[]>("/hotspot/packages"),

  purchase: (data: PurchaseInput) =>
    request<PurchaseResponse>("/hotspot/purchase", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  checkPurchase: (data: ClaimInput) =>
    request<ClaimResponse>("/hotspot/check-purchase", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  recoverVoucher: (data: RecoverVoucherInput) =>
    request<RecoverVoucherResponse>("/hotspot/recover-voucher", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resetDevice: (data: ResetDeviceInput) =>
    request<ResetDeviceResponse>("/hotspot/reset-device", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  validatePromo: (code: string) =>
    request<ValidatePromoResponse>(`/hotspot/validate-promo?code=${encodeURIComponent(code)}`),
};


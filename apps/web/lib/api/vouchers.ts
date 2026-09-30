import { request, requestPaginated } from "./client";

export interface PaginatedVouchers {
  data: Voucher[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface VoucherTemplate {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration_minutes: number;
  data_limit_bytes: number;
  download_kbps: number;
  upload_kbps: number;
  min_download_kbps?: number;
  min_upload_kbps?: number;
  validity_days: number;
  is_active: boolean;
  is_available_online: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoucherBatch {
  id: string;
  batch_number: string;
  template_id: string;
  template_name?: string;
  quantity: number;
  is_mac_locked?: boolean;
  notes?: string;
  created_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  password: string;
  batch_id?: string;
  batch_number?: string;
  template_id?: string;
  template_name?: string;
  price: number;
  status: "BLANK" | "CREATED" | "UNUSED" | "ACTIVE" | "EXPIRED" | "DEPLETED" | "REVOKED";
  channel: "ONLINE" | "OFFLINE";
  buyer_phone?: string;
  order_id?: string;
  buyer_mac?: string;
  is_mac_locked?: boolean;
  agent_id?: string;
  agent_name?: string;
  agent_code?: string;
  promo_code?: string;
  discount_amount?: number;
  agent_commission?: number;
  serial_number?: string;
  is_blank?: boolean;
  activated_by_agent_id?: string;
  activated_at?: string;
  time_limit_seconds: number;
  data_limit_bytes: number;
  used_seconds: number;
  used_bytes: number;
  first_used_at?: string;
  expires_at?: string;
  revoked_at?: string;
  revoked_reason?: string;
  is_printed?: boolean;
  printed_at?: string;
  print_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  data_limit_bytes: number;
  download_kbps: number;
  upload_kbps: number;
  min_download_kbps?: number;
  min_upload_kbps?: number;
  validity_days: number;
  is_available_online?: boolean;
}

export interface UpdateTemplateInput extends CreateTemplateInput {
  is_active?: boolean;
  is_available_online?: boolean;
}

export type VoucherUserMode = "same" | "separate";
export type VoucherCharType =
  | "numeric"
  | "alpha_lower"
  | "alpha_upper"
  | "alphanumeric_lower"
  | "alphanumeric_upper"
  | "alphanumeric_mixed";

export interface GenerateBatchInput {
  template_id: string;
  quantity: number;
  prefix?: string;
  notes?: string;
  user_mode?: VoucherUserMode;
  char_type?: VoucherCharType;
  code_length?: number;
  agent_id?: string;
  is_mac_locked?: boolean;
}

export const voucherApi = {
  listTemplates: () => request<VoucherTemplate[]>("/vouchers/templates"),

  createTemplate: (data: CreateTemplateInput) =>
    request<VoucherTemplate>("/vouchers/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTemplate: (id: string, data: UpdateTemplateInput) =>
    request<VoucherTemplate>(`/vouchers/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTemplate: (id: string) =>
    request<{ message: string }>(`/vouchers/templates/${id}`, {
      method: "DELETE",
    }),

  listBatches: () => request<VoucherBatch[]>("/vouchers/batches"),

  generateBatch: (data: GenerateBatchInput) =>
    request<{ batch: VoucherBatch; vouchers: Voucher[] }>("/vouchers/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listVouchers: (params?: { page?: number; limit?: number; batch_id?: string; status?: string; channel?: string; agent_id?: string; search?: string; voucher_type?: "classic" | "online" | "scratch" | string }): Promise<PaginatedVouchers> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.batch_id) query.set("batch_id", params.batch_id);
    if (params?.status) query.set("status", params.status);
    if (params?.channel) query.set("channel", params.channel);
    if (params?.agent_id) query.set("agent_id", params.agent_id);
    if (params?.search) query.set("search", params.search);
    if (params?.voucher_type) query.set("voucher_type", params.voucher_type);
    return requestPaginated<Voucher>(`/vouchers?${query.toString()}`);
  },

  getByID: (id: string) => request<Voucher>(`/vouchers/${id}`),

  revoke: (id: string, reason: string) =>
    request<{ message: string }>(`/vouchers/${id}/revoke`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  resendWhatsApp: (id: string) =>
    request<{ message: string }>(`/vouchers/${id}/resend-wa`, {
      method: "POST",
    }),

  resetMAC: (id: string) =>
    request<{ message: string }>(`/vouchers/${id}/reset-mac`, {
      method: "POST",
    }),

  // Blank Scratch Voucher Methods
  generateBlankBatch: (data: { quantity: number; prefix?: string; code_length?: number; notes?: string; is_mac_locked?: boolean }) =>
    request<{ batch: VoucherBatch; vouchers: Voucher[] }>("/vouchers/generate-blank", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  activateBlankVoucher: (data: { serial_number: string; template_id: string }) =>
    request<Voucher>("/vouchers/agent/activate-blank", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  activateBlankRange: (data: { sn_start: string; sn_end: string; template_id: string }) =>
    request<{ success_count: number; total_cost: number; agent_commission: number; activated_sns: string[] }>("/vouchers/agent/activate-blank-range", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  checkSN: (sn: string) =>
    request<BlankVoucherInquiry>(`/vouchers/agent/check-sn?sn=${encodeURIComponent(sn)}`),

  reissueDamagedVoucher: (data: { serial_number: string; reason?: string }) =>
    request<Voucher>("/vouchers/agent/reissue-damaged", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listAgentHistory: (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedVouchers> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    return requestPaginated<Voucher>(`/vouchers/agent/history?${query.toString()}`);
  },
};

export interface BlankVoucherInquiry {
  serial_number: string;
  code?: string;
  status: "BLANK" | "CREATED" | "UNUSED" | "ACTIVE" | "EXPIRED" | "DEPLETED" | "REVOKED";
  is_blank: boolean;
  template_id?: string;
  template_name?: string;
  price: number;
  activated_at?: string;
  activated_by_agent_id?: string;
  activated_by_agent?: string;
  time_limit_seconds: number;
  data_limit_bytes: number;
  first_used_at?: string;
  expires_at?: string;
  used_seconds: number;
  used_bytes: number;
}


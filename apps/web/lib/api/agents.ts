import { request, requestPaginated } from "./client";
import { Voucher, VoucherTemplate } from "./vouchers";

export interface Agent {
  id: string;
  user_id?: string;
  user_email?: string;
  code: string;
  name: string;
  company_name?: string;
  phone: string;
  email?: string;
  address?: string;
  id_card_number?: string;
  ktp_url?: string;
  business_photo_url?: string;
  balance: number;
  offline_cashback_pct: number;
  online_cashback_pct: number;
  online_discount_pct: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  loket_admin_fee?: number;
  status: "ACTIVE" | "PENDING" | "REJECTED" | "SUSPENDED" | "TERMINATED";
  notes?: string;
  total_vouchers_sold: number;
  total_commission: number;
  created_at: string;
  updated_at: string;
}

export interface AgentMutation {
  id: string;
  agent_id: string;
  agent_name?: string;
  agent_code?: string;
  mutation_type: "TOPUP_MANUAL" | "TOPUP_BANK_TRANSFER" | "VOUCHER_OFFLINE_BUY" | "VOUCHER_ONLINE_COMMISSION" | "WITHDRAWAL" | "ADJUSTMENT" | string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id?: string;
  description?: string;
  created_at: string;
}

export function getMutationBadgeInfo(mutation_type: string, isCredit: boolean) {
  switch (mutation_type) {
    case "WITHDRAWAL":
      return {
        label: "Tarik Saldo",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        typeDesc: "Penarikan saldo kas / pencairan dana agen",
      };
    case "TOPUP_MANUAL":
      return {
        label: "Top-Up Manual",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        typeDesc: "Pengisian saldo oleh administrator",
      };
    case "TOPUP_BANK_TRANSFER":
      return {
        label: "Transfer Bank",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        typeDesc: "Pengisian saldo via transfer bank",
      };
    case "VOUCHER_OFFLINE_BUY":
      return {
        label: "Modal Voucher",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        typeDesc: "Potong modal cetak voucher fisik",
      };
    case "VOUCHER_ONLINE_COMMISSION":
      return {
        label: "Komisi Voucher",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        typeDesc: "Komisi penjualan voucher online",
      };
    case "INVOICE_PAYMENT_AGENT":
      return {
        label: "Bayar Tagihan",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        typeDesc: "Pembayaran tagihan internet loket agen",
      };
    case "ADJUSTMENT":
      return {
        label: "Penyesuaian",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        typeDesc: "Koreksi saldo oleh sistem atau administrator",
      };
    default:
      return {
        label: mutation_type,
        badgeClass: isCredit
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-100 text-slate-700 border-slate-200",
        typeDesc: "-",
      };
  }
}

export interface TopupRequest {
  id: string;
  request_number: string;
  agent_id: string;
  agent_name: string;
  agent_code: string;
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  proof_url?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes?: string;
  admin_notes?: string;
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
}

export interface DailyPromo {
  id: string;
  agent_id: string;
  promo_code: string;
  valid_date: string;
  created_at: string;
}

export interface AgentDashboardSummary {
  agent: Agent;
  today_promo_code: string;
  valid_date: string;
  total_vouchers_sold: number;
  total_offline_count: number;
  total_online_count: number;
  recent_mutations: AgentMutation[];
  pending_topup_count: number;
}

export interface CreateAgentInput {
  code: string;
  name: string;
  company_name?: string;
  phone: string;
  email?: string;
  address?: string;
  id_card_number?: string;
  ktp_url?: string;
  business_photo_url?: string;
  initial_balance?: number;
  offline_cashback_pct?: number;
  online_cashback_pct?: number;
  online_discount_pct?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  notes?: string;
  create_user_account?: boolean;
  user_password?: string;
}

export interface UpdateAgentInput {
  name: string;
  company_name?: string;
  phone: string;
  email?: string;
  address?: string;
  id_card_number?: string;
  ktp_url?: string;
  business_photo_url?: string;
  offline_cashback_pct?: number;
  online_cashback_pct?: number;
  online_discount_pct?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  status?: string;
  notes?: string;
}

export interface RegisterAgentInput {
  name: string;
  company_name?: string;
  phone: string;
  email: string;
  password: string;
  address?: string;
  id_card_number?: string;
  ktp_url?: string;
  business_photo_url?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  notes?: string;
}

export interface SubmitTopupInput {
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  proof_url?: string;
  notes?: string;
}

export interface AgentGenerateBatchInput {
  template_id: string;
  quantity: number;
  prefix?: string;
  char_type?: string;
  code_length?: number;
  notes?: string;
}

export interface AgentBatchResult {
  batch: any;
  vouchers: Voucher[];
  gross_amount: number;
  cashback_pct: number;
  cashback_amount: number;
  net_cost: number;
  balance_before: number;
  balance_after: number;
}

export const agentApi = {
  // ── Admin APIs ──────────────────────────────────────────────
  listAgents: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", params.page.toString());
    if (params?.limit) q.set("limit", params.limit.toString());
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    return requestPaginated<Agent>(`/agents?${q.toString()}`);
  },

  getAgent: (id: string) => request<Agent>(`/agents/${id}`),

  createAgent: (data: CreateAgentInput) =>
    request<Agent>("/agents", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  register: (data: RegisterAgentInput) =>
    request<Agent>("/agents/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  approveRegistration: (id: string) =>
    request<Agent>(`/agents/${id}/approve`, {
      method: "POST",
    }),

  rejectRegistration: (id: string, reason?: string) =>
    request<Agent>(`/agents/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  updateAgent: (id: string, data: UpdateAgentInput) =>
    request<Agent>(`/agents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  topupManual: (id: string, amount: number, notes?: string) =>
    request<AgentMutation>(`/agents/${id}/topup`, {
      method: "POST",
      body: JSON.stringify({ amount, notes }),
    }),

  withdrawManual: (id: string, data: { amount: number; mutation_type?: string; reference_id?: string; notes?: string }) =>
    request<AgentMutation>(`/agents/${id}/withdraw`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listMutations: (id: string, params?: { page?: number; limit?: number; mutation_type?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", params.page.toString());
    if (params?.limit) q.set("limit", params.limit.toString());
    if (params?.mutation_type) q.set("mutation_type", params.mutation_type);
    return requestPaginated<AgentMutation>(`/agents/${id}/mutations?${q.toString()}`);
  },

  listAllMutations: (params?: { page?: number; limit?: number; agent_id?: string; mutation_type?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", params.page.toString());
    if (params?.limit) q.set("limit", params.limit.toString());
    if (params?.agent_id) q.set("agent_id", params.agent_id);
    if (params?.mutation_type) q.set("mutation_type", params.mutation_type);
    return requestPaginated<AgentMutation>(`/agents/mutations?${q.toString()}`);
  },

  listTopupRequests: (params?: { page?: number; limit?: number; status?: string; agent_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", params.page.toString());
    if (params?.limit) q.set("limit", params.limit.toString());
    if (params?.status) q.set("status", params.status);
    if (params?.agent_id) q.set("agent_id", params.agent_id);
    return requestPaginated<TopupRequest>(`/agents/topup-requests?${q.toString()}`);
  },

  processTopupRequest: (id: string, action: "APPROVE" | "REJECT", admin_notes?: string) =>
    request<TopupRequest>(`/agents/topup-requests/${id}/process`, {
      method: "POST",
      body: JSON.stringify({ action, admin_notes }),
    }),

  // ── Agent Self-Service Portal APIs ──────────────────────────
  getMyDashboard: () => request<AgentDashboardSummary>("/agent-portal/me"),

  getMyPromoCode: () => request<DailyPromo>("/agent-portal/promo-today"),

  submitMyTopupRequest: (data: SubmitTopupInput) =>
    request<TopupRequest>("/agent-portal/topup-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listMyTopupRequests: (params?: { page?: number; limit?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", params.page.toString());
    if (params?.limit) q.set("limit", params.limit.toString());
    if (params?.status) q.set("status", params.status);
    return requestPaginated<TopupRequest>(`/agent-portal/topup-requests?${q.toString()}`);
  },

  listMyMutations: (params?: { page?: number; limit?: number; mutation_type?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", params.page.toString());
    if (params?.limit) q.set("limit", params.limit.toString());
    if (params?.mutation_type) q.set("mutation_type", params.mutation_type);
    return requestPaginated<AgentMutation>(`/agent-portal/mutations?${q.toString()}`);
  },

  generateOfflineBatch: (data: AgentGenerateBatchInput) =>
    request<AgentBatchResult>("/agent-portal/generate-batch", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listMyVouchers: (params?: { page?: number; limit?: number; channel?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", params.page.toString());
    if (params?.limit) q.set("limit", params.limit.toString());
    if (params?.channel) q.set("channel", params.channel);
    return requestPaginated<Voucher>(`/agent-portal/vouchers?${q.toString()}`);
  },

  listTemplates: () => request<VoucherTemplate[]>("/agent-portal/templates"),

  markVouchersPrinted: (voucherIds: string[]) =>
    request<{ success: boolean; message: string }>("/agent-portal/vouchers/mark-printed", {
      method: "POST",
      body: JSON.stringify({ voucher_ids: voucherIds }),
    }),

  inquireInvoice: (search: string) => {
    const q = new URLSearchParams({ search });
    return request<InvoiceInquiryResult>(`/agent-portal/invoices/inquiry?${q.toString()}`);
  },

  payInvoice: (data: PayInvoiceByAgentRequest) =>
    request<PayInvoiceReceipt>("/agent-portal/invoices/pay", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSettings: (data: UpdateAgentSettingsRequest) =>
    request<Agent>("/agent-portal/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export interface InvoiceInquiryItem {
  invoice_id: string;
  invoice_number: string;
  billing_month: string;
  issue_date?: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  is_overdue: boolean;
}

export interface InvoiceInquiryResult {
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_code: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  subscription_id?: string;
  plan_name: string;
  billing_month: string;
  period_start?: string;
  period_end?: string;
  subtotal: number;
  tax_amount: number;
  total_invoice: number;
  total_amount?: number;
  amount_paid?: number;
  amount_due?: number;
  admin_fee: number;
  default_admin_fee?: number;
  total_customer_pay: number;
  status: string;
  issue_date?: string;
  due_date: string;
  is_overdue: boolean;
  unpaid_count?: number;
  total_unpaid_amount?: number;
  invoices?: InvoiceInquiryItem[];
}

export interface PayInvoiceByAgentRequest {
  invoice_id: string;
  admin_fee: number;
}

export interface PayInvoiceReceipt {
  payment_number: string;
  invoice_id: string;
  invoice_number: string;
  paid_at: string;
  customer_code: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  plan_name: string;
  billing_month: string;
  subtotal: number;
  tax_amount: number;
  total_invoice: number;
  admin_fee: number;
  total_customer_pay: number;
  agent_name: string;
  agent_code: string;
  agent_company_name?: string;
  agent_balance_after: number;
}

export interface UpdateAgentSettingsRequest {
  company_name?: string;
  phone?: string;
  loket_admin_fee: number;
}

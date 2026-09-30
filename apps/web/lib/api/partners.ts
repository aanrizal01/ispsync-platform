import { request } from "./client";

export type ShareType = "PERCENTAGE" | "FLAT_FEE";
export type PartnerStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED";
export type SettlementStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

export interface Partner {
  id: string;
  code: string;
  name: string;
  company_name?: string;
  contact_person: string;
  phone: string;
  email?: string;
  share_type: ShareType;
  partner_share_bps: number; // e.g. 7000 = 70.00%
  isp_share_bps: number;     // e.g. 3000 = 30.00%
  flat_fee_amount: number;
  balance: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  status: PartnerStatus;
  notes?: string;
  customer_count: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

export interface RevenueShare {
  id: string;
  partner_id: string;
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  gross_amount: number;
  partner_amount: number;
  isp_amount: number;
  share_type: ShareType;
  status: string;
  created_at: string;
}

export interface Settlement {
  id: string;
  settlement_number: string;
  partner_id: string;
  partner_name: string;
  amount: number;
  status: SettlementStatus;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  proof_url?: string;
  notes?: string;
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
}

export interface CreatePartnerInput {
  code: string;
  name: string;
  company_name?: string;
  contact_person: string;
  phone: string;
  email?: string;
  share_type: ShareType;
  partner_share_bps: number;
  isp_share_bps: number;
  flat_fee_amount: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  notes?: string;
}

export interface CreateSettlementInput {
  partner_id: string;
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  notes?: string;
}

export interface ProcessSettlementInput {
  status: SettlementStatus;
  proof_url?: string;
  notes?: string;
}

export const partnerApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    return request<Partner[]>(`/partners?${query.toString()}`);
  },

  getByID: (id: string) => request<Partner>(`/partners/${id}`),

  create: (data: CreatePartnerInput) =>
    request<Partner>("/partners", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listRevenueShares: (partnerId: string) =>
    request<RevenueShare[]>(`/partners/${partnerId}/shares`),

  listSettlements: (partnerId?: string) => {
    const query = new URLSearchParams();
    if (partnerId) query.set("partner_id", partnerId);
    return request<Settlement[]>(`/partners/settlements?${query.toString()}`);
  },

  createSettlement: (data: CreateSettlementInput) =>
    request<Settlement>("/partners/settlements", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  processSettlement: (id: string, data: ProcessSettlementInput) =>
    request<{ message: string }>(`/partners/settlements/${id}/process`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

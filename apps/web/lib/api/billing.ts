import { request } from "./client";

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: "SUBSCRIPTION" | "INSTALLATION" | "ACTIVATION" | "LATE_FEE" | "CREDIT" | "TAX" | "DISCOUNT" | "OTHER";
  description: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  discount_percent: number;
  total: number;
  period_start?: string;
  period_end?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_number?: string;
  customer_name?: string;
  customer_phone?: string;
  subscription_id?: string;
  plan_price_id?: string;
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "VOID" | "CANCELLED";
  billing_period_start?: string;
  billing_period_end?: string;
  issue_date?: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  late_fee_amount: number;
  credit_applied: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  notes?: string;
  voided_at?: string;
  void_reason?: string;
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateManualInvoiceInput {
  customer_id: string;
  subscription_id?: string;
  due_date: string;
  notes?: string;
  items: {
    item_type: "SUBSCRIPTION" | "INSTALLATION" | "ACTIVATION" | "LATE_FEE" | "CREDIT" | "TAX" | "DISCOUNT" | "OTHER";
    description: string;
    quantity: number;
    unit_price: number;
    tax_percent: number;
  }[];
}

export interface PublicInvoiceLookupResponse {
  customer_id: string;
  customer_name: string;
  customer_number: string;
  phone: string;
  credit_balance?: number;
  held_balance?: number;
  hold_until?: string;
  credit_notes?: {
    id: string;
    amount: number;
    reason: string;
    status: string;
    hold_until?: string;
    deposit_type?: string;
    expires_at?: string;
  }[];
  invoices: Invoice[];
}

export interface PublicPayInvoiceResponse {
  invoice_id: string;
  invoice_number: string;
  amount: number;
  qr_string: string;
  qr_image_url: string;
  payment_url?: string;
  status: string;
  message: string;
}

export interface PublicTopUpDepositRequest {
  customer_id?: string;
  query?: string;
  amount: number;
  notes?: string;
  simulate_pay?: boolean;
}

export interface PublicTopUpDepositResponse {
  customer_id: string;
  customer_name: string;
  deposit_amount: number;
  credit_balance: number;
  qr_string?: string;
  qr_image_url?: string;
  payment_url?: string;
  snap_token?: string;
  status: string;
  message: string;
}

export const billingApi = {
  list: (params?: { page?: number; limit?: number; customer_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.customer_id) query.set("customer_id", params.customer_id);
    if (params?.status) query.set("status", params.status);
    return request<Invoice[]>(`/invoices?${query.toString()}`);
  },

  getByID: (id: string) => request<Invoice>(`/invoices/${id}`),

  createManual: (data: CreateManualInvoiceInput) =>
    request<Invoice>("/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  issue: (id: string) =>
    request<{ message: string }>(`/invoices/${id}/issue`, { method: "POST" }),

  void: (id: string, reason: string) =>
    request<{ message: string }>(`/invoices/${id}/void`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  publicLookup: (query: string) =>
    request<PublicInvoiceLookupResponse>("/invoices/public/lookup", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  publicPayInvoice: (invoiceId: string, simulatePay = false) =>
    request<PublicPayInvoiceResponse>("/invoices/public/pay-qris", {
      method: "POST",
      body: JSON.stringify({ invoice_id: invoiceId, simulate_pay: simulatePay }),
    }),

  publicTopUpDeposit: (data: PublicTopUpDepositRequest) =>
    request<PublicTopUpDepositResponse>("/invoices/public/topup-deposit", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createSecurityDeposit: (data: { customer_id: string; amount: number; duration_months: number; reason?: string; deposit_type?: string }) =>
    request<any>("/invoices/security-deposit", { method: "POST", body: JSON.stringify(data) }),

  releaseSecurityDeposit: (id: string, reason?: string) =>
    request<any>(`/invoices/security-deposit/${id}/release`, { method: "POST", body: JSON.stringify({ reason }) }),

  forfeitSecurityDeposit: (id: string, reason: string) =>
    request<any>(`/invoices/security-deposit/${id}/forfeit`, { method: "POST", body: JSON.stringify({ reason }) }),

  refundSecurityDeposit: (id: string, reason?: string) =>
    request<any>(`/invoices/security-deposit/${id}/refund`, { method: "POST", body: JSON.stringify({ reason }) }),
};


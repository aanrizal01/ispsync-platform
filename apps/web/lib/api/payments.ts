import { request } from "./client";

export interface Payment {
  id: string;
  payment_number: string;
  customer_id: string;
  customer_number?: string;
  customer_name?: string;
  invoice_id?: string;
  invoice_number?: string;
  payment_method: "MANUAL" | "QRIS" | "VA_BCA" | "VA_BNI" | "VA_MANDIRI" | "VA_BRI" | "MIDTRANS" | "XENDIT";
  external_id?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED";
  amount: number;
  currency: string;
  paid_at?: string;
  notes?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateManualPaymentInput {
  invoice_id: string;
  amount: number;
  payment_method: "MANUAL" | "QRIS" | "VA_BCA" | "VA_BNI" | "VA_MANDIRI" | "VA_BRI";
  notes?: string;
}

export const paymentApi = {
  list: (params?: { page?: number; limit?: number; customer_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.customer_id) query.set("customer_id", params.customer_id);
    if (params?.status) query.set("status", params.status);
    return request<Payment[]>(`/payments?${query.toString()}`);
  },

  getByID: (id: string) => request<Payment>(`/payments/${id}`),

  createManual: (data: CreateManualPaymentInput) =>
    request<Payment>("/payments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

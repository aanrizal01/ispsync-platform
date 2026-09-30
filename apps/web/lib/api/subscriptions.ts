import { request, requestPaginated } from "./client";

export interface AccessAccount {
  id: string;
  customer_id: string;
  subscription_id?: string;
  access_type: "PPPOE" | "HOTSPOT" | "VOUCHER" | "PASSPOINT" | "IPOE";
  identity: string;
  password?: string;
  display_name?: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DISABLED" | "EXPIRED";
  nas_port_type?: string;
  static_ip?: string;
  simultaneous_use_limit: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Live Telemetry
  is_online?: boolean;
  current_ip?: string;
  calling_station_id?: string;
  online_duration_seconds?: number;
}

export interface Subscription {
  id: string;
  customer_id: string;
  customer_number?: string;
  customer_name?: string;
  plan_id: string;
  plan_name?: string;
  plan_price_id: string;
  status: "PENDING" | "ACTIVE" | "GRACE" | "SUSPENDED" | "CANCELLED" | "EXPIRED";
  start_date?: string;
  end_date?: string;
  next_billing_date?: string;
  billing_cycle: string;
  auto_renewal: boolean;
  grace_period_days: number;
  cancelled_at?: string;
  cancellation_reason?: string;
  notes?: string;
  price_snapshot?: {
    id: string;
    monthly_price: number;
    installation_fee: number;
    activation_fee: number;
    tax_percent: number;
    late_fee_percent: number;
    currency: string;
  };
  access_accounts?: AccessAccount[];
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionInput {
  customer_id: string;
  plan_id: string;
  billing_cycle?: string;
  auto_renewal?: boolean;
  notes?: string;
  initial_access_type?: "PPPOE" | "HOTSPOT" | "VOUCHER" | "PASSPOINT" | "IPOE";
  initial_username?: string;
  initial_password?: string;
  initial_static_ip?: string;
}

export const subscriptionApi = {
  list: (params?: { page?: number; limit?: number; search?: string; customer_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.customer_id) query.set("customer_id", params.customer_id);
    if (params?.status) query.set("status", params.status);
    return requestPaginated<Subscription>(`/subscriptions?${query.toString()}`);
  },

  getByID: (id: string) => request<Subscription>(`/subscriptions/${id}`),

  create: (data: CreateSubscriptionInput) =>
    request<Subscription>("/subscriptions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  activate: (id: string) =>
    request<Subscription>(`/subscriptions/${id}/activate`, { method: "POST" }),

  revertPending: (id: string) =>
    request<Subscription>(`/subscriptions/${id}/revert-pending`, { method: "POST" }),

  suspend: (id: string) =>
    request<Subscription>(`/subscriptions/${id}/suspend`, { method: "POST" }),

  reactivate: (id: string) =>
    request<Subscription>(`/subscriptions/${id}/reactivate`, { method: "POST" }),

  cancel: (id: string, reason: string) =>
    request<Subscription>(`/subscriptions/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  changePlan: (id: string, plan_id: string) =>
    request<Subscription>(`/subscriptions/${id}/change-plan`, {
      method: "POST",
      body: JSON.stringify({ plan_id }),
    }),

  listAccessAccounts: (params?: { customer_id?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.customer_id) query.set("customer_id", params.customer_id);
    if (params?.type) query.set("type", params.type);
    return request<AccessAccount[]>(`/access-accounts?${query.toString()}`);
  },

  updateAccessAccountIP: (
    accountId: string,
    data: { static_ip?: string; disconnect_session?: boolean }
  ) =>
    request<AccessAccount>(`/access-accounts/${accountId}/ip`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

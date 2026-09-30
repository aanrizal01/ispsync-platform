import { request } from "./client";

export interface PlanPrice {
  id: string;
  plan_id: string;
  monthly_price: number;
  installation_fee: number;
  activation_fee: number;
  tax_percent: number;
  late_fee_percent: number;
  currency: string;
  effective_from: string;
  effective_until?: string;
  created_at: string;
}

export interface PlanGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  cluster_code: string;
  cluster_area: string;
  is_active: boolean;
  plan_count: number;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  plan_type: "HOME" | "BUSINESS" | "HOTSPOT" | "VOUCHER" | "PASSPOINT";
  download_kbps: number;
  upload_kbps: number;
  min_download_kbps?: number;
  min_upload_kbps?: number;
  billing_cycle: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL" | "PREPAID";
  grace_period_days: number;
  status: "ACTIVE" | "INACTIVE" | "DEPRECATED";
  is_visible?: boolean;
  framed_pool?: string;
  group_id?: string;
  group_name?: string;
  package_group?: string;
  cluster_code?: string;
  cluster_area?: string;
  current_price?: PlanPrice;
  price_history?: PlanPrice[];
  created_at: string;
  updated_at: string;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  plan_type: "HOME" | "BUSINESS" | "HOTSPOT" | "VOUCHER" | "PASSPOINT";
  download_kbps: number;
  upload_kbps: number;
  min_download_kbps?: number;
  min_upload_kbps?: number;
  billing_cycle: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL" | "PREPAID";
  grace_period_days: number;
  group_id?: string;
  package_group?: string;
  framed_pool?: string;
  monthly_price: number;
  installation_fee: number;
  activation_fee: number;
  tax_percent: number;
  late_fee_percent: number;
}

export interface UpdatePlanInput {
  name: string;
  description?: string;
  plan_type?: "HOME" | "BUSINESS" | "HOTSPOT" | "VOUCHER" | "PASSPOINT";
  download_kbps?: number;
  upload_kbps?: number;
  min_download_kbps?: number;
  min_upload_kbps?: number;
  billing_cycle?: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL" | "PREPAID";
  status: "ACTIVE" | "INACTIVE" | "DEPRECATED";
  grace_period_days: number;
  group_id?: string;
  package_group?: string;
  framed_pool?: string;
  is_visible?: boolean;
}

export interface CreatePlanGroupInput {
  name: string;
  code: string;
  description?: string;
  cluster_code: string;
  cluster_area: string;
}

export interface UpdatePlanGroupInput {
  name: string;
  description?: string;
  cluster_code: string;
  cluster_area: string;
  is_active: boolean;
}

export interface CreatePriceVersionInput {
  monthly_price: number;
  installation_fee: number;
  activation_fee: number;
  tax_percent: number;
  late_fee_percent: number;
}

export const planApi = {
  list: (params?: { 
    page?: number; 
    limit?: number; 
    status?: string; 
    type?: string; 
    group?: string; 
    cluster?: string; 
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.status) query.set("status", params.status);
    if (params?.type) query.set("type", params.type);
    if (params?.group) query.set("group", params.group);
    if (params?.cluster) query.set("cluster", params.cluster);
    return request<Plan[]>(`/plans?${query.toString()}`);
  },

  getByID: (id: string) => request<Plan>(`/plans/${id}`),

  create: (data: CreatePlanInput) =>
    request<Plan>("/plans", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdatePlanInput) =>
    request<Plan>(`/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/plans/${id}`, {
      method: "DELETE",
    }),

  toggleVisibility: (id: string, is_visible: boolean) =>
    request<Plan>(`/plans/${id}/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ is_visible }),
    }),

  addPriceVersion: (id: string, data: CreatePriceVersionInput) =>
    request<PlanPrice>(`/plans/${id}/prices`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Plan Groups
  listGroups: () => request<PlanGroup[]>("/plans/groups"),
  
  getGroupByID: (id: string) => request<PlanGroup>(`/plans/groups/${id}`),

  createGroup: (data: CreatePlanGroupInput) =>
    request<PlanGroup>("/plans/groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateGroup: (id: string, data: UpdatePlanGroupInput) =>
    request<PlanGroup>(`/plans/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteGroup: (id: string) =>
    request<void>(`/plans/groups/${id}`, {
      method: "DELETE",
    }),
};

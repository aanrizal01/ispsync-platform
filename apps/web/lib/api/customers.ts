import { request, requestPaginated, type PaginatedResponse } from "./client";

export interface Address {
  id: string;
  customer_id: string;
  address_type: "BILLING" | "INSTALLATION" | "MAILING";
  street: string;
  city: string;
  district?: string;
  province?: string;
  postal_code?: string;
  country: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  customer_id: string;
  contact_type: "PHONE" | "EMAIL" | "WHATSAPP";
  value: string;
  label?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  customer_id: string;
  access_account_id?: string;
  mac_address: string;
  device_name?: string;
  device_type?: string;
  os_type?: string;
  passpoint_capable: boolean;
  registered_at: string;
  last_seen_at?: string;
}

export interface Customer {
  id: string;
  customer_number: string;
  full_name: string;
  email?: string;
  phone: string;
  status: "LEAD" | "ACTIVE" | "SUSPENDED" | "TERMINATED";
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  addresses?: Address[];
  contacts?: Contact[];
  devices?: Device[];
}

export interface CreateCustomerInput {
  full_name: string;
  email?: string;
  phone: string;
  notes?: string;
  street: string;
  city: string;
  district?: string;
  province?: string;
  postal_code?: string;
}

export interface UpdateCustomerInput {
  full_name: string;
  email?: string;
  phone: string;
  status: "LEAD" | "ACTIVE" | "SUSPENDED" | "TERMINATED";
  notes?: string;
}

export interface RegisterDeviceInput {
  mac_address: string;
  device_name?: string;
  device_type?: string;
  os_type?: string;
  passpoint_capable?: boolean;
}

export const customerApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    return request<Customer[]>(`/customers?${query.toString()}`);
  },

  listPaginated: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    return requestPaginated<Customer>(`/customers?${query.toString()}`);
  },

  getByID: (id: string) => request<Customer>(`/customers/${id}`),

  create: (data: CreateCustomerInput) =>
    request<Customer>("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateCustomerInput) =>
    request<Customer>(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/customers/${id}`, {
      method: "DELETE",
    }),

  getDevices: (id: string) => request<Device[]>(`/customers/${id}/devices`),

  registerDevice: (id: string, data: RegisterDeviceInput) =>
    request<Device>(`/customers/${id}/devices`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getDocuments: (id: string) => request<CustomerDocumentsResponse>(`/customers/${id}/documents`),
};

export interface BASTReport {
  id: string;
  work_order_id: string;
  optical_power_dbm: number;
  ont_serial_number: string;
  ont_mac_address: string;
  dropcore_length_meters: number;
  customer_signature_url?: string;
  proof_photo_url?: string;
  house_photo_url?: string;
  speedtest_down_mbps: number;
  speedtest_up_mbps: number;
  notes?: string;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  order_no: string;
  registration_id: string;
  type: string;
  technician_name: string;
  scheduled_at: string;
  status: string;
  notes?: string;
  created_at: string;
  bast?: BASTReport;
}

export interface DocumentSite {
  registration_id: string;
  registration_no: string;
  full_name: string;
  id_card_number: string;
  tax_id?: string;
  phone: string;
  email: string;
  address: string;
  latitude: number;
  longitude: number;
  selected_plan_id: string;
  selected_plan_name: string;
  nearest_odp_code?: string;
  distance_to_odp_meters: number;
  status: string;
  ktp_photo_url?: string;
  house_photo_url?: string;
  contract_signature_url?: string;
  contract_signed_at?: string;
  work_order?: WorkOrder;
  created_at: string;
}

export interface CustomerDocumentsResponse {
  customer_id: string;
  full_name: string;
  phone: string;
  email?: string;
  id_card_number?: string;
  sites: DocumentSite[];
}


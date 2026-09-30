import { request } from "./client";

export type VendorType = "ZTE" | "HUAWEI" | "FIBERHOME" | "VSOL" | "OTHER";
export type OpticalStatus = "EXCELLENT" | "NORMAL" | "WARNING" | "CRITICAL_LOS";
export type ConnectionStatus = "ONLINE" | "OFFLINE";

export interface CustomerONT {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  serial_number: string;
  mac_address: string;
  vendor: VendorType;
  model: string;
  hardware_version?: string;
  software_version?: string;
  wifi_ssid: string;
  wifi_password?: string;
  wifi_security: string;
  wifi_channel: number;
  is_wifi_enabled: boolean;
  rx_optical_power: number; // in dBm
  tx_optical_power: number; // in dBm
  optical_status: OpticalStatus;
  connection_status: ConnectionStatus;
  ip_address?: string;
  uptime_seconds: number;
  last_inform_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateWiFiInput {
  ssid: string;
  password: string;
}

export interface RegisterONTInput {
  customer_id: string;
  serial_number: string;
  mac_address: string;
  vendor: VendorType;
  model: string;
  wifi_ssid?: string;
  wifi_password?: string;
  notes?: string;
}

export const acsApi = {
  // Admin Endpoints
  list: () => request<CustomerONT[]>("/api/v1/acs/onts"),
  get: (id: string) => request<CustomerONT>(`/api/v1/acs/onts/${id}`),
  register: (data: RegisterONTInput) => request<CustomerONT>("/api/v1/acs/onts", { method: "POST", body: JSON.stringify(data) }),
  updateWiFi: (id: string, data: UpdateWiFiInput) =>
    request<{ success: boolean; message: string }>(`/api/v1/acs/onts/${id}/wifi`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  reboot: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/v1/acs/onts/${id}/reboot`, {
      method: "POST",
    }),
  getByCustomerId: (customerId: string) => request<CustomerONT>(`/api/v1/acs/customer/${customerId}`),
  checkStatus: () =>
    request<{ base_url: string; is_online: boolean; status: string; checked_at: string }>("/api/v1/acs/status"),

  // Public Endpoints (for /billing/check customer portal)
  publicGetByCustomerId: (customerId: string) =>
    request<CustomerONT>(`/api/v1/public/ont/customer/${customerId}`),
  publicUpdateWiFi: (id: string, data: UpdateWiFiInput) =>
    request<{ success: boolean; message: string }>(`/api/v1/public/ont/${id}/wifi`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  publicReboot: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/v1/public/ont/${id}/reboot`, {
      method: "POST",
    }),
};

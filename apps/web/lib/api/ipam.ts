import { request } from "./client";

export interface IPAMSettings {
  enabled: boolean;
  server_url: string;
  app_id: string;
  app_code: string;
  default_subnet_id: number;
  auto_sync: boolean;
  updated_at?: string;
}

export interface Subnet {
  id: number;
  subnet: string;
  mask: string;
  description: string;
  sectionId: number;
  vlanId: number;
  cidr: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  code?: number;
}

export interface FirstFreeResponse {
  subnet_id: number;
  ip: string;
}

export const ipamApi = {
  getSettings: () => request<IPAMSettings>("/ipam/settings"),

  saveSettings: (data: IPAMSettings) =>
    request<{ success: boolean; message: string; data: IPAMSettings }>("/ipam/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  testConnection: (data?: Partial<IPAMSettings>) =>
    request<TestResult>("/ipam/test", {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  getSubnets: () => request<{ subnets: Subnet[] }>("/ipam/subnets"),

  getFirstFreeIP: (subnetId?: number) => {
    const query = subnetId ? `?subnet_id=${subnetId}` : "";
    return request<FirstFreeResponse>(`/ipam/first-free${query}`);
  },
};

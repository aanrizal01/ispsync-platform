import { request } from "./client";

export type Vendor = "MIKROTIK" | "JUNIPER" | "GENERIC";
export type DeviceStatus = "ONLINE" | "OFFLINE" | "UNKNOWN" | "ERROR";

export interface NetworkDevice {
  id: string;
  name: string;
  vendor: Vendor;
  model?: string;
  ip_address: string;
  api_port: number;
  auth_type: "BASIC" | "TOKEN" | "SSH_KEY";
  username: string;
  use_tls: boolean;
  is_active: boolean;
  status: DeviceStatus;
  last_seen_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SystemInfo {
  uptime: string;
  version: string;
  cpu_load: number;
  free_memory: number;
  total_memory: number;
  free_hdd: number;
  total_hdd: number;
  board_name: string;
  architecture: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  latency_ms: number;
  system_info?: SystemInfo;
}

export interface CreateDeviceInput {
  name: string;
  vendor: Vendor;
  model?: string;
  ip_address: string;
  api_port: number;
  auth_type: "BASIC" | "TOKEN" | "SSH_KEY";
  username: string;
  password: string;
  use_tls: boolean;
  enable_radius?: boolean;
  radius_shared_secret?: string;
  metadata?: Record<string, any>;
}

export interface UpdateDeviceInput {
  name: string;
  model?: string;
  ip_address: string;
  api_port: number;
  username: string;
  password?: string;
  use_tls: boolean;
  is_active: boolean;
  metadata?: Record<string, any>;
}

export const networkApi = {
  list: (params?: { vendor?: Vendor; is_active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.vendor) query.set("vendor", params.vendor);
    if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
    return request<{ data: NetworkDevice[] }>(`/network/devices?${query.toString()}`);
  },

  getByID: (id: string) =>
    request<NetworkDevice>(`/network/devices/${id}`),

  create: (data: CreateDeviceInput) =>
    request<NetworkDevice>("/network/devices", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateDeviceInput) =>
    request<NetworkDevice>(`/network/devices/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/network/devices/${id}`, {
      method: "DELETE",
    }),

  testConnection: (id: string) =>
    request<TestConnectionResponse>(`/network/devices/${id}/test-connection`, {
      method: "POST",
    }),

  syncProfile: (id: string, profile: { name: string; rate_limit?: string; local_address?: string; remote_address?: string }) =>
    request<{ message: string }>(`/network/devices/${id}/sync-profile`, {
      method: "POST",
      body: JSON.stringify(profile),
    }),

  // ODP and FTTX GIS
  listODPs: (params?: { cluster?: string }) => {
    const query = new URLSearchParams();
    if (params?.cluster) query.set("cluster", params.cluster);
    return request<{ data: ODPNode[] }>(`/network/odp?${query.toString()}`);
  },

  createODP: (data: CreateODPInput) =>
    request<ODPNode>("/network/odp", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteODP: (id: string) =>
    request<{ message: string }>(`/network/odp/${id}`, {
      method: "DELETE",
    }),

  listFiberRoutes: () =>
    request<{ data: FiberRoute[] }>("/network/fiber-routes"),

  getFTTXStats: () =>
    request<FTTXStats>("/network/fttx-stats"),
};

export interface ODPNode {
  id: string;
  name: string;
  code: string;
  cluster: string;
  cluster_area?: string;
  latitude: number;
  longitude: number;
  total_ports: number;
  used_ports: number;
  available_ports: number;
  status: "ACTIVE" | "FULL" | "MAINTENANCE" | string;
  splitter_spec: string;
  optical_power_dbm?: number;
  address: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FiberRoute {
  id: string;
  name: string;
  cable_type: "BACKBONE" | "FEEDER" | "DISTRIBUTION" | string;
  core_count: number;
  status: "ACTIVE" | "DEGRADED" | "CUT" | string;
  length_meters: number;
  coordinates: [number, number][];
  color: string;
}

export interface FTTXStats {
  total_odp: number;
  total_ports: number;
  used_ports: number;
  available_ports: number;
  active_odp: number;
  maintenance_odp: number;
  total_fiber_km: number;
}

export interface CreateODPInput {
  name: string;
  code: string;
  cluster: string;
  latitude: number;
  longitude: number;
  total_ports: number;
  used_ports?: number;
  status?: string;
  splitter_spec: string;
  optical_power_dbm?: number;
  address: string;
  notes?: string;
}

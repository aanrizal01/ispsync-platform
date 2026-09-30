import { request } from "./client";

export interface ServiceStatus {
  id: string;
  name: string;
  category: "database" | "network" | "core" | "service" | string;
  status: "OPERATIONAL" | "DEGRADED" | "DOWN";
  latency_ms: number;
  target: string;
  description: string;
  details?: string;
  last_checked: string;
}

export interface SystemMetrics {
  active_radius_sessions: number;
  total_nas_routers: number;
  total_customers: number;
  total_active_subs: number;
  db_connections_open: number;
  db_connections_idle: number;
  server_uptime_seconds: number;
  server_uptime_human: string;
}

export interface SystemStatusResponse {
  overall_status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  checked_at: string;
  services: ServiceStatus[];
  metrics: SystemMetrics;
}

export const systemApi = {
  getStatus: () => request<SystemStatusResponse>("/system/status"),
};

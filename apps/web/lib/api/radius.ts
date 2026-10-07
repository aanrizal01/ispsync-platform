import { request, requestPaginated } from "./client";

export interface RadiusSession {
  radacctid: number;
  acctsessionid: string;
  acctuniqueid: string;
  username: string;
  groupname: string;
  nasipaddress: string;
  nasportid?: string;
  acctstarttime: string;
  acctupdatetime?: string;
  acctstoptime?: string;
  acctsessiontime: number;
  acctinputoctets: number;
  acctoutputoctets: number;
  callingstationid: string;
  framedipaddress?: string;
  is_active: boolean;
}

export interface NAS {
  id: number;
  nasname: string;
  shortname?: string;
  type: string;
  ports?: number;
  secret: string;
  description?: string;
  created_at: string;
}

export interface AuthLog {
  id: number;
  username: string;
  reply: string;
  authdate: string;
  nasipaddress?: string;
  nas_shortname?: string;
  callingstationid?: string;
  pass?: string;
}

export interface CreateNASInput {
  nasname: string;
  shortname?: string;
  type: "mikrotik" | "cisco" | "juniper" | "other";
  secret: string;
  description?: string;
}

export interface DisconnectSessionInput {
  nas_ip_address: string;
  username: string;
  framed_ip?: string;
  acct_session_id?: string;
}

export const radiusApi = {
  listSessions: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    return requestPaginated<RadiusSession>(`/radius/sessions?${query.toString()}`);
  },

  disconnectSession: (data: DisconnectSessionInput) =>
    request<{ message: string }>("/radius/sessions/disconnect", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listNAS: () => request<NAS[]>("/radius/nas"),

  createNAS: (data: CreateNASInput) =>
    request<NAS>("/radius/nas", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listAuthLogs: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    return requestPaginated<AuthLog>(`/radius/auth-logs?${query.toString()}`);
  },
};

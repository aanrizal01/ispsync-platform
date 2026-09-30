import { request, requestPaginated } from "./client";

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_type: string;
  actor_email?: string;
  action: string;
  description: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AuditFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  actor_email?: string;
}

export const auditApi = {
  list: (params?: AuditFilterParams) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.entity_type) query.set("entity_type", params.entity_type);
    if (params?.entity_id) query.set("entity_id", params.entity_id);
    if (params?.action) query.set("action", params.action);
    if (params?.actor_email) query.set("actor_email", params.actor_email);
    return requestPaginated<AuditLog>(`/audit-logs?${query.toString()}`);
  },

  getByEntity: (entityType: string, entityId: string, limit = 50) => {
    return request<AuditLog[]>(`/audit-logs/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}?limit=${limit}`);
  },
};

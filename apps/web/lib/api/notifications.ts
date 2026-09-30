import { request } from "./client";

export type NotificationChannel = "WHATSAPP" | "TELEGRAM" | "EMAIL" | "WEBHOOK";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

export interface NotificationRecord {
  id: string;
  customer_id?: string;
  customer_name?: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  code: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SendNotificationInput {
  customer_id?: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
}

export interface DispatchTemplateInput {
  template_code: string;
  recipient: string;
  customer_id?: string;
  data: Record<string, string>;
}

export interface UpdateTemplateInput {
  subject?: string;
  body: string;
  is_active: boolean;
}

export const notificationApi = {
  list: (params?: { page?: number; limit?: number; channel?: NotificationChannel; status?: NotificationStatus }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.channel) query.set("channel", params.channel);
    if (params?.status) query.set("status", params.status);
    return request<{ data: NotificationRecord[]; meta: { total: number; page: number; limit: number } }>(
      `/notifications?${query.toString()}`
    );
  },

  send: (data: SendNotificationInput) =>
    request<NotificationRecord>("/notifications/send", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  dispatchTemplate: (data: DispatchTemplateInput) =>
    request<NotificationRecord>("/notifications/dispatch-template", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listTemplates: () =>
    request<{ data: NotificationTemplate[] }>("/notifications/templates"),

  updateTemplate: (code: string, data: UpdateTemplateInput) =>
    request<{ message: string }>(`/notifications/templates/${code}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

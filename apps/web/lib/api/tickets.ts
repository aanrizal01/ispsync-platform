import { request } from "./client";

export interface Ticket {
  id: string;
  tenant_id?: string;
  customer_id?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  assignee_id?: string;
  created_at: string;
  updated_at: string;
}

export const ticketsApi = {
  getTickets: () =>
    request<{ data: Ticket[] }>("/admin/tickets"),

  createTicket: (data: Partial<Ticket>) =>
    request<{ message: string; data: Ticket }>("/admin/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTicket: (id: string, data: Partial<Ticket>) =>
    request<{ message: string; data: Ticket }>(`/admin/tickets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

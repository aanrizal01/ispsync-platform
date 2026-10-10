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

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: "STAFF" | "CUSTOMER";
  sender_id?: string;
  sender_name: string;
  message: string;
  attachment_url?: string;
  created_at: string;
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

  getMessages: (ticketId: string) =>
    request<{ data: TicketMessage[] }>(`/admin/tickets/${ticketId}/messages`),

  sendMessage: (ticketId: string, data: { message: string; sender_type?: "STAFF" | "CUSTOMER"; sender_name?: string }) =>
    request<{ message: string; data: TicketMessage }>(`/admin/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPublicTicket: (id: string) =>
    request<{ data: { ticket: Ticket; customer_name: string; customer_phone?: string; messages: TicketMessage[] } }>(`/public/tickets/${id}`),

  sendPublicMessage: (ticketId: string, data: { message: string; sender_type: "CUSTOMER"; sender_name: string }) =>
    request<{ message: string; data: TicketMessage }>(`/public/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

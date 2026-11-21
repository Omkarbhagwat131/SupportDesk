import { apiRequest } from "../../../lib/api";
import type {
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "../schemas";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_ON_CUSTOMER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "P1" | "P2" | "P3" | "P4";

export type Ticket = {
  id: string;
  subject: string;
  requesterEmail: string;
  requesterId: string | null;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  assigneeId: string | null;
  slaDueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketListQuery = ListTicketsQuery;
export type { CreateTicketInput, UpdateTicketInput };

export type TicketListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function listTickets(query: TicketListQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const response = await apiRequest<Ticket[]>(`/api/tickets?${params.toString()}`);
  return { tickets: response.data, meta: response.meta as TicketListMeta };
}

export async function getTicket(id: string): Promise<Ticket> {
  const response = await apiRequest<Ticket>(`/api/tickets/${encodeURIComponent(id)}`);
  return response.data;
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const response = await apiRequest<Ticket>("/api/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateTicket(id: string, input: UpdateTicketInput): Promise<Ticket> {
  const response = await apiRequest<Ticket>(`/api/tickets/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return response.data;
}

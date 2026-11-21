import type { TicketListQuery } from "../api/tickets";

export const ticketKeys = {
  all: ["tickets"] as const,
  list: (query: TicketListQuery) => ["tickets", query] as const,
  detail: (ticketId: string) => ["ticket", ticketId] as const,
  comments: (ticketId: string) => ["ticket-comments", ticketId] as const,
};

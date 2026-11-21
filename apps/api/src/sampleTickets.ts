import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TicketPriority, TicketStatus } from "./generated/prisma/client";

export type SampleTicket = {
  id: string;
  subject: string;
  requesterEmail: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
};

const ticketIdPattern = /^TKT-\d{8}-\d{6,}$/;

function isTicketPriority(value: unknown): value is TicketPriority {
  return Object.values(TicketPriority).some((priority) => priority === value);
}

function isTicketStatus(value: unknown): value is TicketStatus {
  return Object.values(TicketStatus).some((status) => status === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSampleTicket(value: unknown): value is SampleTicket {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    ticketIdPattern.test(value.id) &&
    typeof value.subject === "string" &&
    value.subject.length > 0 &&
    typeof value.requesterEmail === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.requesterEmail) &&
    typeof value.description === "string" &&
    value.description.length > 0 &&
    isTicketPriority(value.priority) &&
    isTicketStatus(value.status) &&
    typeof value.createdAt === "string" &&
    Number.isFinite(Date.parse(value.createdAt))
  );
}

export function loadSampleTickets(
  filePath = resolve(__dirname, "../fixtures/sample-tickets.json"),
): SampleTicket[] {
  const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
  if (!isRecord(parsed) || !Array.isArray(parsed.tickets) || parsed.tickets.length !== 50) {
    throw new Error("Sample ticket JSON must contain exactly 50 tickets.");
  }

  if (!parsed.tickets.every(isSampleTicket)) {
    throw new Error("Sample ticket JSON contains a ticket with invalid or missing fields.");
  }

  const tickets = parsed.tickets;
  const ids = new Set(tickets.map(({ id }) => id));
  if (ids.size !== tickets.length) {
    throw new Error("Sample ticket JSON contains duplicate ticket IDs.");
  }

  return tickets;
}

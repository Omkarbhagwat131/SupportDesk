import type { TicketStatus } from "../api/tickets";
import { ticketStatusOptions } from "../status";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`badge status-${status.toLowerCase()}`}>
      {ticketStatusOptions.find((option) => option.value === status)?.label ?? status}
    </span>
  );
}

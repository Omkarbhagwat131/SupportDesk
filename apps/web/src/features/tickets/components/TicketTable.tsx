import { Link } from "react-router-dom";
import type { Ticket } from "../api/tickets";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { Badge } from "../../../components/ui/Badge";
import { Table } from "../../../components/ui/Table";

export function TicketTable({
  tickets,
  emptyMessage = "No tickets found.",
}: {
  tickets: Ticket[];
  emptyMessage?: string;
}) {
  if (tickets.length === 0) {
    return <Table caption="Tickets" headers={[]} isEmpty emptyMessage={emptyMessage}><tbody /></Table>;
  }

  return (
    <Table
      caption="Support tickets"
      headers={["Ticket", "Requester", "Status", "Priority", "Updated"]}
    >
      <tbody>
        {tickets.map((ticket) => (
          <tr key={ticket.id}>
            <td>
              <Link to={`/tickets/${encodeURIComponent(ticket.id)}`} className="ticket-link">
                <strong>{ticket.subject}</strong>
                <span className="ticket-open-icon" aria-hidden="true">↗</span>
              </Link>
              <span className="ticket-id">{ticket.id}</span>
            </td>
            <td>
              <span className="requester-cell">
                <span className="requester-avatar" aria-hidden="true">
                  {ticket.requesterEmail.charAt(0).toUpperCase()}
                </span>
                <span>{ticket.requesterEmail}</span>
              </span>
            </td>
            <td><TicketStatusBadge status={ticket.status} /></td>
            <td><Badge type="priority" value={ticket.priority} /></td>
            <td>
              <time dateTime={ticket.updatedAt}>
                {new Date(ticket.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </time>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

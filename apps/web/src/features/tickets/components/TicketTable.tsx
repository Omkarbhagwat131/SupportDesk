import { Link } from "react-router-dom";
import type { Ticket } from "../api/tickets";
import { TicketStatusBadge } from "./TicketStatusBadge";

export function TicketTable({
  tickets,
  emptyMessage = "No tickets found.",
}: {
  tickets: Ticket[];
  emptyMessage?: string;
}) {
  if (tickets.length === 0) {
    return <div className="empty-state" role="status">{emptyMessage}</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Requester</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Updated</th>
          </tr>
        </thead>
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
              <td><span className={`badge priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td>
              <td>
                <time dateTime={ticket.updatedAt}>
                  {new Date(ticket.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

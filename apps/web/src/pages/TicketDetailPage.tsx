import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CommentForm } from "../features/tickets/components/CommentForm";
import { CommentThread } from "../features/tickets/components/CommentThread";
import { TicketStatusBadge } from "../features/tickets/components/TicketStatusBadge";
import { useTicket } from "../features/tickets/hooks/useTicket";
import { useTicketComments } from "../features/tickets/hooks/useTicketComments";
import { useUpdateTicket } from "../features/tickets/hooks/useTicketMutations";
import { ticketStatusOptions } from "../features/tickets/status";
import { ApiRequestError } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import type { TicketStatus } from "../features/tickets/api/tickets";
import { Badge } from "../components/ui/Badge";

function getTicketLoadError(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 404) {
    return "Ticket not found or you don't have access to it.";
  }
  if (error instanceof ApiRequestError && error.status === 403) {
    return "You don't have permission to view this ticket.";
  }
  return error instanceof Error ? error.message : "Unable to load this ticket.";
}

export function TicketDetailPage() {
  const { ticketId = "" } = useParams();
  const location = useLocation();
  const user = getStoredUser();
  const isAgent = user?.role === "AGENT" || user?.role === "ADMIN";
  const ticketQuery = useTicket(ticketId);
  const commentsQuery = useTicketComments(ticketId, Boolean(ticketQuery.data));
  const updateMutation = useUpdateTicket(ticketId);
  const [statusError, setStatusError] = useState("");
  const ticket = ticketQuery.data;

  async function changeStatus(status: TicketStatus) {
    setStatusError("");
    try {
      await updateMutation.mutateAsync({ status });
    } catch (reason) {
      setStatusError(reason instanceof Error ? reason.message : "Unable to update ticket status.");
    }
  }

  if (ticketQuery.isPending || ticketQuery.isFetching) {
    return <div className="empty-state" role="status">Loading ticket...</div>;
  }

  if (ticketQuery.error || !ticket) {
    return (
      <section className="ticket-detail-page">
        <Link to="/tickets" className="back-link">← Back to tickets</Link>
        <div className="form-error" role="alert">
          {ticketQuery.error ? getTicketLoadError(ticketQuery.error) : "Ticket not found."}
        </div>
      </section>
    );
  }

  return (
    <section className="ticket-detail-page">
      <Link to="/tickets" className="back-link">← Back to tickets</Link>
      {location.state?.created === true && (
        <div className="form-success" role="status">Ticket created successfully.</div>
      )}
      <div className="page-heading">
        <div>
          <p className="eyebrow">Ticket {ticket.id}</p>
          <h1>{ticket.subject}</h1>
        </div>
        {isAgent && (
          <label className="status-control">
            Update status
            <select
              value={ticket.status}
              disabled={updateMutation.isPending}
              onChange={(event) => {
                const status = ticketStatusOptions.find((option) => option.value === event.target.value)?.value;
                if (status) void changeStatus(status);
              }}
            >
              {ticketStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {statusError && <div className="form-error" role="alert">{statusError}</div>}
      {updateMutation.isPending && <div role="status">Updating status...</div>}

      <article className="ticket-detail-card">
        <div className="ticket-detail-badges">
          <TicketStatusBadge status={ticket.status} />
          <Badge type="priority" value={ticket.priority} />
        </div>
        <dl className="ticket-metadata">
          <div><dt>Requester</dt><dd>{ticket.requesterEmail}</dd></div>
          <div><dt>Created</dt><dd>{new Date(ticket.createdAt).toLocaleString()}</dd></div>
          <div><dt>Last updated</dt><dd>{new Date(ticket.updatedAt).toLocaleString()}</dd></div>
          {ticket.assigneeId && <div><dt>Assignee</dt><dd>{ticket.assigneeId}</dd></div>}
          {ticket.category && <div><dt>Category</dt><dd>{ticket.category}</dd></div>}
        </dl>
        <h2>Description</h2>
        <p className="ticket-description">{ticket.description}</p>
      </article>

      <section className="comments-section" aria-labelledby="comments-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Conversation</p>
            <h2 id="comments-heading">Comments</h2>
          </div>
        </div>
        {commentsQuery.isPending || commentsQuery.isFetching ? (
          <div className="empty-state" role="status">Loading comments...</div>
        ) : commentsQuery.error ? (
          <div className="form-error" role="alert">{getTicketLoadError(commentsQuery.error)}</div>
        ) : (
          <CommentThread comments={commentsQuery.data ?? []} showInternal={isAgent} />
        )}
        {!commentsQuery.error && <CommentForm ticketId={ticket.id} allowInternal={isAgent} />}
      </section>
    </section>
  );
}

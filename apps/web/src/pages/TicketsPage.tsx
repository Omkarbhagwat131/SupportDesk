import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TicketFilters } from "../features/tickets/components/TicketFilters";
import { TicketTable } from "../features/tickets/components/TicketTable";
import { useTickets } from "../features/tickets/hooks/useTickets";
import type { TicketListQuery } from "../features/tickets/api/tickets";
import { parseTicketListQuery, serializeTicketListQuery } from "../features/tickets/queryParams";
import { getStoredUser } from "../lib/auth";
import { Button } from "../components/ui/Button";

export function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreateTicket = getStoredUser()?.role === "CUSTOMER";
  const search = searchParams.toString();
  const query = useMemo(() => parseTicketListQuery(search), [search]);
  const hasActiveFilters = Boolean(
    query.search?.trim() || query.assigneeId?.trim() || query.status || query.priority,
  );

  function updateQuery(next: TicketListQuery) {
    setSearchParams(serializeTicketListQuery(next), { replace: true });
  }

  const { tickets, meta, loading, error } = useTickets(query);

  return (
    <section className="tickets-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Support workspace</p>
          <h1>Tickets</h1>
          <p className="page-intro">Search, organize, and follow up on support requests.</p>
        </div>
        <div className="ticket-page-actions">
          <span className="result-count" aria-live="polite">
            {loading ? "Loading…" : <><strong>{meta.total}</strong> {meta.total === 1 ? "ticket" : "tickets"}</>}
          </span>
          {canCreateTicket && <Link className="button primary" to="/tickets/new">Create ticket</Link>}
        </div>
      </div>
      <section className="filter-panel" aria-label="Filter tickets">
        <div className="filter-panel-heading">
          <div>
            <p className="eyebrow">Find what you need</p>
            <h2>Search and filter</h2>
          </div>
          <span>Refine your ticket list</span>
        </div>
        <TicketFilters value={query} onChange={updateQuery} />
      </section>
      {loading && <div className="empty-state" role="status">Loading tickets...</div>}
      {!loading && error && <div className="form-error" role="alert">{error}</div>}
      {!loading && !error && (
        <TicketTable
          tickets={tickets}
          emptyMessage={hasActiveFilters ? "No tickets match your filters." : "No tickets yet."}
        />
      )}
      {!loading && meta.totalPages > 1 && (
        <div className="pagination">
          <Button variant="secondary" disabled={query.page <= 1} onClick={() => updateQuery({ ...query, page: query.page - 1 })}>Previous</Button>
          <span>Page {meta.page} of {meta.totalPages}</span>
          <Button variant="secondary" disabled={query.page >= meta.totalPages} onClick={() => updateQuery({ ...query, page: query.page + 1 })}>Next</Button>
        </div>
      )}
    </section>
  );
}

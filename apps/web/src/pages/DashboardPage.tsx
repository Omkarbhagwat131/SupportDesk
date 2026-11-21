import { Link } from "react-router-dom";
import { TicketTable } from "../features/tickets/components/TicketTable";
import type { TicketListQuery } from "../features/tickets/api/tickets";
import { useTickets } from "../features/tickets/hooks/useTickets";
import { ticketStatusOptions } from "../features/tickets/status";
import { getStoredUser } from "../lib/auth";

const recentTicketsQuery: TicketListQuery = {
  page: 1,
  limit: 5,
  sortBy: "createdAt",
  sortOrder: "desc",
};

export function DashboardPage() {
  const { tickets, meta, loading, error } = useTickets(recentTicketsQuery);
  const user = getStoredUser();
  const recentStatusCounts = ticketStatusOptions.map((status) => ({
    ...status,
    count: tickets.filter((ticket) => ticket.status === status.value).length,
  }));
  const recentTotal = tickets.length;

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div className="dashboard-welcome">
          <p className="eyebrow">Support workspace</p>
          <h1>Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p>Keep an eye on your support conversations and the latest ticket activity.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="button secondary" to="/tickets">View all tickets</Link>
        </div>
      </div>

      <div className="dashboard-summary-grid">
        <article className="dashboard-stat">
          <div className="dashboard-stat-copy">
            <p className="dashboard-stat-label">Total tickets</p>
            <p className="dashboard-stat-value" aria-live="polite">
              {loading || error ? "—" : meta.total}
            </p>
            <p className="dashboard-stat-note">Across your support workspace</p>
          </div>
          <div className="dashboard-stat-visual" aria-hidden="true">
            <span className="stat-orbit stat-orbit-one" />
            <span className="stat-orbit stat-orbit-two" />
            <span className="dashboard-stat-icon">T</span>
          </div>
        </article>

        <article className="dashboard-status-card" aria-labelledby="status-summary-heading">
          <div className="dashboard-status-heading">
            <div>
              <p className="dashboard-stat-label">At a glance</p>
              <h2 id="status-summary-heading">Recent status mix</h2>
            </div>
            <span className="status-window">Up to 5 latest</span>
          </div>
          {loading && <div className="status-summary-empty" role="status">Loading recent statuses…</div>}
          {!loading && error && <div className="status-summary-empty" role="alert">Status summary unavailable.</div>}
          {!loading && !error && recentTotal === 0 && (
            <div className="status-summary-empty" role="status">Status details will appear when tickets arrive.</div>
          )}
          {!loading && !error && recentTotal > 0 && (
            <div className="status-summary-list">
              {recentStatusCounts.map((status) => (
                <div className="status-summary-row" key={status.value}>
                  <div className="status-summary-label">
                    <span className={`status-dot status-dot-${status.value.toLowerCase()}`} />
                    <span>{status.label}</span>
                  </div>
                  <div className="status-summary-track" aria-hidden="true">
                    <span
                      className={`status-summary-fill status-fill-${status.value.toLowerCase()}`}
                      style={{ width: `${(status.count / recentTotal) * 100}%` }}
                    />
                  </div>
                  <strong className="status-summary-count">{status.count}</strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      <section className="dashboard-recent" aria-labelledby="recent-tickets-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Stay up to date</p>
            <h2 id="recent-tickets-heading">Recent tickets</h2>
          </div>
          {!loading && !error && tickets.length > 0 && (
            <span className="section-meta">Showing {tickets.length} recent</span>
          )}
        </div>
        {loading && <div className="empty-state" role="status">Loading recent tickets...</div>}
        {!loading && error && <div className="form-error" role="alert">{error}</div>}
        {!loading && !error && tickets.length === 0 && (
          <div className="empty-state" role="status">No tickets yet.</div>
        )}
        {!loading && !error && tickets.length > 0 && <TicketTable tickets={tickets} />}
      </section>
    </section>
  );
}

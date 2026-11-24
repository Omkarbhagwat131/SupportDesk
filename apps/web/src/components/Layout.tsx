import { useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAuth, getStoredUser } from "../lib/auth";
import { Button } from "./ui/Button";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = getStoredUser();
  const canCreateTicket = user?.role === "CUSTOMER";

  function logout() {
    queryClient.clear();
    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="app-sidebar">
        <Link className="brand" to="/" aria-label="SupportDesk home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SupportDesk</span>
        </Link>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink to="/" end>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3.8l8.5 6.7v9.2a.8.8 0 0 1-.8.8h-5.2v-6h-5v6H4.3a.8.8 0 0 1-.8-.8z" /></svg>
            <span>Overview</span>
          </NavLink>
          <NavLink to="/tickets">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v3a3 3 0 0 0 0 6v3a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18v-3a3 3 0 0 0 0-6V6A1.5 1.5 0 0 1 5 4.5Z" /><path d="M12 7.5v1m0 3v1m0 3v1" /></svg>
            <span>Tickets</span>
          </NavLink>
        </nav>

        {canCreateTicket && (
          <Link className="sidebar-create button primary" to="/tickets/new">
            <span aria-hidden="true">+</span>
            Create ticket
          </Link>
        )}

        <div className="sidebar-spacer" />
        <div className="sidebar-profile">
          <span className="account-avatar" aria-hidden="true">
            {user?.name?.trim().charAt(0).toUpperCase() || "U"}
          </span>
          <span className="account-details">
            <strong>{user?.name}</strong>
            <small>{user?.role?.toLowerCase()}</small>
          </span>
          <Button type="button" variant="text" className="logout-button" onClick={logout} aria-label="Log out" title="Log out">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10m4-4 4-4-4-4m4 4H9" /></svg>
          </Button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-heading">
            <p>SUPPORTDESK <span>/</span> WORKSPACE</p>
            <strong>
              {location.pathname === "/"
                ? "Overview"
                : location.pathname === "/tickets"
                  ? "Tickets"
                  : location.pathname === "/tickets/new"
                    ? "New ticket"
                    : "Ticket details"}
            </strong>
          </div>
        </header>
        <main id="main-content"><Outlet /></main>
      </div>
    </div>
  );
}

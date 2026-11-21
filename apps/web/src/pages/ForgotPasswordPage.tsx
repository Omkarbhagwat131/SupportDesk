import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useForgotPassword } from "../features/auth/hooks/useForgotPassword";
import { getStoredUser } from "../lib/auth";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [requested, setRequested] = useState(false);
  const { submit, loading, error } = useForgotPassword();

  if (getStoredUser()) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setRequested(await submit(email.trim()));
  }

  return (
    <div className="login-page">
      <aside className="login-showcase" aria-label="About SupportDesk">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SupportDesk</span>
        </div>
        <div className="login-showcase-content">
          <p className="eyebrow">Account recovery</p>
          <h2>Let’s get you<br />back on track.</h2>
          <p>Request a secure, one-time link to choose a new password.</p>
        </div>
        <p className="login-showcase-footer">Thoughtful support starts with a clear view.</p>
      </aside>

      <main className="login-panel">
        <form
          className="login-card"
          onSubmit={handleSubmit}
          aria-labelledby="forgot-password-title"
          aria-describedby="forgot-password-description"
          aria-busy={loading}
        >
          <div className="login-heading">
            <p className="eyebrow">Forgot your password?</p>
            <h1 id="forgot-password-title">Reset your password</h1>
            <p id="forgot-password-description">
              Enter the email address associated with your account.
            </p>
          </div>
          {error && <div className="form-error" id="forgot-password-error" role="alert">{error}</div>}
          {requested ? (
            <div className="form-success" role="status">
              If an account exists for that email, a reset link is available in the API terminal.
            </div>
          ) : (
            <>
              <label htmlFor="forgot-password-email">
                Email address
                <input
                  id="forgot-password-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                  aria-describedby={error ? "forgot-password-error" : undefined}
                />
              </label>
              <button type="submit" className="button primary login-submit" disabled={loading}>
                {loading ? "Requesting link…" : "Request reset link"}
              </button>
            </>
          )}
          <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
        </form>
      </main>
    </div>
  );
}

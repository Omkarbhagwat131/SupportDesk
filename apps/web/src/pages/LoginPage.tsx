import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getStoredUser } from "../lib/auth";
import { useLogin } from "../features/auth/hooks/useLogin";
import { getLoginPasswordError } from "../features/auth/validation";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");
  const submittingRef = useRef(false);
  const { submit: login, loading, error } = useLogin();
  const registrationComplete = location.state?.registrationComplete === true;
  const passwordResetComplete = location.state?.passwordResetComplete === true;

  if (getStoredUser()) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      const passwordError = getLoginPasswordError(password);
      if (passwordError) {
        setValidationError(passwordError);
        return;
      }

      setValidationError("");
      if (await login({ email: email.trim(), password })) {
        navigate("/", { replace: true });
      }
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div className="login-page">
      <aside className="login-showcase" aria-label="About SupportDesk">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SupportDesk</span>
        </div>

        <div className="login-showcase-content">
          <p className="eyebrow">Customer support, in sync</p>
          <h2>Every conversation<br />moving forward.</h2>
          <p>One calm workspace to keep requests clear, teams aligned, and customers informed.</p>

          <div className="login-preview" aria-hidden="true">
            <div className="login-preview-top">
              <span className="preview-live"><span />Workspace activity</span>
              <span className="preview-menu">•••</span>
            </div>
            <div className="preview-ticket">
              <span className="preview-ticket-icon">SD</span>
              <span className="preview-ticket-copy">
                <strong>Account access</strong>
                <small>Customer request · Just now</small>
              </span>
              <span className="badge status-open">Open</span>
            </div>
            <div className="preview-ticket preview-ticket-secondary">
              <span className="preview-ticket-icon preview-ticket-icon-warm">↗</span>
              <span className="preview-ticket-copy">
                <strong>Delivery update</strong>
                <small>Reply added · 12 min ago</small>
              </span>
              <span className="preview-activity-dot" />
            </div>
            <div className="preview-progress"><span /></div>
          </div>
        </div>

        <p className="login-showcase-footer">Thoughtful support starts with a clear view.</p>
      </aside>

      <main className="login-panel">
        <form
          className="login-card"
          onSubmit={submit}
          aria-labelledby="login-title"
          aria-describedby="login-description"
          aria-busy={loading}
        >
          <div className="login-heading">
            <p className="eyebrow">Your workspace</p>
            <h1 id="login-title">Welcome back</h1>
            <p id="login-description">Sign in to manage your support tickets.</p>
          </div>
          {registrationComplete && (
            <div className="form-success" role="status">
              Account created. Sign in with your new credentials.
            </div>
          )}
          {passwordResetComplete && (
            <div className="form-success" role="status">
              Password updated. Sign in with your new password.
            </div>
          )}
          {(validationError || error) && (
            <div className="form-error" id="login-error" role="alert">
              {validationError || error}
            </div>
          )}
          <label htmlFor="login-email">
            Email address
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setValidationError("");
              }}
              required
              disabled={loading}
              aria-describedby={error ? "login-error" : undefined}
            />
          </label>
          <p className="auth-switch auth-forgot-link">
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
          <label htmlFor="login-password">
            Password
            <span className="password-input-wrap">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setValidationError("");
                }}
                required
                disabled={loading}
                aria-invalid={Boolean(validationError)}
                aria-describedby={validationError ? "login-error" : error ? "login-error" : undefined}
              />
              <button
                type="button"
                className="password-visibility-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-controls="login-password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={loading}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>
          <button type="submit" className="button primary login-submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in to SupportDesk"}
          </button>
          <p className="login-secure-note"><span aria-hidden="true">✓</span> Secure sign-in to your support workspace</p>
          <p className="auth-switch">
            New to SupportDesk? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </main>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useResetPassword } from "../features/auth/hooks/useResetPassword";
import { getRegistrationPasswordError } from "../features/auth/validation";

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const { submit, loading, error } = useResetPassword();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const passwordError = getRegistrationPasswordError(password);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    setValidationError("");
    if (await submit({ token, password })) {
      navigate("/login", { replace: true, state: { passwordResetComplete: true } });
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
          <p className="eyebrow">Secure account recovery</p>
          <h2>Choose a new<br />password.</h2>
          <p>Set a new password to continue to your support workspace.</p>
        </div>
        <p className="login-showcase-footer">Thoughtful support starts with a clear view.</p>
      </aside>

      <main className="login-panel">
        <form
          className="login-card"
          onSubmit={handleSubmit}
          aria-labelledby="reset-password-title"
          aria-describedby="reset-password-description"
          aria-busy={loading}
        >
          <div className="login-heading">
            <p className="eyebrow">Account recovery</p>
            <h1 id="reset-password-title">Set a new password</h1>
            <p id="reset-password-description">Choose a password with at least 12 characters.</p>
          </div>
          {!token && (
            <div className="form-error" role="alert">
              This reset link is missing its token. Request a new link to continue.
            </div>
          )}
          {(validationError || error) && (
            <div className="form-error" id="reset-password-error" role="alert">
              {validationError || error}
            </div>
          )}
          <label htmlFor="reset-password">
            New password
            <input
              id="reset-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              placeholder="At least 12 characters"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setValidationError("");
              }}
              required
              disabled={loading || !token}
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError || error ? "reset-password-error" : undefined}
            />
          </label>
          <label htmlFor="reset-password-confirm">
            Confirm new password
            <input
              id="reset-password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setValidationError("");
              }}
              required
              disabled={loading || !token}
              aria-invalid={validationError === "Passwords do not match."}
              aria-describedby={validationError || error ? "reset-password-error" : undefined}
            />
          </label>
          <button
            type="submit"
            className="button primary login-submit"
            disabled={loading || !token}
          >
            {loading ? "Updating password…" : "Update password"}
          </button>
          <p className="auth-switch"><Link to="/forgot-password">Request another reset link</Link></p>
        </form>
      </main>
    </div>
  );
}

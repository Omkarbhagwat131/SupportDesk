import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useRegister } from "../features/auth/hooks/useRegister";
import { getRegistrationPasswordError } from "../features/auth/validation";
import { getStoredUser } from "../lib/auth";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const submittingRef = useRef(false);
  const { submit: register, loading, error } = useRegister();

  if (getStoredUser()) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      const trimmedName = name.trim();
      const passwordError = getRegistrationPasswordError(password);
      if (!trimmedName) {
        setValidationError("Enter your name.");
        return;
      }
      if (passwordError) {
        setValidationError(passwordError);
        return;
      }
      if (password !== confirmPassword) {
        setValidationError("Passwords do not match.");
        return;
      }

      setValidationError("");
      if (await register({ name: trimmedName, email: email.trim(), password })) {
        navigate("/login", { replace: true, state: { registrationComplete: true } });
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
          <p className="eyebrow">A better support experience</p>
          <h2>Get help,<br />without the hassle.</h2>
          <p>Create an account to submit requests and follow updates from your support team.</p>
        </div>
        <p className="login-showcase-footer">Thoughtful support starts with a clear view.</p>
      </aside>

      <main className="login-panel">
        <form
          className="login-card"
          onSubmit={submit}
          aria-labelledby="register-title"
          aria-describedby="register-description"
          aria-busy={loading}
        >
          <div className="login-heading">
            <p className="eyebrow">Create your account</p>
            <h1 id="register-title">Join SupportDesk</h1>
            <p id="register-description">Register to create and track your support requests.</p>
          </div>
          {(validationError || error) && (
            <div className="form-error" id="register-error" role="alert">
              {validationError || error}
            </div>
          )}
          <label htmlFor="register-name">
            Full name
            <input
              id="register-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={100}
              placeholder="Your name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setValidationError("");
              }}
              required
              disabled={loading}
              aria-describedby={error ? "register-error" : undefined}
            />
          </label>
          <label htmlFor="register-email">
            Email address
            <input
              id="register-email"
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
              aria-describedby={error ? "register-error" : undefined}
            />
          </label>
          <label htmlFor="register-password">
            Password
            <input
              id="register-password"
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
              disabled={loading}
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError || error ? "register-error" : undefined}
            />
          </label>
          <label htmlFor="register-confirm-password">
            Confirm password
            <input
              id="register-confirm-password"
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
              disabled={loading}
              aria-invalid={validationError === "Passwords do not match."}
              aria-describedby={validationError || error ? "register-error" : undefined}
            />
          </label>
          <button type="submit" className="button primary login-submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </main>
    </div>
  );
}

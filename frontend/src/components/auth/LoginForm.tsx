// src/components/auth/LoginForm.tsx
// What: the email/password login box. Handles its own loading/error state
// and calls onSuccess once Cognito actually confirms the login - the parent
// (App.tsx) doesn't need to know anything about how login works internally.

import { useState, type FormEvent } from "react";
import { login } from "../../lib/auth";

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      onSuccess();
    } catch {
      // Never echo Cognito's raw error back - it can reveal whether an
      // email exists at all. One generic message either way.
      setError("Incorrect email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h1>Budget App Tracker</h1>
      <p className="app__subtitle">Sign in</p>

      <label className="login-form__field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
      </label>

      <label className="login-form__field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

// src/App.tsx
// What: the root component. Its only job is deciding which screen to show -
// the login form, or the dashboard - based on whether a login token already
// exists. Everything on the dashboard itself lives in Dashboard.tsx.

import { useCallback, useState } from "react";
import { LoginForm } from "./components/auth/LoginForm";
import { Dashboard } from "./components/dashboard/Dashboard";
import { getIdToken } from "./lib/auth";

export default function App() {
  // Checked once, on first render: if a token is already sitting in
  // sessionStorage (e.g. the page was refreshed), skip straight past login.
  const [loggedIn, setLoggedIn] = useState(() => getIdToken() !== null);

  // useCallback keeps this the same function between renders, so the
  // dashboard's data loading (which depends on it) doesn't re-run needlessly.
  const handleSessionExpired = useCallback(() => setLoggedIn(false), []);

  if (!loggedIn) {
    return <LoginForm onSuccess={() => setLoggedIn(true)} />;
  }

  return <Dashboard onSessionExpired={handleSessionExpired} />;
}

// src/hooks/useNotificationSettings.ts
// What: owns the notification settings - loading them, flipping each
// switch, and sending a test email.
//
// Manages: the settings, a loading flag, a busy flag (a request is in
// flight), the test email's state, and the latest error message.
// Returns: { settings, loading, error, busy, testState,
//            toggle, sendTest, reload }.
// reload() re-reads the settings; the dashboard calls it after to-dos or
// bills change, so the "Coming up next" list stays current.

import { useCallback, useEffect, useState } from "react";
import {
  getNotificationSettings,
  sendTestEmail,
  setNotification,
  UnauthorizedError,
} from "../lib/api";
import type { NotificationKind, NotificationSettings } from "../types/settings";

export type TestEmailState = "idle" | "sending" | "sent";

export function useNotificationSettings(onSessionExpired: () => void) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [testState, setTestState] = useState<TestEmailState>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof UnauthorizedError) {
        onSessionExpired();
        return;
      }
      setError(fallback);
    },
    [onSessionExpired]
  );

  const reload = useCallback(() => {
    getNotificationSettings()
      .then(setSettings)
      .catch((err) => handleError(err, "Couldn't load your notification settings."))
      .finally(() => setLoading(false));
  }, [handleError]);

  useEffect(reload, [reload]);

  async function toggle(kind: NotificationKind, on: boolean) {
    setError(null);
    setBusy(true);
    try {
      setSettings(await setNotification(kind, on));
    } catch (err) {
      handleError(err, "Couldn't change that setting. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setError(null);
    setTestState("sending");
    try {
      await sendTestEmail();
      setTestState("sent");
      reload(); // the "sent today" count just went up
    } catch (err) {
      setTestState("idle");
      handleError(err, "Couldn't send the test email. Try again later.");
    }
  }

  return { settings, loading, error, busy, testState, toggle, sendTest, reload };
}

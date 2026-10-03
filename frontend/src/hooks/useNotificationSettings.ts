// src/hooks/useNotificationSettings.ts
// What: owns the notification settings - loading them and flipping the
// email-reminders switch.
//
// Manages: the settings, a loading flag, a busy flag (a request is in
// flight), and the latest error message.
// Returns: { settings, loading, error, busy, toggleEmail }.

import { useCallback, useEffect, useState } from "react";
import { getNotificationSettings, setEmailEnabled, UnauthorizedError } from "../lib/api";
import type { NotificationSettings } from "../types/settings";

export function useNotificationSettings(onSessionExpired: () => void) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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

  useEffect(() => {
    getNotificationSettings()
      .then(setSettings)
      .catch((err) => handleError(err, "Couldn't load your notification settings."))
      .finally(() => setLoading(false));
  }, [handleError]);

  async function toggleEmail(on: boolean) {
    setError(null);
    setBusy(true);
    try {
      setSettings(await setEmailEnabled(on));
    } catch (err) {
      handleError(err, "Couldn't change that setting. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return { settings, loading, error, busy, toggleEmail };
}

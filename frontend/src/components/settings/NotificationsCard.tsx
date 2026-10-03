// src/components/settings/NotificationsCard.tsx
// What: the Notifications card on the dashboard - shows where reminder
// emails go and holds the on/off switch for them. Holds no data of its own;
// everything comes from useNotificationSettings via the dashboard.
//
// Props:
//   settings      - the current settings, or null while loading
//   loading       - true while the settings are first being fetched
//   error         - a message to show if something failed, or null
//   busy          - true while a request is in flight
//   onToggleEmail - called with true/false when the switch is flipped

import type { NotificationSettings } from "../../types/settings";
import { Card } from "../ui";

interface NotificationsCardProps {
  settings: NotificationSettings | null;
  loading: boolean;
  error: string | null;
  busy: boolean;
  onToggleEmail: (on: boolean) => void;
}

export function NotificationsCard({
  settings,
  loading,
  error,
  busy,
  onToggleEmail,
}: NotificationsCardProps) {
  return (
    <Card title="Notifications">
      {error && <p className="error">{error}</p>}
      {loading || !settings ? (
        <p className="muted">Loading…</p>
      ) : settings.email === null ? (
        <p className="muted">Email reminders aren't set up yet.</p>
      ) : (
        <>
          <p className="notifications-card__address">
            Reminder emails go to <strong>{settings.email}</strong>
          </p>
          <label className="switch">
            <input
              type="checkbox"
              className="check"
              checked={settings.emailEnabled}
              disabled={busy}
              onChange={(e) => onToggleEmail(e.target.checked)}
            />
            Email reminders {settings.emailEnabled ? "on" : "off"}
          </label>
        </>
      )}
    </Card>
  );
}

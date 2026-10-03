// src/components/settings/NotificationsCard.tsx
// What: the Notifications card on the dashboard - a switch for each kind of
// email, what's scheduled next, how many went out today, and a button to
// send yourself a test email. Holds no data of its own; everything comes
// from useNotificationSettings via the dashboard.
//
// Props:
//   settings   - the current settings, or null while loading
//   loading    - true while the settings are first being fetched
//   error      - a message to show if something failed, or null
//   busy       - true while a switch is being saved
//   testState  - "idle", "sending" or "sent" for the test email button
//   onToggle   - called with a kind and true/false when a switch is flipped
//   onSendTest - called when "Send me a test email" is clicked

import type { TestEmailState } from "../../hooks/useNotificationSettings";
import type { NotificationKind, NotificationSettings } from "../../types/settings";
import { Card } from "../ui";
import { NotificationToggle } from "./NotificationToggle";
import { UpcomingList } from "./UpcomingList";

interface NotificationsCardProps {
  settings: NotificationSettings | null;
  loading: boolean;
  error: string | null;
  busy: boolean;
  testState: TestEmailState;
  onToggle: (kind: NotificationKind, on: boolean) => void;
  onSendTest: () => void;
}

// The switches, in the order they're shown.
const TOGGLES: { kind: NotificationKind; title: string; hint: string }[] = [
  { kind: "todoReminders", title: "To-do reminders", hint: "At the time you pick on a to-do" },
  { kind: "billReminders", title: "Bill reminders", hint: "When a bill is due (and the day before, if you ask)" },
  { kind: "budgetAlerts", title: "Budget alerts", hint: "Once at 80%, again at 100% of a category" },
  { kind: "dailySummary", title: "Daily summary", hint: "8:00 AM: to-dos, bills and spending" },
];

const TEST_BUTTON_TEXT: Record<TestEmailState, string> = {
  idle: "Send me a test email",
  sending: "Sending…",
  sent: "Sent - check your inbox",
};

export function NotificationsCard({
  settings,
  loading,
  error,
  busy,
  testState,
  onToggle,
  onSendTest,
}: NotificationsCardProps) {
  return (
    <Card
      title="Notifications"
      className="card--span-2"
      aside={
        settings?.email && (
          <span className="card__count">
            {"Emails go to "}
            <strong>{settings.email}</strong>
          </span>
        )
      }
    >
      {error && <p className="error">{error}</p>}
      {loading || !settings ? (
        <p className="muted">Loading…</p>
      ) : settings.email === null ? (
        <p className="muted">Email notifications aren't set up yet.</p>
      ) : (
        <div className="notifications">
          <div>
            {TOGGLES.map(({ kind, title, hint }) => (
              <NotificationToggle
                key={kind}
                title={title}
                hint={hint}
                on={settings[kind]}
                disabled={busy}
                onChange={(on) => onToggle(kind, on)}
              />
            ))}
          </div>
          <div>
            <UpcomingList upcoming={settings.upcoming} />
            <p className="muted notifications__count">
              {`${settings.sentToday} of ${settings.dailyLimit} emails sent today`}
            </p>
            <button
              type="button"
              className="button button--quiet"
              disabled={testState !== "idle"}
              onClick={onSendTest}
            >
              {TEST_BUTTON_TEXT[testState]}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

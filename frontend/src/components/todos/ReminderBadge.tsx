// src/components/todos/ReminderBadge.tsx
// What: a small bell with the reminder time, shown on a to-do that has a
// reminder email still waiting. Clicking the x cancels the reminder.
//
// Props:
//   remindAt - when the main reminder goes out (ISO 8601)
//   onClear  - called when the x is clicked

interface ReminderBadgeProps {
  remindAt: string;
  onClear: () => void;
}

export function ReminderBadge({ remindAt, onClear }: ReminderBadgeProps) {
  const label = new Date(remindAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <span className="reminder-badge" title="A reminder email is scheduled">
      <span aria-hidden="true">🔔</span> {label}
      <button
        type="button"
        className="reminder-badge__clear"
        aria-label="Cancel reminder"
        onClick={onClear}
      >
        ×
      </button>
    </span>
  );
}

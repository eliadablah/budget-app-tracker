// src/components/settings/NotificationToggle.tsx
// What: one row on the Notifications card - a title, a short explanation,
// and an on/off switch.
//
// Props:
//   title    - what this kind of email is
//   hint     - one line on when it's sent
//   on       - whether it's switched on
//   disabled - true while a change is being saved
//   onChange - called with the new on/off value

interface NotificationToggleProps {
  title: string;
  hint: string;
  on: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}

export function NotificationToggle({ title, hint, on, disabled, onChange }: NotificationToggleProps) {
  return (
    <label className="toggle-row">
      <span className="toggle-row__text">
        <strong>{title}</strong>
        <span>{hint}</span>
      </span>
      {/* role="switch" tells screen readers this checkbox is an on/off switch. */}
      <input
        type="checkbox"
        role="switch"
        className="switch-input"
        checked={on}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

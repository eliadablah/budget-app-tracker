// src/components/todos/ReminderFields.tsx
// What: the "Email me a reminder" checkbox, plus (once ticked) a date/time
// picker and an "Also the day before" checkbox. Used inside TodoForm.
//
// Props:
//   value    - the current reminder, or null when unticked
//   onChange - called with the new reminder (or null) on every change

import { useState } from "react";
import type { ReminderInput } from "../../types/todo";

interface ReminderFieldsProps {
  value: ReminderInput | null;
  onChange: (value: ReminderInput | null) => void;
}

// <input type="datetime-local"> works in the browser's LOCAL time with no
// time zone ("2026-10-03T15:00"). new Date() reads that as local time and
// toISOString() turns it into UTC for the server.
function defaultLocalTime(): string {
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
  inOneHour.setMinutes(0, 0, 0);
  const offsetMs = inOneHour.getTimezoneOffset() * 60 * 1000;
  return new Date(inOneHour.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function ReminderFields({ value, onChange }: ReminderFieldsProps) {
  const [localTime, setLocalTime] = useState(defaultLocalTime);
  const [dayBefore, setDayBefore] = useState(false);

  function emit(on: boolean, time: string, before: boolean) {
    onChange(on ? { remindAt: new Date(time).toISOString(), remindDayBefore: before } : null);
  }

  return (
    <fieldset className="reminder-fields">
      <label className="reminder-fields__toggle">
        <input
          type="checkbox"
          className="check"
          checked={value !== null}
          onChange={(e) => emit(e.target.checked, localTime, dayBefore)}
        />
        Email me a reminder
      </label>

      {value !== null && (
        <div className="reminder-fields__details">
          <input
            type="datetime-local"
            aria-label="Reminder date and time"
            value={localTime}
            onChange={(e) => {
              setLocalTime(e.target.value);
              emit(true, e.target.value, dayBefore);
            }}
          />
          <label className="reminder-fields__toggle">
            <input
              type="checkbox"
              className="check"
              checked={dayBefore}
              onChange={(e) => {
                setDayBefore(e.target.checked);
                emit(true, localTime, e.target.checked);
              }}
            />
            Also the day before
          </label>
        </div>
      )}
    </fieldset>
  );
}

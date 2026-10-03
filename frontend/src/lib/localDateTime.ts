// src/lib/localDateTime.ts
// What: converts between the two ways a date-and-time shows up in the app:
//   - what <input type="datetime-local"> uses: local time with no time zone,
//     e.g. "2026-10-20T09:00"
//   - what the API uses: ISO 8601 in UTC, e.g. "2026-10-20T14:00:00.000Z"

// ISO (UTC) -> the input's local format.
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

// The input's local format -> ISO (UTC). new Date() reads a string with no
// time zone as local time, which is exactly what the input means.
export function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

// A sensible starting value: 9:00 AM tomorrow.
export function tomorrowMorning(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toLocalInput(date.toISOString());
}

// "Mon, Oct 5 · 9:00 AM" for lists.
export function formatDue(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

// "Oct 2" for short mentions.
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// src/lib/localTime.ts
// What: answers "what time is it where the user lives?". Lambda's own clock
// is UTC, but "8 AM summary" and "this month's spending" mean local time.
// TIME_ZONE comes from Terraform (reminder_time_zone).

export const TIME_ZONE = process.env.TIME_ZONE ?? "America/Chicago";

export interface LocalTime {
  date: string; // "YYYY-MM-DD"
  month: string; // "YYYY-MM"
  hour: number; // 0-23
  minute: number; // 0-59
}

export function localTime(now = new Date()): LocalTime {
  // formatToParts gives each piece separately, so nothing has to be parsed
  // back out of a formatted string.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const month = `${get("year")}-${get("month")}`;
  return {
    date: `${month}-${get("day")}`,
    month,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

// "Sunday, Nov 1, 9:00 AM" in the user's time zone, for email text.
export function formatLocal(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// src/reminders/reminderSchedule.ts
// What: small date math shared by the API (when a reminder is saved) and the
// sender (after a text goes out). Pure functions with no AWS calls, so they
// are easy to reason about.
//
// ISO 8601 UTC strings sort the same way as the times they represent, which
// is why a plain "<" comparison works below.

const DAY_MS = 24 * 60 * 60 * 1000;

// When should the FIRST text go out? The day-before text if it was asked for
// and is still in the future, otherwise the main one.
export function firstReminderTime(remindAt: string, dayBefore: boolean, now = new Date()): string {
  if (dayBefore) {
    const early = new Date(new Date(remindAt).getTime() - DAY_MS);
    if (early > now) return early.toISOString();
  }
  return remindAt;
}

// After sending the text that was due at `sentFor`, what's next?
// The day-before text is followed by the main one; after the main one,
// nothing (null).
export function nextReminderTime(sentFor: string, remindAt: string): string | null {
  return sentFor < remindAt ? remindAt : null;
}

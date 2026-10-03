// src/todos/validateReminder.ts
// What: checks the reminder part of a to-do request before anything touches
// the database. Same pattern as validateTodo.ts: return the cleaned value or
// throw an HttpError (400) that is safe to show the caller.

import { HttpError } from "../lib/http";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS_AHEAD = 366;

export interface ReminderInput {
  remindAt: string; // normalized to ISO 8601 UTC
  remindDayBefore: boolean;
}

// For POST /todos, where a reminder is optional.
export function validateOptionalReminder(body: Record<string, unknown>): ReminderInput | undefined {
  if (body.remindAt === undefined || body.remindAt === null) return undefined;
  return validateReminder(body);
}

// For PUT /todos/{id}/reminder, where a reminder is the whole point.
export function validateReminder(body: Record<string, unknown>): ReminderInput {
  if (typeof body.remindAt !== "string") {
    throw new HttpError(400, "remindAt is required");
  }
  const when = new Date(body.remindAt);
  if (Number.isNaN(when.getTime())) {
    throw new HttpError(400, "remindAt must be a valid date and time");
  }
  const now = Date.now();
  if (when.getTime() <= now) {
    throw new HttpError(400, "remindAt must be in the future");
  }
  if (when.getTime() > now + MAX_DAYS_AHEAD * DAY_MS) {
    throw new HttpError(400, "remindAt must be within the next year");
  }
  if (body.remindDayBefore !== undefined && typeof body.remindDayBefore !== "boolean") {
    throw new HttpError(400, "remindDayBefore must be true or false");
  }
  return { remindAt: when.toISOString(), remindDayBefore: body.remindDayBefore === true };
}

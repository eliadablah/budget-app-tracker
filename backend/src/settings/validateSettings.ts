// src/settings/validateSettings.ts
// What: checks the notification settings request before anything touches
// the database. Same pattern as validateTodo.ts.

import { HttpError } from "../lib/http";

export function validateEmailEnabled(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new HttpError(400, "emailEnabled must be true or false");
  }
  return value;
}

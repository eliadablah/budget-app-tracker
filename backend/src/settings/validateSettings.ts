// src/settings/validateSettings.ts
// What: checks the notification settings request before anything touches
// the database. Same pattern as validateTodo.ts.

import { HttpError } from "../lib/http";
import { NOTIFICATION_KINDS } from "../types/settings";
import type { SettingsChanges } from "./updateNotificationSettings";

// Accepts any of the switches ({ "billReminders": true, ... }); at least
// one must be present, and each must be true or false.
export function validateSettingsChanges(body: Record<string, unknown>): SettingsChanges {
  const changes: SettingsChanges = {};
  for (const kind of NOTIFICATION_KINDS) {
    const value = body[kind];
    if (value === undefined) continue;
    if (typeof value !== "boolean") {
      throw new HttpError(400, `${kind} must be true or false`);
    }
    changes[kind] = value;
  }
  if (Object.keys(changes).length === 0) {
    throw new HttpError(400, `Send at least one of: ${NOTIFICATION_KINDS.join(", ")}`);
  }
  return changes;
}

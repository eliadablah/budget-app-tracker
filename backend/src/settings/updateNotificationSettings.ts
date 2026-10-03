// src/settings/updateNotificationSettings.ts
// What: flips one or more notification switches. Switching anything ON is
// refused if email isn't set up in Terraform, so a switch can never claim to
// be on when nothing could actually be sent.

import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { EmailNotConfiguredError, emailConfigured } from "../lib/email";
import {
  SETTINGS_SK,
  type NotificationKind,
  type NotificationSettingsView,
} from "../types/settings";
import { getNotificationSettings } from "./notificationSettingsStore";

export type SettingsChanges = Partial<Record<NotificationKind, boolean>>;

export async function updateNotificationSettings(
  userId: string,
  changes: SettingsChanges
): Promise<NotificationSettingsView> {
  const entries = Object.entries(changes) as [NotificationKind, boolean][];
  if (entries.some(([, on]) => on) && !emailConfigured()) throw new EmailNotConfiguredError();

  // Builds "SET #k0 = :v0, #k1 = :v1" for just the switches that were sent,
  // leaving the others untouched.
  const names: Record<string, string> = {};
  const values: Record<string, boolean> = {};
  const assignments = entries.map(([kind, on], i) => {
    names[`#k${i}`] = kind;
    values[`:v${i}`] = on;
    return `#k${i} = :v${i}`;
  });

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${userId}`, sk: SETTINGS_SK },
      UpdateExpression: `SET ${assignments.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
  return getNotificationSettings(userId);
}

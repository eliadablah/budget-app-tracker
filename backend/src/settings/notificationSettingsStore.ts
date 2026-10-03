// src/settings/notificationSettingsStore.ts
// What: reads a user's settings item and turns it into the "view" the
// browser gets, adding the address reminders are emailed to.

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { emailConfigured, REMINDER_EMAIL } from "../lib/email";
import {
  SETTINGS_SK,
  type NotificationSettings,
  type NotificationSettingsView,
} from "../types/settings";

export async function loadNotificationSettings(
  userId: string
): Promise<NotificationSettings | undefined> {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk: `USER#${userId}`, sk: SETTINGS_SK } })
  );
  return result.Item as NotificationSettings | undefined;
}

export function toView(settings: NotificationSettings | undefined): NotificationSettingsView {
  return {
    email: emailConfigured() ? REMINDER_EMAIL : null,
    emailEnabled: settings?.emailEnabled ?? false,
  };
}

export async function getNotificationSettings(userId: string): Promise<NotificationSettingsView> {
  return toView(await loadNotificationSettings(userId));
}

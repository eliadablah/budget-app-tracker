// src/settings/updateNotificationSettings.ts
// What: flips the email-reminders master switch. Switching it ON is refused
// if email isn't set up in Terraform, so the switch can never claim to be on
// when nothing could actually be sent.

import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { EmailNotConfiguredError, emailConfigured } from "../lib/email";
import {
  SETTINGS_SK,
  type NotificationSettings,
  type NotificationSettingsView,
} from "../types/settings";
import { toView } from "./notificationSettingsStore";

export async function updateNotificationSettings(
  userId: string,
  emailEnabled: boolean
): Promise<NotificationSettingsView> {
  if (emailEnabled && !emailConfigured()) throw new EmailNotConfiguredError();

  const result = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${userId}`, sk: SETTINGS_SK },
      UpdateExpression: "SET emailEnabled = :on",
      ExpressionAttributeValues: { ":on": emailEnabled },
      ReturnValues: "ALL_NEW",
    })
  );
  return toView(result.Attributes as NotificationSettings);
}

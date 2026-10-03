// src/settings/notificationSettingsStore.ts
// What: reads a user's notification settings and builds the "view" the
// browser gets: the switches, where emails go, how many went out today, and
// the next few emails that are scheduled.

import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { MAX_SENDS_PER_DAY, sentToday } from "../lib/dailySendCap";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { emailConfigured, REMINDER_EMAIL } from "../lib/email";
import {
  isOn,
  SETTINGS_SK,
  type NotificationSettings,
  type NotificationSettingsView,
  type UpcomingNotification,
} from "../types/settings";

const MAX_UPCOMING = 5;

export async function loadNotificationSettings(
  userId: string
): Promise<NotificationSettings | undefined> {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk: `USER#${userId}`, sk: SETTINGS_SK } })
  );
  return result.Item as NotificationSettings | undefined;
}

// The next reminders waiting for this user, soonest first. Reads the same
// "reminders-due" index the sender uses, so what's listed is exactly what
// will be sent.
async function loadUpcoming(userId: string): Promise<UpcomingNotification[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "reminders-due",
      KeyConditionExpression: "reminderStatus = :pending",
      FilterExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pending": "PENDING", ":pk": `USER#${userId}` },
    })
  );

  return (result.Items ?? []).slice(0, MAX_UPCOMING).map((item) => {
    const isBill = String(item.sk).startsWith("BILL#");
    return {
      kind: isBill ? "bill" : "todo",
      label: String(isBill ? item.name : item.title),
      at: String(item.nextReminderAt),
    };
  });
}

export async function getNotificationSettings(userId: string): Promise<NotificationSettingsView> {
  const [settings, sent, upcoming] = await Promise.all([
    loadNotificationSettings(userId),
    sentToday(userId),
    loadUpcoming(userId),
  ]);

  return {
    email: emailConfigured() ? REMINDER_EMAIL : null,
    todoReminders: isOn(settings, "todoReminders"),
    billReminders: isOn(settings, "billReminders"),
    budgetAlerts: isOn(settings, "budgetAlerts"),
    dailySummary: isOn(settings, "dailySummary"),
    sentToday: sent,
    dailyLimit: MAX_SENDS_PER_DAY,
    upcoming,
  };
}

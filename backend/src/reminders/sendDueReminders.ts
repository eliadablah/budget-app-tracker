// src/reminders/sendDueReminders.ts
// What: the scheduled reminder sender. Runs as its OWN Lambda (same Docker
// image as the API, different starting function - see infra/reminders.tf),
// woken every 15 minutes by EventBridge Scheduler. Finds reminders whose
// time has come and emails them.
//
// Never-twice rule: each reminder is "claimed" with a conditional update
// BEFORE the email is sent. If two runs overlap, only one claim succeeds.
// The trade-off: if AWS fails to send right after a claim, that one email
// is skipped rather than risking a duplicate. The failure is logged and
// trips the error alarm.
//
// Privacy: logs contain counts only - never email addresses or to-do titles.

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { reserveSendSlot } from "../lib/dailySendCap";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { sendNotificationEmail } from "../lib/email";
import { loadNotificationSettings } from "../settings/notificationSettingsStore";
import type { Todo } from "../types/todo";
import { nextReminderTime } from "./reminderSchedule";

const TIME_ZONE = process.env.TIME_ZONE ?? "America/Chicago";
const APP_URL = process.env.APP_URL ?? "";
const MAX_PER_RUN = 50;
const MAX_TITLE_IN_SUBJECT = 100;

interface RunCounts {
  sent: number;
  skipped: number;
  failed: number;
}

export async function handler(): Promise<RunCounts> {
  const now = new Date().toISOString();
  const counts: RunCounts = { sent: 0, skipped: 0, failed: 0 };

  const due = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "reminders-due",
      KeyConditionExpression: "reminderStatus = :pending AND nextReminderAt <= :now",
      ExpressionAttributeValues: { ":pending": "PENDING", ":now": now },
      Limit: MAX_PER_RUN,
    })
  );

  for (const todo of (due.Items ?? []) as Todo[]) {
    try {
      const outcome = await processOne(todo, now);
      counts[outcome] += 1;
    } catch (err) {
      counts.failed += 1;
      console.error("Reminder failed:", (err as Error).name);
    }
  }

  console.log("Reminder run:", JSON.stringify(counts));
  // Throwing makes the run count as an error in CloudWatch, which trips the
  // alarm in reminders.tf and emails the alert address.
  if (counts.failed > 0) throw new Error(`${counts.failed} reminder(s) failed`);
  return counts;
}

async function processOne(todo: Todo, now: string): Promise<"sent" | "skipped"> {
  if (!todo.remindAt || !todo.nextReminderAt) return "skipped";
  const userId = todo.pk.replace(/^USER#/, "");
  const isDayBefore = todo.nextReminderAt < todo.remindAt;

  if (!(await claim(todo, todo.remindAt, todo.nextReminderAt, now))) return "skipped";

  const settings = await loadNotificationSettings(userId);
  if (!settings?.emailEnabled) return "skipped"; // reminders switched off
  if (!(await reserveSendSlot(userId))) return "skipped"; // daily cap reached

  // Quiet hours would go here: if it's night in TIME_ZONE, push
  // nextReminderAt to the next morning instead of sending now.

  const { subject, body } = buildEmail(todo, todo.remindAt, isDayBefore);
  await sendNotificationEmail(subject, body);
  return "sent";
}

// Moves the reminder to its next step (day-before -> main, main -> done),
// but only if nobody else has moved it since it was read.
async function claim(todo: Todo, remindAt: string, expected: string, now: string): Promise<boolean> {
  const next = nextReminderTime(expected, remindAt);
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: todo.pk, sk: todo.sk },
        UpdateExpression: next
          ? "SET nextReminderAt = :next, reminderSentAt = :now"
          : "SET reminderSentAt = :now REMOVE reminderStatus, nextReminderAt",
        ConditionExpression: "nextReminderAt = :expected",
        ExpressionAttributeValues: {
          ":expected": expected,
          ":now": now,
          ...(next && { ":next": next }),
        },
      })
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

// Builds a short plain-text email. Plain text (no HTML) keeps it simple and
// readable in any inbox, including on a phone lock screen.
function buildEmail(
  todo: Todo,
  remindAt: string,
  isDayBefore: boolean
): { subject: string; body: string } {
  const title =
    todo.title.length > MAX_TITLE_IN_SUBJECT
      ? `${todo.title.slice(0, MAX_TITLE_IN_SUBJECT - 3)}...`
      : todo.title;
  const when = new Date(remindAt).toLocaleString("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const subject = isDayBefore ? `Tomorrow: ${title}` : `Reminder: ${title}`;
  const lines = [
    isDayBefore ? `Heads up for tomorrow:` : `It's time:`,
    "",
    `  ${todo.title}`,
    `  ${when}`,
    "",
    ...(APP_URL ? [`Open your to-do list: ${APP_URL}`, ""] : []),
    "You get these because email reminders are switched on in your budget app.",
    "Turn them off any time on the Notifications card.",
  ];
  return { subject, body: lines.join("\n") };
}

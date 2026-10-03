// src/reminders/sendDueReminders.ts
// What: finds to-do and bill reminders whose time has come and emails them.
// Called every 15 minutes by the scheduler (scheduler.ts).
//
// To-dos and bills share the same reminder fields and the same
// "reminders-due" index, so one loop handles both; the key prefix (TODO# or
// BILL#) says which it is.
//
// Never-twice rule: each reminder is "claimed" with a conditional update
// BEFORE the email is sent. If two runs overlap, only one claim succeeds.
// The trade-off: if AWS fails to send right after a claim, that one email
// is skipped rather than risking a duplicate. The failure is counted and
// trips the error alarm.
//
// Privacy: logs contain counts only - never email addresses, titles or names.

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { remaining } from "../bills/billMath";
import { reserveSendSlot } from "../lib/dailySendCap";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { sendNotificationEmail } from "../lib/email";
import { formatLocal } from "../lib/localTime";
import { formatUsd } from "../lib/money";
import { loadNotificationSettings } from "../settings/notificationSettingsStore";
import type { Bill } from "../types/bill";
import { isOn } from "../types/settings";
import type { Todo } from "../types/todo";
import { nextReminderTime } from "./reminderSchedule";

const APP_URL = process.env.APP_URL ?? "";
const MAX_PER_RUN = 50;
const MAX_TITLE_IN_SUBJECT = 100;

export interface RunCounts {
  sent: number;
  skipped: number;
  failed: number;
}

// Anything in the reminders index: the fields both kinds share.
type ReminderItem = (Todo | Bill) & { remindAt?: string; nextReminderAt?: string };

interface Email {
  subject: string;
  body: string;
}

export async function sendDueReminders(): Promise<RunCounts> {
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

  for (const item of (due.Items ?? []) as ReminderItem[]) {
    try {
      counts[await processOne(item, now)] += 1;
    } catch (err) {
      counts.failed += 1;
      console.error("Reminder failed:", (err as Error).name);
    }
  }
  return counts;
}

async function processOne(item: ReminderItem, now: string): Promise<"sent" | "skipped"> {
  if (!item.remindAt || !item.nextReminderAt) return "skipped";
  const userId = item.pk.replace(/^USER#/, "");
  const isDayBefore = item.nextReminderAt < item.remindAt;
  const isBill = item.sk.startsWith("BILL#");

  if (!(await claim(item, item.remindAt, item.nextReminderAt, now))) return "skipped";

  const settings = await loadNotificationSettings(userId);
  if (!isOn(settings, isBill ? "billReminders" : "todoReminders")) return "skipped";

  const email = isBill
    ? billEmail(item as Bill, item.remindAt, isDayBefore)
    : todoEmail(item as Todo, item.remindAt, isDayBefore);
  if (!email) return "skipped"; // e.g. the bill was paid in the meantime

  if (!(await reserveSendSlot(userId))) return "skipped"; // daily cap reached

  // Quiet hours would go here: if it's night locally, push nextReminderAt to
  // the next morning instead of sending now.

  await sendNotificationEmail(email.subject, email.body);
  return "sent";
}

// Moves the reminder to its next step (day-before -> main, main -> done),
// but only if nobody else has moved it since it was read.
async function claim(
  item: ReminderItem,
  remindAt: string,
  expected: string,
  now: string
): Promise<boolean> {
  const next = nextReminderTime(expected, remindAt);
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: item.pk, sk: item.sk },
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

// The Lambda's entry point used to be this file. It is now scheduler.ts, but
// a Lambda still configured with the old entry point (during the gap between
// a code deploy and its Terraform apply) lands here - so forward it. Loaded
// on demand because scheduler.ts imports this file.
export async function handler(): Promise<Record<string, number>> {
  const scheduler = await import("./scheduler");
  return scheduler.handler();
}

function shorten(text: string): string {
  return text.length > MAX_TITLE_IN_SUBJECT ? `${text.slice(0, MAX_TITLE_IN_SUBJECT - 3)}...` : text;
}

// The lines every reminder email ends with.
function footer(): string[] {
  return [
    ...(APP_URL ? [`Open your dashboard: ${APP_URL}`, ""] : []),
    "You get these because this kind of email is switched on in your budget app.",
    "Turn it off any time on the Notifications card.",
  ];
}

// Plain text (no HTML) keeps emails simple and readable in any inbox.
function todoEmail(todo: Todo, remindAt: string, isDayBefore: boolean): Email {
  return {
    subject: `${isDayBefore ? "Tomorrow" : "Reminder"}: ${shorten(todo.title)}`,
    body: [
      isDayBefore ? "Heads up for tomorrow:" : "It's time:",
      "",
      `  ${todo.title}`,
      `  ${formatLocal(remindAt)}`,
      "",
      ...footer(),
    ].join("\n"),
  };
}

function billEmail(bill: Bill, dueAt: string, isDayBefore: boolean): Email | null {
  const left = remaining(bill);
  if (left !== null && left <= 0) return null; // already paid - nothing to remind about

  const amountLine =
    left === null
      ? "Amount: not entered yet - add this month's amount in the app"
      : bill.payments.length > 0
        ? `Still owed: ${formatUsd(left)} of ${formatUsd(bill.amount ?? 0)}`
        : `Amount: ${formatUsd(left)}`;
  const amountInSubject = left === null ? "" : ` (${formatUsd(left)})`;

  return {
    subject: `Bill due ${isDayBefore ? "tomorrow" : "today"}: ${shorten(bill.name)}${amountInSubject}`,
    body: [
      isDayBefore ? "A bill is due tomorrow:" : "A bill is due:",
      "",
      `  ${bill.name}`,
      `  ${amountLine}`,
      `  Due: ${formatLocal(dueAt)}`,
      "",
      ...footer(),
    ].join("\n"),
  };
}

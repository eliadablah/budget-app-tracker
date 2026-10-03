// src/reminders/scheduler.ts
// What: the entry point of the reminders Lambda (infra/reminders.tf). Runs
// as its OWN Lambda - same Docker image as the API, different starting
// function - woken every 15 minutes by EventBridge Scheduler.
//
// Each run does up to three jobs:
//   1. every run          - to-do and bill reminders that are due
//   2. once an hour       - budget alerts (80% and 100%)
//   3. once a day, 8 AM   - the daily summary
//
// "Once an hour" works without any stored state: the schedule fires every 15
// minutes, so exactly one run per hour lands in minutes 0-14. Budget alerts
// and the summary also each guard themselves against repeats.
//
// One user's failure never stops the others, and any failure makes the run
// end with an error so the alarm in reminders.tf emails the alert address.

import { localTime } from "../lib/localTime";
import { listUsersWithSettings } from "../settings/listUsersWithSettings";
import { isOn } from "../types/settings";
import { runBudgetAlerts } from "./budgetAlerts";
import { runDailySummary } from "./dailySummary";
import { sendDueReminders } from "./sendDueReminders";

const SUMMARY_HOUR = 8;
const FIRST_RUN_OF_HOUR_MINUTES = 15;

export async function handler(): Promise<Record<string, number>> {
  const result = { sent: 0, skipped: 0, failed: 0, budgetAlerts: 0, summaries: 0 };

  Object.assign(result, await sendDueReminders());

  const { hour, minute } = localTime();
  if (minute < FIRST_RUN_OF_HOUR_MINUTES) {
    for (const settings of await listUsersWithSettings()) {
      const userId = settings.pk.replace(/^USER#/, "");
      try {
        if (isOn(settings, "budgetAlerts")) {
          result.budgetAlerts += await runBudgetAlerts(userId);
        }
        if (hour === SUMMARY_HOUR && isOn(settings, "dailySummary")) {
          result.summaries += (await runDailySummary(userId)) ? 1 : 0;
        }
      } catch (err) {
        result.failed += 1;
        console.error("Hourly job failed:", (err as Error).name);
      }
    }
  }

  // Counts only - never addresses, titles or amounts.
  console.log("Scheduler run:", JSON.stringify(result));
  if (result.failed > 0) throw new Error(`${result.failed} notification job(s) failed`);
  return result;
}

// src/reminders/budgetAlerts.ts
// What: emails the user when a budget category crosses 80% and again when
// it crosses 100% of its monthly limit. Run once an hour by the scheduler.
//
// Each alert goes out exactly once per category, per level, per month
// (sentMarker.ts). If spending jumps straight past both levels, only the
// "over budget" email is sent - not two emails a second apart.

import { listBankTransactions } from "../bank/listBankTransactions";
import { getBudget } from "../budget/budgetStore";
import { categoryLabel } from "../budget/categoryLabels";
import { monthSpending } from "../budget/monthSpending";
import { reserveSendSlot } from "../lib/dailySendCap";
import { sendNotificationEmail } from "../lib/email";
import { localTime } from "../lib/localTime";
import { formatUsd } from "../lib/money";
import { markOnce } from "./sentMarker";

const LEVELS = [80, 100] as const;

// Returns how many alert emails were sent.
export async function runBudgetAlerts(userId: string): Promise<number> {
  const { limits } = await getBudget(userId);
  if (Object.keys(limits).length === 0) return 0;

  const { month } = localTime();
  const { transactions } = await listBankTransactions(userId);
  const spent = monthSpending(transactions, month);

  let sent = 0;
  for (const [category, limit] of Object.entries(limits)) {
    const amount = spent[category] ?? 0;
    const percent = (amount / limit) * 100;

    // Every level reached gets marked (so it never fires later), but only
    // the highest NEWLY reached level is emailed.
    let newlyReached: number | undefined;
    for (const level of LEVELS) {
      if (percent >= level && (await markOnce(userId, `BUDGET#${month}#${category}#${level}`))) {
        newlyReached = level;
      }
    }
    if (newlyReached === undefined) continue;
    if (!(await reserveSendSlot(userId))) return sent; // daily cap reached

    const label = categoryLabel(category);
    const over = newlyReached >= 100;
    await sendNotificationEmail(
      over ? `Over budget: ${label}` : `${label} is at ${Math.floor(percent)}% of its budget`,
      [
        over
          ? `You've gone over your ${label} budget this month.`
          : `You've used ${Math.floor(percent)}% of your ${label} budget this month.`,
        "",
        `  Spent:  ${formatUsd(amount)}`,
        `  Budget: ${formatUsd(limit)}`,
        over
          ? `  Over by: ${formatUsd(amount - limit)}`
          : `  Left:   ${formatUsd(limit - amount)}`,
        "",
        "Turn budget alerts off any time on the Notifications card.",
      ].join("\n")
    );
    sent += 1;
  }
  return sent;
}

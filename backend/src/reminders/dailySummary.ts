// src/reminders/dailySummary.ts
// What: the once-a-day morning email - open to-dos, bills coming up in the
// next week (and anything overdue), and this month's spending against the
// budget. Run by the scheduler in the 8 AM hour, local time.
//
// Sent at most once per day (sentMarker.ts). If the banks can't be reached,
// the email still goes out with the to-dos and bills, and says so.

import { remaining } from "../bills/billMath";
import { listBills } from "../bills/billStore";
import { listBankTransactions } from "../bank/listBankTransactions";
import { getBudget } from "../budget/budgetStore";
import { monthSpending } from "../budget/monthSpending";
import { reserveSendSlot } from "../lib/dailySendCap";
import { sendNotificationEmail } from "../lib/email";
import { formatLocal, localTime } from "../lib/localTime";
import { formatUsd } from "../lib/money";
import { listTodos } from "../todos/listTodos";
import { markOnce } from "./sentMarker";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LISTED = 8;
const APP_URL = process.env.APP_URL ?? "";

// Returns true if the summary was sent.
export async function runDailySummary(userId: string): Promise<boolean> {
  const { date, month } = localTime();
  if (!(await markOnce(userId, `SUMMARY#${date}`))) return false; // already sent today
  if (!(await reserveSendSlot(userId))) return false;

  const [todos, { bills }, { limits }] = await Promise.all([
    listTodos(userId),
    listBills(userId),
    getBudget(userId),
  ]);

  const openTodos = todos.filter((t) => !t.done);
  const soon = new Date(Date.now() + WEEK_MS).toISOString();
  const dueBills = bills.filter((b) => !b.paidAt && b.dueAt <= soon);

  const lines: string[] = [`Good morning. Here's where things stand.`, ""];

  lines.push(`TO-DOS (${openTodos.length} open)`);
  if (openTodos.length === 0) lines.push("  All caught up.");
  for (const todo of openTodos.slice(0, MAX_LISTED)) lines.push(`  - ${todo.title}`);
  if (openTodos.length > MAX_LISTED) lines.push(`  ...and ${openTodos.length - MAX_LISTED} more`);
  lines.push("");

  lines.push("BILLS (overdue or due in the next 7 days)");
  if (dueBills.length === 0) lines.push("  Nothing due.");
  const now = new Date().toISOString();
  for (const bill of dueBills.slice(0, MAX_LISTED)) {
    const left = remaining(bill);
    const amount = left === null ? "amount not entered" : formatUsd(left);
    const overdue = bill.dueAt < now ? " (OVERDUE)" : "";
    lines.push(`  - ${bill.name}: ${amount}, due ${formatLocal(bill.dueAt)}${overdue}`);
  }
  lines.push("");

  lines.push("SPENDING THIS MONTH");
  try {
    const { transactions } = await listBankTransactions(userId);
    const spent = monthSpending(transactions, month);
    const totalSpent = Object.values(spent).reduce((sum, n) => sum + n, 0);
    const totalBudget = Object.values(limits).reduce((sum, n) => sum + n, 0);
    lines.push(
      totalBudget > 0
        ? `  ${formatUsd(totalSpent)} of ${formatUsd(totalBudget)} budget`
        : `  ${formatUsd(totalSpent)} (no budget set yet)`
    );
  } catch {
    lines.push("  Couldn't reach your bank this morning.");
  }
  lines.push("");

  if (APP_URL) lines.push(`Open your dashboard: ${APP_URL}`, "");
  lines.push("Turn the daily summary off any time on the Notifications card.");

  await sendNotificationEmail(`Your day: ${openTodos.length} to-dos, ${dueBills.length} bills due`, lines.join("\n"));
  return true;
}

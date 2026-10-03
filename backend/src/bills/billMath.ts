// src/bills/billMath.ts
// What: small money and date helpers for bills. Pure functions, no AWS
// calls, so the rules are easy to read in one place.

import { firstReminderTime } from "../reminders/reminderSchedule";
import type { Bill, BillInput } from "../types/bill";

// Money is kept in dollars; rounding to cents after every sum stops tiny
// floating-point leftovers (0.1 + 0.2 = 0.30000000000000004) from building up.
export function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function totalPaid(bill: Pick<Bill, "payments">): number {
  return roundCents(bill.payments.reduce((sum, p) => sum + p.amount, 0));
}

// What's still owed, or null when the amount isn't known yet.
export function remaining(bill: Pick<Bill, "amount" | "payments">): number | null {
  if (bill.amount === null) return null;
  return Math.max(0, roundCents(bill.amount - totalPaid(bill)));
}

export function isFullyPaid(bill: Pick<Bill, "amount" | "payments">): boolean {
  const left = remaining(bill);
  return left !== null && left <= 0;
}

// The same day next month, at the same time. A bill due on the 31st moves to
// the last day of a shorter month (Jan 31 -> Feb 28) instead of spilling into
// March.
export function nextMonth(iso: string): string {
  const d = new Date(iso);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const next = new Date(d);
  next.setUTCDate(1);
  next.setUTCFullYear(year, month, Math.min(d.getUTCDate(), lastDay));
  return next.toISOString();
}

// "BILL#<series>#2026-11-01" - the due date makes each month's key unique.
export function billSk(seriesId: string, dueAt: string): string {
  return `BILL#${seriesId}#${dueAt.slice(0, 10)}`;
}

// The reminder fields for a bill. A reminder is only scheduled when it was
// asked for, the bill isn't paid, and the due time is still ahead.
export function reminderFields(
  input: Pick<BillInput, "dueAt" | "remind" | "remindDayBefore">,
  paid: boolean,
  now = new Date()
): Pick<Bill, "remindAt" | "remindDayBefore" | "reminderStatus" | "nextReminderAt"> {
  if (!input.remind || paid || new Date(input.dueAt) <= now) return {};
  return {
    remindAt: input.dueAt,
    remindDayBefore: input.remindDayBefore,
    reminderStatus: "PENDING",
    nextReminderAt: firstReminderTime(input.dueAt, input.remindDayBefore, now),
  };
}

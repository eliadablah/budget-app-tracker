// src/lib/billMath.ts
// What: the small sums and labels the bills section needs - how much of a
// bill is paid, how much is left, and what state it's in.

import type { Bill } from "../types/bill";

const DAY_MS = 24 * 60 * 60 * 1000;
const SOON_DAYS = 3;

function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function totalPaid(bill: Bill): number {
  return roundCents(bill.payments.reduce((sum, p) => sum + p.amount, 0));
}

// What's still owed, or null when the amount hasn't been entered yet.
export function remaining(bill: Bill): number | null {
  if (bill.amount === null) return null;
  return Math.max(0, roundCents(bill.amount - totalPaid(bill)));
}

// 0-100, how much of the bill is paid (0 when the amount isn't known).
export function percentPaid(bill: Bill): number {
  if (!bill.amount) return 0;
  return Math.min(100, Math.round((totalPaid(bill) / bill.amount) * 100));
}

export type BillStatus = "paid" | "overdue" | "soon" | "partly" | "needs-amount" | "upcoming";

export function billStatus(bill: Bill, now = new Date()): BillStatus {
  if (bill.paidAt) return "paid";
  const due = new Date(bill.dueAt).getTime();
  if (due < now.getTime()) return "overdue";
  if (bill.amount === null) return "needs-amount";
  if (due - now.getTime() <= SOON_DAYS * DAY_MS) return "soon";
  if (bill.payments.length > 0) return "partly";
  return "upcoming";
}

// The total still owed on unpaid bills due by the end of this month
// (including anything overdue). Bills with no amount yet can't be counted.
export function owedThisMonth(bills: Bill[], now = new Date()): number {
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return roundCents(
    bills
      .filter((b) => !b.paidAt && new Date(b.dueAt).getTime() < endOfMonth)
      .reduce((sum, b) => sum + (remaining(b) ?? 0), 0)
  );
}

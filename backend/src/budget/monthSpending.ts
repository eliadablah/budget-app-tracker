// src/budget/monthSpending.ts
// What: adds up this month's spending per category from bank transactions.
// Only real spending counts (countsAsSpending) - not money in, transfers
// between your own accounts, or credit card payments.

import type { BankTransaction } from "../types/bank";
import { OTHER_CATEGORY } from "./categoryLabels";

// monthPrefix is "YYYY-MM"; transaction dates start with the same thing.
export function monthSpending(
  transactions: BankTransaction[],
  monthPrefix: string
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const t of transactions) {
    if (!t.countsAsSpending || !t.date.startsWith(monthPrefix)) continue;
    const category = t.category ?? OTHER_CATEGORY;
    totals[category] = Math.round(((totals[category] ?? 0) + t.amount) * 100) / 100;
  }
  return totals;
}

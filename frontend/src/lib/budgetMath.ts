// src/lib/budgetMath.ts
// What: builds everything the Budget card shows from two inputs - this
// month's bank transactions and the limits you set. One category per row,
// plus the totals.

import type { BankTransaction } from "../types/bank";
import { categoryLabel, chartColor, OTHER_CATEGORY } from "./budgetCategories";

export interface BudgetRow {
  category: string;
  label: string;
  spent: number;
  limit: number | null; // null = no budget set for this category
  color: string;
}

export interface BudgetSummary {
  rows: BudgetRow[]; // biggest spending first
  totalSpent: number;
  totalLimit: number; // 0 when no budget is set at all
  percentUsed: number | null; // null when no budget is set
}

// This month as "YYYY-MM" in the viewer's own time zone - transaction dates
// start with the same thing, so a simple prefix check finds this month's.
export function currentMonthPrefix(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function buildBudget(
  transactions: BankTransaction[],
  limits: Record<string, number>
): BudgetSummary {
  const month = currentMonthPrefix();

  // Only real spending counts - the backend already marks transfers and
  // credit card payments as not-spending (countsAsSpending).
  const spentBy: Record<string, number> = {};
  for (const t of transactions) {
    if (!t.countsAsSpending || !t.date.startsWith(month)) continue;
    const category = t.category ?? OTHER_CATEGORY;
    spentBy[category] = (spentBy[category] ?? 0) + t.amount;
  }

  // A row for every category that has spending or a limit.
  const categories = [...new Set([...Object.keys(spentBy), ...Object.keys(limits)])];
  const rows = categories
    .map((category) => ({
      category,
      label: categoryLabel(category),
      spent: Math.round((spentBy[category] ?? 0) * 100) / 100,
      limit: limits[category] ?? null,
    }))
    .sort((a, b) => b.spent - a.spent)
    .map((row, index) => ({ ...row, color: chartColor(index) }));

  const totalSpent = rows.reduce((sum, r) => sum + r.spent, 0);
  const totalLimit = Object.values(limits).reduce((sum, n) => sum + n, 0);

  return {
    rows,
    totalSpent,
    totalLimit,
    percentUsed: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : null,
  };
}

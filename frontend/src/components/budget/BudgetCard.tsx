// src/components/budget/BudgetCard.tsx
// What: the budget section of the dashboard - the month's total in the
// corner, warning tags, a donut chart of spending by category, each category
// against its limit, and the editor for the limits. Holds no data of its
// own: spending comes from the bank transactions and the limits from the
// useBudget hook, both via the dashboard.
//
// Props:
//   transactions - recent bank transactions (the spending side)
//   limits       - the monthly limits (category -> dollars)
//   hasBanks     - whether any bank is connected (changes the empty message)
//   loading      - true while the limits or transactions are being fetched
//   saving       - true while new limits are being saved
//   error        - a message to show if something failed, or null
//   onSaveLimits - called with new limits; resolves true when saved

import { useState } from "react";
import { COMMON_CATEGORIES } from "../../lib/budgetCategories";
import { buildBudget } from "../../lib/budgetMath";
import type { BankTransaction } from "../../types/bank";
import { Card } from "../ui";
import { BudgetAlerts } from "./BudgetAlerts";
import { BudgetEditor } from "./BudgetEditor";
import { BudgetTotal } from "./BudgetTotal";
import { CategoryRow } from "./CategoryRow";
import { SpendingDonut } from "./SpendingDonut";

// The chart and list stay readable: the biggest categories only.
const MAX_ROWS = 6;

interface BudgetCardProps {
  transactions: BankTransaction[];
  limits: Record<string, number>;
  hasBanks: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onSaveLimits: (limits: Record<string, number>) => Promise<boolean>;
}

export function BudgetCard({
  transactions,
  limits,
  hasBanks,
  loading,
  saving,
  error,
  onSaveLimits,
}: BudgetCardProps) {
  const [editing, setEditing] = useState(false);
  const budget = buildBudget(transactions, limits);
  const rows = budget.rows.slice(0, MAX_ROWS);

  // Offer every category with spending or a limit, plus the common ones.
  const editorCategories = [
    ...new Set([...budget.rows.map((r) => r.category), ...COMMON_CATEGORIES]),
  ];

  return (
    <Card
      title="Budget"
      aside={<BudgetTotal spent={budget.totalSpent} limit={budget.totalLimit} />}
    >
      {error && <p className="error">{error}</p>}

      {budget.percentUsed !== null && (
        <div className="progress">
          <div
            className={`progress__fill${budget.percentUsed > 100 ? " progress__fill--over" : ""}`}
            style={{ width: `${Math.min(100, budget.percentUsed)}%` }}
          />
        </div>
      )}

      <BudgetAlerts rows={budget.rows} />

      {loading ? (
        <p className="muted">Loading…</p>
      ) : editing ? (
        <BudgetEditor
          categories={editorCategories}
          limits={limits}
          saving={saving}
          onSave={onSaveLimits}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {rows.length === 0 ? (
            <p className="muted">
              {hasBanks
                ? "No spending yet this month. Set your budget amounts to get started."
                : "Connect a bank to see what you've spent in each category."}
            </p>
          ) : (
            <div className="budget-body">
              <SpendingDonut rows={rows} percentUsed={budget.percentUsed} />
              <ul className="category-list">
                {rows.map((row) => (
                  <CategoryRow key={row.category} row={row} />
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            className="button button--quiet button--block"
            onClick={() => setEditing(true)}
          >
            {budget.totalLimit > 0 ? "Edit budget amounts" : "Set budget amounts"}
          </button>
        </>
      )}
    </Card>
  );
}

// src/components/budget/BudgetAlerts.tsx
// What: the small warning tags at the top of the Budget card - one for each
// category that is at 80% or more of its limit, red once it's over.
// (The matching emails are sent by the backend when "Budget alerts" is on.)
//
// Props:
//   rows - the budget categories

import type { BudgetRow } from "../../lib/budgetMath";

const WARN_AT_PERCENT = 80;

interface BudgetAlertsProps {
  rows: BudgetRow[];
}

export function BudgetAlerts({ rows }: BudgetAlertsProps) {
  const alerts = rows
    .filter((r) => r.limit !== null && r.limit > 0)
    .map((r) => ({ row: r, percent: Math.floor((r.spent / (r.limit as number)) * 100) }))
    .filter((a) => a.percent >= WARN_AT_PERCENT);

  if (alerts.length === 0) return null;

  return (
    <div className="budget-alerts">
      {alerts.map(({ row, percent }) => (
        <span
          key={row.category}
          className={`alert-chip alert-chip--${percent >= 100 ? "over" : "warn"}`}
        >
          {percent >= 100 ? `${row.label} is over budget` : `${row.label} at ${percent}%`}
        </span>
      ))}
    </div>
  );
}

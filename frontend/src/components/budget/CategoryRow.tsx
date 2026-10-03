// src/components/budget/CategoryRow.tsx
// What: one budget category on a line - its color dot, name, what's been
// spent against its limit, and a small bar. Over the limit turns red.
//
// Props:
//   row - the category's label, spending, limit and chart color

import { formatMoneyWhole } from "../../lib/formatMoney";
import type { BudgetRow } from "../../lib/budgetMath";

interface CategoryRowProps {
  row: BudgetRow;
}

export function CategoryRow({ row }: CategoryRowProps) {
  const over = row.limit !== null && row.spent > row.limit;
  const percent = row.limit ? Math.min(100, (row.spent / row.limit) * 100) : 0;

  return (
    <li className="category-row">
      <span className="category-row__dot" style={{ background: row.color }} />
      <span className="category-row__label">{row.label}</span>
      <span className={`category-row__amount${over ? " category-row__amount--over" : ""}`}>
        {formatMoneyWhole(row.spent)}
        {row.limit !== null && (
          <span className="category-row__limit">{` / ${formatMoneyWhole(row.limit)}`}</span>
        )}
      </span>
      {row.limit !== null && (
        <span className="progress progress--thin category-row__bar">
          <span
            className={`progress__fill${over ? " progress__fill--over" : ""}`}
            style={{ width: `${percent}%`, background: over ? undefined : row.color }}
          />
        </span>
      )}
    </li>
  );
}

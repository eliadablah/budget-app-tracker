// src/components/budget/BudgetTotal.tsx
// What: the total shown in the Budget card's top-right corner - what you've
// spent this month, and out of how much if a budget is set.
//
// Props:
//   spent - this month's spending so far
//   limit - the total monthly budget (0 when none is set)

import { formatMoneyWhole } from "../../lib/formatMoney";

interface BudgetTotalProps {
  spent: number;
  limit: number;
}

export function BudgetTotal({ spent, limit }: BudgetTotalProps) {
  return (
    <span className="card__total">
      <strong>{formatMoneyWhole(spent)}</strong>
      <span>{limit > 0 ? `of ${formatMoneyWhole(limit)} budget` : "spent this month"}</span>
    </span>
  );
}

// src/components/dashboard/SummaryRow.tsx
// What: the row of headline numbers across the top of the dashboard. The
// cash and to-do tiles are live; the budget and bills tiles show a dash
// until those features exist to fill them in.
//
// Props:
//   todos - the to-do list, used for the "To-dos open" tile
//   banks - connected banks, used for the "Cash in accounts" tile

import { formatMoneyWhole } from "../../lib/formatMoney";
import type { Bank } from "../../types/bank";
import type { Todo } from "../../types/todo";
import { StatTile } from "../ui";

interface SummaryRowProps {
  todos: Todo[];
  banks: Bank[];
}

export function SummaryRow({ todos, banks }: SummaryRowProps) {
  const open = todos.filter((t) => !t.done).length;

  // "Cash" = checking and savings only ("depository" is the banks' word
  // for those). Credit cards and loans are money owed, so they're left out.
  const cashAccounts = banks
    .flatMap((bank) => bank.accounts)
    .filter((account) => account.type === "depository");
  const cash = cashAccounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);

  return (
    <div className="summary-row">
      <StatTile
        label="Cash in accounts"
        value={cashAccounts.length > 0 ? formatMoneyWhole(cash) : undefined}
        hint={cashAccounts.length > 0 ? "Checking and savings" : "Connect a bank"}
      />
      <StatTile label="Left to spend" hint="Needs your budget" />
      <StatTile label="Spent this month" hint="Needs your budget" />
      <StatTile label="Bills still due" hint="Needs your bills" />
      <StatTile
        label="To-dos open"
        value={String(open)}
        hint={open === 0 ? "All caught up" : undefined}
      />
    </div>
  );
}

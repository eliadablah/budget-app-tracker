// src/components/dashboard/SummaryRow.tsx
// What: the row of headline numbers across the top of the dashboard. Cash,
// spending, and to-dos are live; the budget and bills tiles show a dash
// until those features exist to fill them in.
//
// Props:
//   todos        - the to-do list, for the "To-dos open" tile
//   banks        - connected banks, for the "Cash in accounts" tile
//   transactions - recent transactions, for the "Spent this month" tile

import { formatMoneyWhole } from "../../lib/formatMoney";
import type { Bank, BankTransaction } from "../../types/bank";
import type { Todo } from "../../types/todo";
import { StatTile } from "../ui";

interface SummaryRowProps {
  todos: Todo[];
  banks: Bank[];
  transactions: BankTransaction[];
}

// This month as "YYYY-MM" in the viewer's own time zone - transaction dates
// start with the same thing, so a simple prefix check finds this month's.
function currentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function SummaryRow({ todos, banks, transactions }: SummaryRowProps) {
  const open = todos.filter((t) => !t.done).length;
  const hasBanks = banks.length > 0;

  // "Cash" = checking and savings only ("depository" is the banks' word
  // for those). Credit cards and loans are money owed, so they're left out.
  const cashAccounts = banks
    .flatMap((bank) => bank.accounts)
    .filter((account) => account.type === "depository");
  const cash = cashAccounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);

  // Purchases and bills dated this month. Transfers between your own
  // accounts and credit card payments are already excluded by the backend
  // (countsAsSpending).
  const month = currentMonthPrefix();
  const spent = transactions
    .filter((t) => t.countsAsSpending && t.date.startsWith(month))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="summary-row">
      <StatTile
        label="Cash in accounts"
        value={cashAccounts.length > 0 ? formatMoneyWhole(cash) : undefined}
        hint={cashAccounts.length > 0 ? "Checking and savings" : "Connect a bank"}
      />
      <StatTile
        label="Spent this month"
        value={hasBanks ? formatMoneyWhole(spent) : undefined}
        hint={hasBanks ? "From your connected banks" : "Connect a bank"}
      />
      <StatTile label="Left to spend" hint="Needs your budget" />
      <StatTile label="Bills still due" hint="Needs your bills" />
      <StatTile
        label="To-dos open"
        value={String(open)}
        hint={open === 0 ? "All caught up" : undefined}
      />
    </div>
  );
}

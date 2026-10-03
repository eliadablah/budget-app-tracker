// src/components/dashboard/SummaryRow.tsx
// What: the row of headline numbers across the top of the dashboard: cash,
// spending, what's left of the budget, bills still owed, and open to-dos.
//
// Props:
//   todos        - the to-do list, for the "To-dos open" tile
//   banks        - connected banks, for the "Cash in accounts" tile
//   transactions - recent transactions, for the "Spent this month" tile
//   limits       - the monthly budget limits, for the "Left to spend" tile
//   bills        - the bills, for the "Bills still due" tile

import { owedThisMonth } from "../../lib/billMath";
import { buildBudget } from "../../lib/budgetMath";
import { formatMoneyWhole } from "../../lib/formatMoney";
import type { Bank, BankTransaction } from "../../types/bank";
import type { Bill } from "../../types/bill";
import type { Todo } from "../../types/todo";
import { StatTile } from "../ui";

interface SummaryRowProps {
  todos: Todo[];
  banks: Bank[];
  transactions: BankTransaction[];
  limits: Record<string, number>;
  bills: Bill[];
}

export function SummaryRow({ todos, banks, transactions, limits, bills }: SummaryRowProps) {
  const open = todos.filter((t) => !t.done).length;
  const hasBanks = banks.length > 0;

  // "Cash" = checking and savings only ("depository" is the banks' word
  // for those). Credit cards and loans are money owed, so they're left out.
  const cashAccounts = banks
    .flatMap((bank) => bank.accounts)
    .filter((account) => account.type === "depository");
  const cash = cashAccounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);

  // Spending and budget use the same sums as the Budget card, so the two
  // can never disagree.
  const budget = buildBudget(transactions, limits);
  const hasBudget = budget.totalLimit > 0;
  const left = budget.totalLimit - budget.totalSpent;

  const unpaidBills = bills.filter((b) => !b.paidAt);

  return (
    <div className="summary-row">
      <StatTile
        label="Cash in accounts"
        value={cashAccounts.length > 0 ? formatMoneyWhole(cash) : undefined}
        hint={cashAccounts.length > 0 ? "Checking and savings" : "Connect a bank"}
      />
      <StatTile
        label="Spent this month"
        value={hasBanks ? formatMoneyWhole(budget.totalSpent) : undefined}
        hint={hasBanks ? "From your connected banks" : "Connect a bank"}
      />
      <StatTile
        label="Left to spend"
        value={hasBudget ? formatMoneyWhole(left) : undefined}
        hint={hasBudget ? (left < 0 ? "Over your budget" : "Of this month's budget") : "Set your budget"}
      />
      <StatTile
        label="Bills still due"
        value={unpaidBills.length > 0 ? formatMoneyWhole(owedThisMonth(bills)) : undefined}
        hint={
          unpaidBills.length > 0
            ? `${unpaidBills.length} unpaid ${unpaidBills.length === 1 ? "bill" : "bills"}`
            : "Add your bills"
        }
      />
      <StatTile
        label="To-dos open"
        value={String(open)}
        hint={open === 0 ? "All caught up" : undefined}
      />
    </div>
  );
}

// src/components/transactions/TransactionsCard.tsx
// What: the recent-transactions section of the dashboard - this month's
// money out and in at the top, filter chips, then the list across all
// connected banks, newest first, a batch at a time. Holds no data of its own
// (only the picked filter and how many are shown); everything else comes
// from the hooks via the dashboard.
//
// Props:
//   transactions - recent transactions, newest first
//   billNames    - transaction id -> the bill it was counted toward
//   loading      - true while they are being fetched
//   error        - a message to show if something failed, or null
//   hasBanks     - whether any bank is connected (changes the empty message)

import { useState } from "react";
import { currentMonthPrefix } from "../../lib/budgetMath";
import { formatMoneyWhole } from "../../lib/formatMoney";
import type { BankTransaction } from "../../types/bank";
import { Card, FilterChips } from "../ui";
import { TransactionRow } from "./TransactionRow";

const BATCH_SIZE = 10;

type TransactionFilter = "all" | "out" | "in" | "bills";

const FILTERS: { value: TransactionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "out", label: "Money out" },
  { value: "in", label: "Money in" },
  { value: "bills", label: "Bill payments" },
];

interface TransactionsCardProps {
  transactions: BankTransaction[];
  billNames: Map<string, string>;
  loading: boolean;
  error: string | null;
  hasBanks: boolean;
}

export function TransactionsCard({
  transactions,
  billNames,
  loading,
  error,
  hasBanks,
}: TransactionsCardProps) {
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  // This month's totals. "Out" is real spending only (not transfers between
  // your own accounts); "in" is everything that arrived.
  const month = currentMonthPrefix();
  const thisMonth = transactions.filter((t) => t.date.startsWith(month));
  const moneyOut = thisMonth.filter((t) => t.countsAsSpending).reduce((sum, t) => sum + t.amount, 0);
  const moneyIn = thisMonth.filter((t) => t.amount < 0).reduce((sum, t) => sum - t.amount, 0);

  const filtered = transactions.filter((t) => {
    if (filter === "out") return t.amount > 0;
    if (filter === "in") return t.amount < 0;
    if (filter === "bills") return billNames.has(t.id);
    return true;
  });
  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  function handleFilter(next: TransactionFilter) {
    setFilter(next);
    setVisibleCount(BATCH_SIZE); // a new filter starts from the top
  }

  return (
    <Card
      title="Recent transactions"
      wide
      aside={
        transactions.length > 0 && (
          <span className="card__total">
            <strong>{`${formatMoneyWhole(moneyOut)} out`}</strong>
            <span className="transactions__in">{`${formatMoneyWhole(moneyIn)} in this month`}</span>
          </span>
        )
      }
    >
      {error && <p className="error">{error}</p>}

      {transactions.length > 0 && (
        <FilterChips
          options={FILTERS}
          value={filter}
          onChange={handleFilter}
          label="Filter transactions"
        />
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : transactions.length === 0 ? (
        <p className="muted">
          {hasBanks
            ? "No transactions yet. A newly connected bank can take a minute to send them - refresh shortly."
            : "Connect a bank to see your transactions here."}
        </p>
      ) : filtered.length === 0 ? (
        <p className="muted">Nothing matches that filter.</p>
      ) : (
        <ul className="transaction-list">
          {visible.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              billName={billNames.get(transaction.id)}
            />
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <button
          type="button"
          className="button button--quiet button--block"
          onClick={() => setVisibleCount((count) => count + BATCH_SIZE)}
        >
          {`Show ${Math.min(BATCH_SIZE, remaining)} more`}
        </button>
      )}
    </Card>
  );
}

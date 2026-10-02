// src/components/transactions/TransactionsCard.tsx
// What: the recent-transactions section of the dashboard - a list across
// all connected banks, newest first, showing a batch at a time with a
// button to show more. Holds no data of its own; everything comes from the
// useTransactions hook via the dashboard.
//
// Props:
//   transactions - recent transactions, newest first
//   loading      - true while they are being fetched
//   error        - a message to show if something failed, or null
//   hasBanks     - whether any bank is connected (changes the empty message)

import { useState } from "react";
import type { BankTransaction } from "../../types/bank";
import { Card } from "../ui";
import { TransactionRow } from "./TransactionRow";

const BATCH_SIZE = 10;

interface TransactionsCardProps {
  transactions: BankTransaction[];
  loading: boolean;
  error: string | null;
  hasBanks: boolean;
}

export function TransactionsCard({ transactions, loading, error, hasBanks }: TransactionsCardProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const visible = transactions.slice(0, visibleCount);
  const remaining = transactions.length - visible.length;

  return (
    <Card
      title="Recent transactions"
      wide
      aside={
        transactions.length > 0 && (
          <span className="card__count">{`${transactions.length} since last month`}</span>
        )
      }
    >
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : transactions.length === 0 ? (
        <p className="muted">
          {hasBanks
            ? "No transactions yet. A newly connected bank can take a minute to send them - refresh shortly."
            : "Connect a bank to see your transactions here."}
        </p>
      ) : (
        <ul className="transaction-list">
          {visible.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
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

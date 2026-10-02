// src/components/transactions/TransactionRow.tsx
// What: one transaction on a line - the date, where the money went (or
// came from), which bank, and the amount.
//
// Props:
//   transaction - the transaction to show

import { formatMoney } from "../../lib/formatMoney";
import type { BankTransaction } from "../../types/bank";

interface TransactionRowProps {
  transaction: BankTransaction;
}

// "2026-10-02" -> "Oct 2". Built from the parts rather than `new Date(text)`
// because that would read the date as UTC and can show the day before in
// US time zones.
function formatDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  // The bank reports money out as positive. On screen, money out is shown
  // plain and money in gets a "+", which is how statements usually read.
  const moneyIn = transaction.amount < 0;
  const amount = formatMoney(Math.abs(transaction.amount), transaction.currency);

  return (
    <li className="transaction-row">
      <span className="transaction-row__date">{formatDay(transaction.date)}</span>
      <div className="transaction-row__text">
        <span className="transaction-row__name">{transaction.name}</span>
        <span className="transaction-row__details">
          {transaction.institutionName}
          {transaction.pending && " · Pending"}
        </span>
      </div>
      <span className={`transaction-row__amount${moneyIn ? " transaction-row__amount--in" : ""}`}>
        {moneyIn ? `+${amount}` : amount}
      </span>
    </li>
  );
}

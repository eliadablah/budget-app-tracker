// src/components/bills/BillSuggestionBox.tsx
// What: the "Is this a bill payment?" box. Shown when a bank transaction
// looks like a payment toward one of your bills (lib/matchBillPayments.ts).
// Nothing is counted until you click the button.
//
// Props:
//   suggestion - the transaction and the bill it seems to belong to
//   onAccept   - called when "Count toward ..." is clicked
//   onDismiss  - called when "Not a bill" is clicked

import { useState } from "react";
import { formatMoney } from "../../lib/formatMoney";
import { formatShortDate } from "../../lib/localDateTime";
import type { BillSuggestion } from "../../lib/matchBillPayments";

interface BillSuggestionBoxProps {
  suggestion: BillSuggestion;
  onAccept: (suggestion: BillSuggestion) => Promise<boolean>;
  onDismiss: (suggestion: BillSuggestion) => Promise<boolean>;
}

export function BillSuggestionBox({ suggestion, onAccept, onDismiss }: BillSuggestionBoxProps) {
  const [busy, setBusy] = useState(false);
  const { transaction, bill } = suggestion;

  async function run(action: (s: BillSuggestion) => Promise<boolean>) {
    setBusy(true);
    await action(suggestion);
    setBusy(false);
  }

  return (
    <div className="suggestion">
      <strong>Is this a bill payment?</strong>
      <span className="suggestion__details">
        {`"${transaction.name}" ${formatMoney(transaction.amount, transaction.currency)} · `}
        {/* Transaction dates are plain "YYYY-MM-DD"; noon avoids the date
            slipping a day in US time zones. */}
        {formatShortDate(`${transaction.date}T12:00:00`)}
        {` · ${transaction.institutionName}`}
      </span>
      <div className="suggestion__actions">
        <button
          type="button"
          className="button button--primary button--small"
          disabled={busy}
          onClick={() => run(onAccept)}
        >
          {`Count toward ${bill.name}`}
        </button>
        <button
          type="button"
          className="button button--quiet button--small"
          disabled={busy}
          onClick={() => run(onDismiss)}
        >
          Not a bill
        </button>
      </div>
    </div>
  );
}

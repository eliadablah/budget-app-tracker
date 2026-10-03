// src/components/bills/BillsCard.tsx
// What: the bills section of the dashboard - what's still owed this month,
// any "is this a bill payment?" suggestions, the list of bills, and the
// button that opens the add-bill form. Holds no data of its own; everything
// comes from the useBills hook via the dashboard.
//
// Props:
//   bills       - every bill, soonest due first
//   suggestions - bank transactions that look like bill payments
//   loading     - true while the bills are first being fetched
//   error       - a message to show if something failed, or null
//   onAdd       - called with a new bill's values
//   onEdit      - called with a bill and its new values
//   onDelete    - called with the bill to delete
//   onPay       - called with a bill, an amount and (for a bank match) the
//                 transaction id
//   onDismiss   - called with a transaction id to stop suggesting it

import { useState } from "react";
import { owedThisMonth } from "../../lib/billMath";
import { formatMoneyWhole } from "../../lib/formatMoney";
import type { BillSuggestion } from "../../lib/matchBillPayments";
import type { Bill, BillInput } from "../../types/bill";
import { Card } from "../ui";
import { BillForm } from "./BillForm";
import { BillRow } from "./BillRow";
import { BillSuggestionBox } from "./BillSuggestionBox";

// Paid bills stay on the list for a while, then drop off so it doesn't grow forever.
const KEEP_PAID_DAYS = 14;

interface BillsCardProps {
  bills: Bill[];
  suggestions: BillSuggestion[];
  loading: boolean;
  error: string | null;
  onAdd: (input: BillInput) => Promise<boolean>;
  onEdit: (bill: Bill, input: BillInput) => Promise<boolean>;
  onDelete: (bill: Bill) => Promise<boolean>;
  onPay: (bill: Bill, amount: number, transactionId?: string) => Promise<boolean>;
  onDismiss: (transactionId: string) => Promise<boolean>;
}

export function BillsCard({
  bills,
  suggestions,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
  onPay,
  onDismiss,
}: BillsCardProps) {
  const [adding, setAdding] = useState(false);

  const cutoff = Date.now() - KEEP_PAID_DAYS * 24 * 60 * 60 * 1000;
  const unpaid = bills.filter((b) => !b.paidAt);
  const recentlyPaid = bills.filter((b) => b.paidAt && new Date(b.paidAt).getTime() > cutoff);
  const visible = [...unpaid, ...recentlyPaid];

  // Deleting can't be undone, so it asks first.
  function handleDelete(bill: Bill) {
    if (window.confirm(`Delete the bill "${bill.name}"?`)) void onDelete(bill);
  }

  return (
    <Card
      title="Upcoming bills"
      aside={
        unpaid.length > 0 && (
          <span className="card__total">
            <strong>{formatMoneyWhole(owedThisMonth(bills))}</strong>
            <span>still owed this month</span>
          </span>
        )
      }
    >
      {error && <p className="error">{error}</p>}

      {suggestions.map((suggestion) => (
        <BillSuggestionBox
          key={suggestion.transaction.id}
          suggestion={suggestion}
          onAccept={(s) => onPay(s.bill, s.transaction.amount, s.transaction.id)}
          onDismiss={(s) => onDismiss(s.transaction.id)}
        />
      ))}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="empty-state">No bills yet. Add your first one below.</p>
      ) : (
        <ul className="bill-list">
          {visible.map((bill) => (
            <BillRow key={bill.sk} bill={bill} onPay={onPay} onEdit={onEdit} onDelete={handleDelete} />
          ))}
        </ul>
      )}

      {adding ? (
        <BillForm onSave={onAdd} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          className="button button--primary button--block"
          onClick={() => setAdding(true)}
        >
          + Add bill
        </button>
      )}
    </Card>
  );
}

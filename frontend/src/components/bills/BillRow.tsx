// src/components/bills/BillRow.tsx
// What: one bill in the list - its name and status, when it's due, what's
// left, the payments made so far, and the buttons to pay, edit or delete it.
//
// Props:
//   bill     - the bill to show
//   onPay    - called with an amount to record a payment
//   onEdit   - called with new values when the edit form is saved
//   onDelete - called when the delete button is clicked

import { useState } from "react";
import { billStatus, percentPaid, remaining, type BillStatus } from "../../lib/billMath";
import { formatMoney } from "../../lib/formatMoney";
import { formatDue, formatShortDate } from "../../lib/localDateTime";
import type { Bill, BillInput } from "../../types/bill";
import { TrashIcon } from "../ui";
import { BillForm } from "./BillForm";
import { BillPaymentForm } from "./BillPaymentForm";

interface BillRowProps {
  bill: Bill;
  onPay: (bill: Bill, amount: number) => Promise<boolean>;
  onEdit: (bill: Bill, input: BillInput) => Promise<boolean>;
  onDelete: (bill: Bill) => void;
}

// The little colored tag next to the name. "upcoming" needs no tag.
const STATUS_LABELS: Record<BillStatus, string | null> = {
  paid: "Paid",
  overdue: "Overdue",
  soon: "Due soon",
  partly: "Partly paid",
  "needs-amount": "Enter amount",
  upcoming: null,
};

const REPEAT_LABELS = {
  none: null,
  monthly_fixed: "auto-repeats monthly",
  monthly_variable: "monthly, amount changes",
};

export function BillRow({ bill, onPay, onEdit, onDelete }: BillRowProps) {
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);

  const status = billStatus(bill);
  const left = remaining(bill);
  const statusLabel = STATUS_LABELS[status];
  const repeatLabel = REPEAT_LABELS[bill.repeat];
  const partlyPaid = !bill.paidAt && bill.payments.length > 0;

  if (editing) {
    return (
      <li className="bill">
        <BillForm bill={bill} onSave={(input) => onEdit(bill, input)} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={`bill${bill.paidAt ? " bill--paid" : ""}`}>
      <div className="bill__main">
        <div className="bill__text">
          <span className="bill__name">{bill.name}</span>
          {statusLabel && <span className={`pill pill--${status}`}>{statusLabel}</span>}
          <span className="bill__meta">
            {bill.paidAt ? `Paid ${formatShortDate(bill.paidAt)}` : formatDue(bill.dueAt)}
            {repeatLabel && ` · ${repeatLabel}`}
            {bill.nextReminderAt && (
              <span title="A reminder email is scheduled" aria-label="Reminder scheduled">
                {" 🔔"}
              </span>
            )}
          </span>
        </div>
        <div className="bill__amount">
          {left === null ? (
            <span className="bill__left">No amount yet</span>
          ) : partlyPaid ? (
            <>
              <span>{`${formatMoney(left)} left`}</span>
              <span className="bill__left">{`of ${formatMoney(bill.amount)}`}</span>
            </>
          ) : (
            <span>{formatMoney(bill.amount)}</span>
          )}
        </div>
      </div>

      {/* The bar fills up as payments come in. */}
      {partlyPaid && (
        <div className="progress progress--thin">
          <div className="progress__fill" style={{ width: `${percentPaid(bill)}%` }} />
        </div>
      )}

      {bill.payments.length > 0 && !bill.paidAt && (
        <ul className="bill__payments">
          {bill.payments.map((p) => (
            <li key={p.id}>
              <span>{`Paid ${formatMoney(p.amount)} · ${formatShortDate(p.paidAt)}`}</span>
              <span>{p.source === "bank" ? "from your bank" : "entered by hand"}</span>
            </li>
          ))}
        </ul>
      )}

      {paying && left !== null && left > 0 && (
        <BillPaymentForm
          left={left}
          onPay={async (amount) => {
            const saved = await onPay(bill, amount);
            if (saved) setPaying(false);
            return saved;
          }}
        />
      )}

      <div className="bill__actions">
        {!bill.paidAt && left !== null && left > 0 && (
          <>
            <button
              type="button"
              className="button button--quiet button--small"
              onClick={() => setPaying((open) => !open)}
            >
              {paying ? "Close" : "Record payment"}
            </button>
            <button
              type="button"
              className="button button--quiet button--small"
              onClick={() => onPay(bill, left)}
            >
              Pay in full
            </button>
          </>
        )}
        {!bill.paidAt && (
          <button
            type="button"
            className="button button--quiet button--small"
            onClick={() => setEditing(true)}
          >
            {left === null ? "Enter amount" : "Edit"}
          </button>
        )}
        <button
          type="button"
          className="icon-button icon-button--small"
          aria-label={`Delete ${bill.name}`}
          onClick={() => onDelete(bill)}
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}

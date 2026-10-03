// src/components/bills/BillForm.tsx
// What: the form for adding a bill or editing one - name, amount, how it
// repeats, when it's due, and whether to email a reminder.
//
// Props:
//   bill     - the bill being edited, or undefined when adding a new one
//   onSave   - called with the form's values; resolves true when saved
//   onCancel - called when Cancel is clicked

import { useState, type FormEvent } from "react";
import { fromLocalInput, toLocalInput, tomorrowMorning } from "../../lib/localDateTime";
import type { Bill, BillInput, BillRepeat } from "../../types/bill";

interface BillFormProps {
  bill?: Bill;
  onSave: (input: BillInput) => Promise<boolean>;
  onCancel: () => void;
}

export function BillForm({ bill, onSave, onCancel }: BillFormProps) {
  const [name, setName] = useState(bill?.name ?? "");
  const [amount, setAmount] = useState(bill?.amount != null ? String(bill.amount) : "");
  const [repeat, setRepeat] = useState<BillRepeat>(bill?.repeat ?? "none");
  const [dueAt, setDueAt] = useState(bill ? toLocalInput(bill.dueAt) : tomorrowMorning());
  const [remind, setRemind] = useState(bill?.remind ?? true);
  const [remindDayBefore, setRemindDayBefore] = useState(bill?.remindDayBefore ?? false);
  const [saving, setSaving] = useState(false);

  // A bill whose amount changes can be saved before the amount is known.
  const amountOptional = repeat === "monthly_variable";
  const parsedAmount = amount.trim() === "" ? null : Number(amount);
  const amountOk =
    parsedAmount === null ? amountOptional : Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSave = name.trim() !== "" && amountOk && dueAt !== "" && !saving;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const saved = await onSave({
      name: name.trim(),
      amount: parsedAmount,
      dueAt: fromLocalInput(dueAt),
      repeat,
      remind,
      remindDayBefore: remind && remindDayBefore,
    });
    setSaving(false);
    if (saved) onCancel(); // close the form
  }

  return (
    <form className="bill-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Bill name (e.g. Rent)"
        aria-label="Bill name"
        maxLength={80}
      />
      <div className="bill-form__row">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={amountOptional ? "Amount $ (if known)" : "Amount $"}
          aria-label="Amount in dollars"
          min="0.01"
          step="0.01"
          inputMode="decimal"
        />
        <select
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as BillRepeat)}
          aria-label="How this bill repeats"
        >
          <option value="none">Doesn't repeat</option>
          <option value="monthly_fixed">Monthly, same amount</option>
          <option value="monthly_variable">Monthly, amount changes</option>
        </select>
      </div>
      <input
        type="datetime-local"
        value={dueAt}
        onChange={(e) => setDueAt(e.target.value)}
        aria-label="Due date and time"
      />
      <label className="reminder-fields__toggle">
        <input
          type="checkbox"
          className="check"
          checked={remind}
          onChange={(e) => setRemind(e.target.checked)}
        />
        Email me a reminder
      </label>
      {remind && (
        <label className="reminder-fields__toggle">
          <input
            type="checkbox"
            className="check"
            checked={remindDayBefore}
            onChange={(e) => setRemindDayBefore(e.target.checked)}
          />
          Also the day before
        </label>
      )}
      <div className="bill-form__row">
        <button type="submit" className="button button--primary" disabled={!canSave}>
          {saving ? "Saving…" : bill ? "Save changes" : "Save bill"}
        </button>
        <button type="button" className="button button--quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

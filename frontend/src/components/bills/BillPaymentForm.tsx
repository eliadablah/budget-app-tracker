// src/components/bills/BillPaymentForm.tsx
// What: the small "how much did you pay?" box under a bill. The amount can't
// be more than what's left on the bill.
//
// Props:
//   left  - what's still owed on the bill
//   onPay - called with the amount; resolves true when saved

import { useState, type FormEvent } from "react";
import { formatMoney } from "../../lib/formatMoney";

interface BillPaymentFormProps {
  left: number;
  onPay: (amount: number) => Promise<boolean>;
}

export function BillPaymentForm({ left, onPay }: BillPaymentFormProps) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const value = Number(amount);
  const valid = amount.trim() !== "" && Number.isFinite(value) && value > 0 && value <= left;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    const saved = await onPay(value);
    setSaving(false);
    if (saved) setAmount("");
  }

  return (
    <form className="pay-form" onSubmit={handleSubmit}>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={`Amount paid (up to ${formatMoney(left)})`}
        aria-label="Amount paid in dollars"
        min="0.01"
        max={left}
        step="0.01"
        inputMode="decimal"
      />
      <button type="submit" className="button button--primary" disabled={!valid || saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

// src/hooks/useBills.ts
// What: owns everything about the bills' data - loading them, adding,
// editing, deleting, recording payments, and dismissing payment suggestions.
//
// Manages: the bill list, the dismissed-suggestion ids, a loading flag, and
// the latest error message.
// Returns: { bills, dismissedIds, loading, error,
//            addBill, editBill, removeBill, pay, dismiss }.
// Every action waits for the server (no optimistic updates): money numbers
// should only change on screen once they've really been saved.

import { useCallback, useEffect, useState } from "react";
import {
  createBill,
  deleteBill,
  dismissBillSuggestion,
  getBills,
  payBill,
  UnauthorizedError,
  updateBill,
} from "../lib/api";
import type { Bill, BillInput } from "../types/bill";

function byDueDate(a: Bill, b: Bill): number {
  return a.dueAt.localeCompare(b.dueAt);
}

export function useBills(onSessionExpired: () => void) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof UnauthorizedError) {
        onSessionExpired();
        return;
      }
      setError(fallback);
    },
    [onSessionExpired]
  );

  useEffect(() => {
    getBills()
      .then((result) => {
        setBills(result.bills);
        setDismissedIds(result.dismissedTransactionIds);
      })
      .catch((err) => handleError(err, "Couldn't load your bills. Refresh to try again."))
      .finally(() => setLoading(false));
  }, [handleError]);

  // Runs one action with errors handled the same way. Resolves true when it
  // worked, so a form knows whether to clear itself.
  async function run(action: () => Promise<void>, fallback: string): Promise<boolean> {
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      handleError(err, fallback);
      return false;
    }
  }

  const addBill = (input: BillInput) =>
    run(async () => {
      const bill = await createBill(input);
      setBills((prev) => [...prev, bill].sort(byDueDate));
    }, "Couldn't add that bill. Try again.");

  const editBill = (bill: Bill, input: BillInput) =>
    run(async () => {
      const updated = await updateBill(bill.sk, input);
      // The key changes when the due date does, so match on the OLD key.
      setBills((prev) => prev.map((b) => (b.sk === bill.sk ? updated : b)).sort(byDueDate));
    }, "Couldn't save that bill. Try again.");

  const removeBill = (bill: Bill) =>
    run(async () => {
      await deleteBill(bill.sk);
      setBills((prev) => prev.filter((b) => b.sk !== bill.sk));
    }, "Couldn't delete that bill. Try again.");

  const pay = (bill: Bill, amount: number, transactionId?: string) =>
    run(async () => {
      const result = await payBill(bill.sk, amount, transactionId);
      setBills((prev) => {
        const next = prev.map((b) => (b.sk === bill.sk ? result.bill : b));
        // A repeating bill that was just paid off brings next month's with it.
        if (result.nextBill) next.push(result.nextBill);
        return next.sort(byDueDate);
      });
    }, "Couldn't record that payment. Check the amount and try again.");

  const dismiss = (transactionId: string) =>
    run(async () => {
      await dismissBillSuggestion(transactionId);
      setDismissedIds((prev) => [...prev, transactionId]);
    }, "Couldn't dismiss that suggestion. Try again.");

  return { bills, dismissedIds, loading, error, addBill, editBill, removeBill, pay, dismiss };
}

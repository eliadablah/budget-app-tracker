// src/hooks/useTransactions.ts
// What: loads recent transactions from every connected bank.
//
// Manages: the transaction list, a loading flag, and the latest error
// message.
// Returns: { transactions, loading, error }.
// bankCount is how many banks are connected - when it changes (a bank was
// added or removed) the transactions are fetched again, and with no banks
// there is nothing to fetch at all.
// onSessionExpired is called when the API says the login is no longer valid.

import { useEffect, useState } from "react";
import { getTransactions, UnauthorizedError } from "../lib/api";
import type { BankTransaction } from "../types/bank";

export function useTransactions(bankCount: number, onSessionExpired: () => void) {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bankCount === 0) {
      setTransactions([]);
      setError(null);
      return;
    }

    // If the bank list changes again before this request finishes, its
    // result is out of date and must be ignored.
    let cancelled = false;
    setLoading(true);
    setError(null);

    getTransactions()
      .then((result) => {
        if (cancelled) return;
        setTransactions(result.transactions);
        if (result.failedBanks.length > 0) {
          setError(`Couldn't load transactions from ${result.failedBanks.join(", ")}.`);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof UnauthorizedError) {
          onSessionExpired();
          return;
        }
        setError("Couldn't load your transactions. Refresh to try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bankCount, onSessionExpired]);

  return { transactions, loading, error };
}

// src/hooks/useBudget.ts
// What: owns the monthly budget limits - loading them and saving changes.
// (The spending side comes from useTransactions; lib/budgetMath.ts puts the
// two together.)
//
// Manages: the limits (category -> dollars), a loading flag, a saving flag,
// and the latest error message.
// Returns: { limits, loading, saving, error, saveLimits }.

import { useCallback, useEffect, useState } from "react";
import { getBudgetLimits, saveBudgetLimits, UnauthorizedError } from "../lib/api";

export function useBudget(onSessionExpired: () => void) {
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    getBudgetLimits()
      .then(setLimits)
      .catch((err) => handleError(err, "Couldn't load your budget. Refresh to try again."))
      .finally(() => setLoading(false));
  }, [handleError]);

  // Resolves true when saved, so the editor knows it can close.
  async function saveLimits(next: Record<string, number>): Promise<boolean> {
    setError(null);
    setSaving(true);
    try {
      setLimits(await saveBudgetLimits(next));
      return true;
    } catch (err) {
      handleError(err, "Couldn't save your budget. Try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { limits, loading, saving, error, saveLimits };
}

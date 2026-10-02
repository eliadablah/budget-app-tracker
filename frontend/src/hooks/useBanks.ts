// src/hooks/useBanks.ts
// What: owns everything about connected banks - loading them with their
// accounts and balances, connecting a new one, and removing one.
//
// Manages: the list of banks, a loading flag, a "connecting" flag (true
// while the bank pop-up flow is in progress), and the latest error message.
// Returns: { banks, loading, connecting, error, connectBank, removeBank }.
// onSessionExpired is called when the API says the login is no longer valid.

import { useCallback, useEffect, useState } from "react";
import {
  connectBank as apiConnectBank,
  createLinkToken,
  getBanks,
  removeBank as apiRemoveBank,
  UnauthorizedError,
} from "../lib/api";
import { openPlaidLink } from "../lib/plaidLink";
import type { Bank } from "../types/bank";

export function useBanks(onSessionExpired: () => void) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
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
    getBanks()
      .then(setBanks)
      .catch((err) => handleError(err, "Couldn't load your accounts. Refresh to try again."))
      .finally(() => setLoading(false));
  }, [handleError]);

  // The whole connect flow: ask the backend for a pop-up token, open
  // Plaid's pop-up, and - if a bank was actually connected - tell the
  // backend and reload the list so the new accounts appear.
  async function connectBank() {
    setError(null);
    setConnecting(true);
    try {
      const linkToken = await createLinkToken();
      const result = await openPlaidLink(linkToken);
      if (!result) return; // pop-up closed without connecting anything
      await apiConnectBank(result.publicToken, result.institutionName);
      setBanks(await getBanks());
    } catch (err) {
      handleError(err, "Couldn't connect that bank. Try again.");
    } finally {
      setConnecting(false);
    }
  }

  async function removeBank(bank: Bank) {
    setError(null);
    try {
      await apiRemoveBank(bank.id);
      setBanks((prev) => prev.filter((b) => b.id !== bank.id));
    } catch (err) {
      handleError(err, "Couldn't remove that bank. Try again.");
    }
  }

  return { banks, loading, connecting, error, connectBank, removeBank };
}

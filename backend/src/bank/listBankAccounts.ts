// src/bank/listBankAccounts.ts
// What: returns every connected bank with its accounts and balances. Looks
// up the user's connections, then asks Plaid about each one.

import { plaidRequest } from "../lib/plaid";
import type { BankAccount, BankConnection, BankWithAccounts } from "../types/bank";
import { getBankToken } from "./bankTokenStore";
import { listBankConnections } from "./listBankConnections";

interface PlaidAccount {
  account_id: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  balances: { current: number | null; iso_currency_code: string | null };
}

interface AccountsResponse {
  accounts: PlaidAccount[];
}

async function fetchAccounts(userId: string, connection: BankConnection): Promise<BankAccount[]> {
  const accessToken = await getBankToken(userId, connection.itemId);
  const result = await plaidRequest<AccountsResponse>("/accounts/get", {
    access_token: accessToken,
  });

  return result.accounts.map((a) => ({
    id: a.account_id,
    name: a.name,
    mask: a.mask,
    type: a.type,
    subtype: a.subtype,
    balance: a.balances.current,
    currency: a.balances.iso_currency_code,
  }));
}

export async function listBankAccounts(userId: string): Promise<BankWithAccounts[]> {
  const connections = await listBankConnections(userId);

  // All banks are asked at the same time, and one bank failing (say, its
  // login expired) must not hide the others - so each failure is caught
  // here and reported on that bank alone.
  return Promise.all(
    connections.map(async (connection): Promise<BankWithAccounts> => {
      const base = { id: connection.sk, institutionName: connection.institutionName };
      try {
        return { ...base, accounts: await fetchAccounts(userId, connection) };
      } catch (err) {
        console.error(`Failed to fetch accounts for ${connection.sk}:`, err);
        return { ...base, accounts: [], error: "Couldn't load this bank's accounts." };
      }
    })
  );
}

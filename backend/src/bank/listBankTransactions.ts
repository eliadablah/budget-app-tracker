// src/bank/listBankTransactions.ts
// What: returns recent transactions from every connected bank, newest
// first. "Recent" = from the 1st of last month through today, which always
// covers the whole current month (for "spent this month") plus enough
// history to make the list useful early in a month.

import { plaidRequest } from "../lib/plaid";
import type { BankConnection, BankTransaction, BankTransactionsResult } from "../types/bank";
import { getBankToken } from "./bankTokenStore";
import { listBankConnections } from "./listBankConnections";

// Plaid returns at most 500 transactions per request.
const PAGE_SIZE = 500;

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  date: string;
  name: string;
  merchant_name: string | null;
  amount: number;
  iso_currency_code: string | null;
  pending: boolean;
  personal_finance_category: { primary: string; detailed: string } | null;
}

interface TransactionsResponse {
  transactions: PlaidTransaction[];
  total_transactions: number;
}

// Plaid wants dates as "YYYY-MM-DD".
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function countsAsSpending(t: PlaidTransaction): boolean {
  if (t.amount <= 0) return false;
  const category = t.personal_finance_category;
  if (category?.primary === "TRANSFER_OUT") return false;
  if (category?.detailed === "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT") return false;
  return true;
}

async function fetchTransactions(
  userId: string,
  connection: BankConnection,
  startDate: string,
  endDate: string
): Promise<BankTransaction[]> {
  const accessToken = await getBankToken(userId, connection.itemId);
  const all: PlaidTransaction[] = [];

  // Keep asking for the next page until everything in the date range has
  // been collected.
  for (;;) {
    const page = await plaidRequest<TransactionsResponse>("/transactions/get", {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count: PAGE_SIZE, offset: all.length },
    });
    all.push(...page.transactions);
    if (page.transactions.length === 0 || all.length >= page.total_transactions) break;
  }

  return all.map((t) => ({
    id: t.transaction_id,
    date: t.date,
    name: t.merchant_name ?? t.name,
    amount: t.amount,
    currency: t.iso_currency_code,
    pending: t.pending,
    category: t.personal_finance_category?.primary ?? null,
    countsAsSpending: countsAsSpending(t),
    accountId: t.account_id,
    institutionName: connection.institutionName,
  }));
}

export async function listBankTransactions(userId: string): Promise<BankTransactionsResult> {
  const connections = await listBankConnections(userId);

  const now = new Date();
  const startDate = toDateString(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
  // One day past "today" in UTC, so a purchase made this evening in a US
  // time zone (already tomorrow in UTC terms, or not) is never cut off.
  const endDate = toDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const failedBanks: string[] = [];

  // Same approach as accounts: all banks at once, and one failing bank is
  // reported by name instead of hiding the rest.
  const perBank = await Promise.all(
    connections.map(async (connection) => {
      try {
        return await fetchTransactions(userId, connection, startDate, endDate);
      } catch (err) {
        console.error(`Failed to fetch transactions for ${connection.sk}:`, err);
        failedBanks.push(connection.institutionName);
        return [];
      }
    })
  );

  const transactions = perBank.flat().sort((a, b) => b.date.localeCompare(a.date));

  return { transactions, failedBanks };
}

// src/types/bank.ts
// What: the shapes used by the bank feature - what is stored in DynamoDB
// for each connected bank, and what the API sends to the frontend.

// One connected bank, as stored in the table. The bank's access token is
// deliberately NOT here - it lives encrypted in Parameter Store.
export interface BankConnection {
  pk: string; // "USER#<id>"
  sk: string; // "BANK#<plaid item id>"
  itemId: string; // Plaid's id for this connection
  institutionName: string;
  createdAt: string; // ISO 8601 timestamp
}

export interface BankAccount {
  id: string;
  name: string;
  mask: string | null; // last few digits of the account number
  type: string; // "depository", "credit", "loan", "investment"...
  subtype: string | null; // "checking", "savings", "credit card"...
  balance: number | null;
  currency: string | null;
}

// One line on a bank statement, as returned by GET /bank/transactions.
export interface BankTransaction {
  id: string;
  date: string; // "YYYY-MM-DD"
  name: string; // the merchant if the bank knows it, else the raw description
  // Plaid's convention, kept as-is: POSITIVE = money leaving the account
  // (a purchase), NEGATIVE = money coming in (a paycheck, a refund).
  amount: number;
  currency: string | null;
  pending: boolean;
  category: string | null; // Plaid's broad category, e.g. "FOOD_AND_DRINK"
  // True for purchases and bills; false for money in, transfers between
  // your own accounts, and credit card payments (which would otherwise be
  // counted twice - once on the card, once when the card is paid off).
  countsAsSpending: boolean;
  accountId: string;
  institutionName: string;
}

// The reply from GET /bank/transactions. failedBanks names any bank whose
// transactions couldn't be fetched, so the others can still be shown.
export interface BankTransactionsResult {
  transactions: BankTransaction[];
  failedBanks: string[];
}

// One bank and its accounts, as returned by GET /bank/accounts. If the
// bank's accounts couldn't be fetched, accounts is empty and error says so.
export interface BankWithAccounts {
  id: string; // the connection's sk, used to remove it
  institutionName: string;
  accounts: BankAccount[];
  error?: string;
}

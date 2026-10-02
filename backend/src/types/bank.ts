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

// One bank and its accounts, as returned by GET /bank/accounts. If the
// bank's accounts couldn't be fetched, accounts is empty and error says so.
export interface BankWithAccounts {
  id: string; // the connection's sk, used to remove it
  institutionName: string;
  accounts: BankAccount[];
  error?: string;
}

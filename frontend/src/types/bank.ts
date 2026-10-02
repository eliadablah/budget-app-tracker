// src/types/bank.ts
// What: the shape of connected banks and their accounts as the backend
// returns them. Mirrors backend/src/types/bank.ts on purpose.

export interface BankAccount {
  id: string;
  name: string;
  mask: string | null; // last few digits of the account number
  type: string; // "depository", "credit", "loan", "investment"...
  subtype: string | null; // "checking", "savings", "credit card"...
  balance: number | null;
  currency: string | null;
}

export interface BankTransaction {
  id: string;
  date: string; // "YYYY-MM-DD"
  name: string;
  // POSITIVE = money leaving the account, NEGATIVE = money coming in.
  amount: number;
  currency: string | null;
  pending: boolean;
  category: string | null;
  // False for money in, transfers between your own accounts, and credit
  // card payments - so "spent this month" doesn't count those.
  countsAsSpending: boolean;
  accountId: string;
  institutionName: string;
}

export interface BankTransactionsResult {
  transactions: BankTransaction[];
  failedBanks: string[]; // banks whose transactions couldn't be loaded
}

export interface Bank {
  id: string;
  institutionName: string;
  accounts: BankAccount[];
  error?: string; // set when this bank's accounts couldn't be loaded
}

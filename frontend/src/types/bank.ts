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

export interface Bank {
  id: string;
  institutionName: string;
  accounts: BankAccount[];
  error?: string; // set when this bank's accounts couldn't be loaded
}

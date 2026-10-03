// src/types/bill.ts
// What: bills and their payments as the backend returns them. Mirrors
// backend/src/types/bill.ts on purpose.

// none             - a one-off bill
// monthly_fixed    - same amount every month; next month's is added for you
// monthly_variable - amount changes; next month's is added with no amount
export type BillRepeat = "none" | "monthly_fixed" | "monthly_variable";

export interface BillPayment {
  id: string;
  amount: number;
  paidAt: string;
  source: "manual" | "bank";
  transactionId?: string;
}

export interface Bill {
  pk: string;
  sk: string;
  seriesId: string;
  name: string;
  amount: number | null; // null = amount not entered yet
  dueAt: string; // ISO 8601
  repeat: BillRepeat;
  payments: BillPayment[];
  paidAt?: string;
  createdAt: string;
  remind: boolean;
  remindDayBefore?: boolean;
  nextReminderAt?: string; // present while a reminder email is still waiting
}

// What the add/edit form sends.
export interface BillInput {
  name: string;
  amount: number | null;
  dueAt: string;
  repeat: BillRepeat;
  remind: boolean;
  remindDayBefore: boolean;
}

export interface BillsResult {
  bills: Bill[];
  dismissedTransactionIds: string[];
}

export interface PaymentResult {
  bill: Bill;
  nextBill?: Bill; // next month's bill, when a repeating bill was just paid off
}

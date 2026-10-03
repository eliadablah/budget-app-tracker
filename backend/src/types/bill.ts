// src/types/bill.ts
// What: the shape of a bill and its payments, shared by every file that
// reads or writes one.
//
// A bill can be paid in parts: each payment is kept, and what's left is the
// amount minus the payments. When it's fully paid and it repeats, the next
// month's bill is created automatically (see recordBillPayment.ts).

// none             - a one-off bill
// monthly_fixed    - same amount every month (rent): next month's bill is
//                    created with the same amount
// monthly_variable - the amount changes (phone): next month's bill is
//                    created with no amount, to be filled in when known
export type BillRepeat = "none" | "monthly_fixed" | "monthly_variable";

export interface BillPayment {
  id: string;
  amount: number; // dollars
  paidAt: string; // ISO 8601
  source: "manual" | "bank";
  transactionId?: string; // set when the payment came from a matched bank transaction
}

export interface Bill {
  pk: string; // "USER#<id>"
  // "BILL#<seriesId>#<due date YYYY-MM-DD>": every month of a repeating
  // bill shares one seriesId, and the date makes each month's sk unique.
  sk: string;
  seriesId: string;
  name: string;
  amount: number | null; // null = "amount changes, not entered yet"
  dueAt: string; // ISO 8601 UTC
  repeat: BillRepeat;
  payments: BillPayment[];
  paidAt?: string; // set once the payments cover the amount
  createdAt: string;

  // --- Reminder: same fields as a to-do, so the same sender handles both ---
  remind: boolean;
  remindAt?: string; // the due time
  remindDayBefore?: boolean;
  reminderSentAt?: string;
  reminderStatus?: "PENDING";
  nextReminderAt?: string;
}

// What the browser sends to create or edit a bill.
export interface BillInput {
  name: string;
  amount: number | null;
  dueAt: string;
  repeat: BillRepeat;
  remind: boolean;
  remindDayBefore: boolean;
}

// GET /bills: the bills, plus bank transactions the user said are NOT bill
// payments, so they aren't suggested again.
export interface BillsResult {
  bills: Bill[];
  dismissedTransactionIds: string[];
}

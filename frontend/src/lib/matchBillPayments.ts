// src/lib/matchBillPayments.ts
// What: spots bank transactions that LOOK like a payment toward one of your
// bills, so the Bills card can ask "Is this a bill payment?".
//
// It only ever suggests. Nothing is counted toward a bill until you click
// yes - a wrong guess costs one click on "Not a bill", never wrong numbers.
//
// A transaction is suggested for a bill when:
//   - money left the account (not pending), in the last 45 days
//   - it isn't already counted toward a bill, and you haven't dismissed it
//   - its description shares a real word with the bill's name
//     ("CREDIT CARD 3333 PAYMENT" and a bill named "Credit card")
//   - it isn't more than what's left on the bill

import type { BankTransaction } from "../types/bank";
import type { Bill } from "../types/bill";
import { remaining } from "./billMath";

const LOOK_BACK_DAYS = 45;
const MAX_SUGGESTIONS = 2;
const MIN_WORD_LENGTH = 4;
// Words too common to mean anything on their own.
const IGNORED_WORDS = new Set(["bill", "payment", "monthly", "account", "from", "with"]);

export interface BillSuggestion {
  transaction: BankTransaction;
  bill: Bill;
}

// "Car Insurance (Geico)" -> ["insurance", "geico"]
function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= MIN_WORD_LENGTH && !IGNORED_WORDS.has(w));
}

function sharesAWord(transactionName: string, billName: string): boolean {
  const inTransaction = new Set(words(transactionName));
  return words(billName).some((w) => inTransaction.has(w));
}

export function suggestBillPayments(
  bills: Bill[],
  transactions: BankTransaction[],
  dismissedIds: string[]
): BillSuggestion[] {
  const skip = new Set(dismissedIds);
  for (const bill of bills) {
    for (const p of bill.payments) if (p.transactionId) skip.add(p.transactionId);
  }

  const oldest = new Date(Date.now() - LOOK_BACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const unpaid = bills.filter((b) => !b.paidAt && (remaining(b) ?? 0) > 0);

  const suggestions: BillSuggestion[] = [];
  for (const transaction of transactions) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    if (transaction.amount <= 0 || transaction.pending) continue;
    if (transaction.date < oldest || skip.has(transaction.id)) continue;

    const bill = unpaid.find(
      (b) =>
        sharesAWord(transaction.name, b.name) && transaction.amount <= (remaining(b) ?? 0) + 0.005
    );
    if (bill) suggestions.push({ transaction, bill });
  }
  return suggestions;
}

// transaction id -> the name of the bill it was counted toward, for the
// "counted toward ..." label in the transactions list.
export function countedTowardBills(bills: Bill[]): Map<string, string> {
  const counted = new Map<string, string>();
  for (const bill of bills) {
    for (const p of bill.payments) if (p.transactionId) counted.set(p.transactionId, bill.name);
  }
  return counted;
}

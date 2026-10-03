// src/bills/recordBillPayment.ts
// What: records one payment toward a bill - typed in by hand, or a bank
// transaction the user confirmed. What's left goes down by that amount.
//
// When the payments cover the whole bill:
//   - it's marked paid and its waiting reminder is cancelled
//   - if it repeats, next month's bill is created (same amount for
//     monthly_fixed, no amount yet for monthly_variable)
//
// Safety:
//   - The update only succeeds if the bill still has the same number of
//     payments as when it was read, so two payments saved at the same moment
//     can't overwrite each other (the second one gets a "try again").
//   - Next month's bill has a fixed key, so creating it twice is impossible.

import { randomUUID } from "crypto";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { HttpError } from "../lib/http";
import type { Bill, BillPayment } from "../types/bill";
import { billSk, isFullyPaid, nextMonth, reminderFields, remaining } from "./billMath";
import { getBill } from "./billStore";

export interface PaymentResult {
  bill: Bill;
  nextBill?: Bill;
}

export async function recordBillPayment(
  userId: string,
  sk: string,
  amount: number,
  transactionId?: string
): Promise<PaymentResult> {
  const existing = await getBill(userId, sk);

  const left = remaining(existing);
  if (left === null) throw new HttpError(400, "Enter this bill's amount before paying it");
  if (left <= 0) throw new HttpError(409, "This bill is already paid");
  if (amount > left) throw new HttpError(400, "That's more than what's left on this bill");
  if (transactionId && existing.payments.some((p) => p.transactionId === transactionId)) {
    throw new HttpError(409, "That transaction is already counted toward this bill");
  }

  const payment: BillPayment = {
    id: randomUUID(),
    amount,
    paidAt: new Date().toISOString(),
    source: transactionId ? "bank" : "manual",
    ...(transactionId && { transactionId }),
  };

  const updated: Bill = { ...existing, payments: [...existing.payments, payment] };
  if (isFullyPaid(updated)) {
    updated.paidAt = payment.paidAt;
    // Paid bills don't need a reminder any more.
    delete updated.reminderStatus;
    delete updated.nextReminderAt;
  }

  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: updated,
        ConditionExpression: "attribute_exists(pk) AND size(payments) = :count",
        ExpressionAttributeValues: { ":count": existing.payments.length },
      })
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new HttpError(409, "This bill just changed. Refresh and try again.");
    }
    throw err;
  }

  const nextBill = updated.paidAt && updated.repeat !== "none" ? await createNextMonth(updated) : undefined;
  return { bill: updated, nextBill };
}

async function createNextMonth(paidBill: Bill): Promise<Bill | undefined> {
  const dueAt = nextMonth(paidBill.dueAt);
  const next: Bill = {
    pk: paidBill.pk,
    sk: billSk(paidBill.seriesId, dueAt),
    seriesId: paidBill.seriesId,
    name: paidBill.name,
    amount: paidBill.repeat === "monthly_fixed" ? paidBill.amount : null,
    dueAt,
    repeat: paidBill.repeat,
    payments: [],
    createdAt: new Date().toISOString(),
    remind: paidBill.remind,
    ...reminderFields(
      { dueAt, remind: paidBill.remind, remindDayBefore: paidBill.remindDayBefore === true },
      false
    ),
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: next,
        ConditionExpression: "attribute_not_exists(pk)",
      })
    );
    return next;
  } catch (err) {
    // Already created (for example an earlier payment finished the bill,
    // then a refund was re-recorded): nothing more to do.
    if (err instanceof ConditionalCheckFailedException) return undefined;
    throw err;
  }
}

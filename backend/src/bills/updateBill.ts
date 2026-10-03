// src/bills/updateBill.ts
// What: edits a bill's name, amount, due date, repeat setting or reminder.
// Payments are kept as they are. The reminder is rescheduled from the new
// settings, and "paid" is re-checked in case the amount changed.
//
// The due date is part of the key, so the edited bill is saved under its
// new key and the old item removed - both in one transaction, so a failure
// can never leave two copies or none.

import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import type { Bill, BillInput } from "../types/bill";
import { billSk, isFullyPaid, reminderFields } from "./billMath";
import { getBill } from "./billStore";

export async function updateBill(userId: string, sk: string, input: BillInput): Promise<Bill> {
  const existing = await getBill(userId, sk);

  const base = {
    pk: existing.pk,
    sk: billSk(existing.seriesId, input.dueAt),
    seriesId: existing.seriesId,
    name: input.name,
    amount: input.amount,
    dueAt: input.dueAt,
    repeat: input.repeat,
    payments: existing.payments,
    createdAt: existing.createdAt,
    remind: input.remind,
  };
  const paid = isFullyPaid(base);
  const bill: Bill = {
    ...base,
    ...(paid && { paidAt: existing.paidAt ?? new Date().toISOString() }),
    ...reminderFields(input, paid),
  };

  if (bill.sk === sk) {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: bill,
              ConditionExpression: "attribute_exists(pk)",
            },
          },
        ],
      })
    );
  } else {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: bill,
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            Delete: {
              TableName: TABLE_NAME,
              Key: { pk: existing.pk, sk },
              ConditionExpression: "attribute_exists(pk)",
            },
          },
        ],
      })
    );
  }
  return bill;
}

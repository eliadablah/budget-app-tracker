// src/bills/createBill.ts
// What: saves a new bill. If a reminder was asked for, it joins the
// "reminders-due" index right away, exactly like a to-do with a reminder.

import { randomUUID } from "crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import type { Bill, BillInput } from "../types/bill";
import { billSk, reminderFields } from "./billMath";

export async function createBill(userId: string, input: BillInput): Promise<Bill> {
  const seriesId = randomUUID();
  const bill: Bill = {
    pk: `USER#${userId}`,
    sk: billSk(seriesId, input.dueAt),
    seriesId,
    name: input.name,
    amount: input.amount,
    dueAt: input.dueAt,
    repeat: input.repeat,
    payments: [],
    createdAt: new Date().toISOString(),
    remind: input.remind,
    ...reminderFields(input, false),
  };

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: bill }));
  return bill;
}

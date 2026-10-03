// src/bills/billStore.ts
// What: reads bills from DynamoDB - one bill, all of a user's bills, and the
// list of bank transactions the user marked "not a bill".

import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { HttpError } from "../lib/http";
import type { Bill, BillsResult } from "../types/bill";

export const DISMISSED_SK = "BILLSUGGEST#dismissed";

export async function getBill(userId: string, sk: string): Promise<Bill> {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk: `USER#${userId}`, sk } })
  );
  if (!result.Item) throw new HttpError(404, "Bill not found");
  return result.Item as Bill;
}

export async function listBills(userId: string): Promise<BillsResult> {
  const [bills, dismissed] = await Promise.all([
    ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":prefix": "BILL#" },
      })
    ),
    ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: `USER#${userId}`, sk: DISMISSED_SK } })
    ),
  ]);

  // Sorted by due date, soonest first (the key itself sorts by series).
  const list = ((bills.Items ?? []) as Bill[]).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  // DynamoDB string sets come back as a JavaScript Set.
  const ids = dismissed.Item?.transactionIds as Set<string> | undefined;
  return { bills: list, dismissedTransactionIds: ids ? [...ids] : [] };
}

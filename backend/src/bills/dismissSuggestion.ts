// src/bills/dismissSuggestion.ts
// What: remembers that a bank transaction is NOT a bill payment, so the
// "Is this a bill payment?" box never asks about it again.

import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { DISMISSED_SK } from "./billStore";

export async function dismissSuggestion(userId: string, transactionId: string): Promise<void> {
  // ADD on a string set adds the id once, however many times this runs.
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${userId}`, sk: DISMISSED_SK },
      UpdateExpression: "ADD transactionIds :ids",
      ExpressionAttributeValues: { ":ids": new Set([transactionId]) },
    })
  );
}

// src/bank/listBankConnections.ts
// What: fetches the record of every bank one user has connected. Shared by
// anything that needs to loop over a user's banks (accounts, transactions).

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import type { BankConnection } from "../types/bank";

export async function listBankConnections(userId: string): Promise<BankConnection[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":prefix": "BANK#",
      },
    })
  );

  return (result.Items ?? []) as BankConnection[];
}

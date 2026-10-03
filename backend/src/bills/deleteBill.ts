// src/bills/deleteBill.ts
// What: removes one bill (only that month - other months of a repeating
// bill are separate items and stay).

import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";

export async function deleteBill(userId: string, sk: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: `USER#${userId}`, sk } }));
}

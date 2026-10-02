// src/todos/deleteTodo.ts
// What: permanently removes one to-do. Deleting something that is already
// gone is treated as success - the end result the caller wanted is the same.

import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";

export async function deleteTodo(userId: string, sk: string): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${userId}`, sk },
    })
  );
}

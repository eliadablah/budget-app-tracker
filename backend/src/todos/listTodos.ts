// src/todos/listTodos.ts
// What: fetches every to-do item belonging to one user, newest-sorted
// automatically because of how the sort key (sk) is built in createTodo.ts.

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import type { Todo } from "../types/todo";

export async function listTodos(userId: string): Promise<Todo[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      // Query (not Scan): only reads this one user's rows, not the whole
      // table - cheaper and faster as the table grows.
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":prefix": "TODO#",
      },
    })
  );

  return (result.Items ?? []) as Todo[];
}

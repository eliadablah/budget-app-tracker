// src/todos/createTodo.ts
// What: writes one new to-do item into DynamoDB and returns it.

import { randomUUID } from "crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import type { Todo } from "../types/todo";

export async function createTodo(userId: string, title: string): Promise<Todo> {
  const now = new Date().toISOString();

  const todo: Todo = {
    pk: `USER#${userId}`,
    // Prefixing the sort key with the timestamp means a plain query already
    // comes back in chronological order, with no extra sorting needed.
    sk: `TODO#${now}#${randomUUID()}`,
    title,
    done: false,
    createdAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: todo,
    })
  );

  return todo;
}

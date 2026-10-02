// src/todos/updateTodo.ts
// What: marks one existing to-do as done or not done, and returns the
// updated item.

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { HttpError } from "../lib/http";
import type { Todo } from "../types/todo";

export async function updateTodo(userId: string, sk: string, done: boolean): Promise<Todo> {
  try {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${userId}`, sk },
        // "done" is a DynamoDB reserved word, so it has to go through a
        // placeholder name (#done) rather than being written directly.
        UpdateExpression: "SET #done = :done",
        ExpressionAttributeNames: { "#done": "done" },
        ExpressionAttributeValues: { ":done": done },
        // Without this, updating an id that doesn't exist would quietly
        // CREATE a half-empty item instead of failing.
        ConditionExpression: "attribute_exists(pk)",
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes as Todo;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new HttpError(404, "To-do not found");
    }
    throw err;
  }
}

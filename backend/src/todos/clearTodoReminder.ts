// src/todos/clearTodoReminder.ts
// What: removes a to-do's reminder entirely. Nothing will be texted for it.

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { HttpError } from "../lib/http";
import type { Todo } from "../types/todo";

export async function clearTodoReminder(userId: string, sk: string): Promise<Todo> {
  try {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${userId}`, sk },
        UpdateExpression:
          "REMOVE remindAt, remindDayBefore, reminderStatus, nextReminderAt, reminderSentAt",
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

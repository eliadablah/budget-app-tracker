// src/todos/setTodoReminder.ts
// What: adds a reminder to an existing to-do, or replaces the one it has.
// Replacing resets it, so the new time gets its own texts.

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { HttpError } from "../lib/http";
import { firstReminderTime } from "../reminders/reminderSchedule";
import type { Todo } from "../types/todo";
import type { ReminderInput } from "./validateReminder";

export async function setTodoReminder(
  userId: string,
  sk: string,
  reminder: ReminderInput
): Promise<Todo> {
  try {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${userId}`, sk },
        UpdateExpression:
          "SET remindAt = :at, remindDayBefore = :dayBefore, " +
          "reminderStatus = :pending, nextReminderAt = :next " +
          "REMOVE reminderSentAt",
        ExpressionAttributeValues: {
          ":at": reminder.remindAt,
          ":dayBefore": reminder.remindDayBefore,
          ":pending": "PENDING",
          ":next": firstReminderTime(reminder.remindAt, reminder.remindDayBefore),
        },
        // Same guard as updateTodo: never create a half-empty item.
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

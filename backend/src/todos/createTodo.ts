// src/todos/createTodo.ts
// What: writes one new to-do item into DynamoDB and returns it. If a
// reminder was asked for, it is saved in the same write and the to-do joins
// the "reminders-due" index right away.

import { randomUUID } from "crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { firstReminderTime } from "../reminders/reminderSchedule";
import type { Todo } from "../types/todo";
import type { ReminderInput } from "./validateReminder";

export async function createTodo(
  userId: string,
  title: string,
  reminder?: ReminderInput
): Promise<Todo> {
  const now = new Date().toISOString();

  const todo: Todo = {
    pk: `USER#${userId}`,
    // Prefixing the sort key with the timestamp means a plain query already
    // comes back in chronological order, with no extra sorting needed.
    sk: `TODO#${now}#${randomUUID()}`,
    title,
    done: false,
    createdAt: now,
    ...(reminder && {
      remindAt: reminder.remindAt,
      remindDayBefore: reminder.remindDayBefore,
      reminderStatus: "PENDING" as const,
      nextReminderAt: firstReminderTime(reminder.remindAt, reminder.remindDayBefore),
    }),
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: todo,
    })
  );

  return todo;
}

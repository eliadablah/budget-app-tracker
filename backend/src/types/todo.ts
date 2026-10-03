// src/types/todo.ts
// What: the shape of a single to-do item, shared by every file that reads or
// writes one, so the whole backend agrees on what a "Todo" looks like.
// Why it lives in its own file: types are referenced from multiple handlers
// (createTodo, listTodos, and later update/delete) - defining it once here
// avoids each file re-declaring a slightly different version.

export interface Todo {
  pk: string; // "USER#<id>" - who owns this item
  sk: string; // "TODO#<timestamp>#<id>" - sorts newest-last automatically
  title: string;
  done: boolean;
  createdAt: string; // ISO 8601 timestamp

  // --- Reminder (all optional - most to-dos have none) ---
  remindAt?: string; // ISO 8601 UTC - when the "it's time" text goes out
  remindDayBefore?: boolean; // also text 24 hours earlier
  reminderSentAt?: string; // when the most recent reminder text went out

  // Internal bookkeeping, only present while a text is still waiting.
  // These two fields are the keys of the "reminders-due" index
  // (infra/dynamodb.tf). Removing them takes the to-do out of the index,
  // which is how a reminder is marked "nothing left to send".
  reminderStatus?: "PENDING";
  nextReminderAt?: string; // ISO 8601 UTC - when the next text is due
}

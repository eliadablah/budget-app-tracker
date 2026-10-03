// src/types/todo.ts
// What: the shape of a to-do item as the backend actually returns it. Mirrors
// backend/src/types/todo.ts on purpose - both sides of the API need to agree
// on this shape, even though they live in separate projects.

export interface Todo {
  pk: string;
  sk: string;
  title: string;
  done: boolean;
  createdAt: string;
  remindAt?: string;
  remindDayBefore?: boolean;
  reminderSentAt?: string;
  nextReminderAt?: string; // present while a text is still waiting
}

// What the form sends when "Email me a reminder" is ticked.
export interface ReminderInput {
  remindAt: string; // ISO 8601
  remindDayBefore: boolean;
}

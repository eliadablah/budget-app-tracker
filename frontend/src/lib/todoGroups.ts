// src/lib/todoGroups.ts
// What: sorts to-dos into the groups shown on the To-do card - Today, This
// week, Later, Anytime (no reminder), Done - and applies the filter chips.

import type { Todo } from "../types/todo";

export type TodoFilter = "all" | "reminders" | "done";

export interface TodoGroup {
  label: string;
  todos: Todo[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function endOfToday(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
}

export function filterTodos(todos: Todo[], filter: TodoFilter): Todo[] {
  if (filter === "reminders") return todos.filter((t) => !t.done && t.nextReminderAt);
  if (filter === "done") return todos.filter((t) => t.done);
  return todos;
}

// Groups with nothing in them are left out.
export function groupTodos(todos: Todo[], now = new Date()): TodoGroup[] {
  const todayEnd = endOfToday(now);
  const weekEnd = todayEnd + 6 * DAY_MS;

  const groups: Record<string, Todo[]> = {
    Today: [],
    "This week": [],
    Later: [],
    Anytime: [],
    Done: [],
  };

  for (const todo of todos) {
    if (todo.done) {
      groups.Done.push(todo);
      continue;
    }
    // Only a reminder that's still waiting gives a to-do a date.
    const when = todo.nextReminderAt && todo.remindAt ? new Date(todo.remindAt).getTime() : null;
    if (when === null) groups.Anytime.push(todo);
    else if (when < todayEnd) groups.Today.push(todo);
    else if (when < weekEnd) groups["This week"].push(todo);
    else groups.Later.push(todo);
  }

  return Object.entries(groups)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, todos: list }));
}

// src/components/todos/TodoCard.tsx
// What: the to-do section of the dashboard - progress bar, filter chips,
// the grouped list, and the add form, inside one tall card. Holds no data of
// its own (only which filter is picked); everything else comes from the
// useTodos hook via the dashboard.
//
// Props:
//   todos    - the to-do list
//   loading  - true while the list is first being fetched
//   error    - a message to show if something failed, or null
//   onAdd    - called with the title (and optional reminder) of a new to-do
//   onToggle - called when a to-do is checked or unchecked
//   onDelete - called when a to-do's delete button is clicked
//   onClearReminder - called when a to-do's reminder is cancelled

import { useState } from "react";
import { filterTodos, type TodoFilter } from "../../lib/todoGroups";
import type { ReminderInput, Todo } from "../../types/todo";
import { Card, FilterChips } from "../ui";
import { TodoForm } from "./TodoForm";
import { TodoList } from "./TodoList";
import { TodoStats } from "./TodoStats";

interface TodoCardProps {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  onAdd: (title: string, reminder?: ReminderInput) => void;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onClearReminder: (todo: Todo) => void;
}

const FILTERS: { value: TodoFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reminders", label: "With reminders" },
  { value: "done", label: "Done" },
];

const EMPTY_MESSAGES: Record<TodoFilter, string> = {
  all: "Nothing on your list. Add your first to-do below.",
  reminders: "No to-dos with a reminder waiting.",
  done: "Nothing checked off yet.",
};

export function TodoCard({
  todos,
  loading,
  error,
  onAdd,
  onToggle,
  onDelete,
  onClearReminder,
}: TodoCardProps) {
  const [filter, setFilter] = useState<TodoFilter>("all");
  const done = todos.filter((t) => t.done).length;
  const hasTodos = todos.length > 0;

  return (
    <Card
      title="To-do"
      className="card--tall"
      aside={hasTodos && <span className="card__count">{`${done} of ${todos.length} done`}</span>}
    >
      {hasTodos && <TodoStats todos={todos} />}
      {hasTodos && (
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} label="Filter to-dos" />
      )}
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <TodoList
          todos={filterTodos(todos, filter)}
          emptyMessage={EMPTY_MESSAGES[filter]}
          onToggle={onToggle}
          onDelete={onDelete}
          onClearReminder={onClearReminder}
        />
      )}
      <TodoForm onAdd={onAdd} />
    </Card>
  );
}

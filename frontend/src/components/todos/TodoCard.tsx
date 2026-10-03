// src/components/todos/TodoCard.tsx
// What: the to-do section of the dashboard - progress bar, the list, and
// the add form, inside one card. Holds no data of its own; everything comes
// from the useTodos hook via the dashboard.
//
// Props:
//   todos    - the to-do list
//   loading  - true while the list is first being fetched
//   error    - a message to show if something failed, or null
//   onAdd    - called with the title (and optional reminder) of a new to-do
//   onToggle - called when a to-do is checked or unchecked
//   onDelete - called when a to-do's delete button is clicked
//   onClearReminder - called when a to-do's reminder is cancelled

import type { ReminderInput, Todo } from "../../types/todo";
import { Card } from "../ui";
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

export function TodoCard({
  todos,
  loading,
  error,
  onAdd,
  onToggle,
  onDelete,
  onClearReminder,
}: TodoCardProps) {
  const done = todos.filter((t) => t.done).length;
  const hasTodos = todos.length > 0;

  return (
    <Card
      title="To-do"
      aside={hasTodos && <span className="card__count">{`${done} of ${todos.length} done`}</span>}
    >
      {hasTodos && <TodoStats todos={todos} />}
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <TodoList
          todos={todos}
          onToggle={onToggle}
          onDelete={onDelete}
          onClearReminder={onClearReminder}
        />
      )}
      <TodoForm onAdd={onAdd} />
    </Card>
  );
}

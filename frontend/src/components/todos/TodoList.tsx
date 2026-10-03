// src/components/todos/TodoList.tsx
// What: renders the to-dos in groups - Today, This week, Later, Anytime,
// Done - or an empty-state message if there's nothing to show.
//
// Props:
//   todos    - the to-dos to show (already filtered)
//   emptyMessage - what to say when there are none
//   onToggle - passed through to each row's checkbox
//   onDelete - passed through to each row's delete button
//   onClearReminder - passed through to each row's reminder badge

import { groupTodos } from "../../lib/todoGroups";
import type { Todo } from "../../types/todo";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  emptyMessage: string;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onClearReminder: (todo: Todo) => void;
}

export function TodoList({ todos, emptyMessage, onToggle, onDelete, onClearReminder }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <>
      {groupTodos(todos).map((group) => (
        <section key={group.label} className="todo-group">
          <h3 className="group-label">{group.label}</h3>
          <ul className="todo-list">
            {group.todos.map((todo) => (
              // sk is unique per item (timestamp + random id) - safe to use as
              // the React key, unlike index-based keys which break on reordering.
              <TodoItem
                key={todo.sk}
                todo={todo}
                onToggle={onToggle}
                onDelete={onDelete}
                onClearReminder={onClearReminder}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

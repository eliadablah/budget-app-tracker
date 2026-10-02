// src/components/todos/TodoList.tsx
// What: renders the full list of to-dos, or an empty-state message if there
// aren't any yet.
//
// Props:
//   todos    - the to-dos to show, in order
//   onToggle - passed through to each row's checkbox
//   onDelete - passed through to each row's delete button

import type { Todo } from "../../types/todo";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

export function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="empty-state">Nothing on your list. Add your first to-do below.</p>;
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        // sk is unique per item (timestamp + random id) - safe to use as the
        // React key, unlike index-based keys which break on reordering.
        <TodoItem key={todo.sk} todo={todo} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  );
}

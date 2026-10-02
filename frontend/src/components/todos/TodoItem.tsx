// src/components/todos/TodoItem.tsx
// What: renders a single to-do row - a checkbox to mark it done, the title,
// and a delete button. No data fetching or state of its own, so it's easy
// to reuse and test.
//
// Props:
//   todo     - the to-do to show
//   onToggle - called when the checkbox is clicked
//   onDelete - called when the delete button is clicked

import type { Todo } from "../../types/todo";
import { TrashIcon } from "../ui";

interface TodoItemProps {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <li className={`todo-item${todo.done ? " todo-item--done" : ""}`}>
      {/* Wrapping in a <label> makes the whole title clickable, not just the
          small box. */}
      <label className="todo-item__label">
        <input
          type="checkbox"
          className="check"
          checked={todo.done}
          onChange={() => onToggle(todo)}
        />
        <span className="todo-item__title">{todo.title}</span>
      </label>
      <button
        type="button"
        className="icon-button"
        aria-label={`Delete ${todo.title}`}
        onClick={() => onDelete(todo)}
      >
        <TrashIcon />
      </button>
    </li>
  );
}

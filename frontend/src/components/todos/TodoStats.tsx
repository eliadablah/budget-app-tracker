// src/components/todos/TodoStats.tsx
// What: a slim progress bar showing how much of the to-do list is done,
// computed entirely from props already loaded on the page - no new backend
// data. Kept as its own component since it has its own job (summarizing),
// separate from TodoList's job (listing).
//
// Props:
//   todos - the full to-do list

import type { Todo } from "../../types/todo";

interface TodoStatsProps {
  todos: Todo[];
}

export function TodoStats({ todos }: TodoStatsProps) {
  const total = todos.length;
  const done = todos.filter((t) => t.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="To-dos done"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
    >
      <div className="progress__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

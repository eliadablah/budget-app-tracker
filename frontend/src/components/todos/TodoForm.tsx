// src/components/todos/TodoForm.tsx
// What: the input + button for adding a new to-do. Doesn't know or care how
// the to-do actually gets saved - it just hands the typed title up to
// whoever rendered it, via the onAdd callback.

import { useState, type FormEvent } from "react";

interface TodoFormProps {
  onAdd: (title: string) => void;
}

export function TodoForm({ onAdd }: TodoFormProps) {
  const [title, setTitle] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle("");
  }

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a to-do"
        aria-label="New to-do"
        maxLength={200}
      />
      <button type="submit" className="button button--primary">
        Add
      </button>
    </form>
  );
}

// src/components/todos/TodoForm.tsx
// What: the input + button for adding a new to-do. Doesn't know or care how
// the to-do actually gets saved - it just hands the typed title (and the
// optional reminder from ReminderFields) up to whoever rendered it, via the
// onAdd callback.

import { useState, type FormEvent } from "react";
import type { ReminderInput } from "../../types/todo";
import { ReminderFields } from "./ReminderFields";

interface TodoFormProps {
  onAdd: (title: string, reminder?: ReminderInput) => void;
}

export function TodoForm({ onAdd }: TodoFormProps) {
  const [title, setTitle] = useState("");
  const [reminder, setReminder] = useState<ReminderInput | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), reminder ?? undefined);
    setTitle("");
    setReminder(null);
  }

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <div className="todo-form__row">
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
      </div>
      <ReminderFields value={reminder} onChange={setReminder} />
    </form>
  );
}

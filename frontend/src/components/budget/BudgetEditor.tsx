// src/components/budget/BudgetEditor.tsx
// What: the form for setting a monthly limit per category. Lists every
// category you've spent in, plus a few common ones. Leaving a box empty (or
// 0) means "no budget for this category".
//
// Props:
//   categories - the category codes to offer
//   limits     - the current limits (category -> dollars)
//   saving     - true while the save is in flight
//   onSave     - called with the new limits; resolves true when saved
//   onCancel   - called when Cancel is clicked

import { useState, type FormEvent } from "react";
import { categoryLabel } from "../../lib/budgetCategories";

interface BudgetEditorProps {
  categories: string[];
  limits: Record<string, number>;
  saving: boolean;
  onSave: (limits: Record<string, number>) => Promise<boolean>;
  onCancel: () => void;
}

export function BudgetEditor({ categories, limits, saving, onSave, onCancel }: BudgetEditorProps) {
  // Kept as text while typing, so a half-typed "12." isn't thrown away.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(categories.map((c) => [c, limits[c] ? String(limits[c]) : ""]))
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, number> = {};
    for (const [category, text] of Object.entries(values)) {
      const amount = Number(text);
      if (text.trim() !== "" && Number.isFinite(amount) && amount > 0) next[category] = amount;
    }
    if (await onSave(next)) onCancel(); // close the editor
  }

  return (
    <form className="budget-editor" onSubmit={handleSubmit}>
      <p className="muted">Set a monthly amount for each category. Leave it empty for no budget.</p>
      {categories.map((category) => (
        <label key={category} className="budget-editor__row">
          <span>{categoryLabel(category)}</span>
          <input
            type="number"
            value={values[category] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [category]: e.target.value }))}
            placeholder="$ per month"
            min="0"
            step="1"
            inputMode="decimal"
          />
        </label>
      ))}
      <div className="bill-form__row">
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? "Saving…" : "Save budget"}
        </button>
        <button type="button" className="button button--quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// src/budget/validateBudget.ts
// What: checks a "save my budget" request. Same pattern as validateTodo.ts.

import { HttpError } from "../lib/http";

const MAX_CATEGORIES = 40;
const MAX_LIMIT = 1_000_000;

// Categories look like Plaid's: upper-case words joined by underscores.
const CATEGORY_PATTERN = /^[A-Z][A-Z_]{1,49}$/;

export function validateBudgetLimits(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, "limits must be an object of category: amount");
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_CATEGORIES) {
    throw new HttpError(400, `At most ${MAX_CATEGORIES} categories`);
  }

  const limits: Record<string, number> = {};
  for (const [category, amount] of entries) {
    if (!CATEGORY_PATTERN.test(category)) {
      throw new HttpError(400, `"${category}" is not a valid category`);
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > MAX_LIMIT) {
      throw new HttpError(400, `The amount for ${category} must be 0 or more`);
    }
    // A limit of 0 means "no budget for this category", so it isn't stored.
    if (amount > 0) limits[category] = Math.round(amount * 100) / 100;
  }
  return limits;
}

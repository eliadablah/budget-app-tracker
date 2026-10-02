// src/todos/validateTodo.ts
// What: checks the pieces of a to-do request before anything touches the
// database. Each function returns the cleaned value or throws an HttpError
// (400) explaining what was wrong.

import { HttpError } from "../lib/http";

const MAX_TITLE_LENGTH = 200;
const TODO_SK_PREFIX = "TODO#";

export function validateTitle(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, "title is required");
  }
  const title = value.trim();
  if (title.length > MAX_TITLE_LENGTH) {
    throw new HttpError(400, `title must be ${MAX_TITLE_LENGTH} characters or fewer`);
  }
  return title;
}

export function validateDone(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new HttpError(400, "done must be true or false");
  }
  return value;
}

// The {id} in /todos/{id} is the item's sort key (sk). It contains "#" and
// ":" so the frontend URL-encodes it; decoding here is safe whether or not
// API Gateway already decoded it, because a real sk never contains "%".
// Insisting on the TODO# prefix stops this route from ever touching another
// kind of item (bills, budget entries) that shares the table.
export function validateTodoId(value: string | undefined): string {
  let sk: string;
  try {
    sk = decodeURIComponent(value ?? "");
  } catch {
    throw new HttpError(400, "Invalid to-do id");
  }
  if (!sk.startsWith(TODO_SK_PREFIX) || sk.length === TODO_SK_PREFIX.length) {
    throw new HttpError(400, "Invalid to-do id");
  }
  return sk;
}

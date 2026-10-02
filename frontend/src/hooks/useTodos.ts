// src/hooks/useTodos.ts
// What: owns everything about the to-do list's data - loading it, adding,
// checking off, and deleting - so components only have to render.
//
// Manages: the list itself, a loading flag, and the latest error message.
// Returns: { todos, loading, error, addTodo, toggleTodo, removeTodo }.
// onSessionExpired is called when the API says the login is no longer valid
// (a 401), so the parent can show the login screen again.

import { useCallback, useEffect, useState } from "react";
import { createTodo, deleteTodo, getTodos, updateTodo, UnauthorizedError } from "../lib/api";
import type { Todo } from "../types/todo";

export function useTodos(onSessionExpired: () => void) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // One place for "something went wrong": an expired login goes back to the
  // login screen, anything else shows a plain message.
  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof UnauthorizedError) {
        onSessionExpired();
        return;
      }
      setError(fallback);
    },
    [onSessionExpired]
  );

  useEffect(() => {
    getTodos()
      .then(setTodos)
      .catch((err) => handleError(err, "Couldn't load your to-dos. Refresh to try again."))
      .finally(() => setLoading(false));
  }, [handleError]);

  async function addTodo(title: string) {
    setError(null);
    try {
      const newTodo = await createTodo(title);
      setTodos((prev) => [...prev, newTodo]);
    } catch (err) {
      handleError(err, "Couldn't add that to-do. Try again.");
    }
  }

  // Both toggle and remove update the screen immediately and only talk to
  // the server afterward, so a click never feels laggy. If the server says
  // no, the item is put back exactly as it was.
  async function toggleTodo(todo: Todo) {
    setError(null);
    const done = !todo.done;
    setTodos((prev) => prev.map((t) => (t.sk === todo.sk ? { ...t, done } : t)));
    try {
      await updateTodo(todo.sk, done);
    } catch (err) {
      setTodos((prev) => prev.map((t) => (t.sk === todo.sk ? { ...t, done: todo.done } : t)));
      handleError(err, "Couldn't update that to-do. Try again.");
    }
  }

  async function removeTodo(todo: Todo) {
    setError(null);
    setTodos((prev) => prev.filter((t) => t.sk !== todo.sk));
    try {
      await deleteTodo(todo.sk);
    } catch (err) {
      // Put it back, in its original (chronological) position - sk starts
      // with the creation timestamp, so sorting by sk restores the order.
      setTodos((prev) => [...prev, todo].sort((a, b) => a.sk.localeCompare(b.sk)));
      handleError(err, "Couldn't delete that to-do. Try again.");
    }
  }

  return { todos, loading, error, addTodo, toggleTodo, removeTodo };
}

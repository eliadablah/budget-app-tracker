// src/types/todo.ts
// What: the shape of a single to-do item, shared by every file that reads or
// writes one, so the whole backend agrees on what a "Todo" looks like.
// Why it lives in its own file: types are referenced from multiple handlers
// (createTodo, listTodos, and later update/delete) - defining it once here
// avoids each file re-declaring a slightly different version.

export interface Todo {
  pk: string; // "USER#<id>" - who owns this item
  sk: string; // "TODO#<timestamp>#<id>" - sorts newest-last automatically
  title: string;
  done: boolean;
  createdAt: string; // ISO 8601 timestamp
}

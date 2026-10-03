// src/lib/api.ts
// What: the one place that knows how to talk to the backend API. Every call
// now requires a login token (the "wristband") - the backend rejects
// anything without one with a 401, which callers can detect via
// UnauthorizedError to send the user back to the login screen.

import type { Bank, BankTransactionsResult } from "../types/bank";
import type { Bill, BillInput, BillsResult, PaymentResult } from "../types/bill";
import type { NotificationKind, NotificationSettings } from "../types/settings";
import type { ReminderInput, Todo } from "../types/todo";
import { getIdToken, logout } from "./auth";

// Trailing slash removed so paths can always be written as `${API_URL}/todos`
// whether or not the configured URL ends in "/".
const API_URL = (import.meta.env.VITE_API_URL as string).replace(/\/+$/, "");

export class UnauthorizedError extends Error {
  constructor() {
    super("Not logged in, or session expired");
    this.name = "UnauthorizedError";
  }
}

function authHeaders(): HeadersInit {
  const token = getIdToken();
  if (!token) throw new UnauthorizedError();
  return { Authorization: `Bearer ${token}` };
}

// Shared response handling: a 401 means the token is missing/expired -
// clear it and surface a typed error so the UI can show the login screen
// again, instead of a confusing generic failure message.
async function checkResponse(res: Response): Promise<Response> {
  if (res.status === 401) {
    logout();
    throw new UnauthorizedError();
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res;
}

// A to-do's address is /todos/<its sk>. The sk contains "#" and ":" - both
// meaningful inside a URL - so it must be encoded before going in the path.
function todoUrl(sk: string): string {
  return `${API_URL}/todos/${encodeURIComponent(sk)}`;
}

export async function getTodos(): Promise<Todo[]> {
  const res = await fetch(`${API_URL}/todos`, { headers: authHeaders() });
  return (await checkResponse(res)).json();
}

export async function createTodo(title: string, reminder?: ReminderInput): Promise<Todo> {
  const res = await fetch(`${API_URL}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ title, ...reminder }),
  });
  return (await checkResponse(res)).json();
}

export async function updateTodo(sk: string, done: boolean): Promise<Todo> {
  const res = await fetch(todoUrl(sk), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ done }),
  });
  return (await checkResponse(res)).json();
}

export async function deleteTodo(sk: string): Promise<void> {
  const res = await fetch(todoUrl(sk), {
    method: "DELETE",
    headers: authHeaders(),
  });
  // 204 No Content - there is no body to read on success.
  await checkResponse(res);
}

// --- Reminders ---

export async function setTodoReminder(sk: string, reminder: ReminderInput): Promise<Todo> {
  const res = await fetch(`${todoUrl(sk)}/reminder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(reminder),
  });
  return (await checkResponse(res)).json();
}

export async function clearTodoReminder(sk: string): Promise<Todo> {
  const res = await fetch(`${todoUrl(sk)}/reminder`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return (await checkResponse(res)).json();
}

// --- Notification settings ---

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const res = await fetch(`${API_URL}/settings/notifications`, { headers: authHeaders() });
  return (await checkResponse(res)).json();
}

// Flips one switch, e.g. setNotification("billReminders", true).
export async function setNotification(
  kind: NotificationKind,
  on: boolean
): Promise<NotificationSettings> {
  const res = await fetch(`${API_URL}/settings/notifications`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ [kind]: on }),
  });
  return (await checkResponse(res)).json();
}

export async function sendTestEmail(): Promise<void> {
  const res = await fetch(`${API_URL}/settings/notifications/test`, {
    method: "POST",
    headers: authHeaders(),
  });
  await checkResponse(res);
}

// --- Bills ---

// A bill's address is /bills/<its sk>, encoded for the same reason as a to-do's.
function billUrl(sk: string): string {
  return `${API_URL}/bills/${encodeURIComponent(sk)}`;
}

export async function getBills(): Promise<BillsResult> {
  const res = await fetch(`${API_URL}/bills`, { headers: authHeaders() });
  return (await checkResponse(res)).json();
}

export async function createBill(input: BillInput): Promise<Bill> {
  const res = await fetch(`${API_URL}/bills`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  return (await checkResponse(res)).json();
}

export async function updateBill(sk: string, input: BillInput): Promise<Bill> {
  const res = await fetch(billUrl(sk), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  return (await checkResponse(res)).json();
}

export async function deleteBill(sk: string): Promise<void> {
  const res = await fetch(billUrl(sk), { method: "DELETE", headers: authHeaders() });
  await checkResponse(res);
}

// transactionId is set when the payment is a bank transaction you confirmed.
export async function payBill(
  sk: string,
  amount: number,
  transactionId?: string
): Promise<PaymentResult> {
  const res = await fetch(`${billUrl(sk)}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ amount, transactionId }),
  });
  return (await checkResponse(res)).json();
}

export async function dismissBillSuggestion(transactionId: string): Promise<void> {
  const res = await fetch(`${API_URL}/bills/suggestions/dismiss`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ transactionId }),
  });
  await checkResponse(res);
}

// --- Budget ---

// limits is category -> monthly amount, e.g. { FOOD_AND_DRINK: 500 }.
export async function getBudgetLimits(): Promise<Record<string, number>> {
  const res = await fetch(`${API_URL}/budget`, { headers: authHeaders() });
  const data: { limits: Record<string, number> } = await (await checkResponse(res)).json();
  return data.limits;
}

export async function saveBudgetLimits(
  limits: Record<string, number>
): Promise<Record<string, number>> {
  const res = await fetch(`${API_URL}/budget`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ limits }),
  });
  const data: { limits: Record<string, number> } = await (await checkResponse(res)).json();
  return data.limits;
}

// --- Bank connections ---

// Step 1 of connecting a bank: get the token that opens Plaid's pop-up.
export async function createLinkToken(): Promise<string> {
  const res = await fetch(`${API_URL}/bank/link-token`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data: { linkToken: string } = await (await checkResponse(res)).json();
  return data.linkToken;
}

// Step 2: hand the pop-up's one-time token to the backend to finish.
export async function connectBank(publicToken: string, institutionName: string): Promise<void> {
  const res = await fetch(`${API_URL}/bank/connections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ publicToken, institutionName }),
  });
  await checkResponse(res);
}

export async function getBanks(): Promise<Bank[]> {
  const res = await fetch(`${API_URL}/bank/accounts`, { headers: authHeaders() });
  return (await checkResponse(res)).json();
}

export async function getTransactions(): Promise<BankTransactionsResult> {
  const res = await fetch(`${API_URL}/bank/transactions`, { headers: authHeaders() });
  return (await checkResponse(res)).json();
}

export async function removeBank(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/bank/connections/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await checkResponse(res);
}

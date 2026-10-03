// src/bills/validateBill.ts
// What: checks bill requests before anything touches the database. Same
// pattern as validateTodo.ts: return the cleaned value or throw an
// HttpError (400) that is safe to show the caller.

import { HttpError } from "../lib/http";
import type { BillInput, BillRepeat } from "../types/bill";

const MAX_NAME_LENGTH = 80;
const MAX_AMOUNT = 1_000_000;
const BILL_SK_PREFIX = "BILL#";
const REPEATS: BillRepeat[] = ["none", "monthly_fixed", "monthly_variable"];

function validateAmount(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) {
    throw new HttpError(400, `${field} must be a number above 0`);
  }
  return Math.round(value * 100) / 100;
}

export function validateBillInput(body: Record<string, unknown>): BillInput {
  if (typeof body.name !== "string" || body.name.trim() === "") {
    throw new HttpError(400, "name is required");
  }
  const name = body.name.trim();
  if (name.length > MAX_NAME_LENGTH) {
    throw new HttpError(400, `name must be ${MAX_NAME_LENGTH} characters or fewer`);
  }

  const repeat = body.repeat ?? "none";
  if (typeof repeat !== "string" || !REPEATS.includes(repeat as BillRepeat)) {
    throw new HttpError(400, "repeat must be none, monthly_fixed or monthly_variable");
  }

  // A bill whose amount changes may be saved without one; every other bill needs it.
  const amount =
    body.amount === null || body.amount === undefined
      ? null
      : validateAmount(body.amount, "amount");
  if (amount === null && repeat !== "monthly_variable") {
    throw new HttpError(400, "amount is required");
  }

  if (typeof body.dueAt !== "string" || Number.isNaN(new Date(body.dueAt).getTime())) {
    throw new HttpError(400, "dueAt must be a valid date and time");
  }

  for (const field of ["remind", "remindDayBefore"] as const) {
    if (body[field] !== undefined && typeof body[field] !== "boolean") {
      throw new HttpError(400, `${field} must be true or false`);
    }
  }

  return {
    name,
    amount,
    dueAt: new Date(body.dueAt).toISOString(),
    repeat: repeat as BillRepeat,
    remind: body.remind === true,
    remindDayBefore: body.remindDayBefore === true,
  };
}

export function validatePaymentAmount(value: unknown): number {
  return validateAmount(value, "amount");
}

// A Plaid transaction id: letters, numbers, dashes and underscores.
export function validateTransactionId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) {
    throw new HttpError(400, "transactionId is not valid");
  }
  return value;
}

export function validateOptionalTransactionId(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : validateTransactionId(value);
}

// The {id} in /bills/{id} is the bill's sort key, URL-encoded like a
// to-do's. Requiring the BILL# prefix stops this route from touching any
// other kind of item in the table.
export function validateBillId(value: string | undefined): string {
  let sk: string;
  try {
    sk = decodeURIComponent(value ?? "");
  } catch {
    throw new HttpError(400, "Invalid bill id");
  }
  if (!sk.startsWith(BILL_SK_PREFIX) || sk.length === BILL_SK_PREFIX.length) {
    throw new HttpError(400, "Invalid bill id");
  }
  return sk;
}

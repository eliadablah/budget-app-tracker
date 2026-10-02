// src/bank/validateBank.ts
// What: checks the pieces of a bank request before anything is sent to
// Plaid or the database. Each function returns the cleaned value or throws
// an HttpError (400).

import { HttpError } from "../lib/http";

const MAX_NAME_LENGTH = 100;
const BANK_SK_PATTERN = /^BANK#[A-Za-z0-9_-]+$/;

export function validatePublicToken(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, "publicToken is required");
  }
  return value.trim();
}

// The bank's display name comes from Plaid's pop-up via the frontend. It is
// only a label, so a missing one gets a generic fallback rather than an error.
export function validateInstitutionName(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return "Bank";
  }
  return value.trim().slice(0, MAX_NAME_LENGTH);
}

// The {id} in /bank/connections/{id} is the connection's sort key. Same
// reasoning as validateTodoId: decode defensively, and insist on the BANK#
// prefix so this route can't touch any other kind of item. The id is also
// used to build a Parameter Store name, so it is limited to the characters
// Plaid item ids actually use.
export function validateBankId(value: string | undefined): string {
  let sk: string;
  try {
    sk = decodeURIComponent(value ?? "");
  } catch {
    throw new HttpError(400, "Invalid bank id");
  }
  if (!BANK_SK_PATTERN.test(sk)) {
    throw new HttpError(400, "Invalid bank id");
  }
  return sk;
}

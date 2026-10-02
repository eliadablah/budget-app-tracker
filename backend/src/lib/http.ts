// src/lib/http.ts
// What: small shared helpers for turning results and mistakes into HTTP
// responses, so every handler replies in the same shape instead of each one
// hand-building { statusCode, body } objects slightly differently.

import type { APIGatewayProxyResultV2 } from "aws-lambda";

// Thrown anywhere in the backend to say "this request is wrong, and here is
// the status code + message that is safe to show the caller". handler.ts
// turns it into a response; anything that is NOT an HttpError stays a
// generic 500 so internals never leak.
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function json(statusCode: number, data: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  };
}

// 204 = "done, nothing to send back" (used by delete).
export function noContent(): APIGatewayProxyResultV2 {
  return { statusCode: 204 };
}

// Parses a request body as a JSON object. Malformed JSON is the caller's
// mistake (400), not a server crash (500).
export function parseJsonBody(body: string | undefined): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body ?? "");
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

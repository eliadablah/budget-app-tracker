// src/lib/plaid.ts
// What: the one place that talks to Plaid (the service that sits between
// this app and the banks). Plaid's API is plain JSON over HTTPS, so this
// uses the built-in fetch instead of pulling in Plaid's whole SDK.
//
// Which Plaid environment is used (sandbox = fake banks, production = real
// ones) comes from the PLAID_ENV variable Terraform sets on the Lambda.

import { getSecret } from "./secrets";

const PLAID_ENV = process.env.PLAID_ENV ?? "sandbox";
const PLAID_BASE_URL = `https://${PLAID_ENV}.plaid.com`;

// Where the Plaid keys and bank tokens live in Parameter Store, e.g.
// "/budget-app/dev/plaid". Set by Terraform.
export const PLAID_PARAM_PREFIX = process.env.PLAID_PARAM_PREFIX ?? "";

interface PlaidCredentials {
  clientId: string;
  secret: string;
}

// Fetched once and reused for as long as this Lambda instance stays warm,
// so most requests don't pay for two extra Parameter Store lookups.
let credentials: Promise<PlaidCredentials> | undefined;

function getCredentials(): Promise<PlaidCredentials> {
  if (!PLAID_PARAM_PREFIX) {
    throw new Error("PLAID_PARAM_PREFIX environment variable is not set");
  }
  if (!credentials) {
    credentials = Promise.all([
      getSecret(`${PLAID_PARAM_PREFIX}/client-id`),
      getSecret(`${PLAID_PARAM_PREFIX}/secret`),
    ]).then(([clientId, secret]) => ({ clientId, secret }));
    // If the lookup failed, forget it so the next request tries again
    // instead of being stuck with the failure.
    credentials.catch(() => {
      credentials = undefined;
    });
  }
  return credentials;
}

// Thrown when Plaid itself says no. errorCode is Plaid's own code (e.g.
// "ITEM_LOGIN_REQUIRED"), useful for logs and for deciding what to show.
export class PlaidError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "PlaidError";
  }
}

// Sends one request to Plaid, adding the keys, and returns the parsed reply.
export async function plaidRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { clientId, secret } = await getCredentials();

  const res = await fetch(`${PLAID_BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    // Plaid rejected the keys themselves: drop the remembered copy so the
    // next request re-reads Parameter Store. Without this, fixing a wrong
    // key wouldn't take effect until this Lambda instance was recycled.
    if (data.error_code === "INVALID_API_KEYS") {
      credentials = undefined;
    }
    throw new PlaidError(
      String(data.error_code ?? "UNKNOWN"),
      String(data.error_message ?? `Plaid request failed with ${res.status}`)
    );
  }
  return data as T;
}

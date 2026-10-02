// src/bank/createLinkToken.ts
// What: step 1 of connecting a bank. Asks Plaid for a short-lived "link
// token" that the frontend uses to open Plaid's bank-login pop-up.

import { plaidRequest } from "../lib/plaid";

interface LinkTokenResponse {
  link_token: string;
}

export async function createLinkToken(userId: string): Promise<{ linkToken: string }> {
  const result = await plaidRequest<LinkTokenResponse>("/link/token/create", {
    client_name: "Budget Tracker",
    language: "en",
    country_codes: ["US"],
    // "transactions" covers balances now and the spending feed later, so
    // banks won't need to be reconnected when that feature is added.
    products: ["transactions"],
    user: { client_user_id: userId },
  });

  return { linkToken: result.link_token };
}

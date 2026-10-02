// src/bank/bankTokenStore.ts
// What: saves, reads, and deletes the access token for one connected bank.
// A token is what lets this app read that bank's data through Plaid, so it
// is kept encrypted in Parameter Store, one parameter per bank, under
// <prefix>/items/<user id>/<plaid item id>.

import { PLAID_PARAM_PREFIX } from "../lib/plaid";
import { deleteSecret, getSecret, putSecret } from "../lib/parameterStore";

function tokenName(userId: string, itemId: string): string {
  return `${PLAID_PARAM_PREFIX}/items/${userId}/${itemId}`;
}

export function saveBankToken(userId: string, itemId: string, token: string): Promise<void> {
  return putSecret(tokenName(userId, itemId), token);
}

export function getBankToken(userId: string, itemId: string): Promise<string> {
  return getSecret(tokenName(userId, itemId));
}

export function deleteBankToken(userId: string, itemId: string): Promise<void> {
  return deleteSecret(tokenName(userId, itemId));
}

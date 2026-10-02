// src/bank/removeBank.ts
// What: disconnects one bank - tells Plaid to cancel the access token,
// deletes the stored token, and removes the connection from the table.

import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ParameterNotFound } from "@aws-sdk/client-ssm";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { plaidRequest } from "../lib/plaid";
import { deleteBankToken, getBankToken } from "./bankTokenStore";

export async function removeBank(userId: string, sk: string): Promise<void> {
  const itemId = sk.slice("BANK#".length);

  // Cancel the token at Plaid first. If that fails for any reason, carry on
  // and clean up our side anyway - the user asked for this bank to be gone.
  try {
    const accessToken = await getBankToken(userId, itemId);
    await plaidRequest("/item/remove", { access_token: accessToken });
  } catch (err) {
    if (!(err instanceof ParameterNotFound)) {
      console.error(`Plaid item removal failed for ${sk}:`, err);
    }
  }

  await deleteBankToken(userId, itemId);
  await ddb.send(
    new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: `USER#${userId}`, sk } })
  );
}

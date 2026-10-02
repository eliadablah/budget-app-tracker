// src/bank/connectBank.ts
// What: step 2 of connecting a bank. After the bank login succeeds in
// Plaid's pop-up, the frontend gets a one-time "public token". This trades
// it for the long-lived access token, locks that away, and records the
// connection in the table.

import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { plaidRequest } from "../lib/plaid";
import type { BankConnection } from "../types/bank";
import { saveBankToken } from "./bankTokenStore";

interface ExchangeResponse {
  access_token: string;
  item_id: string;
}

export async function connectBank(
  userId: string,
  publicToken: string,
  institutionName: string
): Promise<BankConnection> {
  const exchange = await plaidRequest<ExchangeResponse>("/item/public_token/exchange", {
    public_token: publicToken,
  });

  // Token first, record second: a token with no record is harmless, but a
  // record with no token would show up as a permanently broken bank.
  await saveBankToken(userId, exchange.item_id, exchange.access_token);

  const connection: BankConnection = {
    pk: `USER#${userId}`,
    sk: `BANK#${exchange.item_id}`,
    itemId: exchange.item_id,
    institutionName,
    createdAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: connection }));

  return connection;
}

// src/lib/dynamodb.ts
// What: one shared DynamoDB client, reused by every handler instead of each
// handler creating its own - cheaper (fewer connections opened) and keeps
// config (table name) in one place instead of scattered across files.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

// The "document client" lets the rest of the code use plain JS objects
// instead of DynamoDB's verbose { S: "value" } attribute format.
export const ddb = DynamoDBDocumentClient.from(client);

// Read the table name from an environment variable (set by Terraform on the
// Lambda resource) instead of hardcoding it - keeps this code identical
// across dev/prod without ever editing source.
export const TABLE_NAME = process.env.TABLE_NAME ?? "";
if (!TABLE_NAME) {
  throw new Error("TABLE_NAME environment variable is not set");
}

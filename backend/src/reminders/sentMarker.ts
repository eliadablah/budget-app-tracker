// src/reminders/sentMarker.ts
// What: "have I already sent this one?" for emails that must go out exactly
// once (a budget alert for one category and month, or a day's summary).
//
// markOnce() writes a small marker item and succeeds only the first time.
// DynamoDB does the check and the write as one step, so even two runs at the
// same moment can't both get "yes, send it".

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";

// Returns true the first time this marker is written, false ever after.
export async function markOnce(userId: string, marker: string): Promise<boolean> {
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { pk: `USER#${userId}`, sk: `SENT#${marker}`, sentAt: new Date().toISOString() },
        ConditionExpression: "attribute_not_exists(pk)",
      })
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

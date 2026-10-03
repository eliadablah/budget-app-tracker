// src/lib/dailySendCap.ts
// What: a hard limit of MAX_SENDS_PER_DAY notification emails per user per
// day, so a bug (or a loop) can never flood the inbox or run up a bill. Call
// reserveSendSlot() BEFORE sending; it returns false once today's limit is
// used up.
//
// How: one tiny counter item per user per day (sk "SENDCOUNT#2026-10-03").
// DynamoDB adds 1 and checks the limit in a single atomic step, so two
// senders running at once can't both squeeze past the cap.

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./dynamodb";

export const MAX_SENDS_PER_DAY = 10;

function todayKey(userId: string) {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" in UTC
  return { pk: `USER#${userId}`, sk: `SENDCOUNT#${today}` };
}

export async function reserveSendSlot(userId: string): Promise<boolean> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: todayKey(userId),
        UpdateExpression: "ADD #sent :one",
        ConditionExpression: "attribute_not_exists(#sent) OR #sent < :max",
        ExpressionAttributeNames: { "#sent": "sent" },
        ExpressionAttributeValues: { ":one": 1, ":max": MAX_SENDS_PER_DAY },
      })
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

// How many have gone out today (for the Notifications card).
export async function sentToday(userId: string): Promise<number> {
  const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: todayKey(userId) }));
  return Number(result.Item?.sent ?? 0);
}

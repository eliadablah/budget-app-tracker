// src/settings/listUsersWithSettings.ts
// What: finds every user who has notification settings saved. The scheduler
// uses it to know whose budget alerts and daily summary to consider.
//
// This is the one place the backend uses Scan (reads the whole table)
// instead of Query. That's fine here: it runs once an hour, not per request,
// and the table for a personal app is tiny. With many users this would
// become an index instead.

import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { SETTINGS_SK, type NotificationSettings } from "../types/settings";

export async function listUsersWithSettings(): Promise<NotificationSettings[]> {
  const found: NotificationSettings[] = [];
  let startKey: Record<string, unknown> | undefined;

  // Scan returns results a page at a time; keep going until there are no more.
  do {
    const page = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "sk = :sk",
        ExpressionAttributeValues: { ":sk": SETTINGS_SK },
        ExclusiveStartKey: startKey,
      })
    );
    found.push(...((page.Items ?? []) as NotificationSettings[]));
    startKey = page.LastEvaluatedKey;
  } while (startKey);

  return found;
}

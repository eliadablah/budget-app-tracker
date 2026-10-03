// src/budget/budgetStore.ts
// What: reads and saves the user's monthly budget limits (one small item).

import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamodb";
import { BUDGET_SK, type BudgetLimits, type BudgetView } from "../types/budget";

export async function getBudget(userId: string): Promise<BudgetView> {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk: `USER#${userId}`, sk: BUDGET_SK } })
  );
  return { limits: (result.Item as BudgetLimits | undefined)?.limits ?? {} };
}

export async function saveBudgetLimits(
  userId: string,
  limits: Record<string, number>
): Promise<BudgetView> {
  const item: BudgetLimits = {
    pk: `USER#${userId}`,
    sk: BUDGET_SK,
    limits,
    updatedAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return { limits };
}

// src/types/budget.ts
// What: the shape of the monthly budget. The categories are the bank's own
// (Plaid's "primary" categories, e.g. "FOOD_AND_DRINK"); the user sets a
// monthly limit in dollars for the ones they care about.

export const BUDGET_SK = "BUDGET#limits";

export interface BudgetLimits {
  pk: string; // "USER#<id>"
  sk: typeof BUDGET_SK;
  limits: Record<string, number>; // category -> monthly limit in dollars
  updatedAt: string;
}

// GET /budget and PUT /budget both reply with this.
export interface BudgetView {
  limits: Record<string, number>;
}

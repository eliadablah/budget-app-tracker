// src/lib/budgetCategories.ts
// What: turns the bank's category codes into words ("FOOD_AND_DRINK" ->
// "Food & drink") and gives each category a steady color for the chart.
// The backend has its own copy of the labels in
// backend/src/budget/categoryLabels.ts - keep the two in step.

const LABELS: Record<string, string> = {
  FOOD_AND_DRINK: "Food & drink",
  GENERAL_MERCHANDISE: "Shopping",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Travel",
  RENT_AND_UTILITIES: "Rent & utilities",
  ENTERTAINMENT: "Entertainment",
  PERSONAL_CARE: "Personal care",
  GENERAL_SERVICES: "Services",
  MEDICAL: "Medical",
  HOME_IMPROVEMENT: "Home",
  LOAN_PAYMENTS: "Loan payments",
  BANK_FEES: "Bank fees",
  GOVERNMENT_AND_NON_PROFIT: "Government & donations",
  INCOME: "Income",
  TRANSFER_IN: "Transfer in",
  TRANSFER_OUT: "Transfer out",
  OTHER: "Other",
};

export const OTHER_CATEGORY = "OTHER";

// The categories offered in the budget editor even before there's any
// spending in them.
export const COMMON_CATEGORIES = [
  "FOOD_AND_DRINK",
  "GENERAL_MERCHANDISE",
  "TRANSPORTATION",
  "RENT_AND_UTILITIES",
  "ENTERTAINMENT",
  "TRAVEL",
];

export function categoryLabel(category: string | null): string {
  const code = category ?? OTHER_CATEGORY;
  // Unknown codes still read fine: "SOME_NEW_THING" -> "Some new thing".
  return LABELS[code] ?? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, " ");
}

// The CSS variables --chart-1 ... --chart-6 are defined in styles/index.css.
const CHART_COLOR_COUNT = 6;

// The Nth category in a list always gets the Nth color.
export function chartColor(index: number): string {
  return `var(--chart-${(index % CHART_COLOR_COUNT) + 1})`;
}

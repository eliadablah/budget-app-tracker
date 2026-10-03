// src/budget/categoryLabels.ts
// What: turns the bank's category codes into words for emails
// ("FOOD_AND_DRINK" -> "Food & drink"). The frontend has its own copy in
// frontend/src/lib/budgetCategories.ts - keep the two in step.

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
  OTHER: "Other",
};

export const OTHER_CATEGORY = "OTHER";

export function categoryLabel(category: string): string {
  // Unknown codes still read fine: "SOME_NEW_THING" -> "Some new thing".
  return (
    LABELS[category] ??
    category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ")
  );
}

// src/lib/money.ts
// What: writes a dollar amount the same way in every email ("$1,234.50").

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

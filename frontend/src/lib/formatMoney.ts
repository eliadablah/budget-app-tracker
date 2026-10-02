// src/lib/formatMoney.ts
// What: turns a number into money text the same way everywhere on the
// dashboard. A missing amount shows as a dash.
//
// formatMoney      - exact, with cents ("$1,234.56"), for account rows
// formatMoneyWhole - rounded to whole dollars ("$1,235"), for the big
//                    headline tiles where cents are noise

function format(amount: number | null, currency: string | null, fractionDigits: number): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency ?? "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export function formatMoney(amount: number | null, currency: string | null = "USD"): string {
  return format(amount, currency, 2);
}

export function formatMoneyWhole(amount: number | null, currency: string | null = "USD"): string {
  return format(amount, currency, 0);
}

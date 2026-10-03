// src/components/budget/SpendingDonut.tsx
// What: a ring chart of this month's spending. Each colored arc is one
// category's share; the middle shows how much of the budget is used.
//
// How it's drawn (plain SVG, no chart library): every arc is a full circle
// outline with a dash pattern. The circle's radius is chosen so its outline
// is exactly 100 units long, which lets "strokeDasharray" take a percentage
// directly: "35 65" draws 35% of the ring and leaves 65% empty.
// "strokeDashoffset" then slides each arc round so they sit end to end.
//
// Props:
//   rows        - the categories, with what was spent and their colors
//   percentUsed - 0-100+ of the budget used, or null when no budget is set

import type { BudgetRow } from "../../lib/budgetMath";

// circumference = 2 x pi x r = 100 when r = 15.915
const RADIUS = 15.915;
// SVG starts drawing at 3 o'clock; a quarter turn back starts it at 12.
const START_AT_TOP = 25;

interface SpendingDonutProps {
  rows: BudgetRow[];
  percentUsed: number | null;
}

export function SpendingDonut({ rows, percentUsed }: SpendingDonutProps) {
  const total = rows.reduce((sum, r) => sum + r.spent, 0);
  let drawnSoFar = 0;

  return (
    <svg
      className="donut"
      viewBox="0 0 42 42"
      role="img"
      aria-label={
        percentUsed === null
          ? "Spending by category"
          : `Spending by category, ${percentUsed}% of budget used`
      }
    >
      <circle className="donut__track" cx="21" cy="21" r={RADIUS} />
      {total > 0 &&
        rows
          .filter((r) => r.spent > 0)
          .map((row) => {
            const share = (row.spent / total) * 100;
            const offset = START_AT_TOP - drawnSoFar;
            drawnSoFar += share;
            return (
              <circle
                key={row.category}
                className="donut__arc"
                cx="21"
                cy="21"
                r={RADIUS}
                stroke={row.color}
                strokeDasharray={`${share} ${100 - share}`}
                strokeDashoffset={offset}
              />
            );
          })}
      <text className="donut__value" x="21" y="21">
        {percentUsed === null ? "—" : `${percentUsed}%`}
      </text>
      <text className="donut__label" x="21" y="26">
        {percentUsed === null ? "no budget" : "used"}
      </text>
    </svg>
  );
}

// src/components/ui/StatTile.tsx
// What: one big headline number with a label, for the row across the top of
// the dashboard.
//
// Props:
//   label - what the number is ("Left to spend")
//   value - the number itself, already formatted; omit it when there is no
//           data yet and a dash is shown instead
//   hint  - optional small line under the number

import type { CSSProperties } from "react";

interface StatTileProps {
  label: string;
  value?: string;
  hint?: string;
}

export function StatTile({ label, value, hint }: StatTileProps) {
  const empty = value === undefined;
  const text = empty ? "—" : value;

  // The number's length is handed to the stylesheet (as --chars) so it can
  // shrink the type just enough for a long number to fit the tile, instead
  // of spilling out of it. See .stat-tile__value in index.css.
  const fit = { "--chars": text.length } as CSSProperties;

  return (
    <div className={`stat-tile${empty ? " stat-tile--empty" : ""}`}>
      <span className="stat-tile__label">{label}</span>
      <span className="stat-tile__value" style={fit}>
        {text}
      </span>
      {hint && <span className="stat-tile__hint">{hint}</span>}
    </div>
  );
}

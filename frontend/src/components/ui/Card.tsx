// src/components/ui/Card.tsx
// What: the titled box every dashboard section sits in, so all sections
// share one look.
//
// Props:
//   title     - heading shown at the top of the card
//   aside     - optional content on the right of the heading (a count, a
//               total, a button)
//   wide      - when true, the card stretches across the whole dashboard
//               instead of taking one column
//   className - optional extra layout class ("card--tall" to span two rows,
//               "card--span-2" to span two columns)
//   children  - the card's body

import type { ReactNode } from "react";

interface CardProps {
  title: string;
  aside?: ReactNode;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ title, aside, wide = false, className, children }: CardProps) {
  const classes = ["card", wide && "card--wide", className].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      <header className="card__header">
        <h2 className="card__title">{title}</h2>
        {aside && <div className="card__aside">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

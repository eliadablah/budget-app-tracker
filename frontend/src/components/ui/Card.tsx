// src/components/ui/Card.tsx
// What: the titled box every dashboard section sits in, so all sections
// share one look.
//
// Props:
//   title    - heading shown at the top of the card
//   aside    - optional content on the right of the heading (a count, a
//              badge, a button)
//   wide     - when true, the card stretches across the whole dashboard
//              instead of taking one column
//   children - the card's body

import type { ReactNode } from "react";

interface CardProps {
  title: string;
  aside?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}

export function Card({ title, aside, wide = false, children }: CardProps) {
  return (
    <section className={`card${wide ? " card--wide" : ""}`}>
      <header className="card__header">
        <h2 className="card__title">{title}</h2>
        {aside && <div className="card__aside">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

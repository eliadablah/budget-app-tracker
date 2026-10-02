// src/components/ui/Badge.tsx
// What: a small pill label, e.g. "Coming soon" on a card that isn't built
// yet.
//
// Props:
//   children - the label text

import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
}

export function Badge({ children }: BadgeProps) {
  return <span className="badge">{children}</span>;
}

// src/components/dashboard/ComingSoonCard.tsx
// What: a placeholder card for a dashboard section that isn't built yet, so
// the page already has its final shape and each section can be swapped for
// the real thing as it's finished.
//
// Props:
//   title       - the section's name ("Upcoming bills")
//   description - one line on what will live here

import { Badge, Card } from "../ui";

interface ComingSoonCardProps {
  title: string;
  description: string;
}

export function ComingSoonCard({ title, description }: ComingSoonCardProps) {
  return (
    <Card title={title} aside={<Badge>Coming soon</Badge>}>
      <p className="muted">{description}</p>
    </Card>
  );
}

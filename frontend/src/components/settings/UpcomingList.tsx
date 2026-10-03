// src/components/settings/UpcomingList.tsx
// What: the "Coming up next" box on the Notifications card - the next few
// reminder emails that are scheduled, soonest first.
//
// Props:
//   upcoming - the scheduled reminders

import { formatDue } from "../../lib/localDateTime";
import type { UpcomingNotification } from "../../types/settings";

interface UpcomingListProps {
  upcoming: UpcomingNotification[];
}

export function UpcomingList({ upcoming }: UpcomingListProps) {
  return (
    <div className="upcoming">
      <span className="upcoming__title">Coming up next</span>
      {upcoming.length === 0 ? (
        <p className="muted">Nothing scheduled. Add a reminder to a to-do or a bill.</p>
      ) : (
        <ul className="upcoming__list">
          {upcoming.map((item) => (
            <li key={`${item.kind}-${item.label}-${item.at}`}>
              <span>{`🔔 ${item.kind === "bill" ? "Bill: " : ""}${item.label}`}</span>
              <span className="upcoming__when">{formatDue(item.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

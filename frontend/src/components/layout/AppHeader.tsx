// src/components/layout/AppHeader.tsx
// What: the strip across the top of the dashboard - the current month in
// big type, today's date, and the log out button.
//
// Props:
//   onLogout - called when the log out button is clicked

interface AppHeaderProps {
  onLogout: () => void;
}

export function AppHeader({ onLogout }: AppHeaderProps) {
  const now = new Date();
  const month = now.toLocaleDateString(undefined, { month: "long" });
  const today = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="app-header">
      <div>
        <p className="app-header__eyebrow">Budget dashboard</p>
        <h1 className="app-header__month">{month}</h1>
        <p className="app-header__date">{today}</p>
      </div>
      <button type="button" className="button button--quiet" onClick={onLogout}>
        Log out
      </button>
    </header>
  );
}

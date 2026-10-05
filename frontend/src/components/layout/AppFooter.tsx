// src/components/layout/AppFooter.tsx
// What: the line at the very bottom of the app saying who built it and who
// owns it, with the current year.

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      {`Built and owned by Elikem Adablah · © ${year} · All rights reserved`}
    </footer>
  );
}

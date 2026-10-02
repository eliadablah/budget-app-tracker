// src/components/dashboard/Dashboard.tsx
// What: the one page you see after logging in - headline numbers on top,
// then a card for each part of the app (bills, budget, to-dos, accounts,
// transactions).
// It arranges the sections and hands each one its data; the sections
// themselves do the rendering.
//
// Props:
//   onSessionExpired - called when the login is no longer valid (or the
//                      user logs out), so App.tsx shows the login screen

import { useBanks } from "../../hooks/useBanks";
import { useTodos } from "../../hooks/useTodos";
import { useTransactions } from "../../hooks/useTransactions";
import { logout } from "../../lib/auth";
import { AccountsCard } from "../accounts/AccountsCard";
import { TransactionsCard } from "../transactions/TransactionsCard";
import { AppHeader } from "../layout/AppHeader";
import { TodoCard } from "../todos/TodoCard";
import { ComingSoonCard } from "./ComingSoonCard";
import { SummaryRow } from "./SummaryRow";

interface DashboardProps {
  onSessionExpired: () => void;
}

export function Dashboard({ onSessionExpired }: DashboardProps) {
  const { todos, loading, error, addTodo, toggleTodo, removeTodo } = useTodos(onSessionExpired);
  const banks = useBanks(onSessionExpired);
  const transactions = useTransactions(banks.banks.length, onSessionExpired);

  function handleLogout() {
    logout();
    onSessionExpired();
  }

  return (
    <main className="dashboard">
      <AppHeader onLogout={handleLogout} />

      <SummaryRow todos={todos} banks={banks.banks} transactions={transactions.transactions} />

      <div className="dashboard__grid">
        <ComingSoonCard
          title="Upcoming bills"
          description="Your bills with due dates, checked off as you pay them."
        />
        <ComingSoonCard
          title="Budget"
          description="What you planned to spend in each category, next to what you've spent."
        />
        <TodoCard
          todos={todos}
          loading={loading}
          error={error}
          onAdd={addTodo}
          onToggle={toggleTodo}
          onDelete={removeTodo}
        />
        <AccountsCard
          banks={banks.banks}
          loading={banks.loading}
          connecting={banks.connecting}
          error={banks.error}
          onConnect={banks.connectBank}
          onRemove={banks.removeBank}
        />
        <TransactionsCard
          transactions={transactions.transactions}
          loading={transactions.loading}
          error={transactions.error}
          hasBanks={banks.banks.length > 0}
        />
      </div>
    </main>
  );
}

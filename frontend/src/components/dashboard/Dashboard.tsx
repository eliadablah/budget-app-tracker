// src/components/dashboard/Dashboard.tsx
// What: the one page you see after logging in - headline numbers on top,
// then a card for each part of the app (bills, budget, to-dos, notification
// settings, accounts, transactions).
// It arranges the sections and hands each one its data; the sections
// themselves do the rendering.
//
// Layout (wide screens): Bills and Budget sit side by side, To-do runs down
// the right, Notifications fills the space under Bills and Budget, and
// Accounts and Transactions each take a full row.
//
// Props:
//   onSessionExpired - called when the login is no longer valid (or the
//                      user logs out), so App.tsx shows the login screen

import { useEffect } from "react";
import { useBanks } from "../../hooks/useBanks";
import { useBills } from "../../hooks/useBills";
import { useBudget } from "../../hooks/useBudget";
import { useNotificationSettings } from "../../hooks/useNotificationSettings";
import { useTodos } from "../../hooks/useTodos";
import { useTransactions } from "../../hooks/useTransactions";
import { logout } from "../../lib/auth";
import { countedTowardBills, suggestBillPayments } from "../../lib/matchBillPayments";
import { AccountsCard } from "../accounts/AccountsCard";
import { BillsCard } from "../bills/BillsCard";
import { BudgetCard } from "../budget/BudgetCard";
import { AppHeader } from "../layout/AppHeader";
import { NotificationsCard } from "../settings/NotificationsCard";
import { TodoCard } from "../todos/TodoCard";
import { TransactionsCard } from "../transactions/TransactionsCard";
import { SummaryRow } from "./SummaryRow";

interface DashboardProps {
  onSessionExpired: () => void;
}

export function Dashboard({ onSessionExpired }: DashboardProps) {
  const { todos, loading, error, addTodo, toggleTodo, removeTodo, clearReminder } =
    useTodos(onSessionExpired);
  const banks = useBanks(onSessionExpired);
  const transactions = useTransactions(banks.banks.length, onSessionExpired);
  const bills = useBills(onSessionExpired);
  const budget = useBudget(onSessionExpired);
  const notifications = useNotificationSettings(onSessionExpired);

  // The "Coming up next" list depends on to-do and bill reminders, so
  // re-read it whenever either list changes.
  const reloadNotifications = notifications.reload;
  useEffect(() => {
    reloadNotifications();
  }, [todos, bills.bills, reloadNotifications]);

  const suggestions = suggestBillPayments(
    bills.bills,
    transactions.transactions,
    bills.dismissedIds
  );

  function handleLogout() {
    logout();
    onSessionExpired();
  }

  return (
    <main className="dashboard">
      <AppHeader onLogout={handleLogout} />

      <SummaryRow
        todos={todos}
        banks={banks.banks}
        transactions={transactions.transactions}
        limits={budget.limits}
        bills={bills.bills}
      />

      <div className="dashboard__grid">
        <BillsCard
          bills={bills.bills}
          suggestions={suggestions}
          loading={bills.loading}
          error={bills.error}
          onAdd={bills.addBill}
          onEdit={bills.editBill}
          onDelete={bills.removeBill}
          onPay={bills.pay}
          onDismiss={bills.dismiss}
        />
        <BudgetCard
          transactions={transactions.transactions}
          limits={budget.limits}
          hasBanks={banks.banks.length > 0}
          loading={budget.loading || transactions.loading}
          saving={budget.saving}
          error={budget.error}
          onSaveLimits={budget.saveLimits}
        />
        <TodoCard
          todos={todos}
          loading={loading}
          error={error}
          onAdd={addTodo}
          onToggle={toggleTodo}
          onDelete={removeTodo}
          onClearReminder={clearReminder}
        />
        <NotificationsCard
          settings={notifications.settings}
          loading={notifications.loading}
          error={notifications.error}
          busy={notifications.busy}
          testState={notifications.testState}
          onToggle={notifications.toggle}
          onSendTest={notifications.sendTest}
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
          billNames={countedTowardBills(bills.bills)}
          loading={transactions.loading}
          error={transactions.error}
          hasBanks={banks.banks.length > 0}
        />
      </div>
    </main>
  );
}

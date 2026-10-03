// src/types/settings.ts
// What: notification settings as the backend returns them. Mirrors
// NotificationSettingsView in backend/src/types/settings.ts.

// One switch per kind of email.
export type NotificationKind = "todoReminders" | "billReminders" | "budgetAlerts" | "dailySummary";

export interface UpcomingNotification {
  kind: "todo" | "bill";
  label: string;
  at: string; // ISO 8601
}

export interface NotificationSettings {
  email: string | null; // where emails go, or null if email isn't set up
  todoReminders: boolean;
  billReminders: boolean;
  budgetAlerts: boolean;
  dailySummary: boolean;
  sentToday: number;
  dailyLimit: number;
  upcoming: UpcomingNotification[];
}

// src/types/settings.ts
// What: the shape of a user's notification settings. Stored in the same
// table as everything else, under sk "SETTINGS#notifications".
//
// Two shapes on purpose:
//   NotificationSettings     - what is stored in DynamoDB
//   NotificationSettingsView - what the browser gets (adds the address
//                              emails go to, today's count and what's next)

export const SETTINGS_SK = "SETTINGS#notifications";

// One switch per kind of email. Everything is off until switched on.
export const NOTIFICATION_KINDS = [
  "todoReminders",
  "billReminders",
  "budgetAlerts",
  "dailySummary",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface NotificationSettings {
  pk: string; // "USER#<id>"
  sk: typeof SETTINGS_SK;
  todoReminders?: boolean;
  billReminders?: boolean;
  budgetAlerts?: boolean;
  dailySummary?: boolean;
  // The single on/off switch from before there were separate kinds. Still
  // honoured for to-do reminders so nobody's reminders silently turn off.
  emailEnabled?: boolean;
}

// Is this kind of email switched on?
export function isOn(settings: NotificationSettings | undefined, kind: NotificationKind): boolean {
  if (!settings) return false;
  const value = settings[kind];
  if (value !== undefined) return value;
  return kind === "todoReminders" ? settings.emailEnabled === true : false;
}

// One email that is scheduled to go out.
export interface UpcomingNotification {
  kind: "todo" | "bill";
  label: string;
  at: string; // ISO 8601 UTC
}

export interface NotificationSettingsView {
  email: string | null; // where emails go, or null if email isn't set up
  todoReminders: boolean;
  billReminders: boolean;
  budgetAlerts: boolean;
  dailySummary: boolean;
  sentToday: number;
  dailyLimit: number;
  upcoming: UpcomingNotification[];
}

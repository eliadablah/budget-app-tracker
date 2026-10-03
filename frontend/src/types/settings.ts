// src/types/settings.ts
// What: notification settings as the backend returns them. Mirrors
// NotificationSettingsView in backend/src/types/settings.ts.

export interface NotificationSettings {
  email: string | null; // where reminders go, or null if email isn't set up
  emailEnabled: boolean;
}

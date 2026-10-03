// src/types/settings.ts
// What: the shape of a user's notification settings. Stored in the same
// table as everything else, under sk "SETTINGS#notifications".
//
// Two shapes on purpose:
//   NotificationSettings     - what is stored in DynamoDB
//   NotificationSettingsView - what the browser gets (adds the address
//                              emails go to, which comes from Terraform)

export const SETTINGS_SK = "SETTINGS#notifications";

export interface NotificationSettings {
  pk: string; // "USER#<id>"
  sk: typeof SETTINGS_SK;
  emailEnabled: boolean; // the master switch - nothing is emailed while false
}

export interface NotificationSettingsView {
  email: string | null; // where reminders go, or null if email isn't set up
  emailEnabled: boolean;
}

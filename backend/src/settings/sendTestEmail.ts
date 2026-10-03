// src/settings/sendTestEmail.ts
// What: sends one test email, so the user can check that notification
// emails actually arrive (and aren't landing in spam). Counts toward the
// daily limit like any other email.

import { reserveSendSlot } from "../lib/dailySendCap";
import { sendNotificationEmail } from "../lib/email";
import { HttpError } from "../lib/http";

export async function sendTestEmail(userId: string): Promise<void> {
  if (!(await reserveSendSlot(userId))) {
    throw new HttpError(429, "Daily email limit reached. Try again tomorrow.");
  }
  await sendNotificationEmail(
    "Test email from your budget app",
    [
      "This is a test.",
      "",
      "If you're reading this in your inbox, reminder emails are working.",
      "If it landed in Spam or Promotions, mark it \"Not spam\" so the real ones don't.",
    ].join("\n")
  );
}

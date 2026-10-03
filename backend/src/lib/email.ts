// src/lib/email.ts
// What: the ONE place that sends notification emails, through Amazon SES.
// Everything else calls sendNotificationEmail() instead of talking to AWS
// directly, so the delivery method could be swapped later by changing only
// this file.
//
// Both addresses come from Terraform (never typed into the code):
//   REMINDER_FROM  - who the email is from, on our own domain
//                    (e.g. reminders@eliadablah.com), so inboxes trust it
//   REMINDER_EMAIL - the one inbox notifications go to
// They are checked when sending, not when the file loads, so the rest of
// the API keeps working even if email isn't set up.

import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

const client = new SESv2Client({});
const FROM = process.env.REMINDER_FROM ?? "";
export const REMINDER_EMAIL = process.env.REMINDER_EMAIL ?? "";

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email notifications are not set up (REMINDER_FROM or REMINDER_EMAIL is empty)");
    this.name = "EmailNotConfiguredError";
  }
}

export function emailConfigured(): boolean {
  return FROM !== "" && REMINDER_EMAIL !== "";
}

export async function sendNotificationEmail(subject: string, body: string): Promise<void> {
  if (!emailConfigured()) throw new EmailNotConfiguredError();

  await client.send(
    new SendEmailCommand({
      FromEmailAddress: FROM,
      Destination: { ToAddresses: [REMINDER_EMAIL] },
      Content: {
        Simple: {
          Subject: { Data: subject },
          Body: { Text: { Data: body } },
        },
      },
    })
  );
}

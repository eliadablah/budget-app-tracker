// src/lib/plaidLink.ts
// What: opens Plaid's bank-login pop-up ("Plaid Link"). The bank username
// and password are typed into Plaid's window, never into this app - all
// this app gets back is a one-time token to hand to the backend.

const PLAID_SCRIPT_URL = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";

export interface PlaidLinkResult {
  publicToken: string;
  institutionName: string;
}

// Plaid's script is only downloaded the first time a bank is connected,
// not on every page load.
let scriptLoading: Promise<void> | undefined;

function loadPlaidScript(): Promise<void> {
  if (!scriptLoading) {
    scriptLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PLAID_SCRIPT_URL;
      script.onload = () => resolve();
      script.onerror = () => {
        // Forget the failure so a later click can try again.
        scriptLoading = undefined;
        reject(new Error("Could not load Plaid"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptLoading;
}

// Opens the pop-up and waits. Resolves with the result once a bank is
// connected, or with null if the pop-up is closed without finishing.
export async function openPlaidLink(linkToken: string): Promise<PlaidLinkResult | null> {
  await loadPlaidScript();
  const plaid = window.Plaid;
  if (!plaid) throw new Error("Could not load Plaid");

  return new Promise((resolve) => {
    const handler = plaid.create({
      token: linkToken,
      onSuccess: (publicToken, metadata) => {
        resolve({ publicToken, institutionName: metadata.institution?.name ?? "Bank" });
        handler.destroy();
      },
      onExit: () => {
        resolve(null);
        handler.destroy();
      },
    });
    handler.open();
  });
}

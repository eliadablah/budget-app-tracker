// src/types/plaid.d.ts
// What: tells TypeScript about `window.Plaid`, the object Plaid's own script
// (loaded in lib/plaidLink.ts) adds to the page. Only the small part this
// app uses is described.

interface PlaidLinkMetadata {
  institution: { name: string; institution_id: string } | null;
}

interface PlaidLinkHandler {
  open: () => void;
  destroy: () => void;
}

interface PlaidLinkOptions {
  token: string;
  onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void;
  onExit: () => void;
}

interface Window {
  Plaid?: {
    create: (options: PlaidLinkOptions) => PlaidLinkHandler;
  };
}

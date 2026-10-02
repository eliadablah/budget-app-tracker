// src/components/accounts/AccountsCard.tsx
// What: the accounts section of the dashboard - every connected bank with
// its accounts and balances, plus the button that connects another bank.
// Holds no data of its own; everything comes from the useBanks hook via
// the dashboard.
//
// Props:
//   banks      - connected banks with their accounts
//   loading    - true while the list is first being fetched
//   connecting - true while a bank is being connected
//   error      - a message to show if something failed, or null
//   onConnect  - called when "Connect a bank" is clicked
//   onRemove   - called when a bank's remove button is clicked

import type { Bank } from "../../types/bank";
import { Card } from "../ui";
import { BankGroup } from "./BankGroup";

interface AccountsCardProps {
  banks: Bank[];
  loading: boolean;
  connecting: boolean;
  error: string | null;
  onConnect: () => void;
  onRemove: (bank: Bank) => void;
}

export function AccountsCard({
  banks,
  loading,
  connecting,
  error,
  onConnect,
  onRemove,
}: AccountsCardProps) {
  // Removing a bank can't be undone from here (it has to be reconnected),
  // so it asks first.
  function handleRemove(bank: Bank) {
    if (window.confirm(`Remove ${bank.institutionName} from your dashboard?`)) {
      onRemove(bank);
    }
  }

  return (
    <Card title="Accounts">
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : banks.length === 0 ? (
        <p className="empty-state">Connect a bank to see your balances here.</p>
      ) : (
        banks.map((bank) => <BankGroup key={bank.id} bank={bank} onRemove={handleRemove} />)
      )}

      <button
        type="button"
        className="button button--primary button--block"
        onClick={onConnect}
        disabled={connecting}
      >
        {connecting ? "Connecting…" : banks.length === 0 ? "Connect a bank" : "Connect another bank"}
      </button>
    </Card>
  );
}

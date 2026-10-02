// src/components/accounts/BankGroup.tsx
// What: one connected bank - its name, a remove button, and the list of
// its accounts (or a message if they couldn't be loaded).
//
// Props:
//   bank     - the bank and its accounts
//   onRemove - called when the remove button is clicked

import type { Bank } from "../../types/bank";
import { TrashIcon } from "../ui";
import { AccountRow } from "./AccountRow";

interface BankGroupProps {
  bank: Bank;
  onRemove: (bank: Bank) => void;
}

export function BankGroup({ bank, onRemove }: BankGroupProps) {
  return (
    <div className="bank-group">
      <div className="bank-group__header">
        <h3 className="bank-group__name">{bank.institutionName}</h3>
        <button
          type="button"
          className="icon-button"
          aria-label={`Remove ${bank.institutionName}`}
          onClick={() => onRemove(bank)}
        >
          <TrashIcon />
        </button>
      </div>

      {bank.error ? (
        <p className="error">{bank.error}</p>
      ) : (
        <ul className="account-list">
          {bank.accounts.map((account) => (
            <AccountRow key={account.id} account={account} />
          ))}
        </ul>
      )}
    </div>
  );
}

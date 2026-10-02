// src/components/accounts/AccountRow.tsx
// What: one bank account on a line - its name, what kind of account it is,
// the last digits of its number, and its balance.
//
// Props:
//   account - the account to show

import { formatMoney } from "../../lib/formatMoney";
import type { BankAccount } from "../../types/bank";

interface AccountRowProps {
  account: BankAccount;
}

export function AccountRow({ account }: AccountRowProps) {
  // e.g. "checking ·· 0000" - whichever parts the bank provided.
  const details = [account.subtype ?? account.type, account.mask && `·· ${account.mask}`]
    .filter(Boolean)
    .join(" ");

  return (
    <li className="account-row">
      <div className="account-row__text">
        <span className="account-row__name">{account.name}</span>
        <span className="account-row__details">{details}</span>
      </div>
      <span className="account-row__balance">{formatMoney(account.balance, account.currency)}</span>
    </li>
  );
}

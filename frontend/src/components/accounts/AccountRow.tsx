// src/components/accounts/AccountRow.tsx
// What: one bank account as a tile - its name, what kind of account it is,
// the last digits of its number, and its balance in big type. Tiles sit
// side by side in a row (see .account-list in index.css).
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
    <li className="account-tile">
      <span className="account-tile__name">{account.name}</span>
      <span className="account-tile__details">{details}</span>
      <span className="account-tile__balance">{formatMoney(account.balance, account.currency)}</span>
    </li>
  );
}

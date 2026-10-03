// src/components/accounts/AccountsSummary.tsx
// What: the totals at the top of the Accounts card - everything you have
// across all banks, split into cash, savings and investments, and what you
// owe on cards and loans.
//
// How accounts are sorted (by the bank's own account type):
//   cash    - "depository" accounts that are checking
//   savings - every other "depository" account, plus "investment"
//   owed    - "credit" and "loan" accounts (a balance there is money owed)
//
// Props:
//   banks - connected banks with their accounts

import { formatMoneyWhole } from "../../lib/formatMoney";
import type { Bank } from "../../types/bank";

interface AccountsSummaryProps {
  banks: Bank[];
}

export function AccountsSummary({ banks }: AccountsSummaryProps) {
  let cash = 0;
  let savings = 0;
  let owed = 0;

  for (const account of banks.flatMap((bank) => bank.accounts)) {
    const balance = account.balance ?? 0;
    if (account.type === "credit" || account.type === "loan") owed += balance;
    else if (account.type === "depository" && account.subtype === "checking") cash += balance;
    else if (account.type === "depository" || account.type === "investment") savings += balance;
  }

  return (
    <div className="accounts-summary">
      <div className="accounts-summary__total">
        <strong>{formatMoneyWhole(cash + savings)}</strong>
        <span>{`in your accounts across ${banks.length} ${banks.length === 1 ? "bank" : "banks"}`}</span>
      </div>
      <dl className="accounts-summary__parts">
        <div>
          <dt>Cash</dt>
          <dd>{formatMoneyWhole(cash)}</dd>
        </div>
        <div>
          <dt>Savings and investments</dt>
          <dd>{formatMoneyWhole(savings)}</dd>
        </div>
        <div>
          <dt>Owed on cards and loans</dt>
          <dd className={owed > 0 ? "accounts-summary__owed" : undefined}>{formatMoneyWhole(owed)}</dd>
        </div>
      </dl>
    </div>
  );
}

import { StatusBadge } from "@/shared/components/status-badge";

import { describeFinancialState } from "../services/money-state";
import type { FinancialState } from "../types/payment-treasury";

export function MoneyStatusBadge({ state }: { state: FinancialState }) {
  const descriptor = describeFinancialState(state);
  return (
    <StatusBadge tone={descriptor.tone}>
      <span title={descriptor.guidance}>{descriptor.label}</span>
    </StatusBadge>
  );
}

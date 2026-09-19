import type { StatusTone } from "@/shared/components/status-badge";

import type {
  AssessmentStatus,
  CollectionStatus,
  FinancialRecordKind,
  FinancialState,
  GovernmentReceiptStatus,
  PaymentAttemptStatus,
  PhpAmount,
  ProviderAcknowledgmentStatus,
  SettlementStatus,
  TreasurySettlement,
} from "../types/payment-treasury";

export type MoneyStateDescriptor = {
  label: string;
  tone: StatusTone;
  guidance: string;
};

export const FINANCIAL_LIFECYCLE_ORDER: readonly FinancialRecordKind[] = [
  "assessment",
  "attempt",
  "provider-acknowledgment",
  "collection",
  "government-receipt",
  "settlement",
];

export const FINANCIAL_RECORD_LABELS: Record<FinancialRecordKind, string> = {
  assessment: "Assessment",
  attempt: "Payment attempt",
  "provider-acknowledgment": "Provider acknowledgment",
  collection: "Confirmed collection",
  "government-receipt": "Government receipt",
  settlement: "Treasury settlement",
};

const ASSESSMENT: Record<AssessmentStatus, MoneyStateDescriptor> = {
  draft: { label: "Draft", tone: "neutral", guidance: "The fee breakdown is still being prepared." },
  issued: { label: "Due", tone: "pending", guidance: "The assessment is payable but no collection is implied." },
  "partially-paid": {
    label: "Partially paid",
    tone: "warning",
    guidance: "A balance remains and the assessment policy permits partial allocation.",
  },
  paid: { label: "Paid", tone: "success", guidance: "Confirmed collections fully cover this assessment." },
  expired: { label: "Expired", tone: "warning", guidance: "Reassessment is required before another attempt." },
  revised: {
    label: "Revised",
    tone: "neutral",
    guidance: "A newer assessment replaced this amount and rule snapshot.",
  },
  waived: { label: "Waived", tone: "success", guidance: "An approved exemption leaves no amount to collect." },
};

const ATTEMPT: Record<PaymentAttemptStatus, MoneyStateDescriptor> = {
  created: { label: "Created", tone: "neutral", guidance: "Checkout was prepared; no provider result exists." },
  pending: { label: "Pending", tone: "pending", guidance: "Recheck this attempt before offering another try." },
  "confirmation-uncertain": {
    label: "Confirmation uncertain",
    tone: "warning",
    guidance: "The result is unknown; do not claim a collection or start a duplicate attempt.",
  },
  confirmed: {
    label: "Provider confirmed",
    tone: "success",
    guidance: "The attempt succeeded, but the confirmed collection remains a separate ledger record.",
  },
  failed: {
    label: "Failed",
    tone: "destructive",
    guidance: "No collection was created; recovery may offer another channel.",
  },
  cancelled: { label: "Cancelled", tone: "neutral", guidance: "The attempt ended without a collection." },
};

const ACKNOWLEDGMENT: Record<ProviderAcknowledgmentStatus, MoneyStateDescriptor> = {
  pending: { label: "Awaiting provider", tone: "pending", guidance: "No provider message has arrived." },
  received: {
    label: "Acknowledgment received",
    tone: "success",
    guidance: "This provider message is not a confirmed collection or government receipt.",
  },
  rejected: {
    label: "Provider rejected",
    tone: "destructive",
    guidance: "The provider did not accept the sample request.",
  },
};

const COLLECTION: Record<CollectionStatus, MoneyStateDescriptor> = {
  confirmed: { label: "Confirmed", tone: "success", guidance: "A unique event created one collection record." },
  "partially-allocated": {
    label: "Partially allocated",
    tone: "warning",
    guidance: "Part of the collection still needs an allowed assessment allocation.",
  },
  allocated: {
    label: "Allocated",
    tone: "success",
    guidance: "The full collection is assigned to governed assessments.",
  },
  "partially-refunded": {
    label: "Partially refunded",
    tone: "warning",
    guidance: "A linked adjustment returned part of the collection without erasing it.",
  },
  refunded: { label: "Refunded", tone: "warning", guidance: "Linked adjustments returned the allowed amount." },
  reversed: {
    label: "Reversed",
    tone: "destructive",
    guidance: "A later event reversed the collection; history remains.",
  },
  "charged-back": {
    label: "Charged back",
    tone: "destructive",
    guidance: "A later provider event disputed the collection and requires review.",
  },
};

const RECEIPT: Record<GovernmentReceiptStatus, MoneyStateDescriptor> = {
  preview: { label: "Sample preview", tone: "neutral", guidance: "This watermarked preview is not an issued receipt." },
  issued: {
    label: "Sample issued",
    tone: "success",
    guidance: "A receipt is linked to one confirmed collection.",
  },
  voided: {
    label: "Voided",
    tone: "destructive",
    guidance: "The receipt remains in history and cannot prove an active collection.",
  },
  replaced: { label: "Replaced", tone: "neutral", guidance: "A linked receipt supersedes this sample document." },
};

const SETTLEMENT: Record<SettlementStatus, MoneyStateDescriptor> = {
  pending: {
    label: "Pending settlement",
    tone: "pending",
    guidance: "The confirmed collection has not yet been matched to a bank credit.",
  },
  "partially-matched": {
    label: "Partially matched",
    tone: "warning",
    guidance: "Some settlement lines still need Treasury review.",
  },
  matched: { label: "Matched", tone: "success", guidance: "Gross, provider charge, net, and bank credit reconcile." },
  exception: { label: "Exception", tone: "destructive", guidance: "A difference remains assigned for investigation." },
};

export function describeFinancialState(state: FinancialState): MoneyStateDescriptor {
  switch (state.kind) {
    case "assessment":
      return ASSESSMENT[state.status];
    case "attempt":
      return ATTEMPT[state.status];
    case "provider-acknowledgment":
      return ACKNOWLEDGMENT[state.status];
    case "collection":
      return COLLECTION[state.status];
    case "government-receipt":
      return RECEIPT[state.status];
    case "settlement":
      return SETTLEMENT[state.status];
  }
}

export function createPhpAmount(minorUnits: number): PhpAmount {
  if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) {
    throw new RangeError("PHP amounts must use a non-negative integer number of centavos.");
  }
  return { currency: "PHP", minorUnits };
}

export function expectedSettlementNetMinorUnits(settlement: TreasurySettlement): number {
  return settlement.grossAmount.minorUnits - settlement.providerCharge.minorUnits;
}

export function settlementDifferenceMinorUnits(settlement: TreasurySettlement): number {
  return settlement.bankCreditAmount.minorUnits - settlement.netAmount.minorUnits;
}

export function settlementBalances(settlement: TreasurySettlement): boolean {
  return (
    expectedSettlementNetMinorUnits(settlement) === settlement.netAmount.minorUnits &&
    settlementDifferenceMinorUnits(settlement) === 0
  );
}

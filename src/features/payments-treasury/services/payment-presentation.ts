import type { PaymentChannel, PaymentLedgerRecord, PaymentLedgerScenario } from "../types/payment-treasury";

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

export function formatPhp(minorUnits: number): string {
  return phpFormatter.format(minorUnits / 100);
}

export function parsePhpInput(value: string): number | null {
  const normalized = value.trim().replaceAll(",", "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, decimal = ""] = normalized.split(".");
  const minorUnits = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(minorUnits) && minorUnits >= 0 ? minorUnits : null;
}

export function phpInputValue(minorUnits: number): string {
  return `${Math.floor(minorUnits / 100)}.${String(minorUnits % 100).padStart(2, "0")}`;
}

export const PAYMENT_CHANNEL_LABELS: Record<PaymentChannel, string> = {
  "mock-e-wallet": "GCash / e-wallet",
  "mock-bank": "Online bank transfer",
  cashier: "Cashier counter",
};

export function displayFinancialReference(reference: string): string {
  return reference
    .replace(/^DEMO-/, "")
    .replace(/^SAMPLE-OR-/, "OR-")
    .replace(/^SAMPLE-BANK-/, "BANK-")
    .replace(/^SAMPLE-PROVIDER-/, "PAY-")
    .replace(/^SAMPLE-CASHIER-/, "CASH-");
}

export const PAYMENT_SCENARIO_DETAILS: Record<PaymentLedgerScenario, { label: string; description: string }> = {
  "issued-assessment": {
    label: "Issued assessment",
    description: "A source module created the charge; no payment attempt or collection exists yet.",
  },
  "confirmed-and-replay-safe": {
    label: "Confirmed and replay-safe",
    description: "A confirmed collection and receipt remain unchanged when the same event is replayed.",
  },
  "pending-timeout": {
    label: "Confirmation uncertain",
    description: "The payer must recheck the pending attempt before another checkout can begin.",
  },
  "failed-attempt": {
    label: "Failed provider attempt",
    description: "A failed attempt has no confirmed collection or government receipt.",
  },
  "partial-payment": {
    label: "Allowed partial payment",
    description: "A confirmed allocation is retained while the remaining balance stays due.",
  },
  overpayment: {
    label: "Overpayment awaiting allocation",
    description: "The extra amount remains unallocated and is held from account mapping.",
  },
  "partial-disallowed": {
    label: "Partial payment blocked",
    description: "The attempted amount is rejected because the assessment requires the full balance.",
  },
  chargeback: {
    label: "Chargeback and voided receipt",
    description: "The collection stays in history while its chargeback and voided receipt remain visible.",
  },
  "unmatched-deposit": {
    label: "Unmatched settlement",
    description: "The collection remains held until the bank evidence exactly matches provider net.",
  },
};

export function paymentScenarioRoute(record: PaymentLedgerRecord): string {
  const unresolvedAttempt = record.lifecycle.attempts.find((attempt) =>
    ["created", "pending", "confirmation-uncertain", "failed"].includes(attempt.status),
  );
  if (unresolvedAttempt) return `/payments/attempts/${unresolvedAttempt.envelope.id}`;
  const receipt = record.lifecycle.receipts.at(-1);
  if (receipt) return `/payments/receipts/${receipt.envelope.id}`;
  return `/payments/assessments/${record.lifecycle.assessment.envelope.id}`;
}

export function sourceServiceRoute(record: PaymentLedgerRecord): string {
  const module = record.lifecycle.assessment.serviceModule;
  if (module.startsWith("M03")) return "/services/business-permits";
  if (module.startsWith("M04")) return "/services/tourism-registration";
  if (module.startsWith("M07")) return "/services/barangay-certificates";
  return "/services";
}

export function confirmationEventId(attemptId: string): string {
  return `DEMO-EVT-PAY-${attemptId.replace("DEMO-ATT-", "")}`;
}

import type { RecordEnvelope } from "@/shared/data/record-envelope";

/** Monetary values stay in integer centavos so UI math never depends on floating point. */
export type PhpAmount = Readonly<{
  currency: "PHP";
  minorUnits: number;
}>;

export type AssessmentStatus = "draft" | "issued" | "partially-paid" | "paid" | "expired" | "revised" | "waived";
export type PaymentAttemptStatus =
  | "created"
  | "pending"
  | "confirmation-uncertain"
  | "confirmed"
  | "failed"
  | "cancelled";
export type ProviderAcknowledgmentStatus = "pending" | "received" | "rejected";
export type CollectionStatus =
  | "confirmed"
  | "partially-allocated"
  | "allocated"
  | "partially-refunded"
  | "refunded"
  | "reversed"
  | "charged-back";
export type GovernmentReceiptStatus = "preview" | "issued" | "voided" | "replaced";
export type SettlementStatus = "pending" | "partially-matched" | "matched" | "exception";
export type AdjustmentType = "refund" | "void" | "reversal" | "chargeback";
export type AdjustmentStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "processing"
  | "completed"
  | "failed"
  | "withdrawn";
export type PaymentLedgerScenario =
  | "issued-assessment"
  | "confirmed-and-replay-safe"
  | "pending-timeout"
  | "failed-attempt"
  | "partial-payment"
  | "overpayment"
  | "partial-disallowed"
  | "chargeback"
  | "unmatched-deposit";

export type PaymentChannel = "mock-e-wallet" | "mock-bank" | "cashier";
export type PayeeKind = "municipal" | "barangay" | "private-operator";
export type PayerKind = "person" | "business" | "representative";

export type PayeeRef = {
  id: string;
  kind: PayeeKind;
  label: string;
};

export type PayerRef = {
  id: string;
  kind: PayerKind;
  label: string;
};

export type AssessmentLineItem = {
  id: string;
  label: string;
  basis: string;
  effect: "add" | "subtract";
  amount: PhpAmount;
};

export type AssessmentIssueInput = {
  serviceModule: "M03 Business permits" | "M04 Tourism" | "M07 Barangay clearances";
  serviceReference: string;
  payer: PayerRef;
  payee: PayeeRef;
  ruleVersion: string;
  lineItems: readonly AssessmentLineItem[];
  partialPaymentPolicy: "allowed" | "disallowed";
  dueAt: string;
};

/** A service charge and its rule snapshot. It is not evidence that money moved. */
export type PaymentAssessment = {
  envelope: RecordEnvelope;
  status: AssessmentStatus;
  serviceModule: string;
  serviceReference: string;
  payer: PayerRef;
  payee: PayeeRef;
  ruleVersion: string;
  lineItems: readonly AssessmentLineItem[];
  total: PhpAmount;
  allocated: PhpAmount;
  balance: PhpAmount;
  partialPaymentPolicy: "allowed" | "disallowed";
  dueAt: string;
  exemptionNote?: string;
  supersededByAssessmentId?: string;
};

/** One checkout try. A confirmed attempt still needs a separate confirmed collection record. */
export type PaymentAttempt = {
  envelope: RecordEnvelope;
  status: PaymentAttemptStatus;
  assessmentId: string;
  payerId: string;
  payeeId: string;
  channel: PaymentChannel;
  requestedAmount: PhpAmount;
  startedAt: string;
  lastCheckedAt?: string;
  sampleExternalReference?: string;
  failureCode?: string;
};

/** Provider-facing message. It is informational and never serves as a government receipt. */
export type ProviderAcknowledgment = {
  envelope: RecordEnvelope;
  status: ProviderAcknowledgmentStatus;
  attemptId: string;
  providerLabel: string;
  sampleExternalReference: string;
  eventId?: string;
  receivedAt?: string;
  message: string;
};

/** Authoritative payment fact inside the demo ledger, created from one stable event ID. */
export type ConfirmedCollection = {
  envelope: RecordEnvelope;
  status: CollectionStatus;
  assessmentId: string;
  attemptId?: string;
  acknowledgmentId?: string;
  payerId: string;
  payeeId: string;
  channel: PaymentChannel;
  confirmationEventId: string;
  grossAmount: PhpAmount;
  allocatedAmount: PhpAmount;
  unallocatedAmount: PhpAmount;
  confirmedAt: string;
};

/** A sample municipal receipt record linked to a collection, never to a browser redirect. */
export type GovernmentReceipt = {
  envelope: RecordEnvelope;
  status: GovernmentReceiptStatus;
  collectionId: string;
  receiptNumber: string;
  amount: PhpAmount;
  issuedAt?: string;
  issuedBy?: string;
  replacedByReceiptId?: string;
  watermark: string;
};

export type SettlementLine = {
  id: string;
  collectionId: string;
  grossAmount: PhpAmount;
  providerCharge: PhpAmount;
  netAmount: PhpAmount;
  status: "unmatched" | "matched" | "difference";
};

/** Provider and bank comparison. Settlement does not rewrite the confirmed collection. */
export type TreasurySettlement = {
  envelope: RecordEnvelope;
  status: SettlementStatus;
  providerLabel: string;
  periodFrom: string;
  periodTo: string;
  lines: readonly SettlementLine[];
  grossAmount: PhpAmount;
  providerCharge: PhpAmount;
  netAmount: PhpAmount;
  bankCreditAmount: PhpAmount;
  sampleBankReference?: string;
  bankDate?: string;
  assignedTo?: string;
  assignmentReason?: string;
};

export type ReconciliationEvent = {
  id: string;
  settlementId: string;
  action: "assigned" | "bank-credit-corrected";
  actor: string;
  reason: string;
  recordedAt: string;
  fromStatus: SettlementStatus;
  toStatus: SettlementStatus;
  previousBankCreditAmount: PhpAmount;
  bankCreditAmount: PhpAmount;
  assignedTo?: string;
  eventId?: string;
};

/** An append-only request/result linked to a collection. It never edits the collection amount. */
export type PaymentAdjustment = {
  envelope: RecordEnvelope;
  type: AdjustmentType;
  status: AdjustmentStatus;
  collectionId: string;
  requestedAmount: PhpAmount;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resultEventId?: string;
};

export type LedgerDiagnostic = {
  id: string;
  kind: "duplicate-event";
  eventId: string;
  message: string;
  recordedAt: string;
};

/** Links the separate records without merging their identities or lifecycles. */
export type PaymentLifecycle = {
  assessment: PaymentAssessment;
  attempts: readonly PaymentAttempt[];
  acknowledgments: readonly ProviderAcknowledgment[];
  collections: readonly ConfirmedCollection[];
  receipts: readonly GovernmentReceipt[];
  settlements: readonly TreasurySettlement[];
};

export type PaymentLedgerRecord = {
  scenario: PaymentLedgerScenario;
  lifecycle: PaymentLifecycle;
  adjustments: readonly PaymentAdjustment[];
  reconciliationEvents: readonly ReconciliationEvent[];
  diagnostics: readonly LedgerDiagnostic[];
};

export type LedgerEventResult = {
  outcome: "confirmed" | "duplicate";
  eventId: string;
  record: PaymentLedgerRecord;
};

/** Totals for a collection slice such as the demo day or current cashier session. */
export type CollectionTotals = {
  collectionCount: number;
  grossMinorUnits: number;
  allocatedMinorUnits: number;
  unallocatedMinorUnits: number;
};

/** Result of one atomic local cashier posting. */
export type CashPostingResult = LedgerEventResult & {
  attemptId: string;
  collectionId: string;
  receiptId: string;
};

export type CheckoutStartResult = {
  outcome: "created" | "existing";
  attempt: PaymentAttempt;
  record: PaymentLedgerRecord;
};

export type SettlementActionResult = {
  outcome: "assigned" | "matched" | "duplicate";
  settlementId: string;
  record: PaymentLedgerRecord;
};

export type AdjustmentReviewDecision = "approve" | "reject";

export type PaymentSourceModuleId = "M03" | "M04" | "M07";
export type SourcePaymentGateStatus = "satisfied" | "partial" | "pending" | "exception";

/** Minimal M06 result returned to a service module without deciding its workflow. */
export type SourceModulePaymentProjection = {
  moduleId: PaymentSourceModuleId;
  moduleLabel: string;
  serviceReference: string;
  sourceRoute: string;
  assessmentId: string;
  paymentGateStatus: SourcePaymentGateStatus;
  paymentGateLabel: string;
  sourceDecisionLabel: string;
  guidance: string;
  payeeBoundary: string;
};

export type RevenuePostingReadiness =
  | "ready-for-mapping"
  | "held-reconciliation"
  | "held-unallocated"
  | "held-adjustment"
  | "excluded-private-payee";

/** Read-only M14 adapter row. It is not an accounting entry or journal line. */
export type RevenuePostingSummary = {
  postingReference: string;
  collectionId: string;
  assessmentId: string;
  serviceReference: string;
  moduleId: PaymentSourceModuleId;
  payeeLabel: string;
  grossAmount: PhpAmount;
  allocatedAmount: PhpAmount;
  unallocatedAmount: PhpAmount;
  settlementId?: string;
  settlementStatus?: SettlementStatus;
  readiness: RevenuePostingReadiness;
  readinessLabel: string;
  mappingLabel: string;
  reason: string;
};

export type AdjustmentReviewResult = {
  outcome: "completed" | "rejected" | "duplicate";
  adjustmentId: string;
  maximumAdjustableMinorUnits: number;
  record: PaymentLedgerRecord;
};

export type FinancialRecordKind =
  | "assessment"
  | "attempt"
  | "provider-acknowledgment"
  | "collection"
  | "government-receipt"
  | "settlement";

export type FinancialState =
  | { kind: "assessment"; status: AssessmentStatus }
  | { kind: "attempt"; status: PaymentAttemptStatus }
  | { kind: "provider-acknowledgment"; status: ProviderAcknowledgmentStatus }
  | { kind: "collection"; status: CollectionStatus }
  | { kind: "government-receipt"; status: GovernmentReceiptStatus }
  | { kind: "settlement"; status: SettlementStatus };

import { createEnvelope } from "@/shared/data/record-envelope";

import type {
  AdjustmentStatus,
  AdjustmentType,
  AssessmentStatus,
  CollectionStatus,
  GovernmentReceiptStatus,
  PayeeRef,
  PayerRef,
  PaymentAttemptStatus,
  PaymentLedgerRecord,
  PaymentLedgerScenario,
  PhpAmount,
  ProviderAcknowledgmentStatus,
  SettlementStatus,
} from "../types/payment-treasury";

const php = (minorUnits: number): PhpAmount => ({ currency: "PHP", minorUnits });

export const MUNICIPAL_TREASURY_PAYEE: PayeeRef = {
  id: "DEMO-PAYEE-MUNICIPAL",
  kind: "municipal",
  label: "Municipality of Matnog · Sample Treasury",
};
export const BARANGAY_TREASURY_PAYEE: PayeeRef = {
  id: "DEMO-PAYEE-BARANGAY-A",
  kind: "barangay",
  label: "Demo Barangay A · Sample Treasury",
};
export const PRIVATE_OPERATOR_PAYEE: PayeeRef = {
  id: "DEMO-PAYEE-OPERATOR",
  kind: "private-operator",
  label: "Demo Bay Operator · Private sample charge",
};

export const MEMBER_PAYER: PayerRef = { id: "DEMO-PER-001", kind: "person", label: "Mara Dela Cruz" };
export const BUSINESS_PAYER: PayerRef = {
  id: "DEMO-BIZ-001",
  kind: "business",
  label: "Demo Bay Tours",
};

type CollectionSeed = {
  status: CollectionStatus;
  gross?: number;
  allocated: number;
  unallocated?: number;
  eventId?: string;
};

type SettlementSeed = {
  status: SettlementStatus;
  providerCharge: number;
  bankCredit: number;
  lineStatus: "unmatched" | "matched" | "difference";
};

type AdjustmentSeed = {
  type: AdjustmentType;
  status: AdjustmentStatus;
  amount: number;
  reason: string;
  requestedBy: string;
  reviewedBy?: string;
  resultEventId?: string;
};

type ScenarioSeed = {
  number: number;
  scenario: PaymentLedgerScenario;
  serviceModule: string;
  serviceReference: string;
  payer: PayerRef;
  payee: PayeeRef;
  total: number;
  assessmentStatus: AssessmentStatus;
  assessmentAllocated: number;
  partialPaymentAllowed?: boolean;
  attemptStatus: PaymentAttemptStatus;
  requestedAmount?: number;
  acknowledgmentStatus?: ProviderAcknowledgmentStatus;
  collection?: CollectionSeed;
  receiptStatus?: GovernmentReceiptStatus;
  settlement?: SettlementSeed;
  adjustments?: AdjustmentSeed[];
};

function buildLedgerRecord(seed: ScenarioSeed): PaymentLedgerRecord {
  const serial = String(seed.number).padStart(3, "0");
  const day = String(8 + seed.number).padStart(2, "0");
  const at = `2026-09-${day}T08:00:00+08:00`;
  const assessmentId = `DEMO-ASM-${serial}`;
  const attemptId = `DEMO-ATT-${serial}`;
  const collectionId = `DEMO-PAY-${serial}`;
  const acknowledgmentId = `DEMO-ACK-${serial}`;
  const receiptId = `DEMO-RCP-${serial}`;
  const settlementId = `DEMO-SET-${serial}`;
  const scope = {
    kind: seed.payer.kind === "business" ? ("business" as const) : ("person" as const),
    id: seed.payer.id,
    label: seed.payer.label,
  };
  const requestedAmount = seed.requestedAmount ?? seed.total;
  const collectionGross = seed.collection?.gross ?? requestedAmount;
  const eventId = seed.collection?.eventId ?? `DEMO-EVT-PAY-${serial}`;
  const balance = seed.total - seed.assessmentAllocated;
  const providerLabel = seed.attemptStatus === "failed" ? "Unavailable sample provider" : "SamplePay Sandbox";

  const collection = seed.collection
    ? {
        envelope: createEnvelope({ id: collectionId, status: seed.collection.status, scope, createdAt: at }),
        status: seed.collection.status,
        assessmentId,
        attemptId,
        acknowledgmentId,
        payerId: seed.payer.id,
        payeeId: seed.payee.id,
        channel: "mock-e-wallet" as const,
        confirmationEventId: eventId,
        grossAmount: php(collectionGross),
        allocatedAmount: php(seed.collection.allocated),
        unallocatedAmount: php(seed.collection.unallocated ?? collectionGross - seed.collection.allocated),
        confirmedAt: at,
      }
    : undefined;

  const receipt =
    collection && seed.receiptStatus
      ? {
          envelope: createEnvelope({ id: receiptId, status: seed.receiptStatus, scope, createdAt: at }),
          status: seed.receiptStatus,
          collectionId,
          receiptNumber: `SAMPLE-OR-2026-${serial}`,
          amount: php(collectionGross),
          issuedAt: at,
          issuedBy: "Sample cashier · persona",
          watermark: "SAMPLE — NOT AN OFFICIAL RECEIPT" as const,
        }
      : undefined;

  const settlement =
    collection && seed.settlement
      ? {
          envelope: createEnvelope({ id: settlementId, status: seed.settlement.status, scope, createdAt: at }),
          status: seed.settlement.status,
          providerLabel,
          periodFrom: `2026-09-${day}`,
          periodTo: `2026-09-${day}`,
          lines: [
            {
              id: `${settlementId}-L1`,
              collectionId,
              grossAmount: php(collectionGross),
              providerCharge: php(seed.settlement.providerCharge),
              netAmount: php(collectionGross - seed.settlement.providerCharge),
              status: seed.settlement.lineStatus,
            },
          ],
          grossAmount: php(collectionGross),
          providerCharge: php(seed.settlement.providerCharge),
          netAmount: php(collectionGross - seed.settlement.providerCharge),
          bankCreditAmount: php(seed.settlement.bankCredit),
          sampleBankReference: `SAMPLE-BANK-${serial}`,
          bankDate: `2026-09-${day}`,
        }
      : undefined;

  return {
    scenario: seed.scenario,
    lifecycle: {
      assessment: {
        envelope: createEnvelope({ id: assessmentId, status: seed.assessmentStatus, scope, createdAt: at }),
        status: seed.assessmentStatus,
        serviceModule: seed.serviceModule,
        serviceReference: seed.serviceReference,
        payer: seed.payer,
        payee: seed.payee,
        ruleVersion: "DEMO-FEE-RULE-2026.1",
        lineItems: [
          {
            id: `${assessmentId}-L1`,
            label: "Illustrative service charge",
            basis: "Amount for interface review",
            effect: "add",
            amount: php(seed.total - 25000),
          },
          {
            id: `${assessmentId}-L2`,
            label: "Illustrative processing charge",
            basis: "Amount; not an LGU fee quotation",
            effect: "add",
            amount: php(25000),
          },
        ],
        total: php(seed.total),
        allocated: php(seed.assessmentAllocated),
        balance: php(balance),
        partialPaymentPolicy: seed.partialPaymentAllowed ? "allowed" : "disallowed",
        dueAt: "2026-09-30T17:00:00+08:00",
      },
      attempts: [
        {
          envelope: createEnvelope({ id: attemptId, status: seed.attemptStatus, scope, createdAt: at }),
          status: seed.attemptStatus,
          assessmentId,
          payerId: seed.payer.id,
          payeeId: seed.payee.id,
          channel: "mock-e-wallet",
          requestedAmount: php(requestedAmount),
          startedAt: at,
          lastCheckedAt: at,
          sampleExternalReference: `SAMPLE-PROVIDER-${serial}`,
          ...(seed.attemptStatus === "failed" ? { failureCode: "SAMPLE-CHANNEL-UNAVAILABLE" } : {}),
        },
      ],
      acknowledgments: [
        {
          envelope: createEnvelope({
            id: acknowledgmentId,
            status: seed.acknowledgmentStatus ?? (collection ? "received" : "pending"),
            scope,
            createdAt: at,
          }),
          status: seed.acknowledgmentStatus ?? (collection ? "received" : "pending"),
          attemptId,
          providerLabel,
          sampleExternalReference: `SAMPLE-PROVIDER-${serial}`,
          message: collection ? "Sample provider event received." : "No confirmed collection event received.",
          ...(collection ? { eventId, receivedAt: at } : {}),
        },
      ],
      collections: collection ? [collection] : [],
      receipts: receipt ? [receipt] : [],
      settlements: settlement ? [settlement] : [],
    },
    adjustments: (seed.adjustments ?? []).map((adjustment, index) => ({
      envelope: createEnvelope({
        id: `DEMO-ADJ-${serial}-${index + 1}`,
        status: adjustment.status,
        scope,
        createdAt: at,
      }),
      type: adjustment.type,
      status: adjustment.status,
      collectionId,
      requestedAmount: php(adjustment.amount),
      reason: adjustment.reason,
      requestedBy: adjustment.requestedBy,
      requestedAt: at,
      ...(adjustment.reviewedBy ? { reviewedBy: adjustment.reviewedBy, reviewedAt: at } : {}),
      ...(adjustment.resultEventId ? { resultEventId: adjustment.resultEventId } : {}),
    })),
    reconciliationEvents: [],
    diagnostics: [],
  };
}

export function createPaymentLedgerFixtures(): PaymentLedgerRecord[] {
  return [
    buildLedgerRecord({
      number: 1,
      scenario: "confirmed-and-replay-safe",
      serviceModule: "M03 Business permits",
      serviceReference: "DEMO-BPL-001",
      payer: BUSINESS_PAYER,
      payee: MUNICIPAL_TREASURY_PAYEE,
      total: 125000,
      assessmentStatus: "paid",
      assessmentAllocated: 125000,
      attemptStatus: "confirmed",
      collection: { status: "allocated", allocated: 125000 },
      receiptStatus: "issued",
      settlement: { status: "matched", providerCharge: 3500, bankCredit: 121500, lineStatus: "matched" },
      adjustments: [
        {
          type: "refund",
          status: "requested",
          amount: 25000,
          reason: "Duplicate service charge review",
          requestedBy: "Sample cashier requester",
        },
      ],
    }),
    buildLedgerRecord({
      number: 2,
      scenario: "pending-timeout",
      serviceModule: "M04 Tourism",
      serviceReference: "DEMO-TRIP-001",
      payer: MEMBER_PAYER,
      payee: MUNICIPAL_TREASURY_PAYEE,
      total: 85000,
      assessmentStatus: "issued",
      assessmentAllocated: 0,
      attemptStatus: "confirmation-uncertain",
      acknowledgmentStatus: "pending",
    }),
    buildLedgerRecord({
      number: 3,
      scenario: "failed-attempt",
      serviceModule: "M04 Tourism",
      serviceReference: "DEMO-TRIP-PRIVATE-001",
      payer: MEMBER_PAYER,
      payee: PRIVATE_OPERATOR_PAYEE,
      total: 200000,
      assessmentStatus: "issued",
      assessmentAllocated: 0,
      attemptStatus: "failed",
      acknowledgmentStatus: "rejected",
    }),
    buildLedgerRecord({
      number: 4,
      scenario: "partial-payment",
      serviceModule: "M07 Barangay clearances",
      serviceReference: "DEMO-CERT-001",
      payer: MEMBER_PAYER,
      payee: BARANGAY_TREASURY_PAYEE,
      total: 50000,
      assessmentStatus: "partially-paid",
      assessmentAllocated: 20000,
      partialPaymentAllowed: true,
      attemptStatus: "confirmed",
      requestedAmount: 20000,
      collection: { status: "allocated", allocated: 20000 },
      receiptStatus: "issued",
    }),
    buildLedgerRecord({
      number: 5,
      scenario: "overpayment",
      serviceModule: "M03 Business permits",
      serviceReference: "DEMO-BPL-OVERPAY",
      payer: BUSINESS_PAYER,
      payee: MUNICIPAL_TREASURY_PAYEE,
      total: 75000,
      assessmentStatus: "paid",
      assessmentAllocated: 75000,
      attemptStatus: "confirmed",
      requestedAmount: 80000,
      collection: { status: "partially-allocated", gross: 80000, allocated: 75000, unallocated: 5000 },
      receiptStatus: "issued",
      adjustments: [
        {
          type: "refund",
          status: "requested",
          amount: 85000,
          reason: "Excessive refund request for validation",
          requestedBy: "Sample cashier requester",
        },
      ],
    }),
    buildLedgerRecord({
      number: 6,
      scenario: "partial-disallowed",
      serviceModule: "M03 Business permits",
      serviceReference: "DEMO-BPL-PARTIAL-BLOCK",
      payer: BUSINESS_PAYER,
      payee: MUNICIPAL_TREASURY_PAYEE,
      total: 90000,
      assessmentStatus: "issued",
      assessmentAllocated: 0,
      attemptStatus: "created",
      requestedAmount: 40000,
    }),
    buildLedgerRecord({
      number: 7,
      scenario: "chargeback",
      serviceModule: "M04 Tourism",
      serviceReference: "DEMO-TRIP-CHARGEBACK",
      payer: MEMBER_PAYER,
      payee: MUNICIPAL_TREASURY_PAYEE,
      total: 65000,
      assessmentStatus: "issued",
      assessmentAllocated: 0,
      attemptStatus: "confirmed",
      collection: { status: "charged-back", allocated: 65000 },
      receiptStatus: "voided",
      adjustments: [
        {
          type: "chargeback",
          status: "completed",
          amount: 65000,
          reason: "Provider chargeback event",
          requestedBy: "Sample provider event",
          reviewedBy: "Sample Treasury reviewer",
          resultEventId: "DEMO-EVT-ADJ-007",
        },
      ],
    }),
    buildLedgerRecord({
      number: 8,
      scenario: "unmatched-deposit",
      serviceModule: "M07 Barangay clearances",
      serviceReference: "DEMO-CERT-UNMATCHED",
      payer: MEMBER_PAYER,
      payee: MUNICIPAL_TREASURY_PAYEE,
      total: 110000,
      assessmentStatus: "paid",
      assessmentAllocated: 110000,
      attemptStatus: "confirmed",
      collection: { status: "allocated", allocated: 110000 },
      receiptStatus: "issued",
      settlement: { status: "exception", providerCharge: 2500, bankCredit: 109500, lineStatus: "difference" },
    }),
    buildLedgerRecord({
      number: 9,
      scenario: "issued-assessment",
      serviceModule: "M07 Barangay clearances",
      serviceReference: "DEMO-CERT-004",
      payer: BUSINESS_PAYER,
      payee: BARANGAY_TREASURY_PAYEE,
      total: 75000,
      assessmentStatus: "issued",
      assessmentAllocated: 0,
      attemptStatus: "created",
    }),
  ];
}

export const PAYMENT_LEDGER_FIXTURES = createPaymentLedgerFixtures();

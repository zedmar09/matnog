import { demoClock } from "@/shared/data/demo-clock";
import { createEnvelope } from "@/shared/data/record-envelope";
import { conflict, empty, invalid, ok, type RepositoryResult } from "@/shared/data/repository-result";

import { createPaymentLedgerFixtures } from "../data/payment-ledger-fixtures";
import type {
  AdjustmentReviewDecision,
  AdjustmentReviewResult,
  AdjustmentType,
  AssessmentIssueInput,
  CashPostingResult,
  CheckoutStartResult,
  CollectionTotals,
  ConfirmedCollection,
  GovernmentReceipt,
  LedgerEventResult,
  PaymentAdjustment,
  PaymentAttempt,
  PaymentChannel,
  PaymentLedgerRecord,
  PhpAmount,
  ProviderAcknowledgment,
  ReconciliationEvent,
  SettlementActionResult,
  TreasurySettlement,
} from "../types/payment-treasury";

const php = (minorUnits: number): PhpAmount => ({ currency: "PHP", minorUnits });

function clone<T>(value: T): T {
  return structuredClone(value);
}

function bumpEnvelope<T extends { envelope: PaymentLedgerRecord["lifecycle"]["assessment"]["envelope"] }>(
  record: T,
  status: string,
  at: string,
) {
  record.envelope = {
    ...record.envelope,
    status,
    version: record.envelope.version + 1,
    updatedAt: at,
  };
}

export type LedgerTotals = {
  collectionCount: number;
  receiptCount: number;
  grossMinorUnits: number;
};

/** Deterministic local S10 ledger. No operation makes a network or payment-provider request. */
export class PaymentLedgerRepository {
  #records: PaymentLedgerRecord[] = [];
  #handledEvents = new Map<string, { assessmentId: string; attemptId: string }>();
  #handledReconciliationEvents = new Map<string, string>();
  #handledAdjustmentEvents = new Map<string, string>();
  #cashierSessionCollectionIds = new Set<string>();

  constructor() {
    this.reset();
  }

  reset() {
    this.#records = createPaymentLedgerFixtures();
    this.#cashierSessionCollectionIds = new Set();
    this.#handledReconciliationEvents = new Map(
      this.#records.flatMap((record) =>
        record.reconciliationEvents.flatMap((event) => (event.eventId ? [[event.eventId, event.settlementId]] : [])),
      ),
    );
    this.#handledAdjustmentEvents = new Map(
      this.#records.flatMap((record) =>
        record.adjustments.flatMap((adjustment) =>
          adjustment.resultEventId ? [[adjustment.resultEventId, adjustment.envelope.id]] : [],
        ),
      ),
    );
    this.#handledEvents = new Map(
      this.#records.flatMap((record) =>
        record.lifecycle.collections.map(
          (collection) =>
            [
              collection.confirmationEventId,
              {
                assessmentId: record.lifecycle.assessment.envelope.id,
                attemptId: collection.attemptId ?? "",
              },
            ] as const,
        ),
      ),
    );
  }

  list(): PaymentLedgerRecord[] {
    return clone(this.#records);
  }

  listForPayer(payerId: string, payerLabel?: string): PaymentLedgerRecord[] {
    const normalizedId = payerId.trim().toUpperCase();
    const normalizedLabel = payerLabel?.trim().toLocaleLowerCase();
    return clone(
      this.#records.filter(({ lifecycle }) => {
        const payer = lifecycle.assessment.payer;
        return (
          payer.id === normalizedId || (Boolean(normalizedLabel) && payer.label.toLocaleLowerCase() === normalizedLabel)
        );
      }),
    );
  }

  read(assessmentReference: string): RepositoryResult<PaymentLedgerRecord> {
    const record = this.#find(assessmentReference);
    return record ? ok(clone(record)) : empty("The assessment was not found.");
  }

  issueAssessment(input: AssessmentIssueInput): RepositoryResult<PaymentLedgerRecord> {
    const existing = this.#records.find(
      (record) => record.lifecycle.assessment.serviceReference === input.serviceReference.trim().toUpperCase(),
    );
    if (existing) return ok(clone(existing));
    const totalMinorUnits = input.lineItems.reduce(
      (sum, line) => sum + (line.effect === "subtract" ? -line.amount.minorUnits : line.amount.minorUnits),
      0,
    );
    const errors = [
      ...(input.serviceReference.trim().length < 5
        ? [{ id: "serviceReference", message: "Name the source record." }]
        : []),
      ...(input.lineItems.length === 0 || totalMinorUnits <= 0
        ? [{ id: "lineItems", message: "The assessment needs a positive charge." }]
        : []),
      ...(!Number.isFinite(Date.parse(input.dueAt)) ? [{ id: "dueAt", message: "Choose a valid due date." }] : []),
    ];
    if (errors.length) return invalid(errors);

    const number =
      Math.max(
        0,
        ...this.#records.map((record) => Number(record.lifecycle.assessment.envelope.id.match(/(\d+)$/)?.[1] ?? 0)),
      ) + 1;
    const serial = String(number).padStart(3, "0");
    const assessmentId = `DEMO-ASM-${serial}`;
    const now = demoClock.nowIso();
    const scope = {
      kind: input.payer.kind === "business" ? ("business" as const) : ("person" as const),
      id: input.payer.id,
      label: input.payer.label,
    };
    const record: PaymentLedgerRecord = {
      scenario: "issued-assessment",
      lifecycle: {
        assessment: {
          envelope: createEnvelope({ id: assessmentId, status: "issued", scope, createdAt: now }),
          status: "issued",
          serviceModule: input.serviceModule,
          serviceReference: input.serviceReference.trim().toUpperCase(),
          payer: input.payer,
          payee: input.payee,
          ruleVersion: input.ruleVersion,
          lineItems: input.lineItems.map((line) => ({ ...line, amount: php(line.amount.minorUnits) })),
          total: php(totalMinorUnits),
          allocated: php(0),
          balance: php(totalMinorUnits),
          partialPaymentPolicy: input.partialPaymentPolicy,
          dueAt: new Date(input.dueAt).toISOString(),
        },
        attempts: [],
        acknowledgments: [],
        collections: [],
        receipts: [],
        settlements: [],
      },
      adjustments: [],
      reconciliationEvents: [],
      diagnostics: [],
    };
    this.#records.push(record);
    return ok(clone(record));
  }

  updateAssessment(
    assessmentId: string,
    input: {
      serviceReference: string;
      payerLabel: string;
      totalMinorUnits: number;
      dueAt: string;
      partialPaymentPolicy: "allowed" | "disallowed";
    },
    expectedVersion: number,
  ): RepositoryResult<PaymentLedgerRecord> {
    const record = this.#find(assessmentId);
    if (!record) return empty("The assessment was not found.");
    const assessment = record.lifecycle.assessment;
    if (assessment.envelope.version !== expectedVersion) {
      return conflict(
        "This assessment changed after it was opened. Review the current values before saving.",
        assessment.envelope.version,
      );
    }
    if (!["draft", "issued", "partially-paid"].includes(assessment.status)) {
      return invalid([{ id: "assessment", message: "Only open assessments can be edited." }]);
    }
    const errors = [
      ...(input.serviceReference.trim().length < 5
        ? [{ id: "assessment-service-reference", message: "Enter the source service reference." }]
        : []),
      ...(input.payerLabel.trim().length < 3 ? [{ id: "assessment-payer", message: "Enter the payer name." }] : []),
      ...(!Number.isSafeInteger(input.totalMinorUnits) || input.totalMinorUnits <= 0
        ? [{ id: "assessment-total", message: "Enter a positive assessment amount." }]
        : []),
      ...(input.totalMinorUnits < assessment.allocated.minorUnits
        ? [{ id: "assessment-total", message: "The total cannot be lower than the amount already collected." }]
        : []),
      ...(!Number.isFinite(Date.parse(input.dueAt))
        ? [{ id: "assessment-due-date", message: "Choose a valid due date." }]
        : []),
    ];
    if (errors.length) return invalid(errors);

    const now = demoClock.nowIso();
    assessment.serviceReference = input.serviceReference.trim().toUpperCase();
    assessment.payer = { ...assessment.payer, label: input.payerLabel.trim() };
    assessment.total = php(input.totalMinorUnits);
    assessment.balance = php(input.totalMinorUnits - assessment.allocated.minorUnits);
    assessment.status = assessment.allocated.minorUnits > 0 ? "partially-paid" : "issued";
    assessment.partialPaymentPolicy = input.partialPaymentPolicy;
    assessment.dueAt = new Date(input.dueAt).toISOString();
    assessment.lineItems = [
      {
        id: `${assessment.envelope.id}-L1`,
        label: "Assessed municipal service fee",
        basis: assessment.ruleVersion,
        effect: "add",
        amount: php(input.totalMinorUnits),
      },
    ];
    bumpEnvelope(assessment, assessment.status, now);
    return ok(clone(record));
  }

  archiveAssessment(
    assessmentId: string,
    reason: string,
    expectedVersion: number,
  ): RepositoryResult<PaymentLedgerRecord> {
    const record = this.#find(assessmentId);
    if (!record) return empty("The assessment was not found.");
    const assessment = record.lifecycle.assessment;
    if (assessment.envelope.version !== expectedVersion) {
      return conflict(
        "This assessment changed after it was opened. Review the current values before archiving.",
        assessment.envelope.version,
      );
    }
    if (assessment.allocated.minorUnits > 0 || record.lifecycle.collections.length > 0) {
      return invalid([
        {
          id: "assessment",
          message: "An assessment with a collection cannot be archived. Use an adjustment workflow.",
        },
      ]);
    }
    if (reason.trim().length < 8) {
      return invalid([
        { id: "assessment-archive-reason", message: "Enter an archive reason of at least eight characters." },
      ]);
    }
    const now = demoClock.nowIso();
    assessment.status = "waived";
    assessment.exemptionNote = `Archived: ${reason.trim()}`;
    bumpEnvelope(assessment, assessment.status, now);
    return ok(clone(record));
  }

  requestAdjustment(input: {
    collectionId: string;
    type: AdjustmentType;
    amountMinorUnits: number;
    reason: string;
    requestedBy: string;
  }): RepositoryResult<PaymentAdjustment> {
    const collectionResult = this.readByCollection(input.collectionId);
    if (collectionResult.kind !== "success") return empty("The collection was not found.");
    const record = this.#records.find(
      (item) => item.lifecycle.assessment.envelope.id === collectionResult.data.lifecycle.assessment.envelope.id,
    );
    if (!record) return empty("The collection was not found.");
    const collection = record.lifecycle.collections.find(
      (item) => item.envelope.id === input.collectionId.trim().toUpperCase(),
    );
    if (!collection) return empty("The collection was not found.");
    const errors = [
      ...(!Number.isSafeInteger(input.amountMinorUnits) || input.amountMinorUnits <= 0
        ? [{ id: "adjustment-amount", message: "Enter a positive adjustment amount." }]
        : []),
      ...(input.amountMinorUnits > collection.grossAmount.minorUnits
        ? [{ id: "adjustment-amount", message: "The adjustment cannot exceed the gross collection." }]
        : []),
      ...(input.reason.trim().length < 8
        ? [{ id: "adjustment-reason", message: "Enter a reason of at least eight characters." }]
        : []),
      ...(input.requestedBy.trim().length < 3
        ? [{ id: "adjustment-requester", message: "Enter the requesting officer." }]
        : []),
    ];
    if (errors.length) return invalid(errors);
    const serial = collection.envelope.id.replace("DEMO-PAY-", "");
    const number = record.adjustments.length + 1;
    const now = demoClock.nowIso();
    const adjustment: PaymentAdjustment = {
      envelope: createEnvelope({
        id: `DEMO-ADJ-${serial}-${number}`,
        status: "requested",
        scope: collection.envelope.scope,
        createdAt: now,
      }),
      type: input.type,
      status: "requested",
      collectionId: collection.envelope.id,
      requestedAmount: php(input.amountMinorUnits),
      reason: input.reason.trim(),
      requestedBy: input.requestedBy.trim(),
      requestedAt: now,
    };
    record.adjustments = [...record.adjustments, adjustment];
    return ok(clone(adjustment));
  }

  withdrawAdjustment(adjustmentId: string, actor: string): RepositoryResult<PaymentAdjustment> {
    const found = this.#findAdjustment(adjustmentId);
    if (!found) return empty("The adjustment was not found.");
    if (found.adjustment.status !== "requested") {
      return invalid([{ id: "adjustment", message: "Only a pending adjustment request can be withdrawn." }]);
    }
    const now = demoClock.nowIso();
    found.adjustment.status = "withdrawn";
    found.adjustment.reviewedBy = actor.trim();
    found.adjustment.reviewedAt = now;
    bumpEnvelope(found.adjustment, found.adjustment.status, now);
    return ok(clone(found.adjustment));
  }

  readByAttempt(attemptId: string): RepositoryResult<PaymentLedgerRecord> {
    const normalized = attemptId.trim().toUpperCase();
    const record = this.#records.find(({ lifecycle }) =>
      lifecycle.attempts.some((attempt) => attempt.envelope.id === normalized),
    );
    return record ? ok(clone(record)) : empty("The payment attempt was not found.");
  }

  readByReceipt(receiptId: string): RepositoryResult<PaymentLedgerRecord> {
    const normalized = receiptId.trim().toUpperCase();
    const record = this.#records.find(({ lifecycle }) =>
      lifecycle.receipts.some((receipt) => receipt.envelope.id === normalized || receipt.receiptNumber === normalized),
    );
    return record ? ok(clone(record)) : empty("The receipt was not found.");
  }

  readByCollection(collectionId: string): RepositoryResult<PaymentLedgerRecord> {
    const normalized = collectionId.trim().toUpperCase();
    const record = this.#records.find(({ lifecycle }) =>
      lifecycle.collections.some(
        (collection) => collection.envelope.id === normalized || collection.envelope.reference === normalized,
      ),
    );
    return record ? ok(clone(record)) : empty("The collection was not found.");
  }

  readBySettlement(settlementId: string): RepositoryResult<PaymentLedgerRecord> {
    const normalized = settlementId.trim().toUpperCase();
    const record = this.#records.find(({ lifecycle }) =>
      lifecycle.settlements.some((settlement) => settlement.envelope.id === normalized),
    );
    return record ? ok(clone(record)) : empty("The settlement was not found.");
  }

  readByAdjustment(adjustmentId: string): RepositoryResult<PaymentLedgerRecord> {
    const normalized = adjustmentId.trim().toUpperCase();
    const record = this.#records.find(({ adjustments }) =>
      adjustments.some((adjustment) => adjustment.envelope.id === normalized),
    );
    return record ? ok(clone(record)) : empty("The adjustment was not found.");
  }

  assignSettlement(
    settlementId: string,
    assignedTo: string,
    reason: string,
    actor: string,
  ): RepositoryResult<SettlementActionResult> {
    const found = this.#findSettlement(settlementId);
    if (!found) return empty("The settlement was not found.");
    const { record, settlement } = found;
    const errors = [
      ...(assignedTo.trim().length < 3
        ? [{ id: "settlement-assignee", message: "Choose the Treasury assignee." }]
        : []),
      ...(reason.trim().length < 8
        ? [{ id: "settlement-assignment-reason", message: "Explain the assignment in at least eight characters." }]
        : []),
    ];
    if (errors.length > 0) return invalid(errors);
    if (settlement.status === "matched") {
      return invalid([{ id: "settlement", message: "This settlement is already matched." }]);
    }
    const at = demoClock.nowIso();
    const fromStatus = settlement.status;
    settlement.assignedTo = assignedTo.trim();
    settlement.assignmentReason = reason.trim();
    bumpEnvelope(settlement, settlement.status, at);
    const event: ReconciliationEvent = {
      id: `DEMO-REC-${settlement.envelope.id.replace("DEMO-SET-", "")}-A${record.reconciliationEvents.length + 1}`,
      settlementId: settlement.envelope.id,
      action: "assigned",
      actor: actor.trim(),
      assignedTo: settlement.assignedTo,
      reason: reason.trim(),
      recordedAt: at,
      fromStatus,
      toStatus: settlement.status,
      previousBankCreditAmount: php(settlement.bankCreditAmount.minorUnits),
      bankCreditAmount: php(settlement.bankCreditAmount.minorUnits),
    };
    record.reconciliationEvents = [...record.reconciliationEvents, event];
    return ok({ outcome: "assigned", settlementId: settlement.envelope.id, record: clone(record) });
  }

  correctSettlementBankCredit(
    settlementId: string,
    correctedBankCreditMinorUnits: number,
    reason: string,
    actor: string,
    eventId: string,
    expectedVersion: number,
  ): RepositoryResult<SettlementActionResult> {
    const normalizedEventId = eventId.trim();
    const found = this.#findSettlement(settlementId);
    if (!found) return empty("The settlement was not found.");
    const { record, settlement } = found;
    const eventOwner = this.#handledReconciliationEvents.get(normalizedEventId);
    if (eventOwner) {
      if (eventOwner !== settlement.envelope.id) {
        return invalid([{ id: "settlement-event-id", message: "This event belongs to another settlement." }]);
      }
      return ok({ outcome: "duplicate", settlementId: settlement.envelope.id, record: clone(record) });
    }
    if (normalizedEventId.length < 8) {
      return invalid([{ id: "settlement-event-id", message: "Use the stable correction event reference." }]);
    }
    if (expectedVersion !== settlement.envelope.version) {
      return conflict(
        "This settlement changed after it was opened. Review the current values before retrying.",
        settlement.envelope.version,
      );
    }
    if (!Number.isSafeInteger(correctedBankCreditMinorUnits) || correctedBankCreditMinorUnits < 0) {
      return invalid([{ id: "corrected-bank-credit", message: "Enter a valid corrected bank amount." }]);
    }
    if (reason.trim().length < 8) {
      return invalid([
        { id: "settlement-correction-reason", message: "Explain the correction in at least eight characters." },
      ]);
    }
    if (!settlement.assignedTo) {
      return invalid([{ id: "settlement-assignee", message: "Assign this exception before recording a correction." }]);
    }
    const expectedNet = settlement.grossAmount.minorUnits - settlement.providerCharge.minorUnits;
    if (correctedBankCreditMinorUnits !== expectedNet) {
      return invalid([
        {
          id: "corrected-bank-credit",
          message: `The corrected bank credit must equal the ${expectedNet} centavo net settlement.`,
        },
      ]);
    }

    const at = demoClock.nowIso();
    const previousBankCredit = settlement.bankCreditAmount.minorUnits;
    const fromStatus = settlement.status;
    settlement.bankCreditAmount = php(correctedBankCreditMinorUnits);
    settlement.status = "matched";
    settlement.lines = settlement.lines.map((line) => ({ ...line, status: "matched" }));
    bumpEnvelope(settlement, settlement.status, at);
    record.reconciliationEvents = [
      ...record.reconciliationEvents,
      {
        id: `DEMO-REC-${settlement.envelope.id.replace("DEMO-SET-", "")}-C${record.reconciliationEvents.length + 1}`,
        settlementId: settlement.envelope.id,
        action: "bank-credit-corrected",
        actor: actor.trim(),
        assignedTo: settlement.assignedTo,
        reason: reason.trim(),
        recordedAt: at,
        fromStatus,
        toStatus: settlement.status,
        previousBankCreditAmount: php(previousBankCredit),
        bankCreditAmount: php(correctedBankCreditMinorUnits),
        eventId: normalizedEventId,
      },
    ];
    this.#handledReconciliationEvents.set(normalizedEventId, settlement.envelope.id);
    return ok({ outcome: "matched", settlementId: settlement.envelope.id, record: clone(record) });
  }

  maximumAdjustableMinorUnits(adjustmentId: string): RepositoryResult<number> {
    const found = this.#findAdjustment(adjustmentId);
    if (!found) return empty("The adjustment was not found.");
    return ok(this.#maximumAdjustable(found.record, found.adjustment.envelope.id, found.adjustment.collectionId));
  }

  reviewAdjustment(
    adjustmentId: string,
    decision: AdjustmentReviewDecision,
    reviewer: string,
    reviewReason: string,
    eventId: string,
    expectedVersion: number,
  ): RepositoryResult<AdjustmentReviewResult> {
    const found = this.#findAdjustment(adjustmentId);
    if (!found) return empty("The adjustment was not found.");
    const { record, adjustment } = found;
    const normalizedEventId = eventId.trim();
    const maximum = this.#maximumAdjustable(record, adjustment.envelope.id, adjustment.collectionId);
    const eventOwner = this.#handledAdjustmentEvents.get(normalizedEventId);
    if (eventOwner) {
      if (eventOwner !== adjustment.envelope.id) {
        return invalid([{ id: "adjustment-event-id", message: "This event belongs to another adjustment." }]);
      }
      return ok({
        outcome: "duplicate",
        adjustmentId: adjustment.envelope.id,
        maximumAdjustableMinorUnits: maximum,
        record: clone(record),
      });
    }
    const errors = [
      ...(reviewer.trim().length < 3 ? [{ id: "adjustment-reviewer", message: "Choose the reviewing persona." }] : []),
      ...(reviewReason.trim().length < 8
        ? [{ id: "adjustment-review-reason", message: "Record a review reason of at least eight characters." }]
        : []),
      ...(normalizedEventId.length < 8
        ? [{ id: "adjustment-event-id", message: "Use the stable review event reference." }]
        : []),
    ];
    if (errors.length > 0) return invalid(errors);
    if (expectedVersion !== adjustment.envelope.version) {
      return conflict(
        "This adjustment changed after it was opened. Review the current request before retrying.",
        adjustment.envelope.version,
      );
    }
    if (adjustment.status !== "requested") {
      return invalid([{ id: "adjustment", message: "This adjustment already has a review result." }]);
    }
    if (reviewer.trim().toLocaleLowerCase() === adjustment.requestedBy.trim().toLocaleLowerCase()) {
      return invalid([
        { id: "adjustment-reviewer", message: "The requesting persona cannot review its own adjustment." },
      ]);
    }
    if (decision === "approve" && adjustment.requestedAmount.minorUnits > maximum) {
      return invalid([
        {
          id: "adjustment",
          message: `The requested amount exceeds the ${maximum} centavo remaining adjustable amount.`,
        },
      ]);
    }
    const collection = record.lifecycle.collections.find((item) => item.envelope.id === adjustment.collectionId);
    if (!collection) return empty("The linked collection was not found.");

    const at = demoClock.nowIso();
    adjustment.status = decision === "approve" ? "completed" : "rejected";
    adjustment.reviewedBy = reviewer.trim();
    adjustment.reviewedAt = at;
    adjustment.resultEventId = normalizedEventId;
    bumpEnvelope(adjustment, adjustment.status, at);
    if (decision === "approve") {
      const consumedBefore = collection.grossAmount.minorUnits - maximum;
      const fullyAdjusted = consumedBefore + adjustment.requestedAmount.minorUnits >= collection.grossAmount.minorUnits;
      collection.status =
        adjustment.type === "refund"
          ? fullyAdjusted
            ? "refunded"
            : "partially-refunded"
          : adjustment.type === "chargeback"
            ? "charged-back"
            : "reversed";
      bumpEnvelope(collection, collection.status, at);
      if (adjustment.type !== "refund") {
        const receipt = record.lifecycle.receipts.find((item) => item.collectionId === collection.envelope.id);
        if (receipt) {
          receipt.status = "voided";
          bumpEnvelope(receipt, receipt.status, at);
        }
      }
    }
    this.#handledAdjustmentEvents.set(normalizedEventId, adjustment.envelope.id);
    return ok({
      outcome: decision === "approve" ? "completed" : "rejected",
      adjustmentId: adjustment.envelope.id,
      maximumAdjustableMinorUnits: maximum,
      record: clone(record),
    });
  }

  startAttempt(assessmentId: string, channel: PaymentChannel): RepositoryResult<CheckoutStartResult> {
    const record = this.#find(assessmentId);
    if (!record) return empty("The assessment was not found.");
    const assessment = record.lifecycle.assessment;
    if (assessment.balance.minorUnits <= 0 || ["draft", "expired", "revised", "waived"].includes(assessment.status)) {
      return invalid([{ id: "assessment", message: "This assessment is not available for checkout." }]);
    }

    const existing = [...record.lifecycle.attempts]
      .reverse()
      .find((attempt) => ["pending", "confirmation-uncertain"].includes(attempt.status));
    if (existing) return ok({ outcome: "existing", attempt: clone(existing), record: clone(record) });

    const at = demoClock.nowIso();
    const baseSerial = assessment.envelope.id.replace("DEMO-ASM-", "");
    const suffix = record.lifecycle.attempts.length + 1;
    const attemptId = `DEMO-ATT-${baseSerial}-R${suffix}`;
    const attempt: PaymentAttempt = {
      envelope: createEnvelope({ id: attemptId, status: "pending", scope: assessment.envelope.scope, createdAt: at }),
      status: "pending",
      assessmentId: assessment.envelope.id,
      payerId: assessment.payer.id,
      payeeId: assessment.payee.id,
      channel,
      requestedAmount: php(assessment.balance.minorUnits),
      startedAt: at,
      lastCheckedAt: at,
      sampleExternalReference: `SAMPLE-CHECKOUT-${baseSerial}-R${suffix}`,
    };
    const acknowledgment: ProviderAcknowledgment = {
      envelope: createEnvelope({
        id: `DEMO-ACK-${baseSerial}-R${suffix}`,
        status: "pending",
        scope: assessment.envelope.scope,
        createdAt: at,
      }),
      status: "pending",
      attemptId,
      providerLabel: channel === "cashier" ? "Municipal cashier counter" : "Electronic payment gateway",
      sampleExternalReference: attempt.sampleExternalReference ?? "SAMPLE-CHECKOUT",
      message: "No confirmed collection event received.",
    };
    record.lifecycle.attempts = [...record.lifecycle.attempts, attempt];
    record.lifecycle.acknowledgments = [...record.lifecycle.acknowledgments, acknowledgment];
    return ok({ outcome: "created", attempt: clone(attempt), record: clone(record) });
  }

  totals(): LedgerTotals {
    const collections = this.#records.flatMap((record) => record.lifecycle.collections);
    return {
      collectionCount: collections.length,
      receiptCount: this.#records.reduce((count, record) => count + record.lifecycle.receipts.length, 0),
      grossMinorUnits: collections.reduce((sum, collection) => sum + collection.grossAmount.minorUnits, 0),
    };
  }

  collectionTotals(date?: string): CollectionTotals {
    const collections = this.#records
      .flatMap((record) => record.lifecycle.collections)
      .filter((collection) => !date || collection.confirmedAt.slice(0, 10) === date);
    return this.#sumCollections(collections);
  }

  cashierSessionTotals(): CollectionTotals {
    const collections = this.#records
      .flatMap((record) => record.lifecycle.collections)
      .filter((collection) => this.#cashierSessionCollectionIds.has(collection.envelope.id));
    return this.#sumCollections(collections);
  }

  /**
   * Records one counter collection as a single local transaction.
   * Validation happens before any ledger record is appended; an unexpected
   * confirmation failure rolls the temporary attempt and acknowledgment back.
   */
  postCashCollection(
    assessmentId: string,
    amountMinorUnits: number,
    eventId: string,
  ): RepositoryResult<CashPostingResult> {
    const normalizedAssessmentId = assessmentId.trim().toUpperCase();
    const trimmedEventId = eventId.trim();
    if (trimmedEventId.length < 8) {
      return invalid([{ id: "cash-event-id", message: "Use the stable cashier event reference." }]);
    }
    if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits <= 0) {
      return invalid([{ id: "cash-amount", message: "Enter a positive amount with no more than two decimal places." }]);
    }

    const record = this.#find(normalizedAssessmentId);
    if (!record) return empty("The assessment was not found.");

    const eventOwner = this.#handledEvents.get(trimmedEventId);
    if (eventOwner) {
      if (eventOwner.assessmentId !== normalizedAssessmentId) {
        return invalid([
          { id: "cash-event-id", message: "This event reference is already linked to a different assessment." },
        ]);
      }
      const replay = this.confirmAttempt(normalizedAssessmentId, eventOwner.attemptId, trimmedEventId);
      if (replay.kind !== "success") return replay;
      const replayCollection = replay.data.record.lifecycle.collections.find(
        (collection) => collection.confirmationEventId === trimmedEventId,
      );
      const replayReceipt = replayCollection
        ? replay.data.record.lifecycle.receipts.find((receipt) => receipt.collectionId === replayCollection.envelope.id)
        : undefined;
      if (!replayCollection || !replayReceipt) {
        return invalid([{ id: "cash-event-id", message: "The existing event has no complete collection history." }]);
      }
      return ok({
        ...replay.data,
        attemptId: eventOwner.attemptId,
        collectionId: replayCollection.envelope.id,
        receiptId: replayReceipt.envelope.id,
      });
    }

    const assessment = record.lifecycle.assessment;
    if (assessment.balance.minorUnits <= 0 || !["issued", "partially-paid"].includes(assessment.status)) {
      return invalid([{ id: "cash-assessment", message: "This assessment is not available for cashier posting." }]);
    }
    const unresolved = record.lifecycle.attempts.find((attempt) =>
      ["pending", "confirmation-uncertain"].includes(attempt.status),
    );
    if (unresolved) {
      return invalid([
        {
          id: "cash-assessment",
          message: `Recheck ${unresolved.envelope.id} before recording cash to avoid a duplicate collection.`,
        },
      ]);
    }
    if (amountMinorUnits < assessment.balance.minorUnits && assessment.partialPaymentPolicy === "disallowed") {
      return invalid([
        {
          id: "cash-amount",
          message: `This assessment requires the full ${assessment.balance.minorUnits} centavo balance.`,
        },
      ]);
    }

    const at = demoClock.nowIso();
    const baseSerial = assessment.envelope.id.replace("DEMO-ASM-", "");
    let sequence = 1;
    let attemptId = `DEMO-ATT-${baseSerial}-C${sequence}`;
    while (record.lifecycle.attempts.some((attempt) => attempt.envelope.id === attemptId)) {
      sequence += 1;
      attemptId = `DEMO-ATT-${baseSerial}-C${sequence}`;
    }
    const acknowledgmentId = `DEMO-ACK-${baseSerial}-C${sequence}`;
    const attempt: PaymentAttempt = {
      envelope: createEnvelope({ id: attemptId, status: "pending", scope: assessment.envelope.scope, createdAt: at }),
      status: "pending",
      assessmentId: assessment.envelope.id,
      payerId: assessment.payer.id,
      payeeId: assessment.payee.id,
      channel: "cashier",
      requestedAmount: php(amountMinorUnits),
      startedAt: at,
      lastCheckedAt: at,
      sampleExternalReference: `SAMPLE-CASHIER-${baseSerial}-C${sequence}`,
    };
    const acknowledgment: ProviderAcknowledgment = {
      envelope: createEnvelope({
        id: acknowledgmentId,
        status: "pending",
        scope: assessment.envelope.scope,
        createdAt: at,
      }),
      status: "pending",
      attemptId,
      providerLabel: "Municipal cashier counter",
      sampleExternalReference: attempt.sampleExternalReference ?? "SAMPLE-CASHIER",
      message: "Cashier posting awaits confirmation.",
    };
    record.lifecycle.attempts = [...record.lifecycle.attempts, attempt];
    record.lifecycle.acknowledgments = [...record.lifecycle.acknowledgments, acknowledgment];

    const confirmed = this.confirmAttempt(normalizedAssessmentId, attemptId, trimmedEventId);
    if (confirmed.kind !== "success") {
      record.lifecycle.attempts = record.lifecycle.attempts.filter((item) => item.envelope.id !== attemptId);
      record.lifecycle.acknowledgments = record.lifecycle.acknowledgments.filter(
        (item) => item.envelope.id !== acknowledgmentId,
      );
      return confirmed;
    }
    const collection = confirmed.data.record.lifecycle.collections.find(
      (item) => item.confirmationEventId === trimmedEventId,
    );
    const receipt = collection
      ? confirmed.data.record.lifecycle.receipts.find((item) => item.collectionId === collection.envelope.id)
      : undefined;
    if (!collection || !receipt) {
      return invalid([{ id: "cash-assessment", message: "The collection history could not be completed." }]);
    }
    this.#cashierSessionCollectionIds.add(collection.envelope.id);
    return ok({
      ...confirmed.data,
      attemptId,
      collectionId: collection.envelope.id,
      receiptId: receipt.envelope.id,
    });
  }

  confirmAttempt(assessmentId: string, attemptId: string, eventId: string): RepositoryResult<LedgerEventResult> {
    const normalizedAssessmentId = assessmentId.trim().toUpperCase();
    const normalizedAttemptId = attemptId.trim().toUpperCase();
    const trimmedEventId = eventId.trim();
    if (trimmedEventId.length < 8) {
      return invalid([{ id: "event-id", message: "Use the stable event reference." }]);
    }
    const record = this.#find(normalizedAssessmentId);
    if (!record) return empty("The assessment was not found.");
    const attempt = record.lifecycle.attempts.find((item) => item.envelope.id === normalizedAttemptId);
    if (!attempt) return empty("The payment attempt was not found.");

    const eventOwner = this.#handledEvents.get(trimmedEventId);
    if (eventOwner) {
      if (eventOwner.assessmentId !== normalizedAssessmentId || eventOwner.attemptId !== normalizedAttemptId) {
        return invalid([
          {
            id: "event-id",
            message: "This event reference is already linked to a different assessment or attempt.",
          },
        ]);
      }
      if (!record.diagnostics.some((item) => item.eventId === trimmedEventId)) {
        record.diagnostics = [
          ...record.diagnostics,
          {
            id: `DEMO-DIAG-${record.diagnostics.length + 1}-${attempt.envelope.id}`,
            kind: "duplicate-event",
            eventId: trimmedEventId,
            message: "Duplicate confirmation ignored; totals and receipt count are unchanged.",
            recordedAt: demoClock.nowIso(),
          },
        ];
      }
      return ok({ outcome: "duplicate", eventId: trimmedEventId, record: clone(record) });
    }

    if (["confirmed", "failed", "cancelled"].includes(attempt.status)) {
      return invalid([{ id: "attempt", message: "This attempt already has a final result." }]);
    }
    const assessment = record.lifecycle.assessment;
    const requested = attempt.requestedAmount.minorUnits;
    const balance = assessment.balance.minorUnits;
    if (requested < balance && assessment.partialPaymentPolicy === "disallowed") {
      return invalid([
        {
          id: "amount",
          message: `This assessment does not allow partial payment; ${balance} centavos remain due.`,
        },
      ]);
    }

    const at = demoClock.nowIso();
    const applied = Math.min(requested, balance);
    const unallocated = requested - applied;
    const nextBalance = balance - applied;
    const nextAllocated = assessment.allocated.minorUnits + applied;
    const serial = attempt.envelope.id.replace("DEMO-ATT-", "");
    const collectionId = `DEMO-PAY-${serial}`;
    const acknowledgmentId = `DEMO-ACK-${serial}`;
    const receiptId = `DEMO-RCP-${serial}`;
    const collection: ConfirmedCollection = {
      envelope: createEnvelope({
        id: collectionId,
        status: unallocated > 0 ? "partially-allocated" : "allocated",
        scope: assessment.envelope.scope,
        createdAt: at,
      }),
      status: unallocated > 0 ? "partially-allocated" : "allocated",
      assessmentId: assessment.envelope.id,
      attemptId: attempt.envelope.id,
      acknowledgmentId,
      payerId: assessment.payer.id,
      payeeId: assessment.payee.id,
      channel: attempt.channel,
      confirmationEventId: trimmedEventId,
      grossAmount: php(requested),
      allocatedAmount: php(applied),
      unallocatedAmount: php(unallocated),
      confirmedAt: at,
    };
    const receipt: GovernmentReceipt = {
      envelope: createEnvelope({ id: receiptId, status: "issued", scope: assessment.envelope.scope, createdAt: at }),
      status: "issued",
      collectionId,
      receiptNumber: `OR-2026-${serial}`,
      amount: php(requested),
      issuedAt: at,
      issuedBy: "Ana M. Labalan · Cashier II",
      watermark: "MUNICIPAL TREASURY RECEIPT",
    };

    attempt.status = "confirmed";
    attempt.lastCheckedAt = at;
    bumpEnvelope(attempt, "confirmed", at);
    assessment.status = nextBalance === 0 ? "paid" : "partially-paid";
    assessment.allocated = php(nextAllocated);
    assessment.balance = php(nextBalance);
    bumpEnvelope(assessment, assessment.status, at);

    const existingAcknowledgment = record.lifecycle.acknowledgments.find(
      (item) => item.attemptId === attempt.envelope.id,
    );
    if (existingAcknowledgment) {
      existingAcknowledgment.status = "received";
      existingAcknowledgment.eventId = trimmedEventId;
      existingAcknowledgment.receivedAt = at;
      existingAcknowledgment.message =
        attempt.channel === "cashier" ? "Cashier posting confirmed." : "Payment confirmation received.";
      bumpEnvelope(existingAcknowledgment, "received", at);
    } else {
      const acknowledgment: ProviderAcknowledgment = {
        envelope: createEnvelope({
          id: acknowledgmentId,
          status: "received",
          scope: assessment.envelope.scope,
          createdAt: at,
        }),
        status: "received",
        attemptId: attempt.envelope.id,
        providerLabel: "Electronic payment gateway",
        sampleExternalReference: `SAMPLE-PROVIDER-${serial}`,
        eventId: trimmedEventId,
        receivedAt: at,
        message: "Payment confirmation received.",
      };
      record.lifecycle.acknowledgments = [...record.lifecycle.acknowledgments, acknowledgment];
    }
    record.lifecycle.collections = [...record.lifecycle.collections, collection];
    record.lifecycle.receipts = [...record.lifecycle.receipts, receipt];
    this.#handledEvents.set(trimmedEventId, {
      assessmentId: normalizedAssessmentId,
      attemptId: normalizedAttemptId,
    });
    return ok({ outcome: "confirmed", eventId: trimmedEventId, record: clone(record) });
  }

  #find(reference: string) {
    const normalized = reference.trim().toUpperCase();
    return this.#records.find((record) => {
      const { envelope } = record.lifecycle.assessment;
      return envelope.id === normalized || envelope.reference === normalized;
    });
  }

  #findSettlement(settlementId: string): { record: PaymentLedgerRecord; settlement: TreasurySettlement } | undefined {
    const normalized = settlementId.trim().toUpperCase();
    for (const record of this.#records) {
      const settlement = record.lifecycle.settlements.find((item) => item.envelope.id === normalized);
      if (settlement) return { record, settlement };
    }
    return undefined;
  }

  #findAdjustment(adjustmentId: string) {
    const normalized = adjustmentId.trim().toUpperCase();
    for (const record of this.#records) {
      const adjustment = record.adjustments.find((item) => item.envelope.id === normalized);
      if (adjustment) return { record, adjustment };
    }
    return undefined;
  }

  #maximumAdjustable(record: PaymentLedgerRecord, adjustmentId: string, collectionId: string) {
    const collection = record.lifecycle.collections.find((item) => item.envelope.id === collectionId);
    if (!collection) return 0;
    const committed = record.adjustments
      .filter(
        (item) =>
          item.envelope.id !== adjustmentId &&
          item.collectionId === collectionId &&
          ["approved", "processing", "completed"].includes(item.status),
      )
      .reduce((sum, item) => sum + item.requestedAmount.minorUnits, 0);
    return Math.max(0, collection.grossAmount.minorUnits - committed);
  }

  #sumCollections(collections: readonly ConfirmedCollection[]): CollectionTotals {
    return collections.reduce<CollectionTotals>(
      (totals, collection) => ({
        collectionCount: totals.collectionCount + 1,
        grossMinorUnits: totals.grossMinorUnits + collection.grossAmount.minorUnits,
        allocatedMinorUnits: totals.allocatedMinorUnits + collection.allocatedAmount.minorUnits,
        unallocatedMinorUnits: totals.unallocatedMinorUnits + collection.unallocatedAmount.minorUnits,
      }),
      { collectionCount: 0, grossMinorUnits: 0, allocatedMinorUnits: 0, unallocatedMinorUnits: 0 },
    );
  }
}

export const paymentLedgerRepository = new PaymentLedgerRepository();

import type { RepositoryResult } from "@/shared/data/repository-result";

import { PAYMENT_LEDGER_FIXTURES } from "../data/payment-ledger-fixtures";
import type { LedgerEventResult, PaymentLedgerRecord } from "../types/payment-treasury";
import { PaymentLedgerRepository } from "./payment-ledger";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

function success<T>(result: RepositoryResult<T>): T {
  assert.equal(result.kind, "success", `expected success, got ${result.kind}`);
  return (result as { kind: "success"; data: T }).data;
}

describe("M06 S10 payment ledger fixtures", () => {
  it("contains every documented scenario, exceptions included", () => {
    assert.deepEqual(
      PAYMENT_LEDGER_FIXTURES.map((record) => record.scenario),
      [
        "confirmed-and-replay-safe",
        "pending-timeout",
        "failed-attempt",
        "partial-payment",
        "overpayment",
        "partial-disallowed",
        "chargeback",
        "unmatched-deposit",
        // Issued but unpaid: what the M07 certificate fee gate reads.
        "issued-assessment",
      ],
    );
  });

  it("keeps assessment line totals and allocation balances consistent", () => {
    for (const record of PAYMENT_LEDGER_FIXTURES) {
      const { assessment, collections } = record.lifecycle;
      const lineTotal = assessment.lineItems.reduce(
        (sum, line) => sum + (line.effect === "add" ? line.amount.minorUnits : -line.amount.minorUnits),
        0,
      );
      assert.equal(lineTotal, assessment.total.minorUnits, assessment.envelope.id);
      assert.equal(
        assessment.allocated.minorUnits + assessment.balance.minorUnits,
        assessment.total.minorUnits,
        assessment.envelope.id,
      );
      for (const collection of collections) {
        assert.equal(
          collection.allocatedAmount.minorUnits + collection.unallocatedAmount.minorUnits,
          collection.grossAmount.minorUnits,
          collection.envelope.id,
        );
      }
    }
  });

  it("separates pending and failed attempts from collections and receipts", () => {
    for (const scenario of ["pending-timeout", "failed-attempt"] as const) {
      const record = PAYMENT_LEDGER_FIXTURES.find((item) => item.scenario === scenario);
      assert.ok(record);
      assert.equal(record.lifecycle.collections.length, 0);
      assert.equal(record.lifecycle.receipts.length, 0);
      assert.equal(record.lifecycle.assessment.status, "issued");
    }
  });

  it("preserves partial, overpayment, chargeback, and unmatched differences", () => {
    const partial = PAYMENT_LEDGER_FIXTURES.find((item) => item.scenario === "partial-payment");
    const overpayment = PAYMENT_LEDGER_FIXTURES.find((item) => item.scenario === "overpayment");
    const chargeback = PAYMENT_LEDGER_FIXTURES.find((item) => item.scenario === "chargeback");
    const unmatched = PAYMENT_LEDGER_FIXTURES.find((item) => item.scenario === "unmatched-deposit");
    assert.equal(partial?.lifecycle.assessment.balance.minorUnits, 30000);
    assert.equal(overpayment?.lifecycle.collections[0]?.unallocatedAmount.minorUnits, 5000);
    assert.equal(chargeback?.lifecycle.collections[0]?.status, "charged-back");
    assert.equal(unmatched?.lifecycle.settlements[0]?.bankCreditAmount.minorUnits, 109500);
    assert.equal(unmatched?.lifecycle.settlements[0]?.netAmount.minorUnits, 107500);
  });

  it("keeps adjustment requesters and completed reviewers distinct", () => {
    const adjustments = PAYMENT_LEDGER_FIXTURES.flatMap((record) => record.adjustments);
    assert.ok(adjustments.some((item) => item.status === "requested" && !item.reviewedBy));
    const completed = adjustments.find((item) => item.status === "completed");
    assert.ok(completed?.reviewedBy);
    assert.notEqual(completed.requestedBy, completed.reviewedBy);
  });
});

describe("M06 deterministic local payment events", () => {
  let repository: PaymentLedgerRepository;

  beforeEach(() => {
    repository = new PaymentLedgerRepository();
  });

  it("ignores a replayed confirmation without increasing totals or receipts", () => {
    const before = repository.totals();
    const first = success(repository.confirmAttempt("DEMO-ASM-001", "DEMO-ATT-001", "DEMO-EVT-PAY-001"));
    const second = success(repository.confirmAttempt("DEMO-ASM-001", "DEMO-ATT-001", "DEMO-EVT-PAY-001"));
    assert.equal(first.outcome, "duplicate");
    assert.equal(second.outcome, "duplicate");
    assert.deepEqual(repository.totals(), before);
    assert.equal(second.record.diagnostics.length, 1);
  });

  it("confirms an uncertain attempt once and creates one receipt", () => {
    const before = repository.totals();
    const confirmed = success<LedgerEventResult>(
      repository.confirmAttempt("DEMO-ASM-002", "DEMO-ATT-002", "DEMO-EVT-PAY-002"),
    );
    assert.equal(confirmed.outcome, "confirmed");
    assert.equal(confirmed.record.lifecycle.assessment.status, "paid");
    assert.equal(confirmed.record.lifecycle.collections.length, 1);
    assert.equal(confirmed.record.lifecycle.receipts.length, 1);
    assert.equal(repository.totals().collectionCount, before.collectionCount + 1);
    assert.equal(repository.totals().receiptCount, before.receiptCount + 1);

    const replay = success<LedgerEventResult>(
      repository.confirmAttempt("DEMO-ASM-002", "DEMO-ATT-002", "DEMO-EVT-PAY-002"),
    );
    assert.equal(replay.outcome, "duplicate");
    assert.equal(replay.record.lifecycle.collections.length, 1);
    assert.equal(replay.record.lifecycle.receipts.length, 1);
  });

  it("blocks a partial confirmation when the assessment disallows it", () => {
    const before = success<PaymentLedgerRecord>(repository.read("DEMO-ASM-006"));
    const result = repository.confirmAttempt("DEMO-ASM-006", "DEMO-ATT-006", "DEMO-EVT-PAY-006");
    assert.equal(result.kind, "invalid");
    const after = success<PaymentLedgerRecord>(repository.read("DEMO-ASM-006"));
    assert.deepEqual(after, before);
  });

  it("refuses to reuse an event ID for a different assessment", () => {
    const result = repository.confirmAttempt("DEMO-ASM-002", "DEMO-ATT-002", "DEMO-EVT-PAY-001");
    assert.equal(result.kind, "invalid");
    if (result.kind === "invalid") assert.match(result.errors[0]?.message ?? "", /different assessment or attempt/i);
  });

  it("scopes payer records and reuses an unresolved checkout before creating another", () => {
    assert.equal(repository.listForPayer("DEMO-VIS-001", "Mara Dela Cruz").length, 5);
    // Four business charges, including the issued-but-unpaid assessment.
    assert.equal(repository.listForPayer("DEMO-BIZ-001").length, 4);

    const existing = success(repository.startAttempt("DEMO-ASM-002", "mock-bank"));
    assert.equal(existing.outcome, "existing");
    assert.equal(existing.attempt.envelope.id, "DEMO-ATT-002");

    const created = success(repository.startAttempt("DEMO-ASM-003", "mock-bank"));
    assert.equal(created.outcome, "created");
    assert.equal(created.attempt.envelope.id, "DEMO-ATT-003-R2");
    assert.equal(created.attempt.requestedAmount.minorUnits, 200000);
    assert.equal(created.record.lifecycle.attempts.length, 2);
  });

  it("reads attempt and receipt projections and blocks checkout for a paid assessment", () => {
    assert.equal(success(repository.readByAttempt("DEMO-ATT-002")).scenario, "pending-timeout");
    assert.equal(success(repository.readByReceipt("SAMPLE-OR-2026-001")).scenario, "confirmed-and-replay-safe");
    assert.equal(repository.startAttempt("DEMO-ASM-001", "mock-e-wallet").kind, "invalid");
  });

  it("posts one atomic cashier collection and adds only that collection to the session", () => {
    const before = repository.collectionTotals("2026-09-15");
    const posted = success(repository.postCashCollection("DEMO-ASM-003", 200000, "DEMO-EVT-CASH-003-01"));
    assert.equal(posted.outcome, "confirmed");
    assert.equal(posted.attemptId, "DEMO-ATT-003-C1");
    assert.equal(posted.collectionId, "DEMO-PAY-003-C1");
    assert.equal(posted.receiptId, "DEMO-RCP-003-C1");
    assert.equal(posted.record.lifecycle.assessment.status, "paid");
    assert.deepEqual(repository.cashierSessionTotals(), {
      collectionCount: 1,
      grossMinorUnits: 200000,
      allocatedMinorUnits: 200000,
      unallocatedMinorUnits: 0,
    });
    assert.equal(repository.collectionTotals("2026-09-15").grossMinorUnits, before.grossMinorUnits + 200000);
  });

  it("replays a cashier event without creating another collection or session total", () => {
    const first = success(repository.postCashCollection("DEMO-ASM-003", 200000, "DEMO-EVT-CASH-003-01"));
    const replay = success(repository.postCashCollection("DEMO-ASM-003", 200000, "DEMO-EVT-CASH-003-01"));
    assert.equal(replay.outcome, "duplicate");
    assert.equal(replay.collectionId, first.collectionId);
    assert.equal(replay.record.lifecycle.collections.length, 1);
    assert.equal(repository.cashierSessionTotals().collectionCount, 1);
  });

  it("blocks cashier posting while an online result is unresolved", () => {
    const before = success(repository.read("DEMO-ASM-002"));
    const result = repository.postCashCollection("DEMO-ASM-002", 85000, "DEMO-EVT-CASH-002-01");
    assert.equal(result.kind, "invalid");
    if (result.kind === "invalid") assert.match(result.errors[0]?.message ?? "", /recheck demo-att-002/i);
    assert.deepEqual(success(repository.read("DEMO-ASM-002")), before);
    assert.equal(repository.cashierSessionTotals().collectionCount, 0);
  });

  it("rejects a disallowed partial cashier amount without appending records", () => {
    const before = success(repository.read("DEMO-ASM-006"));
    const result = repository.postCashCollection("DEMO-ASM-006", 40000, "DEMO-EVT-CASH-006-01");
    assert.equal(result.kind, "invalid");
    assert.deepEqual(success(repository.read("DEMO-ASM-006")), before);
  });

  it("assigns and reconciles a bank difference while preserving the previous bank value", () => {
    const assigned = success(
      repository.assignSettlement(
        "DEMO-SET-008",
        "Sample Treasury reconciler",
        "Review the bank credit difference",
        "Sample Treasury lead",
      ),
    );
    const assignedSettlement = assigned.record.lifecycle.settlements[0];
    assert.equal(assignedSettlement?.assignedTo, "Sample Treasury reconciler");
    assert.equal(assigned.record.reconciliationEvents[0]?.action, "assigned");

    const collectionBefore = assigned.record.lifecycle.collections[0];
    const matched = success(
      repository.correctSettlementBankCredit(
        "DEMO-SET-008",
        107500,
        "Corrected bank evidence reviewed",
        "Sample Treasury reconciler",
        "DEMO-EVT-REC-008",
        assignedSettlement?.envelope.version ?? 0,
      ),
    );
    const settlement = matched.record.lifecycle.settlements[0];
    const correction = matched.record.reconciliationEvents.at(-1);
    assert.equal(matched.outcome, "matched");
    assert.equal(settlement?.status, "matched");
    assert.equal(settlement?.grossAmount.minorUnits, 110000);
    assert.equal(settlement?.providerCharge.minorUnits, 2500);
    assert.equal(settlement?.netAmount.minorUnits, 107500);
    assert.equal(settlement?.bankCreditAmount.minorUnits, 107500);
    assert.equal(correction?.previousBankCreditAmount.minorUnits, 109500);
    assert.equal(correction?.bankCreditAmount.minorUnits, 107500);
    assert.deepEqual(matched.record.lifecycle.collections[0], collectionBefore);

    const replay = success(
      repository.correctSettlementBankCredit(
        "DEMO-SET-008",
        107500,
        "Corrected bank evidence reviewed",
        "Sample Treasury reconciler",
        "DEMO-EVT-REC-008",
        settlement?.envelope.version ?? 0,
      ),
    );
    assert.equal(replay.outcome, "duplicate");
    assert.equal(replay.record.reconciliationEvents.length, 2);
  });

  it("keeps a settlement exception unchanged when the correction does not equal net", () => {
    const assigned = success(
      repository.assignSettlement(
        "DEMO-SET-008",
        "Sample Treasury reconciler",
        "Review the bank credit difference",
        "Sample Treasury lead",
      ),
    );
    const before = success(repository.readBySettlement("DEMO-SET-008"));
    const result = repository.correctSettlementBankCredit(
      "DEMO-SET-008",
      109500,
      "Incorrect sample correction retained for review",
      "Sample Treasury reconciler",
      "DEMO-EVT-REC-008",
      assigned.record.lifecycle.settlements[0]?.envelope.version ?? 0,
    );
    assert.equal(result.kind, "invalid");
    assert.deepEqual(success(repository.readBySettlement("DEMO-SET-008")), before);
  });

  it("prevents an adjustment requester from approving their own request", () => {
    const before = success(repository.readByAdjustment("DEMO-ADJ-001-1"));
    const adjustment = before.adjustments[0];
    const result = repository.reviewAdjustment(
      "DEMO-ADJ-001-1",
      "approve",
      "Sample cashier requester",
      "Approve the duplicate charge refund",
      "DEMO-EVT-ADJ-001-1",
      adjustment?.envelope.version ?? 0,
    );
    assert.equal(result.kind, "invalid");
    assert.deepEqual(success(repository.readByAdjustment("DEMO-ADJ-001-1")), before);
  });

  it("identifies an excessive adjustment and the remaining allowed amount", () => {
    assert.equal(success(repository.maximumAdjustableMinorUnits("DEMO-ADJ-005-1")), 80000);
    const before = success(repository.readByAdjustment("DEMO-ADJ-005-1"));
    const result = repository.reviewAdjustment(
      "DEMO-ADJ-005-1",
      "approve",
      "Sample Treasury reviewer",
      "Review the excessive refund request",
      "DEMO-EVT-ADJ-005-1",
      before.adjustments[0]?.envelope.version ?? 0,
    );
    assert.equal(result.kind, "invalid");
    if (result.kind === "invalid") assert.match(result.errors[0]?.message ?? "", /80000 centavo/i);
    assert.deepEqual(success(repository.readByAdjustment("DEMO-ADJ-005-1")), before);
  });

  it("completes a valid second-persona refund without changing the collection amount", () => {
    const before = success(repository.readByAdjustment("DEMO-ADJ-001-1"));
    const originalCollection = before.lifecycle.collections[0];
    const reviewed = success(
      repository.reviewAdjustment(
        "DEMO-ADJ-001-1",
        "approve",
        "Sample Treasury reviewer",
        "Approved after reviewing the duplicate charge",
        "DEMO-EVT-ADJ-001-1",
        before.adjustments[0]?.envelope.version ?? 0,
      ),
    );
    const adjustment = reviewed.record.adjustments[0];
    const collection = reviewed.record.lifecycle.collections[0];
    assert.equal(reviewed.outcome, "completed");
    assert.equal(adjustment?.status, "completed");
    assert.equal(adjustment?.reviewedBy, "Sample Treasury reviewer");
    assert.equal(collection?.status, "partially-refunded");
    assert.equal(collection?.grossAmount.minorUnits, originalCollection?.grossAmount.minorUnits);
    assert.equal(collection?.allocatedAmount.minorUnits, originalCollection?.allocatedAmount.minorUnits);
  });
});

import type { RepositoryResult } from "@/shared/data/repository-result";

import { createPaymentLedgerFixtures } from "../data/payment-ledger-fixtures";
import type { PaymentLedgerRecord } from "../types/payment-treasury";
import { revenuePostingProjection, revenuePostingProjections, sourceModulePaymentProjection } from "./payment-adapters";
import { PaymentLedgerRepository } from "./payment-ledger";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

function success<T>(result: RepositoryResult<T>): T {
  assert.equal(result.kind, "success");
  if (result.kind !== "success") throw new Error("Expected success");
  return result.data;
}

function fixture(scenario: PaymentLedgerRecord["scenario"]) {
  const record = createPaymentLedgerFixtures().find((item) => item.scenario === scenario);
  assert.ok(record);
  return record;
}

describe("M06 source-module payment adapters", () => {
  it("reports satisfied M03 payment without claiming permit issuance", () => {
    const projection = sourceModulePaymentProjection(fixture("confirmed-and-replay-safe"));
    assert.equal(projection.moduleId, "M03");
    assert.equal(projection.paymentGateStatus, "satisfied");
    assert.match(projection.guidance, /M03 still evaluates office reviews, inspection, and the permit decision/);
    assert.equal(projection.sourceRoute, "/services/business-permits");
  });

  it("keeps M04 departure blocked for pending payment and separates its private payee", () => {
    const pending = sourceModulePaymentProjection(fixture("pending-timeout"));
    const privateCharge = sourceModulePaymentProjection(fixture("failed-attempt"));
    assert.equal(pending.moduleId, "M04");
    assert.equal(pending.paymentGateStatus, "pending");
    assert.match(pending.guidance, /departure remains blocked/);
    assert.match(privateCharge.payeeBoundary, /Private-operator payee/);
  });

  it("keeps M07 release blocked while its assessment is only partially paid", () => {
    const projection = sourceModulePaymentProjection(fixture("partial-payment"));
    assert.equal(projection.moduleId, "M07");
    assert.equal(projection.paymentGateStatus, "partial");
    assert.match(projection.guidance, /M07 release remains blocked/);
  });
});

describe("M14 revenue posting adapter", () => {
  it("projects each confirmed collection once and holds every unresolved financial state", () => {
    const rows = revenuePostingProjections(createPaymentLedgerFixtures());
    assert.equal(rows.length, 5);
    assert.equal(new Set(rows.map((row) => row.collectionId)).size, rows.length);
    assert.deepEqual(
      rows.map((row) => row.readiness).sort(),
      ["held-adjustment", "held-reconciliation", "held-reconciliation", "held-unallocated", "ready-for-mapping"].sort(),
    );
  });

  it("moves the settlement projection to mapping review only after exact reconciliation", () => {
    const repository = new PaymentLedgerRepository();
    const assigned = success(
      repository.assignSettlement(
        "DEMO-SET-008",
        "Sample Treasury reconciler",
        "Review the bank credit difference",
        "Sample Treasury lead",
      ),
    );
    const before = revenuePostingProjection(success(repository.readBySettlement("DEMO-SET-008")));
    assert.equal(before?.readiness, "held-reconciliation");
    success(
      repository.correctSettlementBankCredit(
        "DEMO-SET-008",
        107500,
        "Corrected bank evidence reviewed",
        "Sample Treasury reconciler",
        "DEMO-EVT-REC-008",
        assigned.record.lifecycle.settlements[0]?.envelope.version ?? 0,
      ),
    );
    const after = revenuePostingProjection(success(repository.readBySettlement("DEMO-SET-008")));
    assert.equal(after?.readiness, "ready-for-mapping");
    assert.equal(after?.grossAmount.minorUnits, 110000);
  });

  it("does not create another posting row for a replayed confirmation", () => {
    const repository = new PaymentLedgerRepository();
    success(repository.confirmAttempt("DEMO-ASM-002", "DEMO-ATT-002", "DEMO-EVT-PAY-002"));
    success(repository.confirmAttempt("DEMO-ASM-002", "DEMO-ATT-002", "DEMO-EVT-PAY-002"));
    const rows = revenuePostingProjections(repository.list());
    assert.equal(rows.filter((row) => row.collectionId === "DEMO-PAY-002").length, 1);
  });
});

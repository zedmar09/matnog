import { createPaymentLedgerFixtures } from "../data/payment-ledger-fixtures";
import { PAYMENT_SCENARIO_DETAILS, paymentScenarioRoute } from "./payment-presentation";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("M06 selectable scenario presentation", () => {
  it("names every scenario a fixture can carry", () => {
    assert.equal(Object.keys(PAYMENT_SCENARIO_DETAILS).length, 9);
    for (const fixture of createPaymentLedgerFixtures()) {
      assert.ok(PAYMENT_SCENARIO_DETAILS[fixture.scenario].label.length > 0);
      assert.ok(PAYMENT_SCENARIO_DETAILS[fixture.scenario].description.length > 0);
    }
  });

  it("opens unresolved and failed scenarios at their attempt", () => {
    const fixtures = createPaymentLedgerFixtures();
    const pending = fixtures.find((record) => record.scenario === "pending-timeout");
    const failed = fixtures.find((record) => record.scenario === "failed-attempt");
    assert.ok(pending);
    assert.ok(failed);
    assert.equal(paymentScenarioRoute(pending), "/payments/attempts/DEMO-ATT-002");
    assert.equal(paymentScenarioRoute(failed), "/payments/attempts/DEMO-ATT-003");
  });

  it("opens a completed scenario at its receipt", () => {
    const confirmed = createPaymentLedgerFixtures().find((record) => record.scenario === "confirmed-and-replay-safe");
    assert.ok(confirmed);
    assert.equal(paymentScenarioRoute(confirmed), "/payments/receipts/DEMO-RCP-001");
  });
});

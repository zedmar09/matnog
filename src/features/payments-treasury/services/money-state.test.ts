import { createEnvelope } from "@/shared/data/record-envelope";

import type { FinancialState, TreasurySettlement } from "../types/payment-treasury";
import {
  createPhpAmount,
  describeFinancialState,
  FINANCIAL_LIFECYCLE_ORDER,
  settlementBalances,
  settlementDifferenceMinorUnits,
} from "./money-state";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const STATES: readonly FinancialState[] = [
  { kind: "assessment", status: "issued" },
  { kind: "attempt", status: "confirmation-uncertain" },
  { kind: "provider-acknowledgment", status: "received" },
  { kind: "collection", status: "confirmed" },
  { kind: "government-receipt", status: "issued" },
  { kind: "settlement", status: "matched" },
];

function settlement(bankCreditMinorUnits = 121500): TreasurySettlement {
  return {
    envelope: createEnvelope({
      id: "DEMO-SET-CHECK",
      status: "matched",
      scope: { kind: "office", id: "DEMO-OFF-TREASURY", label: "Municipal Treasury Office" },
      createdAt: "2026-09-16T08:00:00+08:00",
    }),
    status: "matched",
    providerLabel: "Sample payment provider",
    periodFrom: "2026-09-16",
    periodTo: "2026-09-16",
    lines: [],
    grossAmount: createPhpAmount(125000),
    providerCharge: createPhpAmount(3500),
    netAmount: createPhpAmount(121500),
    bankCreditAmount: createPhpAmount(bankCreditMinorUnits),
  };
}

describe("M06 money-state vocabulary", () => {
  it("keeps the six financial record kinds in their review order", () => {
    assert.deepEqual(FINANCIAL_LIFECYCLE_ORDER, [
      "assessment",
      "attempt",
      "provider-acknowledgment",
      "collection",
      "government-receipt",
      "settlement",
    ]);
  });

  it("provides text and guidance for every lifecycle badge", () => {
    for (const state of STATES) {
      const descriptor = describeFinancialState(state);
      assert.ok(descriptor.label.length > 0);
      assert.ok(descriptor.guidance.length > 0);
    }
  });

  it("does not present an uncertain attempt as paid", () => {
    const descriptor = describeFinancialState({ kind: "attempt", status: "confirmation-uncertain" });
    assert.equal(descriptor.tone, "warning");
    assert.match(descriptor.guidance, /do not claim a collection/i);
  });

  it("states that a provider acknowledgment is not a receipt", () => {
    const descriptor = describeFinancialState({ kind: "provider-acknowledgment", status: "received" });
    assert.match(descriptor.guidance, /not a confirmed collection or government receipt/i);
  });

  it("accepts only safe integer centavos", () => {
    assert.deepEqual(createPhpAmount(125000), { currency: "PHP", minorUnits: 125000 });
    assert.throws(() => createPhpAmount(12.5), /integer number of centavos/);
    assert.throws(() => createPhpAmount(-1), /integer number of centavos/);
  });

  it("compares gross, provider charge, net, and bank credit without floating point", () => {
    assert.equal(settlementBalances(settlement()), true);
    assert.equal(settlementDifferenceMinorUnits(settlement(121400)), -100);
    assert.equal(settlementBalances(settlement(121400)), false);
  });
});

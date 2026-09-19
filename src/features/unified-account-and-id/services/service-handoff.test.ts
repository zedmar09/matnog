import { DEMO_REPRESENTATIONS, SELF_REQUESTER_CONTEXT } from "../data/representations";
import { toRequesterContext } from "./representation";
import { createServiceDraftIntent, evaluateServiceHandoff, getServiceHandoffRule } from "./service-handoff";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("M02 service requester handoff", () => {
  it("keeps a phone-verified visitor distinct from a resident for M07", () => {
    const rule = getServiceHandoffRule("barangay-certificates");
    assert.ok(rule);
    const visitor = evaluateServiceHandoff(rule, SELF_REQUESTER_CONTEXT, false);
    const resident = evaluateServiceHandoff(rule, SELF_REQUESTER_CONTEXT, true);
    assert.equal(visitor.eligible, false);
    assert.equal(visitor.accountStatus, "phone-verified visitor");
    assert.equal(resident.eligible, true);
    assert.equal(resident.accountStatus, "verified resident");
  });

  it("carries the named business into an M03 draft intent", () => {
    const rule = getServiceHandoffRule("business-permits");
    assert.ok(rule);
    const business = toRequesterContext(DEMO_REPRESENTATIONS[1]);
    const decision = evaluateServiceHandoff(rule, business, false);
    const intent = createServiceDraftIntent(rule, decision);
    assert.equal(intent?.requesterId, "DEMO-BIZ-001");
    assert.equal(intent?.requesterLabel, "Demo Bay Tours");
    assert.equal(intent?.reference, "DEMO-DRAFT-M03-001");
  });

  it("rejects a business context for a person-only barangay draft", () => {
    const rule = getServiceHandoffRule("barangay-certificates");
    assert.ok(rule);
    const business = toRequesterContext(DEMO_REPRESENTATIONS[1]);
    assert.equal(evaluateServiceHandoff(rule, business, true).eligible, false);
  });
});

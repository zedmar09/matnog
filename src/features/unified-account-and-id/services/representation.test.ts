import { DEMO_REPRESENTATIONS, SELF_REQUESTER_CONTEXT } from "../data/representations";
import {
  canUseRequesterContext,
  getRepresentationAvailability,
  listAvailableRequesterContexts,
  resolveRequesterContext,
} from "./representation";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("M02 representation contexts", () => {
  it("separates active and expired authority on the fixed demo date", () => {
    assert.equal(getRepresentationAvailability(DEMO_REPRESENTATIONS[0]), "active");
    assert.equal(getRepresentationAvailability(DEMO_REPRESENTATIONS[1]), "active");
    assert.equal(getRepresentationAvailability(DEMO_REPRESENTATIONS[2]), "expired");
  });

  it("exposes only the account owner and currently authorized subjects", () => {
    const contexts = listAvailableRequesterContexts(DEMO_REPRESENTATIONS);

    assert.deepEqual(
      contexts.map((context) => context.id),
      ["self", "DEMO-REP-001", "DEMO-REP-002"],
    );
    assert.notDeepEqual(contexts[1].scopes, contexts[2].scopes);
  });

  it("falls back to the account owner when delegated authority expires", () => {
    const before = listAvailableRequesterContexts(DEMO_REPRESENTATIONS);
    const business = resolveRequesterContext("DEMO-REP-002", before);
    assert.equal(business.subjectId, "DEMO-BIZ-001");

    const after = listAvailableRequesterContexts(DEMO_REPRESENTATIONS, new Set(["DEMO-REP-002"]));
    const resolved = resolveRequesterContext(business.id, after);
    assert.equal(resolved, SELF_REQUESTER_CONTEXT);
    assert.equal(canUseRequesterContext(business, after), false);
  });

  it("does not make an expired household authority selectable", () => {
    const contexts = listAvailableRequesterContexts(DEMO_REPRESENTATIONS);
    assert.equal(
      contexts.some((context) => context.subjectId === "DEMO-HH-001"),
      false,
    );
  });
});

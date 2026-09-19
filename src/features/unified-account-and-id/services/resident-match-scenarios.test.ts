import { getResidentMatchScenario, RESIDENT_MATCH_SCENARIOS } from "./resident-match-scenarios";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("M02 resident match preview", () => {
  it("blocks linking for no-match and duplicate states", () => {
    assert.equal(getResidentMatchScenario("no-match").allowsLinkRequest, false);
    assert.equal(getResidentMatchScenario("multiple").allowsLinkRequest, false);
  });

  it("keeps shared contact distinct from resident identity", () => {
    const shared = getResidentMatchScenario("shared-contact");
    assert.match(shared.summary, /phone verification remains separate/i);
    assert.equal(shared.allowsLinkRequest, true);
  });

  it("falls back to the suggested fixture for an unknown preview", () => {
    assert.equal(getResidentMatchScenario("unknown"), RESIDENT_MATCH_SCENARIOS[0]);
  });
});

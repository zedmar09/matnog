import { isChallengeExpired, resendChallenge, startChallenge, verifyChallenge } from "./auth-simulation";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const NOW = 1_800_000_000_000;

describe("M02 authentication simulation", () => {
  it("issues a normal in-memory challenge", () => {
    const result = startChallenge({ phone: "09170000000", scenario: "normal" }, NOW);

    assert.equal(result.kind, "ready");
    if (result.kind !== "ready") return;
    assert.equal(result.challenge.phone, "09170000000");
    assert.equal(result.challenge.generation, 1);
    assert.equal(isChallengeExpired(result.challenge, NOW), false);
  });

  it("keeps unavailable and limited scenarios out of verification", () => {
    assert.equal(startChallenge({ phone: "09170000000", scenario: "sms-unavailable" }, NOW).kind, "blocked");
    assert.equal(startChallenge({ phone: "09170000000", scenario: "rate-limited" }, NOW).kind, "blocked");
  });

  it("makes the expired-code scenario recoverable through resend", () => {
    const result = startChallenge({ phone: "09170000000", scenario: "expired-code" }, NOW);
    assert.equal(result.kind, "ready");
    if (result.kind !== "ready") return;
    assert.equal(isChallengeExpired(result.challenge, NOW), true);

    const resent = resendChallenge(result.challenge, NOW + 1000);
    assert.equal(resent.phone, result.challenge.phone);
    assert.equal(resent.generation, 2);
    assert.equal(resent.scenario, "normal");
    assert.equal(isChallengeExpired(resent, NOW + 1000), false);
  });

  it("refuses wrong and expired codes and accepts only the demo code", () => {
    const normal = startChallenge({ phone: "09170000000", scenario: "normal" }, NOW);
    assert.equal(normal.kind, "ready");
    if (normal.kind !== "ready") return;

    assert.equal(verifyChallenge(normal.challenge, "000000", NOW), "incorrect");
    assert.equal(verifyChallenge(normal.challenge, "123456", NOW), "verified");
    assert.equal(verifyChallenge(normal.challenge, "123456", NOW + 300_000), "expired");
  });
});

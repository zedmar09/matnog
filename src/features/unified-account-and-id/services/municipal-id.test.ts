import { createIdentityDemoSeed } from "../data/identity-fixtures";
import {
  readPublicCredential,
  requestCredentialReplacement,
  reviewIdentityApplication,
  reviewResidentLink,
  revokeActiveCredential,
} from "./municipal-id";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

function approveInitialCredential() {
  const linked = reviewResidentLink(createIdentityDemoSeed(), "approve");
  assert.equal(linked.ok, true);
  const approved = reviewIdentityApplication(linked.state, "approve");
  assert.equal(approved.ok, true);
  return approved.state;
}

describe("M02 municipal credential rules", () => {
  it("blocks enrollment approval until the resident link is reviewed", () => {
    const result = reviewIdentityApplication(createIdentityDemoSeed(), "approve");
    assert.equal(result.ok, false);
    assert.match(result.message, /resident association/);
  });

  it("requires reasons for correction, rejection, replacement and revocation", () => {
    const linked = reviewResidentLink(createIdentityDemoSeed(), "approve").state;
    assert.equal(reviewIdentityApplication(linked, "correction", "short").ok, false);
    const approved = approveInitialCredential();
    assert.equal(requestCredentialReplacement(approved, "short").ok, false);
    assert.equal(revokeActiveCredential(approved, "short").ok, false);
  });

  it("issues a credential only after approval", () => {
    const state = approveInitialCredential();
    assert.equal(state.credentials.length, 1);
    assert.equal(state.credentials[0].status, "active");
    assert.equal(state.credentials[0].personId, "DEMO-PER-001");
  });

  it("replaces a credential without changing the person ID and invalidates the old token", () => {
    const original = approveInitialCredential();
    const replacement = requestCredentialReplacement(original, "The sample card was damaged.");
    assert.equal(replacement.ok, true);
    const approved = reviewIdentityApplication(replacement.state, "approve");
    assert.equal(approved.ok, true);

    const [oldCredential, newCredential] = approved.state.credentials;
    assert.equal(oldCredential.status, "superseded");
    assert.equal(newCredential.status, "active");
    assert.equal(oldCredential.personId, newCredential.personId);
    assert.equal(readPublicCredential(approved.state, oldCredential.token)?.validity, "invalid");
    assert.equal(readPublicCredential(approved.state, newCredential.token)?.validity, "valid");
  });

  it("returns a public projection with no holder, person, household or evidence fields", () => {
    const state = approveInitialCredential();
    const result = readPublicCredential(state, "DEMO-ID-TOKEN-001");
    assert.ok(result);
    const serialised = JSON.stringify(result);
    assert.doesNotMatch(serialised, /Mara|DEMO-PER|household|evidence|address/i);
  });

  it("makes a revoked active token invalid", () => {
    const state = approveInitialCredential();
    const revoked = revokeActiveCredential(state, "Credential reported lost by holder.");
    assert.equal(revoked.ok, true);
    assert.equal(readPublicCredential(revoked.state, "DEMO-ID-TOKEN-001")?.validity, "invalid");
  });
});

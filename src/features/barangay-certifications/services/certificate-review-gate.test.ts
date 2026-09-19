import { CERTIFICATE_WORKSPACE_FIXTURES } from "../data/certificate-fixtures";
import { certificateRepository, isFeeOpen, isIssuanceActionable, isReviewOpen } from "./certificate-repository";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

/**
 * The header's Approve button and the Return panel are both gated on
 * `isReviewOpen`, and so are the repository's own guards. These tests pin the
 * two together: an action is offered exactly when it would be accepted.
 */
function read(id: string) {
  const result = certificateRepository.readForStaff(id, "barangay");
  assert.equal(result.kind, "success", `expected to read ${id}`);
  return result.kind === "success" ? result.data : undefined;
}

describe("certificate review gate", () => {
  beforeEach(() => certificateRepository.reset());

  it("opens the review on a request still in the barangay's hands", () => {
    const record = read("DEMO-CERT-001");
    assert.ok(record);
    assert.equal(isReviewOpen(record), true);
  });

  it("closes the review once it has been approved", () => {
    const approved = certificateRepository.approveReview("DEMO-CERT-001", "barangay");
    assert.equal(approved.kind, "success");
    if (approved.kind !== "success") return;
    assert.equal(isReviewOpen(approved.data), false);
    // The repository refuses what the screen no longer offers.
    assert.equal(certificateRepository.approveReview("DEMO-CERT-001", "barangay").kind, "invalid");
  });

  it("closes the review on a returned, issued or blocked request", () => {
    for (const id of ["DEMO-CERT-002", "DEMO-CERT-003", "DEMO-CERT-007"]) {
      const record = read(id);
      assert.ok(record, id);
      assert.equal(isReviewOpen(record), false, id);
      assert.equal(certificateRepository.approveReview(id, "barangay").kind, "invalid", id);
      assert.equal(certificateRepository.returnForCorrection(id, "barangay", "Missing item").kind, "invalid", id);
    }
  });

  it("never leaves a staff-visible request offering an action the repository refuses", () => {
    for (const { request } of CERTIFICATE_WORKSPACE_FIXTURES.filter(
      (item) => item.request.source === "ordinary-catalog",
    )) {
      certificateRepository.reset();
      const record = read(request.envelope.id);
      if (!record) continue;
      const offered = isReviewOpen(record);
      const accepted = certificateRepository.approveReview(request.envelope.id, "barangay").kind === "success";
      assert.equal(offered, accepted, request.envelope.id);
    }
  });
});

describe("certificate row-action gates", () => {
  beforeEach(() => certificateRepository.reset());

  it("offers the fee decision exactly when the repository accepts one", () => {
    for (const { request } of CERTIFICATE_WORKSPACE_FIXTURES.filter(
      (item) => item.request.source === "ordinary-catalog",
    )) {
      certificateRepository.reset();
      const record = read(request.envelope.id);
      if (!record) continue;
      const offered = isFeeOpen(record);
      const accepted =
        certificateRepository.setFeeDecision(request.envelope.id, "barangay", {
          kind: "exempt",
          ruleLabel: "",
          exemptionBasis: "Indigency confirmed by the barangay",
        }).kind === "success";
      assert.equal(offered, accepted, request.envelope.id);
    }
  });

  it("offers reprint and revocation only on a valid issuance", () => {
    for (const { request } of CERTIFICATE_WORKSPACE_FIXTURES.filter(
      (item) => item.request.source === "ordinary-catalog",
    )) {
      certificateRepository.reset();
      const record = read(request.envelope.id);
      if (!record) continue;
      const offered = isIssuanceActionable(record);
      const accepted =
        certificateRepository.reprint(request.envelope.id, "barangay", "The released copy was damaged").kind ===
        "success";
      assert.equal(offered, accepted, request.envelope.id);

      certificateRepository.reset();
      const revoked =
        certificateRepository.revoke(request.envelope.id, "barangay", "Issued against a superseded record").kind ===
        "success";
      assert.equal(offered, revoked, request.envelope.id);
    }
  });

  it("closes the fee gate once a decision has been recorded", () => {
    // DEMO-CERT-001 reaches the fee stage as soon as its review is approved.
    assert.equal(certificateRepository.approveReview("DEMO-CERT-001", "barangay").kind, "success");
    const afterApproval = read("DEMO-CERT-001");
    assert.ok(afterApproval);
    assert.equal(isFeeOpen(afterApproval), true);

    const decided = certificateRepository.setFeeDecision("DEMO-CERT-001", "barangay", {
      kind: "exempt",
      ruleLabel: "",
      exemptionBasis: "Indigency confirmed by the barangay",
    });
    assert.equal(decided.kind, "success");
    if (decided.kind !== "success") return;
    assert.equal(isFeeOpen(decided.data), false);
    // The repository refuses a second decision, matching the closed gate.
    assert.notEqual(
      certificateRepository.setFeeDecision("DEMO-CERT-001", "barangay", {
        kind: "exempt",
        ruleLabel: "",
        exemptionBasis: "A second attempt at the same decision",
      }).kind,
      "success",
    );
  });

  it("refuses every row action for a role that cannot act", () => {
    assert.equal(certificateRepository.approveReview("DEMO-CERT-001", "municipal").kind, "denied");
    assert.equal(
      certificateRepository.returnForCorrection("DEMO-CERT-001", "municipal", "Missing item").kind,
      "denied",
    );
    assert.equal(certificateRepository.reprint("DEMO-CERT-003", "municipal", "Another copy needed").kind, "denied");
    assert.equal(certificateRepository.revoke("DEMO-CERT-003", "municipal", "Issued in error").kind, "denied");
  });
});

describe("the queue reflects a row action", () => {
  beforeEach(() => certificateRepository.reset());

  it("shows the new gates on a fresh read of the list, not only on the returned record", () => {
    const before = certificateRepository.listForStaff("barangay");
    assert.equal(before.kind, "success");
    if (before.kind !== "success") return;
    const beforeRow = before.data.find((item) => item.request.envelope.id === "DEMO-CERT-001");
    assert.ok(beforeRow);
    assert.equal(isReviewOpen(beforeRow), true);
    assert.equal(isFeeOpen(beforeRow), false);

    assert.equal(certificateRepository.approveReview("DEMO-CERT-001", "barangay").kind, "success");

    // The queue re-reads the repository rather than holding its own copy, so a
    // second read must carry the change the row action made.
    const after = certificateRepository.listForStaff("barangay");
    assert.equal(after.kind, "success");
    if (after.kind !== "success") return;
    const afterRow = after.data.find((item) => item.request.envelope.id === "DEMO-CERT-001");
    assert.ok(afterRow);
    assert.equal(isReviewOpen(afterRow), false, "approve must disappear from the row menu");
    assert.equal(isFeeOpen(afterRow), true, "the fee decision must take its place");
    assert.equal(afterRow.request.review.status, "reviewed");
  });

  it("carries a fee decision through to the next read", () => {
    certificateRepository.approveReview("DEMO-CERT-001", "barangay");
    certificateRepository.setFeeDecision("DEMO-CERT-001", "barangay", {
      kind: "exempt",
      ruleLabel: "",
      exemptionBasis: "Indigency confirmed by the barangay",
    });
    const listed = certificateRepository.listForStaff("barangay");
    assert.equal(listed.kind, "success");
    if (listed.kind !== "success") return;
    const row = listed.data.find((item) => item.request.envelope.id === "DEMO-CERT-001");
    assert.ok(row);
    assert.equal(isFeeOpen(row), false);
    assert.equal(row.request.feeDecision.kind, "exempt");
  });
});

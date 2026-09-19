import type { CertificateTemplateValues } from "../schemas/certificate-lifecycle-schema";
import { certificateRepository } from "./certificate-repository";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

const VALUES: CertificateTemplateValues = {
  certificateTypeId: "residency",
  certificateTypeLabel: "Certificate of residency",
  status: "active",
  signatoryRole: "Authorized Punong Barangay",
  serialPrefix: "BRGY-CERT",
  effectiveFrom: "2026-09-01",
  body: "<p>This is to certify that {{subject.fullName}} resides in {{barangay.label}}.</p>",
};

function list() {
  const result = certificateRepository.listTemplates("barangay");
  assert.equal(result.kind, "success");
  return result.kind === "success" ? result.data : [];
}

describe("certificate templates", () => {
  beforeEach(() => certificateRepository.reset());

  it("adds a version and shows it on the next read", () => {
    const before = list().length;
    const made = certificateRepository.createTemplate("barangay", VALUES);
    assert.equal(made.kind, "success");
    if (made.kind !== "success") return;
    assert.equal(made.data.certificateTypeId, "residency");
    assert.ok(made.data.body.includes("{{subject.fullName}}"));

    const after = list();
    assert.equal(after.length, before + 1);
    assert.ok(after.some((item) => item.envelope.id === made.data.envelope.id));
  });

  it("numbers a new version above the highest existing one for that type", () => {
    const highest = list()
      .filter((item) => item.certificateTypeId === "residency")
      .reduce((max, item) => Math.max(max, item.version), 0);
    const made = certificateRepository.createTemplate("barangay", VALUES);
    assert.equal(made.kind === "success" && made.data.version, highest + 1);
  });

  it("saves an edited layout and label, visible on the next read", () => {
    const updated = certificateRepository.updateTemplate("DEMO-TPL-RES-A-V2", "barangay", {
      ...VALUES,
      certificateTypeLabel: "Certificate of residency (archived form)",
      status: "retired",
      body: "<p>Revised layout for {{subject.fullName}}.</p>",
    });
    assert.equal(updated.kind, "success");

    const row = list().find((item) => item.envelope.id === "DEMO-TPL-RES-A-V2");
    assert.ok(row);
    assert.equal(row.certificateTypeLabel, "Certificate of residency (archived form)");
    assert.equal(row.status, "retired");
    assert.ok(row.body.includes("Revised layout"));
  });

  it("deletes a version that no issuance depends on", () => {
    const removed = certificateRepository.deleteTemplate("DEMO-TPL-RES-A-V2", "barangay");
    assert.equal(removed.kind, "success");
    assert.ok(!list().some((item) => item.envelope.id === "DEMO-TPL-RES-A-V2"));
  });

  it("refuses to delete a version frozen into an issued certificate", () => {
    const inUse = certificateRepository.templateVersionsInUse();
    assert.ok(inUse.length > 0, "a fixture issuance must reference a template version");
    const target = inUse[0];
    assert.ok(target);
    const removed = certificateRepository.deleteTemplate(target, "barangay");
    assert.equal(removed.kind, "invalid");
    if (removed.kind === "invalid") assert.match(removed.errors[0]?.message ?? "", /Retire it instead/);
    // The version is still there for the issuance that points at it.
    assert.ok(list().some((item) => item.envelope.id === target));
  });

  it("lets either staff role configure templates, and no one else", () => {
    // Both roles that can read the templates can also change them.
    assert.equal(certificateRepository.createTemplate("municipal", VALUES).kind, "success");
    assert.equal(certificateRepository.updateTemplate("DEMO-TPL-RES-A-V2", "municipal", VALUES).kind, "success");
    assert.equal(certificateRepository.deleteTemplate("DEMO-TPL-RES-A-V2", "municipal").kind, "success");

    certificateRepository.reset();
    assert.equal(certificateRepository.createTemplate("partner", VALUES).kind, "denied");
    assert.equal(certificateRepository.updateTemplate("DEMO-TPL-RES-A-V2", "partner", VALUES).kind, "denied");
    assert.equal(certificateRepository.deleteTemplate("DEMO-TPL-RES-A-V2", "partner").kind, "denied");
  });

  it("reports a missing version rather than silently doing nothing", () => {
    assert.equal(certificateRepository.updateTemplate("DEMO-TPL-NOPE", "barangay", VALUES).kind, "empty");
    assert.equal(certificateRepository.deleteTemplate("DEMO-TPL-NOPE", "barangay").kind, "empty");
  });
});

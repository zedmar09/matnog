import { ROUTING_TEMPLATE_FIXTURES } from "../data/routing-template-fixtures";
import { routingTemplateStageSchema } from "../schemas/routing-template-schema";
import { trackSafeDocument } from "./safe-document-tracking";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("M05 safe document tracking", () => {
  it("returns only the purpose-built public projection", () => {
    const result = trackSafeDocument("doc-2026-0048");
    assert.equal(result.kind, "success");
    if (result.kind !== "success") return;
    assert.deepEqual(Object.keys(result.data).sort(), [
      "reference",
      "releasedAt",
      "sampleOutputReference",
      "status",
      "steps",
      "title",
    ]);
    const serialized = JSON.stringify(result.data);
    assert.doesNotMatch(serialized, /sample-archive-hold-r1\.pdf/i);
    assert.doesNotMatch(serialized, /audit review remains open/i);
    assert.doesNotMatch(serialized, /records officer/i);
  });

  it("does not reveal whether an unavailable reference is restricted", () => {
    const unknown = trackSafeDocument("DOC-UNKNOWN");
    const restricted = trackSafeDocument("DOC-2026-0047");
    assert.equal(unknown.kind, "empty");
    assert.deepEqual(restricted, unknown);
  });
});

describe("M05 routing template fixtures", () => {
  it("keeps template identity and version separate from routed documents", () => {
    assert.equal(ROUTING_TEMPLATE_FIXTURES.length, 2);
    assert.ok(ROUTING_TEMPLATE_FIXTURES.every((template) => template.id.startsWith("DEMO-TPL-")));
    assert.ok(ROUTING_TEMPLATE_FIXTURES.some((template) => template.mode === "parallel"));
    assert.ok(
      ROUTING_TEMPLATE_FIXTURES.flatMap((template) => template.stages).some((stage) => stage.acknowledgmentRequired),
    );
  });

  it("validates new stage details before the editor accepts them", () => {
    assert.equal(
      routingTemplateStageSchema.safeParse({
        title: "Legal review",
        officeId: "DEMO-OFF-LEGAL",
        assigneePersona: "Legal reviewer",
        dueDays: 2,
        acknowledgmentRequired: true,
      }).success,
      true,
    );
    assert.equal(
      routingTemplateStageSchema.safeParse({
        title: "Short",
        officeId: "",
        assigneePersona: "",
        dueDays: 0,
        acknowledgmentRequired: false,
      }).success,
      false,
    );
  });
});

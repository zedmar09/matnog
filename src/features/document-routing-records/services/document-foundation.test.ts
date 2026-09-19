import { demoClock } from "@/shared/data/demo-clock";
import type { RepositoryResult } from "@/shared/data/repository-result";

import {
  DOCUMENT_FOUNDATION_FIXTURE,
  DOCUMENT_ROUTING_FIXTURES,
  MAYORS_OFFICE,
  RECORDS_OFFICE,
} from "../data/document-foundation-fixtures";
import { documentRegistrationSchema, fileReplacementSchema } from "../schemas/document-schema";
import type { DocumentWorkspaceRecord } from "../types/document-routing";
import {
  custodyLabel,
  documentRoutingRepository,
  listArchivePreview,
  listDocumentFoundation,
  projectedHolder,
  readDocumentFoundation,
} from "./document-foundation";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

function success(result: RepositoryResult<DocumentWorkspaceRecord>) {
  assert.equal(result.kind, "success", `expected success, got ${result.kind}`);
  return (result as { kind: "success"; data: DocumentWorkspaceRecord }).data;
}

beforeEach(() => {
  documentRoutingRepository.reset();
  demoClock.reset();
});

describe("M05 document routing foundation", () => {
  it("keeps document, file version, route task and physical custody identities separate", () => {
    const fixture = DOCUMENT_FOUNDATION_FIXTURE;
    assert.equal(fixture.document.envelope.id, "DEMO-DOC-001");
    assert.equal(fixture.document.currentFileVersionId, "DEMO-FILE-001-V2");
    assert.equal(fixture.route.envelope.id, "DEMO-ROUTE-001");
    assert.equal(fixture.tasks[0]?.id, "DEMO-TASK-001-1");
    assert.equal(fixture.custody.envelope.id, "DEMO-CUST-001");
  });

  it("seeds all seven documented S11 variants", () => {
    assert.deepEqual(DOCUMENT_ROUTING_FIXTURES.map((record) => record.scenario).sort(), [
      "archive-hold",
      "confidential",
      "delegated-review",
      "digital-review",
      "parallel-review",
      "physical-handover",
      "returned-correction",
    ]);
  });

  it("projects only assigned records and withholds the confidential record", () => {
    assert.equal(listDocumentFoundation("municipal").length, 7);
    assert.deepEqual(
      listDocumentFoundation("barangay").map((record) => record.id),
      ["DEMO-DOC-002"],
    );
    assert.deepEqual(
      listDocumentFoundation("partner").map((record) => record.id),
      ["DEMO-DOC-001"],
    );
    assert.equal(readDocumentFoundation("barangay", "DEMO-DOC-006"), undefined);
  });

  it("does not transfer custody when the receiver has not acknowledged", () => {
    assert.equal(DOCUMENT_FOUNDATION_FIXTURE.custody.state, "handover-pending");
    assert.deepEqual(projectedHolder(DOCUMENT_FOUNDATION_FIXTURE.custody), RECORDS_OFFICE);
    assert.notDeepEqual(projectedHolder(DOCUMENT_FOUNDATION_FIXTURE.custody), MAYORS_OFFICE);
    const digital = DOCUMENT_ROUTING_FIXTURES[1];
    assert.equal(projectedHolder(digital.custody), undefined);
    assert.match(custodyLabel(digital.custody), /no physical handover/i);
  });
});

describe("M05 local operations", () => {
  it("registers validated metadata as a new routed digital record", () => {
    const created = success(
      documentRoutingRepository.register("municipal", {
        direction: "incoming",
        documentType: "Inter-office memorandum",
        sourceModule: "M11",
        sourceRecordId: "demo-svc-011",
        subject: "Sample request for coordinated office review",
        classification: "internal",
        filename: "sample-incoming-letter.pdf",
        attachmentNote: "Initial readable sample attachment",
        routeOffice: MAYORS_OFFICE,
      }),
    );
    assert.equal(created.document.envelope.id, "DEMO-DOC-008");
    assert.equal(created.document.envelope.reference, "DOC-2026-0049");
    assert.equal(created.document.sourceRecordId, "DEMO-SVC-011");
    assert.equal(created.document.currentFileVersionId, "DEMO-FILE-008-V1");
    assert.equal(created.tasks[0]?.state, "pending-acknowledgment");
    assert.equal(created.custody.state, "digital-only");
    assert.equal(listDocumentFoundation("municipal").length, 8);
  });

  it("keeps registration municipal and rejects incomplete metadata", () => {
    const input = {
      direction: "incoming" as const,
      documentType: "x",
      sourceModule: "M99",
      sourceRecordId: "x",
      subject: "short",
      classification: "internal" as const,
      filename: "sample.txt",
      attachmentNote: "short",
      routeOffice: MAYORS_OFFICE,
    };
    assert.equal(documentRoutingRepository.register("barangay", input).kind, "denied");
    const result = documentRoutingRepository.register("municipal", input);
    assert.equal(result.kind, "invalid");
    assert.deepEqual(result.kind === "invalid" ? result.errors.map((error) => error.id) : [], [
      "subject",
      "documentType",
      "sourceModule",
      "sourceRecordId",
      "filename",
      "attachmentNote",
    ]);
  });

  it("uses the same validation rules for registration and replacement forms", () => {
    assert.equal(
      documentRegistrationSchema.safeParse({
        direction: "incoming",
        documentType: "x",
        sourceModule: "M99",
        sourceRecordId: "x",
        subject: "short",
        classification: "internal",
        filename: "sample.txt",
        attachmentNote: "short",
        routeOfficeId: "",
      }).success,
      false,
    );
    assert.equal(fileReplacementSchema.safeParse({ filename: "sample.pdf", note: "Readable sample" }).success, true);
  });

  it("refuses the wrong receiver without changing custody", () => {
    const denied = documentRoutingRepository.acceptHandover(
      "municipal",
      "DEMO-DOC-001",
      "DEMO-OFF-WRONG",
      "Receiving clerk",
    );
    assert.equal(denied.kind, "denied");
    assert.equal(readDocumentFoundation("municipal", "DEMO-DOC-001")?.custody.state, "handover-pending");
  });

  it("transfers custody and acknowledges the route task together", () => {
    const mismatched = documentRoutingRepository.acceptHandover(
      "municipal",
      "DEMO-DOC-001",
      MAYORS_OFFICE.id,
      "Receiving clerk",
      "HAND-WRONG",
    );
    assert.equal(mismatched.kind, "invalid");
    const updated = success(
      documentRoutingRepository.acceptHandover(
        "municipal",
        "DEMO-DOC-001",
        MAYORS_OFFICE.id,
        "Receiving clerk",
        "HAND-2026-0017",
      ),
    );
    assert.equal(updated.custody.currentHolder?.id, MAYORS_OFFICE.id);
    assert.equal(updated.custody.state, "accepted");
    assert.equal(updated.tasks[0]?.state, "received");
  });

  it("assigns a validated route stage and keeps its task identity separate", () => {
    const refused = documentRoutingRepository.assignStage("municipal", "DEMO-DOC-002", {
      title: "Legal check",
      office: MAYORS_OFFICE,
      assigneePersona: "Office reviewer",
      dueAt: "2026-09-14T17:00:00+08:00",
      acknowledgmentRequired: true,
      placement: "next-sequential",
      assignmentNote: "Coordinate the next sample review",
      actor: "Routing coordinator",
    });
    assert.equal(refused.kind, "invalid");

    const updated = success(
      documentRoutingRepository.assignStage("municipal", "DEMO-DOC-002", {
        title: "Municipal legal review",
        office: MAYORS_OFFICE,
        assigneePersona: "Office reviewer",
        dueAt: "2026-09-18T17:00:00+08:00",
        acknowledgmentRequired: true,
        placement: "next-sequential",
        assignmentNote: "Coordinate the next sample review",
        actor: "Routing coordinator",
      }),
    );
    const assigned = updated.tasks.at(-1);
    assert.equal(assigned?.id, "DEMO-TASK-002-2");
    assert.equal(assigned?.state, "pending-acknowledgment");
    assert.equal(updated.route.requiredTaskIds.at(-1), assigned?.id);
    assert.equal(updated.document.envelope.status, "routed");
  });

  it("acknowledges a route task without accepting physical custody", () => {
    const updated = success(
      documentRoutingRepository.acknowledgeTask("municipal", "DEMO-DOC-001", "DEMO-TASK-001-1", "Receiving clerk"),
    );
    assert.equal(updated.tasks[0]?.state, "received");
    assert.ok(updated.tasks[0]?.acknowledgedAt);
    assert.equal(updated.custody.state, "handover-pending");
    assert.equal(updated.custody.currentHolder?.id, RECORDS_OFFICE.id);
  });

  it("requires acknowledgment and a note before a review decision", () => {
    assert.equal(
      documentRoutingRepository.returnTask("municipal", "DEMO-DOC-001", "DEMO-TASK-001-1", "Readable correction reason")
        .kind,
      "invalid",
    );
    assert.equal(
      documentRoutingRepository.completeTask(
        "municipal",
        "DEMO-DOC-002",
        "DEMO-TASK-002-1",
        "endorsed",
        "endorse",
        "short",
      ).kind,
      "invalid",
    );
    const returned = success(
      documentRoutingRepository.returnTask(
        "municipal",
        "DEMO-DOC-002",
        "DEMO-TASK-002-1",
        "The certification needs a readable address",
      ),
    );
    assert.equal(returned.tasks[0]?.state, "returned");
    assert.equal(returned.tasks[0]?.decisionNote, "The certification needs a readable address");
  });

  it("adds a replacement revision without erasing the returned file", () => {
    const updated = success(
      documentRoutingRepository.replaceFile("municipal", "DEMO-DOC-004", {
        filename: "corrected-location-sketch.pdf",
        note: "Readable replacement sketch",
        actor: "Applicant support reviewer",
      }),
    );
    assert.deepEqual(
      updated.versions.map((version) => version.revision),
      [1, 2, 3],
    );
    assert.equal(updated.document.currentFileVersionId, "DEMO-FILE-004-V3");
  });

  it("keeps a parallel route active until every required task completes", () => {
    const updated = success(
      documentRoutingRepository.completeTask("municipal", "DEMO-DOC-003", "DEMO-TASK-003-2", "approved"),
    );
    assert.equal(updated.route.envelope.status, "complete");
    assert.equal(updated.document.envelope.status, "approved");
    assert.equal(
      updated.versions.find((version) => version.id === updated.document.currentFileVersionId)?.state,
      "approved",
    );
  });

  it("records a custody dispute without changing the current holder", () => {
    const refused = documentRoutingRepository.disputeHandover(
      "municipal",
      "DEMO-DOC-001",
      "short",
      "Records supervisor",
    );
    assert.equal(refused.kind, "invalid");
    const disputed = success(
      documentRoutingRepository.disputeHandover(
        "municipal",
        "DEMO-DOC-001",
        "The label arrived without the expected receiving signature",
        "Records supervisor",
      ),
    );
    assert.equal(disputed.custody.state, "disputed");
    assert.equal(disputed.custody.currentHolder?.id, RECORDS_OFFICE.id);
    assert.match(disputed.custody.disputeReason ?? "", /receiving signature/i);
  });

  it("releases only an explicitly approved revision after the route completes", () => {
    assert.equal(
      documentRoutingRepository.releaseDocument(
        "municipal",
        "DEMO-DOC-003",
        "DEMO-FILE-003-V1",
        "Release after route review",
        "Authorized signatory",
      ).kind,
      "invalid",
    );
    const completed = success(
      documentRoutingRepository.completeTask("municipal", "DEMO-DOC-003", "DEMO-TASK-003-2", "approved"),
    );
    const released = success(
      documentRoutingRepository.releaseDocument(
        "municipal",
        "DEMO-DOC-003",
        completed.document.currentFileVersionId,
        "Release after route review",
        "Authorized signatory",
      ),
    );
    assert.equal(released.document.envelope.status, "released");
    assert.equal(released.release?.versionId, "DEMO-FILE-003-V1");
    assert.equal(released.archive.state, "eligible");
    assert.ok(listArchivePreview("municipal").some((record) => record.document.envelope.id === "DEMO-DOC-003"));
  });

  it("blocks an action after the delegated authority expires", () => {
    const result = documentRoutingRepository.completeTask(
      "municipal",
      "DEMO-DOC-005",
      "DEMO-TASK-005-1",
      "approved",
      "sign",
    );
    assert.equal(result.kind, "denied");
    assert.match(result.kind === "denied" ? result.message : "", /expired/i);
  });

  it("requires a reason to clear an archive hold and reset restores it", () => {
    const refused = documentRoutingRepository.setArchiveHold("municipal", "DEMO-DOC-007", false, "short");
    assert.equal(refused.kind, "invalid");
    const cleared = success(
      documentRoutingRepository.setArchiveHold("municipal", "DEMO-DOC-007", false, "Audit review is complete"),
    );
    assert.equal(cleared.archive.hold, false);
    documentRoutingRepository.reset();
    assert.equal(readDocumentFoundation("municipal", "DEMO-DOC-007")?.archive.hold, true);
  });
});

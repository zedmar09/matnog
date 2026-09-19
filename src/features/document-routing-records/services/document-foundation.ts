import { demoClock } from "@/shared/data/demo-clock";
import { denied, empty, invalid, ok, type RepositoryResult } from "@/shared/data/repository-result";
import type { WorkspaceRole } from "@/shared/providers/workspace-session-provider";

import { DOCUMENT_ROUTING_FIXTURES } from "../data/document-foundation-fixtures";
import type {
  DocumentAudience,
  DocumentMetadataUpdateInput,
  DocumentRegistrationInput,
  DocumentWorkspaceRecord,
  OfficeRef,
  PhysicalCustody,
  RouteStageAssignmentInput,
  RouteTask,
} from "../types/document-routing";

export type DocumentSummary = {
  id: string;
  reference: string;
  subject: string;
  type: string;
  scenario: string;
  classification: string;
  routeState: string;
  fileRevision: number;
  custodyLabel: string;
  archiveHold: boolean;
  archiveState: string;
  status: string;
  direction: string;
  source: string;
  updatedAt: string;
};

type TaskOutcome = "approved" | "endorsed";
type DelegatedAction = "review" | "endorse" | "sign";

const COMPLETED_TASK_STATES = new Set(["approved", "endorsed", "released"]);

function audienceFor(role: WorkspaceRole): DocumentAudience | undefined {
  return role === "municipal" || role === "barangay" || role === "partner" ? role : undefined;
}

function isVisible(record: DocumentWorkspaceRecord, role: WorkspaceRole) {
  const audience = audienceFor(role);
  return audience ? record.document.allowedRoles.includes(audience) : false;
}

function bump(record: DocumentWorkspaceRecord, status = record.document.envelope.status) {
  record.document.envelope = {
    ...record.document.envelope,
    status,
    version: record.document.envelope.version + 1,
    updatedAt: demoClock.nowIso(),
  };
}

export class DocumentRoutingRepository {
  #records: DocumentWorkspaceRecord[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.#records = structuredClone([...DOCUMENT_ROUTING_FIXTURES]);
  }

  list(role: WorkspaceRole): DocumentWorkspaceRecord[] {
    return structuredClone(this.#records.filter((record) => isVisible(record, role)));
  }

  read(role: WorkspaceRole, id: string): RepositoryResult<DocumentWorkspaceRecord> {
    const record = this.#records.find(
      (item) => item.document.envelope.id === id || item.document.envelope.reference === id,
    );
    if (!record) return empty("The document was not found.");
    if (!isVisible(record, role)) return denied("This document is outside the assigned role.");
    return ok(structuredClone(record));
  }

  listTasks(role: WorkspaceRole): RouteTask[] {
    return this.list(role).flatMap((record) => record.tasks);
  }

  assignStage(
    role: WorkspaceRole,
    documentId: string,
    input: RouteStageAssignmentInput,
  ): RepositoryResult<DocumentWorkspaceRecord> {
    if (role !== "municipal") return denied("Only the municipal routing role can assign a stage.");
    const errors = [
      ...(input.title.trim().length < 8
        ? [{ id: "stage-title", message: "Describe the stage in at least eight characters." }]
        : []),
      ...(input.assigneePersona.trim().length < 3
        ? [{ id: "assignee-persona", message: "Enter the assigned persona." }]
        : []),
      ...(input.assignmentNote.trim().length < 8
        ? [{ id: "assignment-note", message: "Explain the assignment in at least eight characters." }]
        : []),
      ...(!Number.isFinite(Date.parse(input.dueAt)) || Date.parse(input.dueAt) <= demoClock.now().getTime()
        ? [{ id: "due-at", message: "Choose a future due date and time." }]
        : []),
    ];
    if (errors.length) return invalid(errors);
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    const record = result.data;
    if (["released", "archived"].includes(record.document.envelope.status)) {
      return invalid([{ id: "stage-title", message: "Released or archived documents cannot receive another stage." }]);
    }
    const sequence =
      input.placement === "current-parallel"
        ? Math.max(1, record.route.currentStage)
        : Math.max(0, ...record.tasks.map((task) => task.sequence)) + 1;
    const nextNumber = record.tasks.length + 1;
    const task: RouteTask = {
      id: `${record.route.envelope.id.replace("ROUTE", "TASK")}-${nextNumber}`,
      routeId: record.route.envelope.id,
      documentId: record.document.envelope.id,
      title: input.title.trim(),
      office: input.office,
      assigneePersona: input.assigneePersona.trim(),
      sequence,
      ...(input.placement === "current-parallel" ? { parallelGroup: `stage-${sequence}` } : {}),
      state: input.acknowledgmentRequired ? "pending-acknowledgment" : "in-review",
      acknowledgmentRequired: input.acknowledgmentRequired,
      dueAt: new Date(input.dueAt).toISOString(),
      assignmentNote: input.assignmentNote.trim(),
      lastActor: input.actor,
    };
    record.tasks.push(task);
    record.route.taskIds.push(task.id);
    record.route.requiredTaskIds.push(task.id);
    record.route.currentStage = Math.max(record.route.currentStage, sequence);
    record.route.mode = input.placement === "current-parallel" ? "parallel" : "sequential";
    record.route.envelope = {
      ...record.route.envelope,
      status: "active",
      version: record.route.envelope.version + 1,
      updatedAt: demoClock.nowIso(),
    };
    bump(record, "routed");
    return ok(structuredClone(record));
  }

  acknowledgeTask(
    role: WorkspaceRole,
    documentId: string,
    taskId: string,
    actor: string,
  ): RepositoryResult<DocumentWorkspaceRecord> {
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    const task = result.data.tasks.find((item) => item.id === taskId);
    if (!task) return empty("The route task was not found.");
    if (task.state !== "pending-acknowledgment") {
      return invalid([{ id: "task-action", message: "Only a pending task can be acknowledged." }]);
    }
    task.state = "received";
    task.acknowledgedAt = demoClock.nowIso();
    task.lastActor = actor;
    bump(result.data, "in-review");
    return ok(structuredClone(result.data));
  }

  register(role: WorkspaceRole, input: DocumentRegistrationInput): RepositoryResult<DocumentWorkspaceRecord> {
    if (role !== "municipal") return denied("Only the municipal records role can register a document.");
    const errors = [
      ...(input.subject.trim().length < 8
        ? [{ id: "subject", message: "Enter a subject of at least eight characters." }]
        : []),
      ...(input.documentType.trim().length < 3
        ? [{ id: "documentType", message: "Enter a document type of at least three characters." }]
        : []),
      ...(!/^M(?:0[1-9]|1[0-7])$/.test(input.sourceModule)
        ? [{ id: "sourceModule", message: "Select a source module from M01 to M17." }]
        : []),
      ...(input.sourceRecordId.trim().length < 5
        ? [{ id: "sourceRecordId", message: "Enter the source record reference." }]
        : []),
      ...(!input.filename.toLowerCase().endsWith(".pdf")
        ? [{ id: "filename", message: "Choose a PDF document." }]
        : []),
      ...(input.attachmentNote.trim().length < 8
        ? [{ id: "attachmentNote", message: "Describe the attachment in at least eight characters." }]
        : []),
    ];
    if (errors.length) return invalid(errors);

    const number =
      Math.max(0, ...this.#records.map((record) => Number(record.document.envelope.id.match(/(\d+)$/)?.[1] ?? 0))) + 1;
    const serial = String(number).padStart(3, "0");
    const referenceNumber =
      Math.max(
        0,
        ...this.#records.map((record) => Number(record.document.envelope.reference.match(/(\d+)$/)?.[1] ?? 0)),
      ) + 1;
    const documentId = `DOCREC-2026-${serial}`;
    const routeId = `ROUTE-2026-${serial}`;
    const custodyId = `CUST-2026-${serial}`;
    const fileId = `FILE-2026-${serial}-V1`;
    const taskId = `TASK-2026-${serial}-1`;
    const now = demoClock.nowIso();
    const record: DocumentWorkspaceRecord = {
      scenario: "digital-review",
      document: {
        envelope: {
          id: documentId,
          reference: `DOC-2026-${String(referenceNumber).padStart(4, "0")}`,
          status: "routed",
          version: 1,
          scope: { kind: "office", id: "OFF-RECORDS", label: "Municipal Records Office" },
          createdAt: now,
          updatedAt: now,
          source: "Sample data",
        },
        subject: input.subject.trim(),
        documentType: input.documentType.trim(),
        direction: input.direction,
        classification: input.classification,
        sourceModule: input.sourceModule,
        sourceRecordId: input.sourceRecordId.trim().toUpperCase(),
        currentFileVersionId: fileId,
        routeId,
        custodyId,
        allowedRoles: ["municipal"],
      },
      versions: [
        {
          id: fileId,
          documentId,
          revision: 1,
          filename: input.filename,
          mediaType: "application/pdf",
          sizeBytes: 236000,
          state: "submitted",
          addedAt: now,
          addedBy: "Municipal Records Officer",
          note: input.attachmentNote.trim(),
        },
      ],
      route: {
        envelope: {
          id: routeId,
          reference: routeId,
          status: "active",
          version: 1,
          scope: { kind: "office", id: input.routeOffice.id, label: input.routeOffice.label },
          createdAt: now,
          updatedAt: now,
          source: "Sample data",
        },
        documentId,
        templateId: "TPL-REGISTERED-DOCUMENT",
        templateVersion: 1,
        currentStage: 1,
        taskIds: [taskId],
        mode: "sequential",
        requiredTaskIds: [taskId],
      },
      tasks: [
        {
          id: taskId,
          routeId,
          documentId,
          title: "Acknowledge and review document",
          office: input.routeOffice,
          assigneePersona: "Receiving office reviewer",
          sequence: 1,
          state: "pending-acknowledgment",
          acknowledgmentRequired: true,
          dueAt: new Date(demoClock.now().getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      custody: {
        envelope: {
          id: custodyId,
          reference: custodyId,
          status: "digital-only",
          version: 1,
          scope: { kind: "office", id: "OFF-RECORDS", label: "Municipal Records Office" },
          createdAt: now,
          updatedAt: now,
          source: "Sample data",
        },
        documentId,
        state: "digital-only",
        mode: "digital",
      },
      delegations: [],
      archive: { state: "active", hold: false },
    };
    this.#records.push(record);
    return ok(structuredClone(record));
  }

  updateDocument(
    role: WorkspaceRole,
    documentId: string,
    input: DocumentMetadataUpdateInput,
  ): RepositoryResult<DocumentWorkspaceRecord> {
    if (role !== "municipal") return denied("Only municipal records staff can edit document metadata.");
    const errors = [
      ...(input.subject.trim().length < 8
        ? [{ id: "subject", message: "Enter a subject of at least eight characters." }]
        : []),
      ...(input.documentType.trim().length < 3
        ? [{ id: "documentType", message: "Enter a document type of at least three characters." }]
        : []),
      ...(!/^M(?:0[1-9]|1[0-7])$/.test(input.sourceModule)
        ? [{ id: "sourceModule", message: "Select a source module from M01 to M17." }]
        : []),
      ...(input.sourceRecordId.trim().length < 5
        ? [{ id: "sourceRecordId", message: "Enter the source record reference." }]
        : []),
    ];
    if (errors.length) return invalid(errors);
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    const record = result.data;
    if (["released", "archived"].includes(record.document.envelope.status)) {
      return invalid([{ id: "document", message: "Restore or reopen this record before editing its metadata." }]);
    }
    record.document.subject = input.subject.trim();
    record.document.documentType = input.documentType.trim();
    record.document.direction = input.direction;
    record.document.classification = input.classification;
    record.document.sourceModule = input.sourceModule;
    record.document.sourceRecordId = input.sourceRecordId.trim().toUpperCase();
    const firstTask = [...record.tasks].sort((a, b) => a.sequence - b.sequence)[0];
    if (firstTask && !COMPLETED_TASK_STATES.has(firstTask.state)) firstTask.office = input.routeOffice;
    record.route.envelope = {
      ...record.route.envelope,
      scope: { kind: "office", id: input.routeOffice.id, label: input.routeOffice.label },
      version: record.route.envelope.version + 1,
      updatedAt: demoClock.nowIso(),
    };
    bump(record);
    return ok(structuredClone(record));
  }

  deleteDocument(role: WorkspaceRole, documentId: string): RepositoryResult<{ id: string }> {
    if (role !== "municipal") return denied("Only municipal records staff can delete document records.");
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    if (result.data.archive.hold) {
      return invalid([{ id: "delete-document", message: "Clear the archive hold before deleting this record." }]);
    }
    this.#records = this.#records.filter((record) => record.document.envelope.id !== documentId);
    return ok({ id: documentId });
  }

  archiveDocument(role: WorkspaceRole, documentId: string): RepositoryResult<DocumentWorkspaceRecord> {
    if (role !== "municipal") return denied("Only municipal records staff can archive document records.");
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    const record = result.data;
    if (record.archive.hold) {
      return invalid([{ id: "archive-document", message: "Clear the archive hold before archiving this record." }]);
    }
    if (record.document.envelope.status !== "released") {
      return invalid([{ id: "archive-document", message: "Only released documents can be archived." }]);
    }
    record.archive.state = "archived";
    bump(record, "archived");
    return ok(structuredClone(record));
  }

  restoreDocument(role: WorkspaceRole, documentId: string): RepositoryResult<DocumentWorkspaceRecord> {
    if (role !== "municipal") return denied("Only municipal records staff can restore document records.");
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    result.data.archive.state = "eligible";
    bump(result.data, "released");
    return ok(structuredClone(result.data));
  }

  acceptHandover(
    role: WorkspaceRole,
    documentId: string,
    receiverOfficeId: string,
    actor: string,
    trackingReference?: string,
  ): RepositoryResult<DocumentWorkspaceRecord> {
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    const record = result.data;
    const custody = record.custody;
    if (custody.mode !== "physical" || custody.state !== "handover-pending" || !custody.intendedReceiver) {
      return invalid([{ id: "tracking-reference", message: "No physical handover is waiting for acceptance." }]);
    }
    if (custody.intendedReceiver.id !== receiverOfficeId) {
      return denied("Only the intended receiving office can accept this handover.");
    }
    if (trackingReference !== undefined && trackingReference.trim().toUpperCase() !== custody.trackingReference) {
      return invalid([{ id: "tracking-reference", message: "The tracking reference does not match." }]);
    }
    custody.currentHolder = custody.intendedReceiver;
    custody.state = "accepted";
    custody.acceptedAt = demoClock.nowIso();
    custody.acceptedBy = actor;
    custody.envelope = {
      ...custody.envelope,
      status: "accepted",
      version: custody.envelope.version + 1,
      updatedAt: demoClock.nowIso(),
      scope: { kind: "office", id: custody.currentHolder.id, label: custody.currentHolder.label },
    };
    const acknowledgment = record.tasks.find((task) => task.state === "pending-acknowledgment");
    if (acknowledgment) {
      acknowledgment.state = "received";
      acknowledgment.acknowledgedAt = demoClock.nowIso();
      acknowledgment.lastActor = actor;
    }
    bump(record, "in-review");
    return ok(structuredClone(record));
  }

  disputeHandover(
    role: WorkspaceRole,
    documentId: string,
    reason: string,
    actor: string,
  ): RepositoryResult<DocumentWorkspaceRecord> {
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    if (reason.trim().length < 8) {
      return invalid([
        { id: "custody-dispute-reason", message: "Explain the custody dispute in at least eight characters." },
      ]);
    }
    const custody = result.data.custody;
    if (custody.mode !== "physical" || !["handover-pending", "accepted"].includes(custody.state)) {
      return invalid([
        { id: "custody-dispute-reason", message: "This custody record cannot be disputed in its current state." },
      ]);
    }
    custody.state = "disputed";
    custody.disputedAt = demoClock.nowIso();
    custody.disputedBy = actor;
    custody.disputeReason = reason.trim();
    custody.envelope = {
      ...custody.envelope,
      status: "disputed",
      version: custody.envelope.version + 1,
      updatedAt: demoClock.nowIso(),
    };
    bump(result.data);
    return ok(structuredClone(result.data));
  }

  replaceFile(
    role: WorkspaceRole,
    documentId: string,
    input: { filename: string; note: string; actor: string },
  ): RepositoryResult<DocumentWorkspaceRecord> {
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    if (!input.filename.toLowerCase().endsWith(".pdf")) {
      return invalid([{ id: "file", message: "Choose a PDF document." }]);
    }
    if (input.note.trim().length < 8) {
      return invalid([{ id: "version-note", message: "Explain the replacement in at least eight characters." }]);
    }
    const record = result.data;
    if (["released", "archived"].includes(record.document.envelope.status)) {
      return invalid([{ id: "file", message: "Released or archived documents cannot receive another file revision." }]);
    }
    for (const version of record.versions) {
      if (version.id === record.document.currentFileVersionId && version.state !== "approved")
        version.state = "superseded";
    }
    const revision = Math.max(...record.versions.map((version) => version.revision)) + 1;
    const version = {
      id: `FILE-2026-${record.document.envelope.id.slice(-3)}-V${revision}`,
      documentId: record.document.envelope.id,
      revision,
      filename: input.filename,
      mediaType: "application/pdf",
      sizeBytes: 278000,
      state: "submitted" as const,
      addedAt: demoClock.nowIso(),
      addedBy: input.actor,
      note: input.note.trim(),
    };
    record.versions.push(version);
    record.document.currentFileVersionId = version.id;
    bump(record, "in-review");
    return ok(structuredClone(record));
  }

  returnTask(
    role: WorkspaceRole,
    documentId: string,
    taskId: string,
    reason: string,
  ): RepositoryResult<DocumentWorkspaceRecord> {
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    if (reason.trim().length < 8) {
      return invalid([{ id: "reason", message: "Give a correction reason of at least eight characters." }]);
    }
    const task = result.data.tasks.find((item) => item.id === taskId);
    if (!task) return empty("The route task was not found.");
    if (task.delegationId && !this.canUseDelegation(result.data, task.delegationId, "review")) {
      return denied("The delegation is expired or does not permit this action. Reassign the task.");
    }
    if (task.state === "pending-acknowledgment" || COMPLETED_TASK_STATES.has(task.state)) {
      return invalid([
        { id: "reason", message: "Acknowledge the task before review and do not reopen completed work." },
      ]);
    }
    task.state = "returned";
    task.completedAt = demoClock.nowIso();
    task.decisionNote = reason.trim();
    task.lastActor = "Municipal Reviewing Officer";
    bump(result.data, "returned");
    return ok(structuredClone(result.data));
  }

  completeTask(
    role: WorkspaceRole,
    documentId: string,
    taskId: string,
    outcome: TaskOutcome,
    delegatedAction: DelegatedAction = "review",
    note = "",
  ): RepositoryResult<DocumentWorkspaceRecord> {
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    const record = result.data;
    const task = record.tasks.find((item) => item.id === taskId);
    if (!task) return empty("The route task was not found.");
    if (task.state === "pending-acknowledgment" || task.state === "returned" || COMPLETED_TASK_STATES.has(task.state)) {
      return invalid([{ id: "review-note", message: "This task is not ready for an endorsement decision." }]);
    }
    if (outcome === "endorsed" && note.trim().length < 8) {
      return invalid([{ id: "review-note", message: "Record an endorsement note of at least eight characters." }]);
    }
    if (task.delegationId && !this.canUseDelegation(record, task.delegationId, delegatedAction)) {
      return denied("The delegation is expired or does not permit this action. Reassign the task.");
    }
    task.state = outcome;
    task.completedAt = demoClock.nowIso();
    task.decisionNote = note.trim() || undefined;
    task.lastActor = "Municipal Reviewing Officer";
    const complete = record.route.requiredTaskIds.every((requiredId) => {
      const required = record.tasks.find((item) => item.id === requiredId);
      return required && ["approved", "endorsed", "released"].includes(required.state);
    });
    record.route.envelope = {
      ...record.route.envelope,
      status: complete ? "complete" : "active",
      version: record.route.envelope.version + 1,
      updatedAt: demoClock.nowIso(),
    };
    if (complete) {
      const currentVersion = record.versions.find((version) => version.id === record.document.currentFileVersionId);
      if (currentVersion) currentVersion.state = "approved";
    }
    bump(record, complete ? "approved" : "in-review");
    return ok(structuredClone(record));
  }

  releaseDocument(
    role: WorkspaceRole,
    documentId: string,
    versionId: string,
    note: string,
    actor: string,
  ): RepositoryResult<DocumentWorkspaceRecord> {
    if (role !== "municipal") return denied("Only the municipal records role can release a document.");
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    const record = result.data;
    if (record.release || record.document.envelope.status === "released") {
      return invalid([{ id: "release-version", message: "This document is already released." }]);
    }
    if (record.route.envelope.status !== "complete") {
      return invalid([{ id: "release-version", message: "Complete every required route task before release." }]);
    }
    if (note.trim().length < 8) {
      return invalid([{ id: "release-note", message: "Record a release note of at least eight characters." }]);
    }
    const version = record.versions.find((item) => item.id === versionId);
    if (version?.state !== "approved") {
      return invalid([{ id: "release-version", message: "Select an explicitly approved revision." }]);
    }
    record.document.currentFileVersionId = version.id;
    record.release = {
      versionId: version.id,
      releasedAt: demoClock.nowIso(),
      releasedBy: actor,
      note: note.trim(),
      sampleOutputReference: `REL-${record.document.envelope.reference}`,
    };
    record.archive = { ...record.archive, state: "eligible" };
    bump(record, "released");
    return ok(structuredClone(record));
  }

  canUseDelegation(
    record: DocumentWorkspaceRecord,
    delegationId: string,
    action: DelegatedAction,
    at = demoClock.nowIso(),
  ) {
    const delegation = record.delegations.find((item) => item.id === delegationId);
    if (!delegation?.permittedActions.includes(action)) return false;
    const time = Date.parse(at);
    return Date.parse(delegation.validFrom) <= time && time <= Date.parse(delegation.validUntil);
  }

  setArchiveHold(
    role: WorkspaceRole,
    documentId: string,
    hold: boolean,
    reason: string,
  ): RepositoryResult<DocumentWorkspaceRecord> {
    const result = this.#mutable(role, documentId);
    if (result.kind !== "success") return result;
    if (role !== "municipal") return denied("Only the municipal records role can change archive holds.");
    if (reason.trim().length < 8) {
      return invalid([{ id: "hold-reason", message: "Record a reason of at least eight characters." }]);
    }
    result.data.archive = {
      ...result.data.archive,
      hold,
      ...(hold
        ? { holdReason: reason.trim(), holdPlacedAt: demoClock.nowIso(), holdPlacedBy: "Municipal Records Supervisor" }
        : { holdReason: undefined, holdPlacedAt: undefined, holdPlacedBy: undefined }),
    };
    bump(result.data);
    return ok(structuredClone(result.data));
  }

  #mutable(role: WorkspaceRole, id: string): RepositoryResult<DocumentWorkspaceRecord> {
    const record = this.#records.find((item) => item.document.envelope.id === id);
    if (!record) return empty("The document was not found.");
    if (!isVisible(record, role)) return denied("This document is outside the assigned role.");
    return ok(record);
  }
}

export const documentRoutingRepository = new DocumentRoutingRepository();

export function listDocumentFoundation(role: WorkspaceRole): DocumentSummary[] {
  return documentRoutingRepository
    .list(role)
    .filter((record) => record.archive.state !== "archived")
    .map((record) => {
      const currentVersion = record.versions.find((version) => version.id === record.document.currentFileVersionId);
      const activeTask = record.tasks.find((task) => !["approved", "endorsed", "released"].includes(task.state));
      return {
        id: record.document.envelope.id,
        reference: record.document.envelope.reference,
        subject: record.document.subject,
        type: record.document.documentType,
        scenario: record.scenario,
        classification: record.document.classification,
        routeState: activeTask?.state ?? record.route.envelope.status,
        fileRevision: currentVersion?.revision ?? 0,
        custodyLabel: custodyLabel(record.custody),
        archiveHold: record.archive.hold,
        archiveState: record.archive.state,
        status: record.document.envelope.status,
        direction: record.document.direction,
        source: `${record.document.sourceModule} · ${record.document.sourceRecordId}`,
        updatedAt: record.document.envelope.updatedAt,
      };
    });
}

export function readDocumentFoundation(role: WorkspaceRole, id: string): DocumentWorkspaceRecord | undefined {
  const result = documentRoutingRepository.read(role, id);
  return result.kind === "success" ? result.data : undefined;
}

export function listDocumentTasks(role: WorkspaceRole): RouteTask[] {
  return documentRoutingRepository.listTasks(role);
}

export function listArchivePreview(role: WorkspaceRole): DocumentWorkspaceRecord[] {
  return documentRoutingRepository
    .list(role)
    .filter(
      (record) =>
        record.document.envelope.status === "released" || record.archive.state !== "active" || record.archive.hold,
    );
}

export type TaskDueState = "complete" | "overdue" | "open";

export function taskDueState(task: RouteTask): TaskDueState {
  if (COMPLETED_TASK_STATES.has(task.state) || task.state === "returned") return "complete";
  return Date.parse(task.dueAt) < demoClock.now().getTime() ? "overdue" : "open";
}

export function custodyLabel(custody: PhysicalCustody): string {
  if (custody.mode === "digital") return "Digital record · no physical handover";
  if (custody.state === "handover-pending" && custody.currentHolder && custody.intendedReceiver) {
    return `${custody.currentHolder.label} · handover pending to ${custody.intendedReceiver.label}`;
  }
  if (custody.state === "disputed" && custody.currentHolder) {
    return `${custody.currentHolder.label} · custody disputed`;
  }
  return custody.currentHolder?.label ?? "Physical holder unavailable";
}

export function projectedHolder(custody: PhysicalCustody): OfficeRef | undefined {
  if (custody.mode === "digital") return undefined;
  if (custody.state === "accepted" && custody.intendedReceiver) return custody.intendedReceiver;
  return custody.currentHolder;
}

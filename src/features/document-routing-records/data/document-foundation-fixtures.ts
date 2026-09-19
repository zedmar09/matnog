import { createEnvelope } from "@/shared/data/record-envelope";

import type {
  ArchiveControl,
  DocumentAudience,
  DocumentClassification,
  DocumentFileVersion,
  DocumentRelease,
  DocumentScenario,
  DocumentWorkspaceRecord,
  FileVersionState,
  OfficeRef,
  PhysicalCustody,
  ReviewDelegation,
  RouteMode,
  RouteTask,
  RouteTaskState,
} from "../types/document-routing";

export const RECORDS_OFFICE: OfficeRef = { id: "DEMO-OFF-RECORDS", label: "Municipal Records Office" };
export const MAYORS_OFFICE: OfficeRef = { id: "DEMO-OFF-MAYOR", label: "Office of the Mayor" };
export const TOURISM_OFFICE: OfficeRef = { id: "DEMO-OFF-TOURISM", label: "Municipal Tourism Office" };
export const ENGINEERING_OFFICE: OfficeRef = { id: "DEMO-OFF-ENGINEERING", label: "Municipal Engineering Office" };
export const HEALTH_OFFICE: OfficeRef = { id: "DEMO-OFF-HEALTH", label: "Municipal Health Office" };
export const BARANGAY_OFFICE: OfficeRef = { id: "DEMO-OFF-BRGY-A", label: "Demo Barangay A Office" };
export const LEGAL_OFFICE: OfficeRef = { id: "DEMO-OFF-LEGAL", label: "Municipal Legal Office" };

type TaskSeed = {
  title: string;
  office: OfficeRef;
  persona: string;
  state: RouteTaskState;
  dueAt: string;
  sequence?: number;
  parallelGroup?: string;
  acknowledgmentRequired?: boolean;
  delegationId?: string;
};

type FixtureSeed = {
  number: number;
  scenario: DocumentScenario;
  subject: string;
  documentType: string;
  status: string;
  classification?: DocumentClassification;
  sourceModule: string;
  sourceRecordId: string;
  allowedRoles?: DocumentAudience[];
  routeMode?: RouteMode;
  tasks: TaskSeed[];
  versions?: { state: FileVersionState; note: string }[];
  custody?: Partial<PhysicalCustody>;
  delegations?: ReviewDelegation[];
  archive?: Partial<ArchiveControl>;
  release?: DocumentRelease;
};

function createFixture(seed: FixtureSeed): DocumentWorkspaceRecord {
  const serial = String(seed.number).padStart(3, "0");
  const documentId = `DEMO-DOC-${serial}`;
  const routeId = `DEMO-ROUTE-${serial}`;
  const custodyId = `DEMO-CUST-${serial}`;
  const day = String(8 + seed.number).padStart(2, "0");
  const createdAt = `2026-09-${day}T08:05:00+08:00`;
  const versionsSeed = seed.versions ?? [{ state: "submitted" as const, note: "Initial bundled sample file" }];
  const versions: DocumentFileVersion[] = versionsSeed.map((version, index) => ({
    id: `DEMO-FILE-${serial}-V${index + 1}`,
    documentId,
    revision: index + 1,
    filename: `sample-${seed.scenario}-r${index + 1}.pdf`,
    mediaType: "application/pdf",
    sizeBytes: 220000 + seed.number * 10000 + index * 14000,
    state: version.state,
    addedAt: `2026-09-${day}T08:${String(5 + index * 12).padStart(2, "0")}:00+08:00`,
    addedBy: "Records staff · demo persona",
    note: version.note,
  }));
  const tasks: RouteTask[] = seed.tasks.map((task, index) => ({
    id: `DEMO-TASK-${serial}-${index + 1}`,
    routeId,
    documentId,
    title: task.title,
    office: task.office,
    assigneePersona: task.persona,
    sequence: task.sequence ?? index + 1,
    state: task.state,
    acknowledgmentRequired: task.acknowledgmentRequired ?? false,
    dueAt: task.dueAt,
    ...(task.parallelGroup ? { parallelGroup: task.parallelGroup } : {}),
    ...(task.delegationId ? { delegationId: task.delegationId } : {}),
  }));
  const physical = seed.scenario === "physical-handover";
  const custody: PhysicalCustody = {
    envelope: createEnvelope({
      id: custodyId,
      status: physical ? "handover-pending" : "digital-only",
      scope: { kind: "office", id: RECORDS_OFFICE.id, label: RECORDS_OFFICE.label },
      createdAt,
    }),
    documentId,
    state: physical ? "handover-pending" : "digital-only",
    mode: physical ? "physical" : "digital",
    ...(physical
      ? {
          currentHolder: RECORDS_OFFICE,
          intendedReceiver: MAYORS_OFFICE,
          trackingReference: "HAND-2026-0017",
          sentAt: "2026-09-15T08:40:00+08:00",
          sentBy: "Records staff · demo persona",
        }
      : {}),
    ...seed.custody,
  };

  return {
    scenario: seed.scenario,
    document: {
      envelope: createEnvelope({
        id: documentId,
        reference: `DOC-2026-${String(41 + seed.number).padStart(4, "0")}`,
        status: seed.status,
        scope: { kind: "office", id: RECORDS_OFFICE.id, label: RECORDS_OFFICE.label },
        createdAt,
        updatedAt: versions.at(-1)?.addedAt ?? createdAt,
        version: versions.length,
      }),
      subject: seed.subject,
      documentType: seed.documentType,
      direction: "incoming",
      classification: seed.classification ?? "internal",
      sourceModule: seed.sourceModule,
      sourceRecordId: seed.sourceRecordId,
      currentFileVersionId: versions.at(-1)?.id ?? `DEMO-FILE-${serial}-V1`,
      routeId,
      custodyId,
      allowedRoles: seed.allowedRoles ?? ["municipal"],
    },
    versions,
    route: {
      envelope: createEnvelope({
        id: routeId,
        status: seed.status === "released" ? "complete" : "active",
        scope: {
          kind: "office",
          id: tasks[0]?.office.id ?? RECORDS_OFFICE.id,
          label: tasks[0]?.office.label ?? RECORDS_OFFICE.label,
        },
        createdAt,
      }),
      documentId,
      templateId: `DEMO-TPL-${seed.scenario.toUpperCase()}`,
      templateVersion: 1,
      currentStage: Math.max(1, ...tasks.map((task) => task.sequence)),
      taskIds: tasks.map((task) => task.id),
      mode: seed.routeMode ?? "sequential",
      requiredTaskIds: tasks.map((task) => task.id),
    },
    tasks,
    custody,
    delegations: seed.delegations ?? [],
    archive: { state: seed.status === "released" ? "eligible" : "active", hold: false, ...seed.archive },
    ...(seed.release ? { release: seed.release } : {}),
  };
}

export const DOCUMENT_ROUTING_FIXTURES: readonly [DocumentWorkspaceRecord, ...DocumentWorkspaceRecord[]] = [
  createFixture({
    number: 1,
    scenario: "physical-handover",
    subject: "Sample coastal activity endorsement",
    documentType: "Endorsement packet",
    status: "routed",
    sourceModule: "M04 Tourism & maritime operations",
    sourceRecordId: "DEMO-TRIP-001",
    allowedRoles: ["municipal", "partner"],
    versions: [
      { state: "superseded", note: "Initial sample scan" },
      { state: "submitted", note: "Readable replacement scan" },
    ],
    tasks: [
      {
        title: "Acknowledge receipt",
        office: MAYORS_OFFICE,
        persona: "Receiving clerk",
        state: "pending-acknowledgment",
        acknowledgmentRequired: true,
        dueAt: "2026-09-15T12:00:00+08:00",
      },
      {
        title: "Review endorsement packet",
        office: MAYORS_OFFICE,
        persona: "Office reviewer",
        state: "received",
        dueAt: "2026-09-17T17:00:00+08:00",
      },
    ],
  }),
  createFixture({
    number: 2,
    scenario: "digital-review",
    subject: "Sample barangay certification request",
    documentType: "Digital certification packet",
    status: "in-review",
    sourceModule: "M07 Barangay certifications",
    sourceRecordId: "DEMO-CERT-001",
    allowedRoles: ["municipal", "barangay"],
    tasks: [
      {
        title: "Review residency certification",
        office: BARANGAY_OFFICE,
        persona: "Barangay reviewer",
        state: "in-review",
        dueAt: "2026-09-16T15:00:00+08:00",
      },
    ],
  }),
  createFixture({
    number: 3,
    scenario: "parallel-review",
    subject: "Sample event safety review",
    documentType: "Parallel review packet",
    status: "in-review",
    sourceModule: "M11 Citizen service desk",
    sourceRecordId: "DEMO-SVC-003",
    routeMode: "parallel",
    tasks: [
      {
        title: "Health and sanitation review",
        office: HEALTH_OFFICE,
        persona: "Health reviewer",
        state: "approved",
        sequence: 1,
        parallelGroup: "safety",
        dueAt: "2026-09-15T16:00:00+08:00",
      },
      {
        title: "Venue safety review",
        office: ENGINEERING_OFFICE,
        persona: "Engineering reviewer",
        state: "in-review",
        sequence: 1,
        parallelGroup: "safety",
        dueAt: "2026-09-14T16:00:00+08:00",
      },
    ],
  }),
  createFixture({
    number: 4,
    scenario: "returned-correction",
    subject: "Sample business sketch correction",
    documentType: "Business attachment",
    status: "returned",
    sourceModule: "M03 Business permits",
    sourceRecordId: "DEMO-BPL-001",
    versions: [
      { state: "superseded", note: "Returned because the sample sketch was unreadable" },
      { state: "working", note: "Replacement draft awaiting resubmission" },
    ],
    tasks: [
      {
        title: "Correct unreadable location sketch",
        office: RECORDS_OFFICE,
        persona: "Applicant support reviewer",
        state: "returned",
        dueAt: "2026-09-18T17:00:00+08:00",
      },
    ],
  }),
  createFixture({
    number: 5,
    scenario: "delegated-review",
    subject: "Sample delegated approval packet",
    documentType: "Approval memorandum",
    status: "in-review",
    sourceModule: "M11 Citizen service desk",
    sourceRecordId: "DEMO-SVC-005",
    delegations: [
      {
        id: "DEMO-DEL-001",
        fromPersona: "Municipal administrator",
        toPersona: "Acting municipal administrator",
        validFrom: "2026-09-10T08:00:00+08:00",
        validUntil: "2026-09-14T17:00:00+08:00",
        permittedActions: ["review", "endorse", "sign"],
      },
    ],
    tasks: [
      {
        title: "Delegated signatory review",
        office: MAYORS_OFFICE,
        persona: "Acting municipal administrator",
        state: "in-review",
        delegationId: "DEMO-DEL-001",
        dueAt: "2026-09-15T14:00:00+08:00",
      },
    ],
  }),
  createFixture({
    number: 6,
    scenario: "confidential",
    subject: "Restricted legal correspondence",
    documentType: "Confidential memorandum",
    status: "in-review",
    classification: "restricted",
    sourceModule: "M17 Platform administration",
    sourceRecordId: "DEMO-ADM-006",
    allowedRoles: ["municipal"],
    tasks: [
      {
        title: "Restricted legal review",
        office: LEGAL_OFFICE,
        persona: "Authorized legal reviewer",
        state: "in-review",
        dueAt: "2026-09-16T12:00:00+08:00",
      },
    ],
  }),
  createFixture({
    number: 7,
    scenario: "archive-hold",
    subject: "Released sample permit under archive hold",
    documentType: "Released permit packet",
    status: "released",
    sourceModule: "M03 Business permits",
    sourceRecordId: "DEMO-BPL-007",
    versions: [{ state: "approved", note: "Explicitly approved release revision" }],
    tasks: [
      {
        title: "Release approved version",
        office: RECORDS_OFFICE,
        persona: "Records officer",
        state: "released",
        dueAt: "2026-09-12T17:00:00+08:00",
      },
    ],
    archive: {
      state: "eligible",
      hold: true,
      holdReason: "Sample audit review remains open",
      holdPlacedAt: "2026-09-14T10:30:00+08:00",
      holdPlacedBy: "Records supervisor · demo persona",
    },
    release: {
      versionId: "DEMO-FILE-007-V1",
      releasedAt: "2026-09-12T15:40:00+08:00",
      releasedBy: "Records officer · demo persona",
      note: "Released after the sample route completed",
      sampleOutputReference: "SAMPLE-REL-DOC-2026-0048",
    },
  }),
];

export const DOCUMENT_FOUNDATION_FIXTURE = DOCUMENT_ROUTING_FIXTURES[0];

import type { RecordEnvelope } from "@/shared/data/record-envelope";

export type DocumentDirection = "incoming" | "outgoing";
export type DocumentClassification = "public" | "internal" | "restricted";
export type DocumentState = "registered" | "routed" | "in-review" | "returned" | "approved" | "released" | "archived";
export type FileVersionState = "working" | "submitted" | "approved" | "superseded";
export type RouteTaskState =
  | "pending-acknowledgment"
  | "received"
  | "in-review"
  | "returned"
  | "endorsed"
  | "approved"
  | "released";
export type CustodyState = "digital-only" | "held" | "handover-pending" | "accepted" | "disputed" | "lost";
export type DocumentScenario =
  | "digital-review"
  | "physical-handover"
  | "parallel-review"
  | "returned-correction"
  | "delegated-review"
  | "confidential"
  | "archive-hold";
export type RouteMode = "sequential" | "parallel";
export type DocumentAudience = "municipal" | "barangay" | "partner";

export type OfficeRef = { id: string; label: string };

/** The business-facing record. It points to file, route and custody records without merging their lifecycles. */
export type RoutedDocument = {
  envelope: RecordEnvelope;
  subject: string;
  documentType: string;
  direction: DocumentDirection;
  classification: DocumentClassification;
  sourceModule: string;
  sourceRecordId: string;
  currentFileVersionId: string;
  routeId: string;
  custodyId: string;
  allowedRoles: DocumentAudience[];
};

/** One immutable uploaded/scanned revision. Replacing a file adds a version; it never edits an approved version. */
export type DocumentFileVersion = {
  id: string;
  documentId: string;
  revision: number;
  filename: string;
  mediaType: string;
  sizeBytes: number;
  state: FileVersionState;
  addedAt: string;
  addedBy: string;
  note: string;
};

export type RouteTask = {
  id: string;
  routeId: string;
  documentId: string;
  title: string;
  office: OfficeRef;
  assigneePersona: string;
  sequence: number;
  parallelGroup?: string;
  delegationId?: string;
  state: RouteTaskState;
  acknowledgmentRequired: boolean;
  dueAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  assignmentNote?: string;
  decisionNote?: string;
  lastActor?: string;
};

export type DocumentRoute = {
  envelope: RecordEnvelope;
  documentId: string;
  templateId: string;
  templateVersion: number;
  currentStage: number;
  taskIds: string[];
  mode: RouteMode;
  requiredTaskIds: string[];
};

/** Physical possession. A pending handover names an intended receiver but keeps the current holder unchanged. */
export type PhysicalCustody = {
  envelope: RecordEnvelope;
  documentId: string;
  state: CustodyState;
  mode: "digital" | "physical";
  currentHolder?: OfficeRef;
  intendedReceiver?: OfficeRef;
  trackingReference?: string;
  sentAt?: string;
  sentBy?: string;
  acceptedAt?: string;
  acceptedBy?: string;
  disputedAt?: string;
  disputedBy?: string;
  disputeReason?: string;
};

export type DocumentRelease = {
  versionId: string;
  releasedAt: string;
  releasedBy: string;
  note: string;
  sampleOutputReference: string;
};

export type ReviewDelegation = {
  id: string;
  fromPersona: string;
  toPersona: string;
  validFrom: string;
  validUntil: string;
  permittedActions: ("review" | "endorse" | "sign")[];
};

export type ArchiveControl = {
  state: "active" | "eligible" | "archived";
  hold: boolean;
  holdReason?: string;
  holdPlacedAt?: string;
  holdPlacedBy?: string;
};

export type DocumentWorkspaceRecord = {
  scenario: DocumentScenario;
  document: RoutedDocument;
  versions: DocumentFileVersion[];
  route: DocumentRoute;
  tasks: RouteTask[];
  custody: PhysicalCustody;
  delegations: ReviewDelegation[];
  archive: ArchiveControl;
  release?: DocumentRelease;
};

export type DocumentRegistrationInput = {
  direction: DocumentDirection;
  documentType: string;
  sourceModule: string;
  sourceRecordId: string;
  subject: string;
  classification: DocumentClassification;
  filename: string;
  attachmentNote: string;
  routeOffice: OfficeRef;
};

export type DocumentMetadataUpdateInput = {
  direction: DocumentDirection;
  documentType: string;
  sourceModule: string;
  sourceRecordId: string;
  subject: string;
  classification: DocumentClassification;
  routeOffice: OfficeRef;
};

export type RouteStagePlacement = "next-sequential" | "current-parallel";

export type RouteStageAssignmentInput = {
  title: string;
  office: OfficeRef;
  assigneePersona: string;
  dueAt: string;
  acknowledgmentRequired: boolean;
  placement: RouteStagePlacement;
  assignmentNote: string;
  actor: string;
};

export type RoutingTemplateStage = {
  id: string;
  title: string;
  office: OfficeRef;
  assigneePersona: string;
  sequence: number;
  dueDays: number;
  acknowledgmentRequired: boolean;
};

export type RoutingTemplate = {
  id: string;
  name: string;
  version: number;
  mode: RouteMode;
  status: "draft" | "active";
  stages: RoutingTemplateStage[];
};

export type SafeDocumentTrackingStep = {
  title: string;
  detail: string;
  complete: boolean;
};

/** Public/member projection that deliberately has no internal document fields. */
export type SafeDocumentTrackingRecord = {
  reference: string;
  title: string;
  status: string;
  steps: SafeDocumentTrackingStep[];
  sampleOutputReference?: string;
  releasedAt?: string;
};

import type { RecordEnvelope } from "@/shared/data/record-envelope";

export type CertificateRequestStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "returned"
  | "awaiting-payment"
  | "payment-exception"
  | "ready-for-signoff"
  | "issued"
  | "revoked"
  | "blocked";

export type CertificateScenario =
  | "residency-review"
  | "returned-correction"
  | "fee-exempt"
  | "business-clearance"
  | "revoked-issuance"
  | "prohibited-case-request"
  | "wrong-barangay"
  | "settlement-exception";

export type CertificateSource = "ordinary-catalog" | "m10-case" | "prohibited-public-case-attempt";
export type CertificateSubjectKind = "person" | "business" | "case";
export type CertificateClaimMethod = "barangay-counter" | "digital-copy";

export type CertificateEvidence = {
  id: string;
  label: string;
  status: "provided" | "missing" | "not-required";
  source: "M01 projection" | "Applicant declaration" | "Bundled metadata" | "M10 eligibility";
};

export type CertificateRequestRevision = {
  id: string;
  requestId: string;
  revision: number;
  state: "working" | "submitted" | "superseded" | "approved-snapshot";
  purpose: string;
  requestingOffice: string;
  evidenceIds: readonly string[];
  createdAt: string;
  note: string;
};

export type CertificateReview = {
  id: string;
  requestId: string;
  assignedBarangayId: string;
  assignedBarangayLabel: string;
  status: "pending" | "in-review" | "returned" | "reviewed" | "blocked";
  checklist: readonly { id: string; label: string; result: "pending" | "met" | "not-met" | "not-applicable" }[];
  decisionReason?: string;
  history: readonly {
    id: string;
    action:
      | "assigned"
      | "returned"
      | "correction-received"
      | "approved"
      | "fee-selected"
      | "signed"
      | "reprinted"
      | "revoked";
    actor: string;
    at: string;
    revisionId: string;
    reason?: string;
  }[];
};

export type CertificateFeeDecision =
  | { kind: "pending"; guidance: string }
  | { kind: "assessment"; assessmentId: string; status: "partial" | "pending" | "paid" | "exception" }
  | { kind: "exempt"; exemptionId: string; basis: string; reviewedBy: string };

export type CertificateRequestRecord = {
  envelope: RecordEnvelope;
  scenario: CertificateScenario;
  source: CertificateSource;
  certificateTypeId: string;
  certificateTypeLabel: string;
  requesterId: string;
  requesterLabel: string;
  subjectKind: CertificateSubjectKind;
  subjectId: string;
  subjectLabel: string;
  barangayId: string;
  barangayLabel: string;
  purpose: string;
  requestingOffice: string;
  claimMethod: CertificateClaimMethod;
  status: CertificateRequestStatus;
  evidence: readonly CertificateEvidence[];
  revisions: readonly CertificateRequestRevision[];
  currentRevisionId: string;
  review: CertificateReview;
  feeDecision: CertificateFeeDecision;
  routedDocumentId?: string;
  issuanceId?: string;
};

export type CertificateTemplateVersion = {
  envelope: RecordEnvelope;
  templateId: string;
  certificateTypeId: string;
  certificateTypeLabel: string;
  barangayId: string;
  barangayLabel: string;
  version: number;
  status: "active" | "retired" | "restricted";
  signatoryRole: string;
  fields: readonly string[];
  serialPrefix: string;
  nextSerialSequence: number;
  effectiveFrom: string;
  /**
   * The printable layout, as HTML. Placeholders in {{double braces}} are filled
   * from the approved request at sign-off; the layout itself is frozen into the
   * issuance so a later edit never rewrites an issued certificate.
   */
  body: string;
};

export type CertificateIssuance = {
  envelope: RecordEnvelope;
  requestId: string;
  approvedRevisionId: string;
  templateVersionId: string;
  serial: string;
  signatoryRole: string;
  issuedAt: string;
  status: "valid" | "revoked";
  verificationToken: string;
  snapshot: {
    certificateTypeLabel: string;
    subjectLabel: string;
    barangayLabel: string;
    purpose: string;
    requestingOffice: string;
    claimMethod: CertificateClaimMethod;
  };
  release: { at: string; actor: string; method: CertificateClaimMethod };
  reprints: readonly { id: string; at: string; actor: string; reason: string }[];
  revokedAt?: string;
  revocationReason?: string;
};

export type CertificateWorkspaceRecord = {
  request: CertificateRequestRecord;
  issuance?: CertificateIssuance;
};

export type CertificateVerificationProjection = {
  token: string;
  status: "valid" | "revoked";
  certificateTypeLabel: string;
  sampleSerial: string;
  issuingBarangay: string;
  templateVersion: number;
  issuedAt: string;
  revokedAt?: string;
};

export type BusinessClearanceState =
  | "not-requested"
  | "under-review"
  | "payment-required"
  | "ready-for-signoff"
  | "valid"
  | "revoked"
  | "blocked";

/** Read-only result M03 may consume without gaining ownership of the M07 lifecycle. */
export type BusinessClearanceProjection = {
  businessId: string;
  businessLabel: string;
  state: BusinessClearanceState;
  stateLabel: string;
  guidance: string;
  requestId?: string;
  assessmentId?: string;
  issuanceSerial?: string;
  issuedAt?: string;
  verificationToken?: string;
};

export type CaseCertificateOriginInput = {
  decisionId: string;
  caseId: string;
  decisionStatus: "eligible" | "ineligible" | "pending";
  decidedAt?: string;
};

/** Minimal M10-facing projection. It never contains complainant, respondent or case narrative data. */
export type CaseCertificateOriginProjection = {
  decisionId: string;
  caseReference: string;
  mayCreateRequest: boolean;
  certificateTypeId: "certificate-to-file-action";
  source: "M10 case decision";
  guidance: string;
};

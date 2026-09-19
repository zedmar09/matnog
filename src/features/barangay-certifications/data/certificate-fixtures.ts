import { createEnvelope } from "@/shared/data/record-envelope";

import type {
  CertificateEvidence,
  CertificateFeeDecision,
  CertificateIssuance,
  CertificateRequestRecord,
  CertificateRequestStatus,
  CertificateScenario,
  CertificateSource,
  CertificateSubjectKind,
  CertificateTemplateVersion,
  CertificateWorkspaceRecord,
} from "../types/certificate-records";

const BARANGAY_A = { id: "DEMO-BRGY-A", label: "Demo Barangay A" } as const;
const BARANGAY_B = { id: "DEMO-BRGY-B", label: "Demo Barangay B" } as const;

type Seed = {
  id: string;
  scenario: CertificateScenario;
  source?: CertificateSource;
  typeId: string;
  typeLabel: string;
  requesterId: string;
  requesterLabel: string;
  subjectKind: CertificateSubjectKind;
  subjectId: string;
  subjectLabel: string;
  barangay?: typeof BARANGAY_A | typeof BARANGAY_B;
  purpose: string;
  requestingOffice?: string;
  status: CertificateRequestStatus;
  reviewStatus: CertificateRequestRecord["review"]["status"];
  feeDecision: CertificateFeeDecision;
  evidence?: readonly CertificateEvidence[];
  returnedReason?: string;
  revisionCount?: number;
  routedDocumentId?: string;
  issuance?: Omit<CertificateIssuance, "envelope" | "requestId" | "approvedRevisionId" | "snapshot" | "release">;
};

const RESIDENCY_EVIDENCE: readonly CertificateEvidence[] = [
  { id: "DEMO-CERT-EVD-RES", label: "Current residency projection", status: "provided", source: "M01 projection" },
  { id: "DEMO-CERT-EVD-PURPOSE", label: "Declared purpose", status: "provided", source: "Applicant declaration" },
];

function buildRecord(seed: Seed, index: number): CertificateWorkspaceRecord {
  const createdAt = `2026-09-${String(8 + index).padStart(2, "0")}T09:00:00+08:00`;
  const barangay = seed.barangay ?? BARANGAY_A;
  const revisionCount = seed.revisionCount ?? 1;
  const revisions = Array.from({ length: revisionCount }, (_, revisionIndex) => ({
    id: `${seed.id}-REV-${revisionIndex + 1}`,
    requestId: seed.id,
    revision: revisionIndex + 1,
    state:
      revisionIndex === revisionCount - 1
        ? seed.issuance
          ? ("approved-snapshot" as const)
          : seed.reviewStatus === "returned"
            ? ("working" as const)
            : ("submitted" as const)
        : ("superseded" as const),
    purpose: seed.purpose,
    requestingOffice: seed.requestingOffice ?? "Requesting office",
    evidenceIds: (seed.evidence ?? RESIDENCY_EVIDENCE).map((item) => item.id),
    createdAt: `2026-09-${String(8 + index).padStart(2, "0")}T${String(9 + revisionIndex).padStart(2, "0")}:00:00+08:00`,
    note: revisionIndex === 0 ? "Initial submission" : "Correction draft keeps the earlier revision",
  }));
  const review = {
    id: `${seed.id}-REVIEW-1`,
    requestId: seed.id,
    assignedBarangayId: BARANGAY_A.id,
    assignedBarangayLabel: BARANGAY_A.label,
    status: seed.reviewStatus,
    checklist: [
      {
        id: "subject",
        label: "Requester authority and subject match",
        result: seed.status === "blocked" ? ("not-met" as const) : ("met" as const),
      },
      {
        id: "barangay",
        label: "Current barangay matches the issuing scope",
        result: seed.scenario === "wrong-barangay" ? ("not-met" as const) : ("met" as const),
      },
      { id: "purpose", label: "Specific purpose is recorded", result: "met" as const },
      {
        id: "evidence",
        label: "Required evidence is attached to the submitted revision",
        result: seed.reviewStatus === "returned" ? ("not-met" as const) : ("met" as const),
      },
    ],
    history: [
      {
        id: `${seed.id}-REVIEW-HISTORY-1`,
        action: "assigned" as const,
        actor: "Demo Barangay A assignment rule",
        at: createdAt,
        revisionId: `${seed.id}-REV-1`,
      },
      ...(seed.returnedReason
        ? [
            {
              id: `${seed.id}-REVIEW-HISTORY-2`,
              action: "returned" as const,
              actor: "Barangay certificate reviewer",
              at: `2026-09-${String(8 + index).padStart(2, "0")}T10:00:00+08:00`,
              revisionId: revisions.at(-1)?.id ?? `${seed.id}-REV-1`,
              reason: seed.returnedReason,
            },
          ]
        : []),
      ...(!seed.returnedReason && seed.reviewStatus === "reviewed"
        ? [
            {
              id: `${seed.id}-REVIEW-HISTORY-2`,
              action: "approved" as const,
              actor: "Barangay certificate reviewer",
              at: seed.issuance?.issuedAt ?? createdAt,
              revisionId: revisions.at(-1)?.id ?? `${seed.id}-REV-1`,
            },
          ]
        : []),
      ...(seed.feeDecision.kind !== "pending"
        ? [
            {
              id: `${seed.id}-REVIEW-HISTORY-3`,
              action: "fee-selected" as const,
              actor: "Barangay certificate reviewer",
              at: seed.issuance?.issuedAt ?? createdAt,
              revisionId: revisions.at(-1)?.id ?? `${seed.id}-REV-1`,
              reason:
                seed.feeDecision.kind === "exempt"
                  ? seed.feeDecision.basis
                  : `${seed.feeDecision.assessmentId} · ${seed.feeDecision.status}`,
            },
          ]
        : []),
      ...(seed.issuance
        ? [
            {
              id: `${seed.id}-REVIEW-HISTORY-4`,
              action: "signed" as const,
              actor: seed.issuance.signatoryRole,
              at: seed.issuance.issuedAt,
              revisionId: revisions.at(-1)?.id ?? `${seed.id}-REV-1`,
              reason: `${seed.issuance.templateVersionId} · ${seed.issuance.serial}`,
            },
            ...seed.issuance.reprints.map((reprint, reprintIndex) => ({
              id: `${seed.id}-REVIEW-HISTORY-REPRINT-${reprintIndex + 1}`,
              action: "reprinted" as const,
              actor: reprint.actor,
              at: reprint.at,
              revisionId: revisions.at(-1)?.id ?? `${seed.id}-REV-1`,
              reason: reprint.reason,
            })),
            ...(seed.issuance.status === "revoked"
              ? [
                  {
                    id: `${seed.id}-REVIEW-HISTORY-REVOKED`,
                    action: "revoked" as const,
                    actor: "Authorized Punong Barangay",
                    at: seed.issuance.revokedAt ?? seed.issuance.issuedAt,
                    revisionId: revisions.at(-1)?.id ?? `${seed.id}-REV-1`,
                    reason: seed.issuance.revocationReason ?? "Revocation",
                  },
                ]
              : []),
          ]
        : []),
    ],
    ...(seed.returnedReason ? { decisionReason: seed.returnedReason } : {}),
  };
  const request: CertificateRequestRecord = {
    envelope: createEnvelope({
      id: seed.id,
      status: seed.status,
      scope: { kind: seed.subjectKind, id: seed.subjectId, label: seed.subjectLabel },
      createdAt,
      version: revisionCount,
    }),
    scenario: seed.scenario,
    source: seed.source ?? "ordinary-catalog",
    certificateTypeId: seed.typeId,
    certificateTypeLabel: seed.typeLabel,
    requesterId: seed.requesterId,
    requesterLabel: seed.requesterLabel,
    subjectKind: seed.subjectKind,
    subjectId: seed.subjectId,
    subjectLabel: seed.subjectLabel,
    barangayId: barangay.id,
    barangayLabel: barangay.label,
    purpose: seed.purpose,
    requestingOffice: seed.requestingOffice ?? "Requesting office",
    claimMethod: seed.issuance ? "digital-copy" : "barangay-counter",
    status: seed.status,
    evidence: seed.evidence ?? RESIDENCY_EVIDENCE,
    revisions,
    currentRevisionId: revisions.at(-1)?.id ?? `${seed.id}-REV-1`,
    review,
    feeDecision: seed.feeDecision,
    ...(seed.routedDocumentId ? { routedDocumentId: seed.routedDocumentId } : {}),
    ...(seed.issuance ? { issuanceId: `${seed.id}-ISS-1` } : {}),
  };
  if (!seed.issuance) return { request };
  const issuance: CertificateIssuance = {
    envelope: createEnvelope({
      id: `${seed.id}-ISS-1`,
      status: seed.issuance.status,
      scope: { kind: "barangay", id: BARANGAY_A.id, label: BARANGAY_A.label },
      createdAt: seed.issuance.issuedAt,
    }),
    requestId: seed.id,
    approvedRevisionId: revisions.at(-1)?.id ?? `${seed.id}-REV-1`,
    ...seed.issuance,
    snapshot: {
      certificateTypeLabel: seed.typeLabel,
      subjectLabel: seed.subjectLabel,
      barangayLabel: barangay.label,
      purpose: seed.purpose,
      requestingOffice: seed.requestingOffice ?? "Requesting office",
      claimMethod: seed.issuance ? "digital-copy" : "barangay-counter",
    },
    release: {
      at: seed.issuance.issuedAt,
      actor: "Barangay release clerk",
      method: seed.issuance ? "digital-copy" : "barangay-counter",
    },
  };
  return { request, issuance };
}

export const CERTIFICATE_WORKSPACE_FIXTURES: readonly CertificateWorkspaceRecord[] = [
  buildRecord(
    {
      id: "DEMO-CERT-001",
      scenario: "residency-review",
      typeId: "residency",
      typeLabel: "Certificate of residency",
      requesterId: "DEMO-VIS-001",
      requesterLabel: "Mara Dela Cruz",
      subjectKind: "person",
      subjectId: "DEMO-PER-001",
      subjectLabel: "Mara Dela Cruz",
      purpose: "School enrollment requirement",
      requestingOffice: "Matnog Community College",
      status: "under-review",
      reviewStatus: "in-review",
      feeDecision: { kind: "pending", guidance: "The fee path is selected after the barangay review is complete." },
    },
    1,
  ),
  buildRecord(
    {
      id: "DEMO-CERT-002",
      scenario: "returned-correction",
      typeId: "residency",
      typeLabel: "Certificate of residency",
      requesterId: "DEMO-PER-002",
      requesterLabel: "Nico Dela Cruz",
      subjectKind: "person",
      subjectId: "DEMO-PER-002",
      subjectLabel: "Nico Dela Cruz",
      purpose: "Scholarship application",
      requestingOffice: "Sorsogon Scholarship Committee",
      status: "returned",
      reviewStatus: "returned",
      feeDecision: { kind: "pending", guidance: "Fee review resumes after the missing evidence is corrected." },
      returnedReason: "Add the requesting school and a readable purpose letter.",
      revisionCount: 2,
    },
    2,
  ),
  buildRecord(
    {
      id: "DEMO-CERT-003",
      scenario: "fee-exempt",
      typeId: "indigency",
      typeLabel: "Certificate of indigency",
      requesterId: "DEMO-VIS-001",
      requesterLabel: "Mara Dela Cruz",
      subjectKind: "person",
      subjectId: "DEMO-PER-001",
      subjectLabel: "Mara Dela Cruz",
      purpose: "Public hospital assistance",
      requestingOffice: "Public Hospital Assistance Desk",
      status: "issued",
      reviewStatus: "reviewed",
      feeDecision: {
        kind: "exempt",
        exemptionId: "DEMO-CERT-EXM-003",
        basis: "Approved indigency exemption fixture",
        reviewedBy: "Barangay reviewer",
      },
      issuance: {
        templateVersionId: "DEMO-TPL-RES-A-V3",
        serial: "BRGY-CERT-2026-0001",
        signatoryRole: "Authorized Punong Barangay",
        issuedAt: "2026-09-14T14:00:00+08:00",
        status: "valid",
        verificationToken: "DEMO-CERT-TOKEN-003",
        reprints: [],
      },
    },
    3,
  ),
  buildRecord(
    {
      id: "DEMO-CERT-004",
      scenario: "business-clearance",
      typeId: "business-clearance",
      typeLabel: "Barangay business clearance",
      requesterId: "DEMO-BIZ-001",
      requesterLabel: "Demo Bay Tours",
      subjectKind: "business",
      subjectId: "DEMO-BIZ-001",
      subjectLabel: "Demo Bay Tours",
      purpose: "Business permit renewal",
      requestingOffice: "Business Permits and Licensing Office",
      status: "awaiting-payment",
      reviewStatus: "reviewed",
      feeDecision: { kind: "assessment", assessmentId: "DEMO-ASM-009", status: "pending" },
    },
    4,
  ),
  buildRecord(
    {
      id: "DEMO-CERT-005",
      scenario: "revoked-issuance",
      typeId: "clearance",
      typeLabel: "Barangay clearance",
      requesterId: "DEMO-VIS-001",
      requesterLabel: "Mara Dela Cruz",
      subjectKind: "person",
      subjectId: "DEMO-PER-001",
      subjectLabel: "Mara Dela Cruz",
      purpose: "Local employment requirement",
      requestingOffice: "Matnog Port Services",
      status: "revoked",
      reviewStatus: "reviewed",
      feeDecision: { kind: "assessment", assessmentId: "DEMO-ASM-CERT-005", status: "paid" },
      issuance: {
        templateVersionId: "DEMO-TPL-CLR-A-V2",
        serial: "BRGY-CERT-2026-0002",
        signatoryRole: "Authorized Punong Barangay",
        issuedAt: "2026-09-10T11:00:00+08:00",
        status: "revoked",
        verificationToken: "DEMO-CERT-TOKEN-005",
        reprints: [
          {
            id: "DEMO-CERT-REPRINT-005-1",
            at: "2026-09-11T09:30:00+08:00",
            actor: "Barangay clerk",
            reason: "Applicant requested another printed copy",
          },
        ],
        revokedAt: "2026-09-13T15:00:00+08:00",
        revocationReason: "Source record correction after issuance",
      },
    },
    5,
  ),
  buildRecord(
    {
      id: "DEMO-CERT-006",
      scenario: "prohibited-case-request",
      source: "prohibited-public-case-attempt",
      typeId: "certificate-to-file-action",
      typeLabel: "Certificate to File Action",
      requesterId: "DEMO-VIS-001",
      requesterLabel: "Public wizard attempt",
      subjectKind: "case",
      subjectId: "DEMO-CASE-001",
      subjectLabel: "Restricted case reference",
      purpose: "Generic public request is prohibited",
      requestingOffice: "Ineligible public wizard path",
      status: "blocked",
      reviewStatus: "blocked",
      feeDecision: { kind: "pending", guidance: "No fee or request exists because M10 eligibility is missing." },
      evidence: [
        { id: "DEMO-CERT-EVD-CASE", label: "Eligible M10 decision", status: "missing", source: "M10 eligibility" },
      ],
      returnedReason: "This certificate can originate only from an eligible M10 decision.",
    },
    6,
  ),
  buildRecord(
    {
      id: "DEMO-CERT-007",
      scenario: "wrong-barangay",
      typeId: "residency",
      typeLabel: "Certificate of residency",
      requesterId: "DEMO-PER-006",
      requesterLabel: "Liza Bermudo",
      subjectKind: "person",
      subjectId: "DEMO-PER-006",
      subjectLabel: "Liza Bermudo",
      barangay: BARANGAY_B,
      purpose: "Utility service application",
      requestingOffice: "Sorsogon Electric Cooperative",
      status: "returned",
      reviewStatus: "returned",
      feeDecision: { kind: "pending", guidance: "No assessment until the issuing barangay is corrected." },
      returnedReason: "The request was sent to Demo Barangay A, but current residency is in Demo Barangay B.",
    },
    7,
  ),
  buildRecord(
    {
      id: "DEMO-CERT-UNMATCHED",
      scenario: "settlement-exception",
      typeId: "clearance",
      typeLabel: "Barangay clearance",
      requesterId: "DEMO-VIS-001",
      requesterLabel: "Mara Dela Cruz",
      subjectKind: "person",
      subjectId: "DEMO-PER-001",
      subjectLabel: "Mara Dela Cruz",
      purpose: "Inter-office transaction",
      requestingOffice: "Municipal Assessor's Office",
      status: "payment-exception",
      reviewStatus: "reviewed",
      feeDecision: { kind: "assessment", assessmentId: "DEMO-ASM-008", status: "exception" },
    },
    8,
  ),
];

/**
 * The printable layout for a template version. Placeholders in double braces
 * are filled from the approved request at sign-off.
 */
function templateBody(typeLabel: string, purposeLine: string): string {
  return [
    '<p style="text-align:center"><strong>Republic of the Philippines</strong><br>',
    "Province of Sorsogon<br>Municipality of Matnog<br><strong>{{barangay.label}}</strong></p>",
    `<h2 style="text-align:center">${typeLabel}</h2>`,
    "<p>TO WHOM IT MAY CONCERN:</p>",
    "<p>This is to certify that <strong>{{subject.fullName}}</strong>, {{subject.age}} years of age, ",
    "is a bona fide resident of {{subject.address}}, {{barangay.label}}, Matnog, Sorsogon.</p>",
    `<p>${purposeLine}</p>`,
    "<p>Issued this {{issuance.issuedOn}} at {{barangay.label}}, Matnog, Sorsogon.</p>",
    '<p style="text-align:right"><strong>{{signatory.role}}</strong></p>',
    "<p><small>Serial {{issuance.serial}} · Verify at {{issuance.verificationUrl}}</small></p>",
  ].join("");
}

function template(input: {
  id: string;
  templateId: string;
  typeId: string;
  typeLabel: string;
  version: number;
  status: CertificateTemplateVersion["status"];
  prefix: string;
  next: number;
  /** Overrides the default purpose sentence in the printable layout. */
  purposeLine?: string;
}): CertificateTemplateVersion {
  return {
    envelope: createEnvelope({
      id: input.id,
      status: input.status,
      scope: { kind: "barangay", id: BARANGAY_A.id, label: BARANGAY_A.label },
      createdAt: `2026-0${Math.min(input.version + 5, 9)}-01T08:00:00+08:00`,
      version: input.version,
    }),
    templateId: input.templateId,
    certificateTypeId: input.typeId,
    certificateTypeLabel: input.typeLabel,
    barangayId: BARANGAY_A.id,
    barangayLabel: BARANGAY_A.label,
    version: input.version,
    status: input.status,
    signatoryRole: "Authorized Punong Barangay",
    fields: [
      "Barangay header",
      "Subject snapshot",
      "Stated purpose",
      "Issue date",
      "Issued serial",
      "Verification token",
    ],
    serialPrefix: input.prefix,
    nextSerialSequence: input.next,
    effectiveFrom: `2026-0${Math.min(input.version + 5, 9)}-01`,
    body: templateBody(
      input.typeLabel,
      input.purposeLine ?? "This certification is issued upon request for {{request.purpose}}.",
    ),
  };
}

export const CERTIFICATE_TEMPLATE_FIXTURES: readonly CertificateTemplateVersion[] = [
  template({
    id: "DEMO-TPL-RES-A-V2",
    templateId: "DEMO-TPL-RES-A",
    typeId: "residency",
    typeLabel: "Certificate of residency",
    version: 2,
    status: "retired",
    prefix: "BRGY-CERT",
    next: 1,
  }),
  template({
    id: "DEMO-TPL-RES-A-V3",
    templateId: "DEMO-TPL-RES-A",
    typeId: "residency",
    typeLabel: "Certificate of residency / indigency",
    version: 3,
    status: "active",
    prefix: "BRGY-CERT",
    next: 3,
  }),
  template({
    id: "DEMO-TPL-CLR-A-V2",
    templateId: "DEMO-TPL-CLR-A",
    typeId: "clearance",
    typeLabel: "Barangay clearance",
    version: 2,
    status: "active",
    prefix: "BRGY-CERT",
    next: 3,
  }),
  template({
    id: "DEMO-TPL-BIZ-A-V2",
    templateId: "DEMO-TPL-BIZ-A",
    typeId: "business-clearance",
    typeLabel: "Barangay business clearance",
    version: 2,
    status: "active",
    prefix: "SAMPLE-BIZ-CLR",
    next: 1,
  }),
  template({
    id: "DEMO-TPL-CASE-A-V1",
    templateId: "DEMO-TPL-CASE-A",
    typeId: "certificate-to-file-action",
    typeLabel: "Certificate to File Action",
    version: 1,
    status: "restricted",
    prefix: "SAMPLE-CASE-CERT",
    next: 1,
  }),
];

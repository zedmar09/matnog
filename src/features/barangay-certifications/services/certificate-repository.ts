import { createEnvelope, normalizeReference } from "@/shared/data/record-envelope";
import { denied, empty, invalid, ok, type RepositoryResult } from "@/shared/data/repository-result";
import type { WorkspaceRole } from "@/shared/providers/workspace-session-provider";

import { CERTIFICATE_TEMPLATE_FIXTURES, CERTIFICATE_WORKSPACE_FIXTURES } from "../data/certificate-fixtures";
import { CERTIFICATE_CATALOG } from "../data/certificate-journey";
import type {
  CertificateFeeValues,
  CertificateSignoffValues,
  CertificateTemplateValues,
} from "../schemas/certificate-lifecycle-schema";
import {
  type CertificateCorrectionValues,
  type CertificateRequestValues,
  certificateEvidenceOptions,
  certificateRequestSchema,
  defaultEvidenceFor,
} from "../schemas/certificate-request-schema";
import type {
  BusinessClearanceProjection,
  CaseCertificateOriginInput,
  CaseCertificateOriginProjection,
  CertificateIssuance,
  CertificateTemplateVersion,
  CertificateVerificationProjection,
  CertificateWorkspaceRecord,
} from "../types/certificate-records";
import type { CertificateSubjectProjection } from "../types/certificate-request";
import {
  evaluateCaseCertificateOrigin,
  issueCertificateAssessment,
  readCertificatePayment,
  routeCertificateOutput,
} from "./certificate-module-adapters";

let workspaceRecords = [...CERTIFICATE_WORKSPACE_FIXTURES];
let templateRecords = [...CERTIFICATE_TEMPLATE_FIXTURES];
let submissionSequence = 1;
let lifecycleSequence = 1;

function synchronizePaymentRecord(record: CertificateWorkspaceRecord): CertificateWorkspaceRecord {
  const decision = record.request.feeDecision;
  if (decision.kind !== "assessment" || record.issuance) return record;
  const payment = readCertificatePayment(decision.assessmentId);
  if (payment.kind !== "success") return record;
  const nextStatus =
    payment.data.status === "paid"
      ? record.request.review.status === "reviewed"
        ? "ready-for-signoff"
        : record.request.status
      : payment.data.status === "exception"
        ? "payment-exception"
        : "awaiting-payment";
  if (decision.status === payment.data.status && record.request.status === nextStatus) return record;
  const updated: CertificateWorkspaceRecord = {
    ...record,
    request: {
      ...record.request,
      envelope: { ...record.request.envelope, status: nextStatus },
      status: nextStatus,
      feeDecision: { ...decision, status: payment.data.status },
    },
  };
  workspaceRecords = workspaceRecords.map((item) =>
    item.request.envelope.id === updated.request.envelope.id ? updated : item,
  );
  return updated;
}

/**
 * A review decision — approve or return — is open only while the request is
 * still in the barangay's hands and nothing has been issued. The queue screens
 * read the same predicate, so an action is never offered that the repository
 * would refuse.
 */
export function isReviewOpen(record: CertificateWorkspaceRecord): boolean {
  return (
    !record.issuance &&
    ["submitted", "under-review"].includes(record.request.status) &&
    ["pending", "in-review"].includes(record.request.review.status)
  );
}

/**
 * The fee path is chosen after the barangay review and before anything is
 * issued. Screens read this so a fee action is never offered on a request the
 * repository would refuse.
 */
export function isFeeOpen(record: CertificateWorkspaceRecord): boolean {
  return (
    !record.issuance && record.request.review.status === "reviewed" && record.request.feeDecision.kind === "pending"
  );
}

/** Reprint and revocation apply only to a certificate that is issued and valid. */
export function isIssuanceActionable(record: CertificateWorkspaceRecord): boolean {
  return record.issuance?.status === "valid";
}

const ordinaryRecords = () =>
  workspaceRecords
    .filter((item) => item.request.source === "ordinary-catalog")
    .map((item) => synchronizePaymentRecord(item));

function lifecycleTime() {
  const minute = Math.min(lifecycleSequence++ * 5, 55);
  return `2026-09-16T18:${String(minute).padStart(2, "0")}:00+08:00`;
}

function staffRecordIndex(requestId: string, role: WorkspaceRole, barangayId = "DEMO-BRGY-A") {
  if (role !== "barangay") return -1;
  const id = normalizeReference(requestId);
  return workspaceRecords.findIndex(
    (item) =>
      item.request.source === "ordinary-catalog" &&
      item.request.envelope.id === id &&
      item.request.review.assignedBarangayId === barangayId,
  );
}

function appendReviewHistory(
  request: CertificateWorkspaceRecord["request"],
  input: {
    action: CertificateWorkspaceRecord["request"]["review"]["history"][number]["action"];
    actor: string;
    at: string;
    reason?: string;
  },
) {
  return [
    ...request.review.history,
    {
      id: `${request.envelope.id}-REVIEW-HISTORY-${request.review.history.length + 1}`,
      action: input.action,
      actor: input.actor,
      at: input.at,
      revisionId: request.currentRevisionId,
      ...(input.reason ? { reason: input.reason } : {}),
    },
  ];
}

function templateMatchesRequest(template: CertificateTemplateVersion, request: CertificateWorkspaceRecord["request"]) {
  if (template.certificateTypeId === request.certificateTypeId) return true;
  return request.certificateTypeId === "indigency" && template.certificateTypeId === "residency";
}

export const certificateRepository = {
  reset() {
    workspaceRecords = [...CERTIFICATE_WORKSPACE_FIXTURES];
    templateRecords = [...CERTIFICATE_TEMPLATE_FIXTURES];
    submissionSequence = 1;
    lifecycleSequence = 1;
  },

  listForRequester(subjectId: string, requesterId?: string): RepositoryResult<readonly CertificateWorkspaceRecord[]> {
    return ok(
      ordinaryRecords().filter(
        (item) => item.request.subjectId === subjectId || (requesterId && item.request.requesterId === requesterId),
      ),
    );
  },

  readForRequester(
    requestId: string,
    subjectId: string,
    requesterId?: string,
  ): RepositoryResult<CertificateWorkspaceRecord> {
    const id = normalizeReference(requestId);
    const record = ordinaryRecords().find((item) => item.request.envelope.id === id);
    if (!record || (record.request.subjectId !== subjectId && record.request.requesterId !== requesterId)) {
      return empty("The certificate request was not found or is not available to this requester.");
    }
    return ok(record);
  },

  businessClearanceProjection(businessId: string): RepositoryResult<BusinessClearanceProjection> {
    const id = normalizeReference(businessId);
    const matches = workspaceRecords
      .filter(
        (item) =>
          item.request.source === "ordinary-catalog" &&
          item.request.certificateTypeId === "business-clearance" &&
          item.request.subjectId === id,
      )
      .map((item) => synchronizePaymentRecord(item));
    const record = matches.at(-1);
    if (!record) {
      return ok({
        businessId: id,
        businessLabel: id,
        state: "not-requested",
        stateLabel: "No barangay clearance request",
        guidance: "The permit requirement stays incomplete until a barangay clearance is requested.",
      });
    }
    const { request, issuance } = record;
    const state =
      issuance?.status === "valid"
        ? "valid"
        : issuance?.status === "revoked"
          ? "revoked"
          : request.status === "awaiting-payment" || request.status === "payment-exception"
            ? "payment-required"
            : request.status === "ready-for-signoff"
              ? "ready-for-signoff"
              : request.status === "blocked" || request.status === "returned"
                ? "blocked"
                : "under-review";
    return ok({
      businessId: request.subjectId,
      businessLabel: request.subjectLabel,
      requestId: request.envelope.id,
      state,
      stateLabel: state.replaceAll("-", " "),
      guidance:
        state === "valid"
          ? "This valid clearance can be consumed by the business permit decision."
          : "The barangay-clearance requirement stays incomplete until a valid certificate is issued.",
      ...(request.feeDecision.kind === "assessment" ? { assessmentId: request.feeDecision.assessmentId } : {}),
      ...(issuance
        ? {
            issuanceSerial: issuance.serial,
            issuedAt: issuance.issuedAt,
            verificationToken: issuance.verificationToken,
          }
        : {}),
    });
  },

  evaluateCaseOrigin(origin: CaseCertificateOriginInput): RepositoryResult<CaseCertificateOriginProjection> {
    return evaluateCaseCertificateOrigin(origin);
  },

  listForStaff(
    role: WorkspaceRole,
    barangayId = "DEMO-BRGY-A",
  ): RepositoryResult<readonly CertificateWorkspaceRecord[]> {
    if (role !== "barangay" && role !== "municipal") {
      return denied("No certificate request queue is assigned to this role.");
    }
    const records = ordinaryRecords().filter(
      (item) => role === "municipal" || item.request.review.assignedBarangayId === barangayId,
    );
    return ok(records);
  },

  readForStaff(
    requestId: string,
    role: WorkspaceRole,
    barangayId = "DEMO-BRGY-A",
  ): RepositoryResult<CertificateWorkspaceRecord> {
    const list = this.listForStaff(role, barangayId);
    if (list.kind === "denied") return denied(list.message);
    if (list.kind === "empty") return empty(list.reason);
    if (list.kind !== "success") return empty("The certificate request queue is unavailable.");
    const id = normalizeReference(requestId);
    const record = list.data.find((item) => item.request.envelope.id === id);
    return record ? ok(record) : empty("The certificate request was not found in this scoped queue.");
  },

  submitRequest(input: {
    values: CertificateRequestValues;
    requesterId: string;
    requesterLabel: string;
    subject: CertificateSubjectProjection;
  }): RepositoryResult<CertificateWorkspaceRecord> {
    const parsed = certificateRequestSchema.safeParse(input.values);
    if (!parsed.success) {
      return invalid(
        parsed.error.issues.map((issue) => ({
          id: issue.path[0]?.toString() ?? "purpose",
          message: issue.message,
        })),
      );
    }
    const values = parsed.data;
    if (values.barangayId !== input.subject.barangayId) {
      return invalid([{ id: "barangayId", message: "Choose the barangay that currently owns the subject record." }]);
    }
    if (values.certificateTypeId === "business-clearance" && input.subject.kind !== "business") {
      return invalid([{ id: "certificateTypeId", message: "A barangay business clearance needs a business subject." }]);
    }
    if (values.certificateTypeId !== "business-clearance" && input.subject.kind !== "person") {
      return invalid([{ id: "certificateTypeId", message: "Choose a resident certificate for a person subject." }]);
    }

    const certificateType = CERTIFICATE_CATALOG.find((item) => item.id === values.certificateTypeId);
    if (!certificateType) return empty("The selected certificate type is unavailable.");
    const evidenceOption = certificateEvidenceOptions.find((item) => item.id === values.evidenceRef);
    const suffix = String(submissionSequence++).padStart(3, "0");
    const requestId = `DEMO-CERT-NEW-${suffix}`;
    const createdAt = `2026-09-16T${String(16 + Math.min(submissionSequence, 6)).padStart(2, "0")}:00:00+08:00`;
    const revisionId = `${requestId}-REV-1`;
    const evidenceId = `${requestId}-EVD-1`;
    const request: CertificateWorkspaceRecord["request"] = {
      envelope: createEnvelope({
        id: requestId,
        status: "submitted",
        scope: { kind: input.subject.kind, id: input.subject.id, label: input.subject.label },
        createdAt,
      }),
      scenario: values.certificateTypeId === "business-clearance" ? "business-clearance" : "residency-review",
      source: "ordinary-catalog",
      certificateTypeId: values.certificateTypeId,
      certificateTypeLabel: certificateType.title,
      requesterId: input.requesterId,
      requesterLabel: input.requesterLabel,
      subjectKind: input.subject.kind,
      subjectId: input.subject.id,
      subjectLabel: input.subject.label,
      barangayId: input.subject.barangayId,
      barangayLabel: input.subject.barangayLabel,
      purpose: values.purpose,
      requestingOffice: values.requestingOffice,
      claimMethod: values.claimMethod,
      status: "submitted",
      evidence: [
        {
          id: evidenceId,
          label: evidenceOption?.label ?? "Bundled evidence",
          status: "provided",
          source: values.evidenceRef === "resident-registry-projection" ? "M01 projection" : "Bundled metadata",
        },
      ],
      revisions: [
        {
          id: revisionId,
          requestId,
          revision: 1,
          state: "submitted",
          purpose: values.purpose,
          requestingOffice: values.requestingOffice,
          evidenceIds: [evidenceId],
          createdAt,
          note: `Initial submission for ${values.requestingOffice}`,
        },
      ],
      currentRevisionId: revisionId,
      review: {
        id: `${requestId}-REVIEW-1`,
        requestId,
        assignedBarangayId: input.subject.barangayId,
        assignedBarangayLabel: input.subject.barangayLabel,
        status: "pending",
        checklist: [
          { id: "subject", label: "Requester authority and subject match", result: "pending" },
          { id: "barangay", label: "Current barangay matches the issuing scope", result: "pending" },
          { id: "purpose", label: "Specific purpose is recorded", result: "pending" },
          { id: "evidence", label: "Required evidence is attached to the submitted revision", result: "pending" },
        ],
        history: [
          {
            id: `${requestId}-REVIEW-HISTORY-1`,
            action: "assigned",
            actor: "Demo Barangay A assignment rule",
            at: createdAt,
            revisionId,
          },
        ],
      },
      feeDecision: {
        kind: "pending",
        guidance: "Barangay review must finish before a fee assessment or exemption is recorded.",
      },
    };
    const record: CertificateWorkspaceRecord = { request };
    workspaceRecords = [...workspaceRecords, record];
    return ok(record);
  },

  resubmitCorrection(
    requestId: string,
    subjectId: string,
    requesterId: string,
    values: CertificateCorrectionValues,
  ): RepositoryResult<CertificateWorkspaceRecord> {
    const id = normalizeReference(requestId);
    const index = workspaceRecords.findIndex((item) => item.request.envelope.id === id);
    const currentRecord = workspaceRecords[index];
    const current = currentRecord ? synchronizePaymentRecord(currentRecord) : undefined;
    if (
      current?.request.source !== "ordinary-catalog" ||
      (current.request.subjectId !== subjectId && current.request.requesterId !== requesterId)
    ) {
      return empty("The certificate request was not found or is not available to this requester.");
    }
    if (current.request.status !== "returned") {
      return invalid([{ id: "correctionNote", message: "Only a returned request can be resubmitted for review." }]);
    }
    const certificateTypeId = current.request.certificateTypeId as CertificateRequestValues["certificateTypeId"];
    if (values.evidenceRef !== defaultEvidenceFor(certificateTypeId)) {
      return invalid([{ id: "evidenceRef", message: "Choose the evidence that matches this certificate type." }]);
    }
    const purpose = values.purpose.trim();
    const requestingOffice = values.requestingOffice.trim();
    const correctionNote = values.correctionNote.trim();
    if (purpose.length < 12 || requestingOffice.length < 3 || correctionNote.length < 8) {
      return invalid([{ id: "correctionNote", message: "Complete the corrected purpose, office, evidence and note." }]);
    }

    const updatedAt = "2026-09-16T17:15:00+08:00";
    const currentRevisionId = current.request.currentRevisionId;
    const evidenceId = `${id}-EVD-CORRECTION`;
    const evidenceLabel =
      certificateEvidenceOptions.find((item) => item.id === values.evidenceRef)?.label ?? "Corrected evidence";
    const request: CertificateWorkspaceRecord["request"] = {
      ...current.request,
      envelope: {
        ...current.request.envelope,
        status: "under-review",
        version: current.request.envelope.version + 1,
        updatedAt,
      },
      purpose,
      requestingOffice,
      status: "under-review",
      evidence: [
        ...current.request.evidence.filter((item) => item.id !== evidenceId),
        { id: evidenceId, label: evidenceLabel, status: "provided", source: "Bundled metadata" },
      ],
      revisions: current.request.revisions.map((revision) =>
        revision.id === currentRevisionId
          ? {
              ...revision,
              state: "submitted" as const,
              purpose,
              requestingOffice,
              evidenceIds: [...revision.evidenceIds, evidenceId],
              createdAt: updatedAt,
              note: `Correction resubmitted: ${correctionNote}. Previous return: ${current.request.review.decisionReason ?? "No reason recorded"}`,
            }
          : revision,
      ),
      review: {
        ...current.request.review,
        status: "in-review",
        checklist: current.request.review.checklist.map((item) => ({ ...item, result: "pending" as const })),
        decisionReason: `Correction received. Previous return: ${current.request.review.decisionReason ?? "No reason recorded"}`,
        history: [
          ...current.request.review.history,
          {
            id: `${id}-REVIEW-HISTORY-${current.request.review.history.length + 1}`,
            action: "correction-received",
            actor: current.request.requesterLabel,
            at: updatedAt,
            revisionId: currentRevisionId,
            reason: correctionNote,
          },
        ],
      },
    };
    const updated: CertificateWorkspaceRecord = { ...current, request };
    workspaceRecords = workspaceRecords.map((item, recordIndex) => (recordIndex === index ? updated : item));
    return ok(updated);
  },

  returnForCorrection(
    requestId: string,
    role: WorkspaceRole,
    reason: string,
    actor = "Barangay certificate reviewer",
    barangayId = "DEMO-BRGY-A",
  ): RepositoryResult<CertificateWorkspaceRecord> {
    const index = staffRecordIndex(requestId, role, barangayId);
    if (index < 0) return denied("Only the assigned barangay role can return this request.");
    const current = workspaceRecords[index];
    if (!current || !isReviewOpen(current)) {
      return invalid([{ id: "returnReason", message: "This request is not available for correction return." }]);
    }
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 8) {
      return invalid([
        { id: "returnReason", message: "Explain the required correction in at least eight characters." },
      ]);
    }
    const at = lifecycleTime();
    const revisionNumber = current.request.revisions.length + 1;
    const revisionId = `${current.request.envelope.id}-REV-${revisionNumber}`;
    const request: CertificateWorkspaceRecord["request"] = {
      ...current.request,
      envelope: {
        ...current.request.envelope,
        status: "returned",
        version: current.request.envelope.version + 1,
        updatedAt: at,
      },
      status: "returned",
      revisions: [
        ...current.request.revisions.map((revision) =>
          revision.id === current.request.currentRevisionId ? { ...revision, state: "superseded" as const } : revision,
        ),
        {
          id: revisionId,
          requestId: current.request.envelope.id,
          revision: revisionNumber,
          state: "working",
          purpose: current.request.purpose,
          requestingOffice: current.request.requestingOffice,
          evidenceIds: current.request.evidence.map((item) => item.id),
          createdAt: at,
          note: `Working correction created after return: ${normalizedReason}`,
        },
      ],
      currentRevisionId: revisionId,
      review: {
        ...current.request.review,
        status: "returned",
        decisionReason: normalizedReason,
        checklist: current.request.review.checklist.map((item) =>
          item.id === "evidence" ? { ...item, result: "not-met" as const } : item,
        ),
        history: appendReviewHistory(current.request, {
          action: "returned",
          actor,
          at,
          reason: normalizedReason,
        }),
      },
    };
    const updated: CertificateWorkspaceRecord = { ...current, request };
    workspaceRecords = workspaceRecords.map((item, recordIndex) => (recordIndex === index ? updated : item));
    return ok(updated);
  },

  approveReview(
    requestId: string,
    role: WorkspaceRole,
    actor = "Barangay certificate reviewer",
    barangayId = "DEMO-BRGY-A",
  ): RepositoryResult<CertificateWorkspaceRecord> {
    const index = staffRecordIndex(requestId, role, barangayId);
    if (index < 0) return denied("Only the assigned barangay role can approve this review.");
    const current = workspaceRecords[index];
    if (!current || !isReviewOpen(current)) {
      return invalid([{ id: "review", message: "This request is not available for review approval." }]);
    }
    const at = lifecycleTime();
    const status =
      current.request.feeDecision.kind === "exempt" ||
      (current.request.feeDecision.kind === "assessment" && current.request.feeDecision.status === "paid")
        ? "ready-for-signoff"
        : current.request.feeDecision.kind === "assessment"
          ? "awaiting-payment"
          : "under-review";
    const request: CertificateWorkspaceRecord["request"] = {
      ...current.request,
      envelope: {
        ...current.request.envelope,
        status,
        version: current.request.envelope.version + 1,
        updatedAt: at,
      },
      status,
      review: {
        ...current.request.review,
        status: "reviewed",
        decisionReason: "Requirements accepted for the current submitted revision.",
        checklist: current.request.review.checklist.map((item) => ({ ...item, result: "met" as const })),
        history: appendReviewHistory(current.request, { action: "approved", actor, at }),
      },
    };
    const updated: CertificateWorkspaceRecord = { ...current, request };
    workspaceRecords = workspaceRecords.map((item, recordIndex) => (recordIndex === index ? updated : item));
    return ok(updated);
  },

  setFeeDecision(
    requestId: string,
    role: WorkspaceRole,
    values: CertificateFeeValues,
    actor = "Barangay certificate reviewer",
    barangayId = "DEMO-BRGY-A",
  ): RepositoryResult<CertificateWorkspaceRecord> {
    const index = staffRecordIndex(requestId, role, barangayId);
    if (index < 0) return denied("Only the assigned barangay role can select the fee path.");
    const current = workspaceRecords[index];
    if (!current || !isFeeOpen(current)) {
      // Either the review is not finished, or a fee decision already exists.
      // Replacing one would silently discard an assessment the treasury may
      // already be acting on.
      return invalid([
        {
          id: "kind",
          message:
            current?.request.feeDecision.kind !== "pending"
              ? "A fee decision is already recorded for this request."
              : "Complete the barangay review before selecting a fee path.",
        },
      ]);
    }
    if (values.kind === "assessment" && values.ruleLabel.trim().length < 5) {
      return invalid([{ id: "ruleLabel", message: "Name the fee rule." }]);
    }
    if (values.kind === "exempt" && values.exemptionBasis.trim().length < 8) {
      return invalid([{ id: "exemptionBasis", message: "Record the exemption basis in at least eight characters." }]);
    }
    const at = lifecycleTime();
    const sequence = String(lifecycleSequence).padStart(3, "0");
    const assessment =
      values.kind === "assessment" ? issueCertificateAssessment(current.request, values.ruleLabel) : null;
    if (assessment && assessment.kind !== "success") {
      return invalid([{ id: "kind", message: "The fee assessment could not be created." }]);
    }
    let feeDecision: CertificateWorkspaceRecord["request"]["feeDecision"];
    if (values.kind === "assessment") {
      if (assessment?.kind !== "success") {
        return invalid([{ id: "kind", message: "The fee assessment could not be created." }]);
      }
      feeDecision = {
        kind: "assessment",
        assessmentId: assessment.data.assessmentId,
        status: assessment.data.status,
      };
    } else {
      feeDecision = {
        kind: "exempt",
        exemptionId: `DEMO-CERT-EXM-NEW-${sequence}`,
        basis: values.exemptionBasis.trim(),
        reviewedBy: actor,
      };
    }
    const status = values.kind === "assessment" ? "awaiting-payment" : "ready-for-signoff";
    const reason =
      values.kind === "assessment"
        ? `Fee rule selected: ${values.ruleLabel.trim()}`
        : `Exemption basis: ${values.exemptionBasis.trim()}`;
    const request: CertificateWorkspaceRecord["request"] = {
      ...current.request,
      envelope: {
        ...current.request.envelope,
        status,
        version: current.request.envelope.version + 1,
        updatedAt: at,
      },
      status,
      feeDecision,
      review: {
        ...current.request.review,
        history: appendReviewHistory(current.request, { action: "fee-selected", actor, at, reason }),
      },
    };
    const updated: CertificateWorkspaceRecord = { ...current, request };
    workspaceRecords = workspaceRecords.map((item, recordIndex) => (recordIndex === index ? updated : item));
    return ok(updated);
  },

  listActiveTemplatesForRequest(
    requestId: string,
    role: WorkspaceRole,
    barangayId = "DEMO-BRGY-A",
  ): RepositoryResult<readonly CertificateTemplateVersion[]> {
    const record = this.readForStaff(requestId, role, barangayId);
    if (record.kind !== "success") return record.kind === "denied" ? denied(record.message) : empty();
    return ok(
      templateRecords.filter(
        (template) =>
          template.status === "active" &&
          template.barangayId === barangayId &&
          templateMatchesRequest(template, record.data.request),
      ),
    );
  },

  signAndRelease(
    requestId: string,
    role: WorkspaceRole,
    values: CertificateSignoffValues,
    actor = "Authorized Punong Barangay",
    barangayId = "DEMO-BRGY-A",
  ): RepositoryResult<CertificateWorkspaceRecord> {
    const index = staffRecordIndex(requestId, role, barangayId);
    if (index < 0) return denied("Only the assigned barangay signatory can release this certificate.");
    const currentRecord = workspaceRecords[index];
    const current = currentRecord ? synchronizePaymentRecord(currentRecord) : undefined;
    if (current?.request.status !== "ready-for-signoff" || current.issuance) {
      return invalid([{ id: "templateVersionId", message: "This request is not ready for authorized sign-off." }]);
    }
    const templateIndex = templateRecords.findIndex((item) => item.envelope.id === values.templateVersionId);
    const template = templateRecords[templateIndex];
    if (
      template?.status !== "active" ||
      template.barangayId !== barangayId ||
      !templateMatchesRequest(template, current.request)
    ) {
      return invalid([{ id: "templateVersionId", message: "Select the active template for this certificate type." }]);
    }
    if (!values.snapshotConfirmed) {
      return invalid([{ id: "snapshotConfirmed", message: "Confirm the exact request and template snapshot." }]);
    }
    const at = lifecycleTime();
    let nextSequence = template.nextSerialSequence;
    let serial = `${template.serialPrefix}-2026-${String(nextSequence).padStart(4, "0")}`;
    const usedSerials = new Set(workspaceRecords.flatMap((item) => (item.issuance ? [item.issuance.serial] : [])));
    while (usedSerials.has(serial)) {
      nextSequence += 1;
      serial = `${template.serialPrefix}-2026-${String(nextSequence).padStart(4, "0")}`;
    }
    const issuanceId = `${current.request.envelope.id}-ISS-1`;
    const issuance: CertificateIssuance = {
      envelope: createEnvelope({
        id: issuanceId,
        status: "valid",
        scope: { kind: "barangay", id: barangayId, label: current.request.barangayLabel },
        createdAt: at,
      }),
      requestId: current.request.envelope.id,
      approvedRevisionId: current.request.currentRevisionId,
      templateVersionId: template.envelope.id,
      serial,
      signatoryRole: template.signatoryRole,
      issuedAt: at,
      status: "valid",
      verificationToken: `DEMO-CERT-TOKEN-NEW-${String(lifecycleSequence).padStart(3, "0")}`,
      snapshot: {
        certificateTypeLabel: current.request.certificateTypeLabel,
        subjectLabel: current.request.subjectLabel,
        barangayLabel: current.request.barangayLabel,
        purpose: current.request.purpose,
        requestingOffice: current.request.requestingOffice,
        claimMethod: current.request.claimMethod,
      },
      release: { at, actor, method: current.request.claimMethod },
      reprints: [],
    };
    const routed = routeCertificateOutput(current.request, issuance);
    if (routed.kind !== "success") {
      return invalid([{ id: "templateVersionId", message: "The released document could not be registered." }]);
    }
    templateRecords = templateRecords.map((item, recordIndex) =>
      recordIndex === templateIndex
        ? {
            ...item,
            envelope: {
              ...item.envelope,
              version: item.envelope.version + 1,
              updatedAt: at,
            },
            nextSerialSequence: nextSequence + 1,
          }
        : item,
    );
    const request: CertificateWorkspaceRecord["request"] = {
      ...current.request,
      envelope: {
        ...current.request.envelope,
        status: "issued",
        version: current.request.envelope.version + 1,
        updatedAt: at,
      },
      status: "issued",
      issuanceId,
      routedDocumentId: routed.data,
      revisions: current.request.revisions.map((revision) =>
        revision.id === current.request.currentRevisionId
          ? { ...revision, state: "approved-snapshot" as const }
          : revision,
      ),
      review: {
        ...current.request.review,
        history: appendReviewHistory(current.request, {
          action: "signed",
          actor,
          at,
          reason: `${template.envelope.id} · ${serial}`,
        }),
      },
    };
    const updated: CertificateWorkspaceRecord = { request, issuance };
    workspaceRecords = workspaceRecords.map((item, recordIndex) => (recordIndex === index ? updated : item));
    return ok(updated);
  },

  reprint(
    requestId: string,
    role: WorkspaceRole,
    reason: string,
    actor = "Barangay release clerk",
    barangayId = "DEMO-BRGY-A",
  ): RepositoryResult<CertificateWorkspaceRecord> {
    const index = staffRecordIndex(requestId, role, barangayId);
    if (index < 0) return denied("Only the assigned barangay role can record a reprint.");
    const current = workspaceRecords[index];
    if (current.issuance?.status !== "valid") {
      return invalid([{ id: "reprintReason", message: "Only a valid issued certificate can be reprinted." }]);
    }
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 8) {
      return invalid([{ id: "reprintReason", message: "Explain why another copy is needed." }]);
    }
    const at = lifecycleTime();
    const reprint = {
      id: `${current.request.envelope.id}-REPRINT-${current.issuance.reprints.length + 1}`,
      at,
      actor,
      reason: normalizedReason,
    };
    const updated: CertificateWorkspaceRecord = {
      request: {
        ...current.request,
        envelope: {
          ...current.request.envelope,
          version: current.request.envelope.version + 1,
          updatedAt: at,
        },
        review: {
          ...current.request.review,
          history: appendReviewHistory(current.request, {
            action: "reprinted",
            actor,
            at,
            reason: normalizedReason,
          }),
        },
      },
      issuance: {
        ...current.issuance,
        envelope: {
          ...current.issuance.envelope,
          version: current.issuance.envelope.version + 1,
          updatedAt: at,
        },
        reprints: [...current.issuance.reprints, reprint],
      },
    };
    workspaceRecords = workspaceRecords.map((item, recordIndex) => (recordIndex === index ? updated : item));
    return ok(updated);
  },

  revoke(
    requestId: string,
    role: WorkspaceRole,
    reason: string,
    actor = "Authorized Punong Barangay",
    barangayId = "DEMO-BRGY-A",
  ): RepositoryResult<CertificateWorkspaceRecord> {
    const index = staffRecordIndex(requestId, role, barangayId);
    if (index < 0) return denied("Only the assigned barangay signatory can revoke this certificate.");
    const current = workspaceRecords[index];
    if (current.issuance?.status !== "valid") {
      return invalid([{ id: "revocationReason", message: "Only a valid issued certificate can be revoked." }]);
    }
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 8) {
      return invalid([
        { id: "revocationReason", message: "Record the revocation reason in at least eight characters." },
      ]);
    }
    const at = lifecycleTime();
    const updated: CertificateWorkspaceRecord = {
      request: {
        ...current.request,
        envelope: {
          ...current.request.envelope,
          status: "revoked",
          version: current.request.envelope.version + 1,
          updatedAt: at,
        },
        status: "revoked",
        review: {
          ...current.request.review,
          history: appendReviewHistory(current.request, {
            action: "revoked",
            actor,
            at,
            reason: normalizedReason,
          }),
        },
      },
      issuance: {
        ...current.issuance,
        envelope: {
          ...current.issuance.envelope,
          status: "revoked",
          version: current.issuance.envelope.version + 1,
          updatedAt: at,
        },
        status: "revoked",
        revokedAt: at,
        revocationReason: normalizedReason,
      },
    };
    workspaceRecords = workspaceRecords.map((item, recordIndex) => (recordIndex === index ? updated : item));
    return ok(updated);
  },

  listTemplates(
    role: WorkspaceRole,
    barangayId = "DEMO-BRGY-A",
  ): RepositoryResult<readonly CertificateTemplateVersion[]> {
    if (role !== "barangay" && role !== "municipal") {
      return denied("Certificate template metadata is unavailable to this role.");
    }
    return ok(
      templateRecords.filter(
        (item) => item.barangayId === barangayId && (role === "municipal" || item.status !== "restricted"),
      ),
    );
  },

  /** Template versions already frozen into an issuance, which must not be lost. */
  templateVersionsInUse(): string[] {
    return workspaceRecords.flatMap((item) => (item.issuance ? [item.issuance.templateVersionId] : []));
  },

  createTemplate(
    role: WorkspaceRole,
    values: CertificateTemplateValues,
    barangayId = "DEMO-BRGY-A",
  ): RepositoryResult<CertificateTemplateVersion> {
    if (role !== "barangay" && role !== "municipal") return denied("This role cannot add a template.");
    const siblings = templateRecords.filter((item) => item.certificateTypeId === values.certificateTypeId);
    const version = siblings.reduce((max, item) => Math.max(max, item.version), 0) + 1;
    const templateId = siblings[0]?.templateId ?? `DEMO-TPL-${values.certificateTypeId.toUpperCase()}-A`;
    const id = `${templateId}-V${version}`;
    if (templateRecords.some((item) => item.envelope.id === id)) {
      return invalid([{ id: "certificateTypeId", message: "A template with that version already exists." }]);
    }
    const record: CertificateTemplateVersion = {
      envelope: createEnvelope({
        id,
        status: values.status,
        scope: { kind: "barangay", id: barangayId, label: "Demo Barangay A" },
        createdAt: `${values.effectiveFrom}T08:00:00+08:00`,
        version,
      }),
      templateId,
      certificateTypeId: values.certificateTypeId,
      certificateTypeLabel: values.certificateTypeLabel.trim(),
      barangayId,
      barangayLabel: "Demo Barangay A",
      version,
      status: values.status,
      signatoryRole: values.signatoryRole.trim(),
      fields: ["Barangay header", "Subject snapshot", "Stated purpose", "Issue date", "Issued serial"],
      serialPrefix: values.serialPrefix.trim(),
      nextSerialSequence: 1,
      effectiveFrom: values.effectiveFrom,
      body: values.body,
    };
    templateRecords = [...templateRecords, record];
    return ok(record);
  },

  updateTemplate(
    templateVersionId: string,
    role: WorkspaceRole,
    values: CertificateTemplateValues,
  ): RepositoryResult<CertificateTemplateVersion> {
    if (role !== "barangay" && role !== "municipal") return denied("This role cannot edit a template.");
    const id = normalizeReference(templateVersionId);
    const index = templateRecords.findIndex((item) => item.envelope.id === id);
    if (index < 0) return empty("That template version was not found.");
    const current = templateRecords[index];
    if (!current) return empty("That template version was not found.");
    const updated: CertificateTemplateVersion = {
      ...current,
      envelope: { ...current.envelope, status: values.status, version: current.envelope.version },
      certificateTypeLabel: values.certificateTypeLabel.trim(),
      status: values.status,
      signatoryRole: values.signatoryRole.trim(),
      serialPrefix: values.serialPrefix.trim(),
      effectiveFrom: values.effectiveFrom,
      body: values.body,
    };
    templateRecords = templateRecords.map((item, position) => (position === index ? updated : item));
    return ok(updated);
  },

  /**
   * Removes a template version. A version frozen into an issuance is refused:
   * deleting it would leave an issued certificate pointing at a layout that no
   * longer exists. Retire it instead, which keeps it out of new sign-offs.
   */
  deleteTemplate(templateVersionId: string, role: WorkspaceRole): RepositoryResult<CertificateTemplateVersion> {
    if (role !== "barangay" && role !== "municipal") return denied("This role cannot remove a template.");
    const id = normalizeReference(templateVersionId);
    const current = templateRecords.find((item) => item.envelope.id === id);
    if (!current) return empty("That template version was not found.");
    const used = workspaceRecords.some((item) => item.issuance?.templateVersionId === id);
    if (used) {
      return invalid([
        {
          id: "delete",
          message: "This version is frozen into an issued certificate. Retire it instead of deleting it.",
        },
      ]);
    }
    templateRecords = templateRecords.filter((item) => item.envelope.id !== id);
    return ok(current);
  },

  verify(token: string): RepositoryResult<CertificateVerificationProjection> {
    const normalized = normalizeReference(token);
    const record = workspaceRecords.find((item) => item.issuance?.verificationToken === normalized);
    if (!record?.issuance) return empty("The verification token is unavailable.");
    const template = templateRecords.find((item) => item.envelope.id === record.issuance?.templateVersionId);
    return ok({
      token: normalized,
      status: record.issuance.status,
      certificateTypeLabel: record.issuance.snapshot.certificateTypeLabel,
      sampleSerial: record.issuance.serial,
      issuingBarangay: record.issuance.snapshot.barangayLabel,
      templateVersion: template?.version ?? 0,
      issuedAt: record.issuance.issuedAt,
      ...(record.issuance.revokedAt ? { revokedAt: record.issuance.revokedAt } : {}),
    });
  },
};

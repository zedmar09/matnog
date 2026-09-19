import { RECORDS_OFFICE } from "@/features/document-routing-records/data/document-foundation-fixtures";
import { documentRoutingRepository } from "@/features/document-routing-records/services/document-foundation";
import { BARANGAY_TREASURY_PAYEE } from "@/features/payments-treasury/data/payment-ledger-fixtures";
import { sourceModulePaymentProjection } from "@/features/payments-treasury/services/payment-adapters";
import { paymentLedgerRepository } from "@/features/payments-treasury/services/payment-ledger";
import { empty, invalid, ok, type RepositoryResult } from "@/shared/data/repository-result";

import type {
  CaseCertificateOriginInput,
  CaseCertificateOriginProjection,
  CertificateIssuance,
  CertificateRequestRecord,
} from "../types/certificate-records";

export type CertificatePaymentProjection = {
  assessmentId: string;
  status: "partial" | "pending" | "paid" | "exception";
  label: string;
  guidance: string;
};

export function readCertificatePayment(assessmentId: string): RepositoryResult<CertificatePaymentProjection> {
  const result = paymentLedgerRepository.read(assessmentId);
  if (result.kind !== "success") return empty("The linked M06 assessment is unavailable.");
  const projection = sourceModulePaymentProjection(result.data);
  if (projection.moduleId !== "M07")
    return invalid([{ id: "assessment", message: "The assessment belongs to another module." }]);
  const status =
    projection.paymentGateStatus === "satisfied"
      ? "paid"
      : projection.paymentGateStatus === "partial"
        ? "partial"
        : projection.paymentGateStatus;
  return ok({
    assessmentId: projection.assessmentId,
    status,
    label: projection.paymentGateLabel,
    guidance: projection.guidance,
  });
}

export function issueCertificateAssessment(
  request: CertificateRequestRecord,
  ruleLabel: string,
): RepositoryResult<CertificatePaymentProjection> {
  const result = paymentLedgerRepository.issueAssessment({
    serviceModule: "M07 Barangay clearances",
    serviceReference: request.envelope.id,
    payer: {
      id: request.subjectId,
      kind: request.subjectKind === "business" ? "business" : "person",
      label: request.subjectLabel,
    },
    payee: BARANGAY_TREASURY_PAYEE,
    ruleVersion: "DEMO-BRGY-FEE-2026.1",
    lineItems: [
      {
        id: `${request.envelope.id}-FEE-1`,
        label: request.certificateTypeLabel,
        basis: ruleLabel.trim(),
        effect: "add",
        amount: { currency: "PHP", minorUnits: request.subjectKind === "business" ? 75000 : 50000 },
      },
    ],
    partialPaymentPolicy: "disallowed",
    dueAt: "2026-10-16T17:00:00+08:00",
  });
  if (result.kind !== "success") return result;
  return readCertificatePayment(result.data.lifecycle.assessment.envelope.id);
}

export function routeCertificateOutput(
  request: CertificateRequestRecord,
  issuance: CertificateIssuance,
): RepositoryResult<string> {
  const result = documentRoutingRepository.register("municipal", {
    direction: "outgoing",
    documentType: request.certificateTypeLabel,
    sourceModule: "M07",
    sourceRecordId: request.envelope.id,
    subject: `${issuance.serial} · ${request.subjectLabel}`,
    classification: request.subjectKind === "case" ? "restricted" : "internal",
    filename: `${issuance.serial.toLowerCase()}.pdf`,
    attachmentNote: `Issued document from ${issuance.templateVersionId}`,
    routeOffice: RECORDS_OFFICE,
  });
  return result.kind === "success" ? ok(result.data.document.envelope.id) : result;
}

export const ELIGIBLE_M10_CASE_ORIGIN: CaseCertificateOriginInput = {
  decisionId: "DEMO-M10-DECISION-001",
  caseId: "DEMO-CASE-ELIGIBLE-001",
  decisionStatus: "eligible",
  decidedAt: "2026-09-15T14:30:00+08:00",
};

export function evaluateCaseCertificateOrigin(
  origin: CaseCertificateOriginInput,
): RepositoryResult<CaseCertificateOriginProjection> {
  if (!origin.decisionId.trim().toUpperCase().startsWith("DEMO-M10-") || !origin.caseId.trim()) {
    return invalid([{ id: "caseOrigin", message: "A valid M10 decision and case reference are required." }]);
  }
  if (origin.decisionStatus !== "eligible" || !origin.decidedAt) {
    return invalid([
      {
        id: "caseOrigin",
        message: "Certificate to File Action requires a completed eligible M10 decision.",
      },
    ]);
  }
  return ok({
    decisionId: origin.decisionId,
    caseReference: origin.caseId,
    mayCreateRequest: true,
    certificateTypeId: "certificate-to-file-action",
    source: "M10 case decision",
    guidance: "M10 may create the restricted request using only this decision reference; case details stay in M10.",
  });
}

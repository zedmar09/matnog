"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, FileOutput, RotateCcw, Undo2 } from "lucide-react";
import { type FieldErrors, type FieldValues, useForm } from "react-hook-form";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import type { FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { formatStatusLabel } from "@/shared/lib/utils";
import type { WorkspaceRole } from "@/shared/providers/workspace-session-provider";

import type { CertificateLifecycle } from "../hooks/use-certificate-lifecycle";
import {
  type CertificateFeeValues,
  type CertificateReprintValues,
  type CertificateReturnValues,
  type CertificateRevocationValues,
  type CertificateSignoffValues,
  certificateFeeSchema,
  certificateReprintSchema,
  certificateReturnSchema,
  certificateRevocationSchema,
  certificateSignoffSchema,
} from "../schemas/certificate-lifecycle-schema";
import { certificateRepository, isReviewOpen } from "../services/certificate-repository";
import type { CertificateWorkspaceRecord } from "../types/certificate-records";

function collectFieldErrors<T extends FieldValues>(
  errors: FieldErrors<T>,
  aliases: Record<string, string> = {},
): FieldError[] {
  return Object.entries(errors).flatMap(([id, error]) =>
    typeof error?.message === "string" ? [{ id: aliases[id] ?? id, message: error.message }] : [],
  );
}

export function CertificateLifecycleWorkspace({
  record,
  role,
  lifecycle,
}: {
  record: CertificateWorkspaceRecord;
  role: WorkspaceRole;
  lifecycle: CertificateLifecycle;
}) {
  const { canAct, apply, setActionErrors } = lifecycle;
  const request = record.request;
  const issuance = record.issuance;
  const templatesResult = certificateRepository.listActiveTemplatesForRequest(request.envelope.id, role);
  const templates = templatesResult.kind === "success" ? templatesResult.data : [];

  const returnForm = useForm<CertificateReturnValues>({
    resolver: zodResolver(certificateReturnSchema),
    defaultValues: { reason: "" },
  });
  const feeForm = useForm<CertificateFeeValues>({
    resolver: zodResolver(certificateFeeSchema),
    defaultValues: { kind: "assessment", ruleLabel: "Barangay certificate fee rule", exemptionBasis: "" },
  });
  const signoffForm = useForm<CertificateSignoffValues>({
    resolver: zodResolver(certificateSignoffSchema),
    defaultValues: { templateVersionId: templates[0]?.envelope.id ?? "", snapshotConfirmed: false },
  });
  const reprintForm = useForm<CertificateReprintValues>({
    resolver: zodResolver(certificateReprintSchema),
    defaultValues: { reason: "" },
  });
  const revocationForm = useForm<CertificateRevocationValues>({
    resolver: zodResolver(certificateRevocationSchema),
    defaultValues: { reason: "" },
  });
  const feeKind = feeForm.watch("kind");

  const reviewOpen = isReviewOpen(record);
  const feeOpen = request.review.status === "reviewed" && request.feeDecision.kind === "pending";
  const signoffOpen = request.status === "ready-for-signoff" && !issuance;

  return (
    <div className="grid gap-6" id="lifecycle-actions">
      {reviewOpen && (
        <ContentPanel as="section">
          <h2>Return for correction</h2>
          <p className="muted mt-2">
            Name the missing or inconsistent item. The request keeps a working revision the requester can correct.
          </p>
          <form
            className="mt-5"
            onSubmit={returnForm.handleSubmit(
              (values) =>
                apply(
                  certificateRepository.returnForCorrection(request.envelope.id, role, values.reason),
                  "Request returned with a retained working correction revision.",
                ),
              (errors) => setActionErrors(collectFieldErrors(errors, { reason: "returnReason" })),
            )}
            noValidate
          >
            <FormField
              id="returnReason"
              label="Required correction"
              error={returnForm.formState.errors.reason?.message}
            >
              {(field) => (
                <Textarea
                  {...field}
                  {...returnForm.register("reason")}
                  placeholder="Describe the missing or inconsistent item."
                />
              )}
            </FormField>
            <Button type="submit" variant="outline" className="mt-4" disabled={!canAct}>
              <Undo2 /> Return request
            </Button>
          </form>
        </ContentPanel>
      )}

      {feeOpen && (
        <ContentPanel as="section">
          <h2>Fee or exemption</h2>
          <p className="muted mt-2">
            An assessment waits for treasury confirmation. An exemption needs a recorded basis before sign-off becomes
            available.
          </p>
          <form
            className="mt-5"
            onSubmit={feeForm.handleSubmit(
              (values) =>
                apply(
                  certificateRepository.setFeeDecision(request.envelope.id, role, values),
                  values.kind === "assessment"
                    ? "A fee assessment was created for this request."
                    : "The exemption basis was recorded and the request is ready for sign-off.",
                ),
              (errors) => setActionErrors(collectFieldErrors(errors)),
            )}
            noValidate
          >
            <FormSection title="Fee decision">
              <FormField id="kind" label="Fee path" error={feeForm.formState.errors.kind?.message}>
                {(field) => (
                  <NativeSelect {...field} {...feeForm.register("kind")} className="w-full">
                    <option value="assessment">Create a fee assessment</option>
                    <option value="exempt">Record an exemption basis</option>
                  </NativeSelect>
                )}
              </FormField>
              {feeKind === "assessment" ? (
                <FormField id="ruleLabel" label="Fee rule" error={feeForm.formState.errors.ruleLabel?.message}>
                  {(field) => <Input {...field} {...feeForm.register("ruleLabel")} />}
                </FormField>
              ) : (
                <FormField
                  id="exemptionBasis"
                  label="Exemption basis"
                  error={feeForm.formState.errors.exemptionBasis?.message}
                >
                  {(field) => (
                    <Textarea
                      {...field}
                      {...feeForm.register("exemptionBasis")}
                      placeholder="Record the rule or approved eligibility basis."
                    />
                  )}
                </FormField>
              )}
            </FormSection>
            <Button type="submit" disabled={!canAct}>
              Save fee decision
            </Button>
          </form>
        </ContentPanel>
      )}

      {request.status === "awaiting-payment" && (
        <ContentPanel as="section">
          <h2>Payment confirmation is still required</h2>
          <p className="muted mt-2">
            The assessment is visible here, but this screen cannot mark it paid. The status comes from the linked
            treasury record.
          </p>
          <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
            {request.feeDecision.kind === "assessment"
              ? `${request.feeDecision.assessmentId} · ${formatStatusLabel(request.feeDecision.status)}`
              : "No assessment reference"}
          </p>
        </ContentPanel>
      )}

      {signoffOpen && (
        <ContentPanel as="section">
          <h2>Sign off and release</h2>
          <p className="muted mt-2">
            Sign-off consumes one serial and freezes the snapshot. Later changes cannot rewrite the issued request or
            template version.
          </p>
          <form
            className="mt-5"
            onSubmit={signoffForm.handleSubmit(
              (values) =>
                apply(
                  certificateRepository.signAndRelease(request.envelope.id, role, values),
                  "The certificate was signed and released.",
                ),
              (errors) => setActionErrors(collectFieldErrors(errors)),
            )}
            noValidate
          >
            <FormSection title="Snapshot and active template">
              <FormField
                id="templateVersionId"
                label="Template version"
                error={signoffForm.formState.errors.templateVersionId?.message}
              >
                {(field) => (
                  <NativeSelect {...field} {...signoffForm.register("templateVersionId")} className="w-full">
                    <option value="">Choose an active template</option>
                    {templates.map((template) => (
                      <option key={template.envelope.id} value={template.envelope.id}>
                        {template.certificateTypeLabel} · version {template.version} · next {template.serialPrefix}
                        -2026-
                        {String(template.nextSerialSequence).padStart(4, "0")}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField
                id="snapshotConfirmed"
                label="Snapshot confirmation"
                error={signoffForm.formState.errors.snapshotConfirmed?.message}
              >
                {(field) => (
                  <label className="flex items-start gap-3 rounded-lg border p-3" htmlFor={field.id}>
                    <input
                      {...field}
                      {...signoffForm.register("snapshotConfirmed")}
                      type="checkbox"
                      className="mt-1 size-4"
                    />
                    <span>
                      I confirm revision {request.currentRevisionId}, the named subject, purpose, fee decision and
                      selected template version.
                    </span>
                  </label>
                )}
              </FormField>
            </FormSection>
            <Button type="submit" disabled={!canAct || templates.length === 0}>
              <FileOutput /> Sign and release
            </Button>
          </form>
        </ContentPanel>
      )}

      {issuance && (
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2>Issued certificate</h2>
              <p className="muted mt-1">{issuance.serial}</p>
            </div>
            <StatusBadge tone={issuance.status === "valid" ? "success" : "destructive"}>
              {formatStatusLabel(issuance.status)}
            </StatusBadge>
          </div>
          <dl className="registry-facts mt-5">
            <div>
              <dt>Approved revision</dt>
              <dd>{issuance.approvedRevisionId}</dd>
            </div>
            <div>
              <dt>Template version</dt>
              <dd>{issuance.templateVersionId}</dd>
            </div>
            <div>
              <dt>Signatory role</dt>
              <dd>{issuance.signatoryRole}</dd>
            </div>
            <div>
              <dt>Release method</dt>
              <dd>{formatStatusLabel(issuance.release.method)}</dd>
            </div>
            <div>
              <dt>Released by</dt>
              <dd>{issuance.release.actor}</dd>
            </div>
            <div>
              <dt>Released at</dt>
              <dd>{formatDemoDateTime(issuance.release.at)}</dd>
            </div>
            <div>
              <dt>Verification token</dt>
              <dd>{issuance.verificationToken}</dd>
            </div>
            <div>
              <dt>Reprints</dt>
              <dd>{issuance.reprints.length}</dd>
            </div>
          </dl>
          {issuance.revocationReason && (
            <p className="mt-4 rounded-lg bg-destructive/5 p-3 text-sm">
              <strong>Revocation reason:</strong> {issuance.revocationReason}
            </p>
          )}
          {issuance.status === "valid" && (
            <>
              <PanelDivider />
              <div className="grid gap-5 lg:grid-cols-2">
                <form
                  onSubmit={reprintForm.handleSubmit(
                    (values) => {
                      const completed = apply(
                        certificateRepository.reprint(request.envelope.id, role, values.reason),
                        "A reprint was recorded without consuming a new serial.",
                      );
                      if (completed) reprintForm.reset();
                    },
                    (errors) => setActionErrors(collectFieldErrors(errors, { reason: "reprintReason" })),
                  )}
                  noValidate
                >
                  <FormSection title="Reprint same serial">
                    <FormField
                      id="reprintReason"
                      label="Reprint reason"
                      error={reprintForm.formState.errors.reason?.message}
                    >
                      {(field) => <Textarea {...field} {...reprintForm.register("reason")} />}
                    </FormField>
                  </FormSection>
                  <Button type="submit" variant="outline" disabled={!canAct}>
                    <RotateCcw /> Record reprint
                  </Button>
                </form>
                <form
                  onSubmit={revocationForm.handleSubmit(
                    (values) =>
                      apply(
                        certificateRepository.revoke(request.envelope.id, role, values.reason),
                        "The issuance was revoked. Its snapshot and history remain available.",
                      ),
                    (errors) => setActionErrors(collectFieldErrors(errors, { reason: "revocationReason" })),
                  )}
                  noValidate
                >
                  <FormSection title="Revoke issuance">
                    <FormField
                      id="revocationReason"
                      label="Revocation reason"
                      error={revocationForm.formState.errors.reason?.message}
                    >
                      {(field) => <Textarea {...field} {...revocationForm.register("reason")} />}
                    </FormField>
                  </FormSection>
                  <Button type="submit" variant="destructive" disabled={!canAct}>
                    <Ban /> Revoke issuance
                  </Button>
                </form>
              </div>
            </>
          )}
        </ContentPanel>
      )}
    </div>
  );
}

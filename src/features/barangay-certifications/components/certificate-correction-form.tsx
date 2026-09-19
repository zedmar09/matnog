"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw } from "lucide-react";
import { type FieldErrors, useForm } from "react-hook-form";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";

import {
  type CertificateCorrectionValues,
  certificateCorrectionSchema,
  certificateEvidenceOptions,
  defaultEvidenceFor,
} from "../schemas/certificate-request-schema";
import { certificateRepository } from "../services/certificate-repository";
import type { CertificateWorkspaceRecord } from "../types/certificate-records";

function collectFieldErrors(errors: FieldErrors<CertificateCorrectionValues>): FieldError[] {
  return Object.entries(errors).flatMap(([id, error]) =>
    typeof error?.message === "string" ? [{ id, message: error.message }] : [],
  );
}

export function CertificateCorrectionForm({
  record,
  subjectId,
  requesterId,
  onUpdated,
}: {
  record: CertificateWorkspaceRecord;
  subjectId: string;
  requesterId: string;
  onUpdated: (record: CertificateWorkspaceRecord) => void;
}) {
  const [summaryErrors, setSummaryErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  const request = record.request;
  const typeId = request.certificateTypeId as "residency" | "clearance" | "indigency" | "business-clearance";
  const {
    register,
    handleSubmit,
    formState: { errors: fieldErrors },
  } = useForm<CertificateCorrectionValues>({
    resolver: zodResolver(certificateCorrectionSchema),
    defaultValues: {
      purpose: request.purpose,
      requestingOffice: request.requestingOffice,
      evidenceRef: defaultEvidenceFor(typeId),
      correctionNote: "",
    },
  });

  const submit = (values: CertificateCorrectionValues) => {
    setSaving(true);
    setSummaryErrors([]);
    const result = certificateRepository.resubmitCorrection(request.envelope.id, subjectId, requesterId, values);
    setSaving(false);
    if (result.kind === "invalid") {
      setSummaryErrors(result.errors);
      return;
    }
    if (result.kind !== "success") {
      setSummaryErrors([{ id: "correctionNote", message: "The correction could not be resubmitted." }]);
      return;
    }
    onUpdated(result.data);
  };

  return (
    <ContentPanel as="section" className="mt-6 border-warning/30">
      <span className="eyebrow">Correction requested</span>
      <h2 className="mt-1">Create a new reviewable revision</h2>
      <p className="muted mt-2">
        The earlier submission stays in the revision history. Update the returned fields and explain what changed.
      </p>
      {request.review.decisionReason && (
        <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
          <strong>Barangay return reason:</strong> {request.review.decisionReason}
        </p>
      )}
      <div className="mt-5">
        <ErrorSummary errors={summaryErrors} title="Check the correction" />
        <form onSubmit={handleSubmit(submit, (errors) => setSummaryErrors(collectFieldErrors(errors)))} noValidate>
          <FormSection title="Corrected request fields">
            <FormField id="purpose" label="Corrected purpose" error={fieldErrors.purpose?.message}>
              {(field) => <Textarea {...field} {...register("purpose")} />}
            </FormField>
            <FormField
              id="requestingOffice"
              label="Requesting office or transaction"
              error={fieldErrors.requestingOffice?.message}
            >
              {(field) => <Input {...field} {...register("requestingOffice")} />}
            </FormField>
            <FormField id="evidenceRef" label="Corrected sample evidence" error={fieldErrors.evidenceRef?.message}>
              {(field) => (
                <NativeSelect {...field} {...register("evidenceRef")} className="w-full">
                  {certificateEvidenceOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField id="correctionNote" label="What was corrected?" error={fieldErrors.correctionNote?.message}>
              {(field) => (
                <Textarea
                  {...field}
                  {...register("correctionNote")}
                  placeholder="Example: Added the requesting school and replaced the purpose letter."
                />
              )}
            </FormField>
          </FormSection>
          <div className="registry-actions">
            <Button type="submit" disabled={saving}>
              <RotateCcw /> {saving ? "Resubmitting…" : "Resubmit correction"}
            </Button>
          </div>
        </form>
      </div>
    </ContentPanel>
  );
}

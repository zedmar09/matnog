"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { SectionHeading } from "@/shared/components/section-heading";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import type { WorkspaceRole } from "@/shared/providers/workspace-session-provider";

import { type CertificateTemplateValues, certificateTemplateSchema } from "../schemas/certificate-lifecycle-schema";
import { certificateRepository } from "../services/certificate-repository";
import { CertificateBodyEditor } from "./certificate-body-editor";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "retired", label: "Inactive" },
  { value: "restricted", label: "Restricted" },
] as const;

/**
 * The template form, shared by the add and edit pages. Saving returns to the
 * template list, which reads the repository again on mount.
 */
export function CertificateTemplateForm({
  mode,
  role,
  templateVersionId,
  initial,
  heading,
  description,
}: {
  mode: "create" | "update";
  role: WorkspaceRole;
  /** Present when updating. */
  templateVersionId?: string;
  initial: CertificateTemplateValues;
  heading: string;
  description: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CertificateTemplateValues>(initial);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof CertificateTemplateValues>(key: K, next: CertificateTemplateValues[K]) {
    setValues((prev) => ({ ...prev, [key]: next }));
  }

  function save() {
    if (saving) return;
    const parsed = certificateTemplateSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })));
      return;
    }
    setSaving(true);
    const result =
      mode === "create"
        ? certificateRepository.createTemplate(role, parsed.data)
        : certificateRepository.updateTemplate(templateVersionId ?? "", role, parsed.data);
    setSaving(false);
    if (result.kind === "success") {
      router.push("/ops/certificates/templates");
      return;
    }
    setErrors(
      result.kind === "invalid"
        ? result.errors
        : [{ id: "form", message: result.kind === "denied" ? result.message : "The template could not be saved." }],
    );
  }

  return (
    <div className="registry-wizard template-page">
      <div className="registry-wizard-head">
        <h1>{heading}</h1>
        <p>{description}</p>
      </div>

      <ErrorSummary errors={errors} />

      <ContentPanel className="mb-6">
        <SectionHeading title="Configuration" description="How this version prints, signs and numbers." />
        <div className="mt-6">
          <FormSection title="Version details">
            <FormField id="certificateTypeLabel" label="Prints as" required>
              {(field) => (
                <Input
                  {...field}
                  placeholder="Certificate of residency"
                  value={values.certificateTypeLabel}
                  onChange={(event) => set("certificateTypeLabel", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="status" label="Status" required>
              {(field) => (
                <Select
                  value={values.status}
                  onValueChange={(next) => set("status", next as CertificateTemplateValues["status"])}
                >
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="signatoryRole" label="Signatory role" required>
              {(field) => (
                <Input
                  {...field}
                  placeholder="Authorized Punong Barangay"
                  value={values.signatoryRole}
                  onChange={(event) => set("signatoryRole", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="serialPrefix" label="Serial prefix" required hint="Capital letters, numbers and hyphens.">
              {(field) => (
                <Input
                  {...field}
                  placeholder="BRGY-CERT"
                  value={values.serialPrefix}
                  onChange={(event) => set("serialPrefix", event.target.value.toUpperCase())}
                />
              )}
            </FormField>
            <FormField id="effectiveFrom" label="Effective from" required>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  value={values.effectiveFrom}
                  onChange={(event) => set("effectiveFrom", event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>

      <ContentPanel>
        <SectionHeading
          title="Printable layout"
          description="Placeholders in double braces are filled from the approved request at sign-off. The layout is frozen into the issuance, so a later edit never rewrites an issued certificate."
        />
        <div className="mt-6">
          <CertificateBodyEditor value={values.body} onChange={(next) => set("body", next)} />
        </div>
        <div className="form-actions">
          <Button type="button" variant="ghost" asChild>
            <Link href="/ops/certificates/templates">Cancel</Link>
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Add version" : "Save template"}
          </Button>
        </div>
      </ContentPanel>
    </div>
  );
}

"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FilePlus2, FileText, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import {
  BARANGAY_OFFICE,
  ENGINEERING_OFFICE,
  HEALTH_OFFICE,
  LEGAL_OFFICE,
  MAYORS_OFFICE,
  TOURISM_OFFICE,
} from "../data/document-foundation-fixtures";
import { type DocumentRegistrationValues, documentRegistrationSchema } from "../schemas/document-schema";
import { documentRoutingRepository } from "../services/document-foundation";

const ROUTE_OFFICES = [MAYORS_OFFICE, TOURISM_OFFICE, ENGINEERING_OFFICE, HEALTH_OFFICE, BARANGAY_OFFICE, LEGAL_OFFICE];

const DOCUMENT_FILES = ["incoming-correspondence.pdf", "endorsement-packet.pdf", "clearance-request.pdf"];

const MODULES = Array.from({ length: 17 }, (_, index) => `M${String(index + 1).padStart(2, "0")}`);

export function DocumentRegistrationView() {
  const router = useRouter();
  const { role } = useWorkspaceSession();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors: fieldErrors },
  } = useForm<DocumentRegistrationValues>({
    resolver: zodResolver(documentRegistrationSchema),
    defaultValues: {
      direction: "incoming",
      documentType: "",
      sourceModule: "M11",
      sourceRecordId: "",
      subject: "",
      classification: "internal",
      filename: "",
      attachmentNote: "",
      routeOfficeId: MAYORS_OFFICE.id,
    },
  });
  const values = watch();

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Document registration is unavailable to this role"
        description="Only municipal records staff can create a new document record."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/documents">Return to document register</Link>
          </Button>
        }
      />
    );
  }

  const submit = (input: DocumentRegistrationValues) => {
    if (saving) return;
    setSaving(true);
    setErrors([]);
    const routeOffice = ROUTE_OFFICES.find((office) => office.id === input.routeOfficeId);
    if (!routeOffice) {
      setSaving(false);
      setErrors([{ id: "routeOfficeId", message: "Select the initial receiving office." }]);
      return;
    }
    const result = documentRoutingRepository.register(role, { ...input, routeOffice });
    setSaving(false);
    if (result.kind === "invalid") {
      setErrors(result.errors);
      return;
    }
    if (result.kind !== "success") {
      setErrors([
        {
          id: "subject",
          message: result.kind === "denied" ? result.message : "The document could not be registered.",
        },
      ]);
      return;
    }
    router.push(`/ops/documents/${result.data.document.envelope.id}`);
  };

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link href="/ops/documents" className="text-link">
            <ArrowLeft size={15} />
            Document register
          </Link>
          <h1>Register a document</h1>
          <p>Record the metadata, attach the initial file, and assign the first receiving office.</p>
        </div>
      </div>
      <ErrorSummary errors={errors} />

      <div className="document-registration-layout">
        <ContentPanel as="section">
          <form onSubmit={handleSubmit(submit)} noValidate>
            <FormSection
              title="Document metadata"
              description="The source module keeps ownership of its service decision. M05 records only the routed document."
            >
              <FormField id="direction" label="Direction" error={fieldErrors.direction?.message}>
                {(field) => (
                  <NativeSelect {...field} {...register("direction")}>
                    <option value="incoming">Incoming</option>
                    <option value="outgoing">Outgoing</option>
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="documentType" label="Document type" error={fieldErrors.documentType?.message}>
                {(field) => <Input {...field} {...register("documentType")} />}
              </FormField>
              <FormField id="sourceModule" label="Source module" error={fieldErrors.sourceModule?.message}>
                {(field) => (
                  <NativeSelect {...field} {...register("sourceModule")}>
                    {MODULES.map((module) => (
                      <option key={module} value={module}>
                        {module}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField
                id="sourceRecordId"
                label="Source record reference"
                error={fieldErrors.sourceRecordId?.message}
              >
                {(field) => <Input {...field} {...register("sourceRecordId")} />}
              </FormField>
              <FormField id="subject" label="Subject" error={fieldErrors.subject?.message}>
                {(field) => <Textarea {...field} {...register("subject")} />}
              </FormField>
              <FormField
                id="classification"
                label="Classification"
                error={fieldErrors.classification?.message}
                hint="Restricted metadata stays inside the municipal projection."
              >
                {(field) => (
                  <NativeSelect {...field} {...register("classification")}>
                    <option value="public">Public</option>
                    <option value="internal">Internal</option>
                    <option value="restricted">Restricted</option>
                  </NativeSelect>
                )}
              </FormField>
            </FormSection>

            <FormSection
              title="Attachment and first route"
              description="The initial attachment starts at revision one. A replacement creates a new revision."
            >
              <FormField id="filename" label="Document file" error={fieldErrors.filename?.message}>
                {(field) => (
                  <NativeSelect {...field} {...register("filename")}>
                    <option value="">Choose a PDF document</option>
                    {DOCUMENT_FILES.map((filename) => (
                      <option key={filename} value={filename}>
                        {filename}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="attachmentNote" label="Attachment note" error={fieldErrors.attachmentNote?.message}>
                {(field) => <Textarea {...field} {...register("attachmentNote")} />}
              </FormField>
              <FormField id="routeOfficeId" label="Initial receiving office" error={fieldErrors.routeOfficeId?.message}>
                {(field) => (
                  <NativeSelect {...field} {...register("routeOfficeId")}>
                    {ROUTE_OFFICES.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.label}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
            </FormSection>

            <div className="registry-actions">
              <Button type="button" variant="outline" onClick={() => reset()}>
                Clear form
              </Button>
              <Button type="submit" disabled={saving}>
                <FilePlus2 />
                {saving ? "Registering…" : "Register document"}
              </Button>
            </div>
          </form>
        </ContentPanel>

        <ContentPanel as="aside" className="document-registration-review">
          <span className="eyebrow">Review before registration</span>
          <div className="document-review-icon">
            <FileText />
          </div>
          <h2>{values.subject || "Document subject"}</h2>
          <p>{values.documentType || "Document type"}</p>
          <dl>
            <div>
              <dt>Source</dt>
              <dd>
                {values.sourceModule} · {values.sourceRecordId || "No reference yet"}
              </dd>
            </div>
            <div>
              <dt>Attachment</dt>
              <dd>{values.filename || "No file selected"}</dd>
            </div>
            <div>
              <dt>First route</dt>
              <dd>{ROUTE_OFFICES.find((office) => office.id === values.routeOfficeId)?.label}</dd>
            </div>
          </dl>
          <StatusBadge tone={values.classification === "restricted" ? "destructive" : "neutral"}>
            {values.classification}
          </StatusBadge>
          <p className="document-registration-boundary">
            <ShieldCheck />
            Opening this screen never creates a record. Registration happens only after the validated action.
          </p>
        </ContentPanel>
      </div>
    </>
  );
}

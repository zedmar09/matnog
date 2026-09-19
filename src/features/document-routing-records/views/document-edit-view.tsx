"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { PermissionState } from "@/shared/components/permission-state";
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
  RECORDS_OFFICE,
  TOURISM_OFFICE,
} from "../data/document-foundation-fixtures";
import { type DocumentMetadataValues, documentMetadataSchema } from "../schemas/document-schema";
import { documentRoutingRepository } from "../services/document-foundation";

const OFFICES = [
  RECORDS_OFFICE,
  MAYORS_OFFICE,
  TOURISM_OFFICE,
  ENGINEERING_OFFICE,
  HEALTH_OFFICE,
  BARANGAY_OFFICE,
  LEGAL_OFFICE,
];
const MODULES = Array.from({ length: 17 }, (_, index) => `M${String(index + 1).padStart(2, "0")}`);

export function DocumentEditView({ documentId }: { documentId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const recordResult = documentRoutingRepository.read(role, documentId);
  const record = recordResult.kind === "success" ? recordResult.data : undefined;
  const firstOffice = record?.tasks.slice().sort((a, b) => a.sequence - b.sequence)[0]?.office ?? RECORDS_OFFICE;
  const [values, setValues] = useState<DocumentMetadataValues>(() => ({
    direction: record?.document.direction ?? "incoming",
    documentType: record?.document.documentType ?? "",
    sourceModule: record?.document.sourceModule.match(/^M(?:0[1-9]|1[0-7])/)?.[0] ?? "M05",
    sourceRecordId: record?.document.sourceRecordId ?? "",
    subject: record?.document.subject ?? "",
    classification: record?.document.classification ?? "internal",
    routeOfficeId: firstOffice.id,
  }));
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  if (role !== "municipal")
    return (
      <PermissionState
        title="Document editing unavailable"
        description="Only municipal records staff can edit document metadata."
      />
    );
  if (!record)
    return (
      <PermissionState
        title="Document unavailable"
        description="The requested document was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/documents">Back to register</Link>
          </Button>
        }
      />
    );
  if (["released", "archived"].includes(record.document.envelope.status))
    return (
      <PermissionState
        title="Document editing is locked"
        description="Released and archived records must be restored or reopened before their metadata can be changed."
        action={
          <Button asChild variant="outline">
            <Link href={`/ops/documents/${record.document.envelope.id}`}>Back to document</Link>
          </Button>
        }
      />
    );

  const resolvedDocumentId = record.document.envelope.id;

  function set<K extends keyof DocumentMetadataValues>(key: K, value: DocumentMetadataValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function save() {
    const parsed = documentMetadataSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "document"), message: issue.message })),
      );
      return;
    }
    const routeOffice = OFFICES.find((office) => office.id === parsed.data.routeOfficeId);
    if (!routeOffice) return setErrors([{ id: "routeOfficeId", message: "Select the receiving office." }]);
    setSaving(true);
    const result = documentRoutingRepository.updateDocument(role, resolvedDocumentId, {
      ...parsed.data,
      routeOffice,
    });
    setSaving(false);
    if (result.kind !== "success") {
      setErrors(
        result.kind === "invalid"
          ? result.errors
          : [
              {
                id: "document",
                message: result.kind === "empty" ? (result.reason ?? "The record was not found.") : result.message,
              },
            ],
      );
      return;
    }
    router.push(`/ops/documents/${resolvedDocumentId}`);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <span className="eyebrow">{record.document.envelope.reference}</span>
        <h1>Edit document</h1>
        <p>Update the document metadata, classification, source record, and initial receiving office.</p>
      </div>
      <ErrorSummary errors={errors} title="This document could not be saved" />
      <ContentPanel className="mb-6">
        <FormSection
          title="Document metadata"
          description="Changes update the registered record while retaining its file revisions, custody history, and routing decisions."
        >
          <FormField id="direction" label="Direction" required>
            {(field) => (
              <NativeSelect
                {...field}
                value={values.direction}
                onChange={(event) => set("direction", event.target.value as DocumentMetadataValues["direction"])}
              >
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
              </NativeSelect>
            )}
          </FormField>
          <FormField id="documentType" label="Document type" required>
            {(field) => (
              <Input
                {...field}
                value={values.documentType}
                onChange={(event) => set("documentType", event.target.value)}
              />
            )}
          </FormField>
          <FormField id="sourceModule" label="Source module" required>
            {(field) => (
              <NativeSelect
                {...field}
                value={values.sourceModule}
                onChange={(event) => set("sourceModule", event.target.value)}
              >
                {MODULES.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="sourceRecordId" label="Source record reference" required>
            {(field) => (
              <Input
                {...field}
                value={values.sourceRecordId}
                onChange={(event) => set("sourceRecordId", event.target.value)}
              />
            )}
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="subject" label="Subject" required>
              {(field) => (
                <Textarea {...field} value={values.subject} onChange={(event) => set("subject", event.target.value)} />
              )}
            </FormField>
          </div>
          <FormField id="classification" label="Classification" required>
            {(field) => (
              <NativeSelect
                {...field}
                value={values.classification}
                onChange={(event) =>
                  set("classification", event.target.value as DocumentMetadataValues["classification"])
                }
              >
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="restricted">Restricted</option>
              </NativeSelect>
            )}
          </FormField>
          <FormField id="routeOfficeId" label="Initial receiving office" required>
            {(field) => (
              <NativeSelect
                {...field}
                value={values.routeOfficeId}
                onChange={(event) => set("routeOfficeId", event.target.value)}
              >
                {OFFICES.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </FormSection>
      </ContentPanel>
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving}>
          <Save />
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/ops/documents/${record.document.envelope.id}`}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

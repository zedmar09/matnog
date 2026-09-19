"use client";

import { useState } from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArrowLeft, FileCheck2, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type ArchiveHoldValues, archiveHoldSchema } from "../schemas/document-schema";
import { documentRoutingRepository, listArchivePreview } from "../services/document-foundation";
import type { DocumentWorkspaceRecord } from "../types/document-routing";

function ArchiveHoldControl({
  record,
  onUpdate,
}: {
  record: DocumentWorkspaceRecord;
  onUpdate: (record: DocumentWorkspaceRecord) => void;
}) {
  const { role } = useWorkspaceSession();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState("");
  const form = useForm<ArchiveHoldValues>({
    resolver: zodResolver(archiveHoldSchema),
    defaultValues: { reason: "" },
  });

  const submit = (values: ArchiveHoldValues) => {
    setErrors([]);
    setNotice("");
    const nextHold = !record.archive.hold;
    const result = documentRoutingRepository.setArchiveHold(role, record.document.envelope.id, nextHold, values.reason);
    if (result.kind !== "success") {
      setErrors(
        result.kind === "invalid"
          ? result.errors
          : [
              {
                id: "hold-reason",
                message:
                  result.kind === "empty"
                    ? (result.reason ?? "The sample archive hold could not be updated.")
                    : result.message,
              },
            ],
      );
      return;
    }
    setNotice(nextHold ? "Archive hold placed." : "Archive hold cleared.");
    form.reset();
    onUpdate(result.data);
  };

  return (
    <form className="document-archive-hold-form" onSubmit={form.handleSubmit(submit)} noValidate>
      {notice && <NoticePanel>{notice}</NoticePanel>}
      <ErrorSummary errors={errors} title="Archive hold needs attention" />
      <FormField
        id="hold-reason"
        label={record.archive.hold ? "Reason for clearing the hold" : "Reason for archive hold"}
        error={form.formState.errors.reason?.message}
      >
        {(field) => <Textarea {...field} {...form.register("reason")} />}
      </FormField>
      <Button type="submit" variant={record.archive.hold ? "outline" : "destructive"}>
        <ShieldAlert /> {record.archive.hold ? "Clear archive hold" : "Place archive hold"}
      </Button>
    </form>
  );
}

export function DocumentArchiveView() {
  const { role } = useWorkspaceSession();
  const [overrides, setOverrides] = useState<Record<string, DocumentWorkspaceRecord>>({});

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Archive preview is limited to municipal records staff"
        description="Choose the municipal demo role to inspect releases and archive holds."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/documents">Return to document register</Link>
          </Button>
        }
      />
    );
  }

  const records = listArchivePreview(role).map((record) => overrides[record.document.envelope.id] ?? record);

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M05 · Records retention</span>
          <h1>Archive preview</h1>
          <p>Inspect released revisions and place or clear a sample retention hold.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/ops/documents">
            <ArrowLeft /> Document register
          </Link>
        </Button>
      </div>

      <NoticePanel className="mb-6" icon={<Archive />}>
        This local preview does not delete, export, sign, or transmit a file. Holds only change in-memory sample state.
      </NoticePanel>

      <div className="document-archive-list">
        {records.map((record) => {
          const releasedVersion = record.release
            ? record.versions.find((version) => version.id === record.release?.versionId)
            : undefined;
          return (
            <ContentPanel as="article" key={record.document.envelope.id} className="document-archive-card">
              <div className="document-workspace-section-heading">
                <SectionHeading eyebrow={record.document.envelope.reference} title={record.document.subject} />
                <div className="document-route-badges">
                  <StatusBadge tone={record.archive.hold ? "warning" : "success"}>
                    {record.archive.hold ? "hold active" : record.archive.state}
                  </StatusBadge>
                  <StatusBadge tone="neutral">{record.document.classification}</StatusBadge>
                </div>
              </div>

              <div className="document-archive-grid">
                <div className="document-archive-release">
                  <FileCheck2 />
                  <div>
                    <strong>{record.release?.sampleOutputReference ?? "Release receipt pending"}</strong>
                    <p>
                      {releasedVersion
                        ? `Revision ${releasedVersion.revision} · ${releasedVersion.filename}`
                        : "No released revision is recorded."}
                    </p>
                    {record.release && (
                      <small>
                        {record.release.releasedBy} · {formatDemoDateTime(record.release.releasedAt)}
                      </small>
                    )}
                  </div>
                </div>

                {record.archive.hold && (
                  <NoticePanel icon={<ShieldAlert />}>
                    {record.archive.holdReason} · {record.archive.holdPlacedBy}
                  </NoticePanel>
                )}

                <ArchiveHoldControl
                  record={record}
                  onUpdate={(updated) =>
                    setOverrides((current) => ({ ...current, [updated.document.envelope.id]: updated }))
                  }
                />
              </div>

              <Button asChild variant="ghost" size="sm">
                <Link href={`/ops/documents/${record.document.envelope.id}`}>Open document record</Link>
              </Button>
            </ContentPanel>
          );
        })}
      </div>
    </>
  );
}

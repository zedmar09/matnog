"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Archive, ArchiveRestore, ArrowLeft, FileText, Pencil, Trash2, UserRoundCog } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { CustodyReleaseWorkspace } from "../components/custody-release-workspace";
import { DocumentReplacementForm } from "../components/document-replacement-form";
import { DocumentSummaryCards } from "../components/document-summary-cards";
import { DocumentVersionPreview } from "../components/document-version-preview";
import { RoutingWorkspace } from "../components/routing-workspace";
import type { FileReplacementValues } from "../schemas/document-schema";
import { documentRoutingRepository, readDocumentFoundation } from "../services/document-foundation";
import type { DocumentWorkspaceRecord } from "../types/document-routing";

export function DocumentDetailView({ documentId }: { documentId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [recordOverride, setRecordOverride] = useState<{
    role: typeof role;
    record: DocumentWorkspaceRecord;
  }>();
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const projectedRecord = readDocumentFoundation(role, documentId);
  const record =
    recordOverride?.role === role &&
    recordOverride.record.document.envelope.id === projectedRecord?.document.envelope.id
      ? recordOverride.record
      : projectedRecord;

  if (!record) {
    return (
      <PermissionState
        title="Document record unavailable"
        description="The reference does not exist or is outside the selected role."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/documents">Return to document register</Link>
          </Button>
        }
      />
    );
  }

  const replaceFile = (values: FileReplacementValues) => {
    const result = documentRoutingRepository.replaceFile(role, documentId, {
      ...values,
      actor: "Municipal Records Officer",
    });
    if (result.kind === "success") {
      setSelectedVersionId(result.data.document.currentFileVersionId);
      setRecordOverride({ role, record: result.data });
    }
    return result;
  };
  const canEdit = role === "municipal" && !["released", "archived"].includes(record.document.envelope.status);

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M05 · {record.document.envelope.reference}</span>
          <h1>{record.document.subject}</h1>
          <p>
            {record.document.documentType} · {record.document.direction} · {record.document.classification}
          </p>
        </div>
        <div className="ops-topline-actions">
          <Button asChild variant="outline">
            <Link href="/ops/documents">
              <ArrowLeft /> Back to register
            </Link>
          </Button>
          {canEdit && (
            <Button asChild>
              <Link href={`/ops/documents/${record.document.envelope.id}/edit`}>
                <Pencil />
                Edit document
              </Link>
            </Button>
          )}
          {role === "municipal" &&
            record.document.envelope.status === "released" &&
            record.archive.state !== "archived" && (
              <Button variant="outline" onClick={() => setConfirmArchive(true)}>
                <Archive />
                Archive
              </Button>
            )}
          {role === "municipal" && record.archive.state === "archived" && (
            <Button variant="outline" onClick={() => setConfirmArchive(true)}>
              <ArchiveRestore />
              Restore
            </Button>
          )}
          {role === "municipal" && (
            <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              Delete
            </Button>
          )}
        </div>
      </div>

      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This document record could not be changed" />

      <DocumentSummaryCards record={record} />
      {record.custody.mode === "physical" ? (
        <NoticePanel className="mb-6">
          Sending a physical file starts a handover. Custody stays with {record.custody.currentHolder?.label} until the
          correct receiving persona accepts {record.custody.trackingReference}.
        </NoticePanel>
      ) : (
        <NoticePanel className="mb-6">
          This is a digital-only record. Route responsibility is tracked without implying a physical custodian or
          handover.
        </NoticePanel>
      )}

      {record.delegations.map((delegation) => (
        <ContentPanel key={delegation.id} className="document-exception-panel">
          <UserRoundCog />
          <div>
            <strong>Delegated review · {delegation.id}</strong>
            <p>
              {delegation.fromPersona} delegated to {delegation.toPersona} through{" "}
              {formatDemoDateTime(delegation.validUntil)}. The delegation has expired, so delegated actions require
              reassignment.
            </p>
          </div>
          <StatusBadge tone="destructive">expired delegation</StatusBadge>
        </ContentPanel>
      ))}

      {record.archive.hold && (
        <ContentPanel className="document-exception-panel">
          <Archive />
          <div>
            <strong>Archive hold active</strong>
            <p>
              {record.archive.holdReason} · {record.archive.holdPlacedBy}
            </p>
          </div>
          <StatusBadge tone="warning">release retained</StatusBadge>
        </ContentPanel>
      )}

      <div className={canEdit ? "document-preview-workspace" : "is-read-only document-preview-workspace"}>
        <DocumentVersionPreview
          record={record}
          selectedVersionId={selectedVersionId || record.document.currentFileVersionId}
          onVersionChange={setSelectedVersionId}
        />
        {canEdit && (
          <ContentPanel as="section">
            <DocumentReplacementForm onReplace={replaceFile} />
          </ContentPanel>
        )}
      </div>

      <div className="document-detail-grid">
        <ContentPanel as="section">
          <SectionHeading eyebrow="Immutable revisions" title="File versions" />
          <div className="document-version-list">
            {[...record.versions].reverse().map((version) => (
              <article key={version.id}>
                <div className="document-row-heading">
                  <span className="document-file-icon">
                    <FileText />
                  </span>
                  <div>
                    <strong>
                      Revision {version.revision} · {version.filename}
                    </strong>
                    <small>
                      {version.note} · {formatDemoDateTime(version.addedAt)}
                    </small>
                  </div>
                  <StatusBadge tone={version.state === "submitted" ? "pending" : "neutral"}>
                    {version.state}
                  </StatusBadge>
                </div>
              </article>
            ))}
          </div>
        </ContentPanel>

        <ContentPanel as="section">
          <SectionHeading eyebrow={`Template version ${record.route.templateVersion}`} title="Route tasks" />
          <ol className="document-task-list">
            {record.tasks.map((task) => (
              <li key={task.id}>
                <span className="document-task-sequence">{task.sequence}</span>
                <div>
                  <strong>{task.title}</strong>
                  <small>
                    {task.office.label} · {task.assigneePersona}
                  </small>
                  <small>Due {formatDemoDateTime(task.dueAt)}</small>
                </div>
                <StatusBadge tone={task.state === "pending-acknowledgment" ? "pending" : "neutral"}>
                  {task.state.replaceAll("-", " ")}
                </StatusBadge>
              </li>
            ))}
          </ol>
        </ContentPanel>
      </div>

      {canEdit && (
        <RoutingWorkspace record={record} onUpdate={(updated) => setRecordOverride({ role, record: updated })} />
      )}
      <CustodyReleaseWorkspace
        record={record}
        role={role}
        onUpdate={(updated) => setRecordOverride({ role, record: updated })}
      />
      <ConfirmationDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={`${record.archive.state === "archived" ? "Restore" : "Archive"} ${record.document.envelope.reference}`}
        description={
          record.archive.state === "archived"
            ? "This returns the released record to the active document register."
            : "This moves the released document to the records archive."
        }
        confirmLabel={record.archive.state === "archived" ? "Restore document" : "Archive document"}
        onConfirm={() => {
          const result =
            record.archive.state === "archived"
              ? documentRoutingRepository.restoreDocument(role, record.document.envelope.id)
              : documentRoutingRepository.archiveDocument(role, record.document.envelope.id);
          if (result.kind === "success") {
            setRecordOverride({ role, record: result.data });
            setNotice(record.archive.state === "archived" ? "Document restored." : "Document archived.");
            setErrors([]);
          } else
            setErrors(
              result.kind === "invalid"
                ? result.errors
                : [
                    {
                      id: "archive-document",
                      message:
                        result.kind === "empty" ? (result.reason ?? "The record was not found.") : result.message,
                    },
                  ],
            );
        }}
      />
      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${record.document.envelope.reference}`}
        description="This permanently removes the document metadata, file revisions, routing tasks, custody history, and release record."
        confirmLabel="Delete document"
        destructive
        onConfirm={() => {
          const result = documentRoutingRepository.deleteDocument(role, record.document.envelope.id);
          if (result.kind === "success") router.replace("/ops/documents");
          else
            setErrors(
              result.kind === "invalid"
                ? result.errors
                : [
                    {
                      id: "delete-document",
                      message:
                        result.kind === "empty" ? (result.reason ?? "The record was not found.") : result.message,
                    },
                  ],
            );
        }}
      />
    </>
  );
}

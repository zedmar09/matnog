"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Archive, ArchiveRestore, EllipsisVertical, Eye, SearchX, ShieldAlert, Trash2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { documentRoutingRepository, listArchivePreview } from "../services/document-foundation";
import type { DocumentWorkspaceRecord } from "../types/document-routing";

type PendingAction = { type: "archive" | "restore" | "delete"; record: DocumentWorkspaceRecord };

export function DocumentArchiveView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<DocumentWorkspaceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [hold, setHold] = useState("");
  const [pending, setPending] = useState<PendingAction>();
  const [holdRecord, setHoldRecord] = useState<DocumentWorkspaceRecord>();
  const [holdReason, setHoldReason] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  useEffect(() => setRecords(listArchivePreview(role)), [role]);

  if (role !== "municipal")
    return (
      <PermissionState
        title="Records archive unavailable"
        description="Only municipal records staff can manage released records and retention holds."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/documents">Back to register</Link>
          </Button>
        }
      />
    );

  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((record) => {
    const haystack =
      `${record.document.envelope.reference} ${record.document.subject} ${record.document.documentType} ${record.release?.sampleOutputReference ?? ""}`.toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!state || record.archive.state === state) &&
      (!hold || (hold === "held") === record.archive.hold)
    );
  });
  const filtering = Boolean(search || state || hold);

  function replaceRecord(updated: DocumentWorkspaceRecord) {
    setRecords((current) =>
      current.map((record) => (record.document.envelope.id === updated.document.envelope.id ? updated : record)),
    );
    setHoldRecord((current) => (current?.document.envelope.id === updated.document.envelope.id ? updated : current));
  }

  function performAction() {
    if (!pending) return;
    const id = pending.record.document.envelope.id;
    const result =
      pending.type === "archive"
        ? documentRoutingRepository.archiveDocument(role, id)
        : pending.type === "restore"
          ? documentRoutingRepository.restoreDocument(role, id)
          : documentRoutingRepository.deleteDocument(role, id);
    if (result.kind === "success") {
      if (pending.type === "delete")
        setRecords((current) => current.filter((record) => record.document.envelope.id !== id));
      else replaceRecord(result.data as DocumentWorkspaceRecord);
      setNotice(
        `${pending.record.document.envelope.reference} was ${pending.type === "archive" ? "archived" : pending.type === "restore" ? "restored" : "deleted"}.`,
      );
      setErrors([]);
    } else
      setErrors(
        result.kind === "invalid"
          ? result.errors
          : [
              {
                id: `${pending.type}-document`,
                message: result.kind === "empty" ? (result.reason ?? "The record was not found.") : result.message,
              },
            ],
      );
    setPending(undefined);
  }

  function updateHold() {
    if (!holdRecord) return;
    const result = documentRoutingRepository.setArchiveHold(
      role,
      holdRecord.document.envelope.id,
      !holdRecord.archive.hold,
      holdReason,
    );
    if (result.kind === "success") {
      replaceRecord(result.data);
      setNotice(result.data.archive.hold ? "Archive hold placed." : "Archive hold cleared.");
      setErrors([]);
      setHoldReason("");
    } else
      setErrors(
        result.kind === "invalid"
          ? result.errors
          : [
              {
                id: "hold-reason",
                message: result.kind === "empty" ? (result.reason ?? "The record was not found.") : result.message,
              },
            ],
      );
  }

  const columns: DataTableColumn<DocumentWorkspaceRecord>[] = [
    {
      key: "reference",
      header: "Reference",
      sortValue: (row) => row.document.envelope.reference ?? row.document.envelope.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/documents/${row.document.envelope.id}`}>
          {row.document.envelope.reference}
        </Link>
      ),
    },
    {
      key: "document",
      header: "Document",
      className: "ops-wide-cell",
      sortValue: (row) => row.document.subject,
      cell: (row) => (
        <>
          <strong>{row.document.subject}</strong>
          <small>
            {row.document.documentType} · {row.document.classification}
          </small>
        </>
      ),
    },
    {
      key: "release",
      header: "Release",
      className: "ops-wide-cell",
      sortValue: (row) => row.release?.releasedAt ?? "",
      cell: (row) =>
        row.release ? (
          <>
            <strong>{row.release.sampleOutputReference}</strong>
            <small>{formatDemoDateTime(row.release.releasedAt)}</small>
          </>
        ) : (
          <span className="muted">Pending release</span>
        ),
    },
    {
      key: "retention",
      header: "Retention",
      sortValue: (row) => row.archive.state,
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={row.archive.state === "archived" ? "success" : "pending"}>{row.archive.state}</StatusBadge>
          <StatusBadge tone={row.archive.hold ? "warning" : "neutral"}>
            {row.archive.hold ? "Hold active" : "Clear"}
          </StatusBadge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${row.document.envelope.reference}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/documents/${row.document.envelope.id}`}>
                <Eye size={14} />
                Open record
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setHoldRecord(row)}>
              <ShieldAlert size={14} />
              Manage hold
            </DropdownMenuItem>
            {row.archive.state === "archived" ? (
              <DropdownMenuItem onSelect={() => setPending({ type: "restore", record: row })}>
                <ArchiveRestore size={14} />
                Restore record
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={row.archive.hold || row.document.envelope.status !== "released"}
                onSelect={() => setPending({ type: "archive", record: row })}
              >
                <Archive size={14} />
                Archive record
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive" onSelect={() => setPending({ type: "delete", record: row })}>
              <Trash2 size={14} />
              Delete record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Records archive</h1>
          <p>Manage released documents, retention holds, archived records, and restoration.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/ops/documents">Back to register</Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This archive record could not be changed" />
      <div className="ops-controls">
        <OpsSearch value={search} onChange={setSearch} placeholder="Reference, subject, type, or release number…" />
        <OpsFilter
          label="Archive state"
          value={state}
          onChange={setState}
          anyLabel="Any state"
          options={[
            { value: "eligible", label: "Eligible" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <OpsFilter
          label="Retention hold"
          value={hold}
          onChange={setHold}
          anyLabel="Any hold state"
          options={[
            { value: "held", label: "Hold active" },
            { value: "clear", label: "Clear" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.document.envelope.id}
          initialSort={{ key: "release", direction: "desc" }}
          summary={`${rows.length} archive ${rows.length === 1 ? "record" : "records"}`}
        />
      ) : (
        <EmptyState
          icon={filtering ? SearchX : Archive}
          title={filtering ? "No archive records match your filters." : "No records are ready for archiving."}
          description={
            filtering
              ? "Adjust the search or clear the filters."
              : "Released records appear here when they become eligible for retention."
          }
          action={
            filtering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setState("");
                  setHold("");
                }}
              >
                Reset filters
              </Button>
            ) : undefined
          }
        />
      )}
      {holdRecord && (
        <ContentPanel as="section" className="mt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">{holdRecord.document.envelope.reference}</span>
              <h2>Retention hold</h2>
              <p className="muted mt-2">
                {holdRecord.archive.hold
                  ? holdRecord.archive.holdReason
                  : "Record a reason before placing a retention hold."}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setHoldRecord(undefined);
                setHoldReason("");
              }}
            >
              Close
            </Button>
          </div>
          <div className="mt-5 max-w-2xl">
            <FormField
              id="hold-reason"
              label={holdRecord.archive.hold ? "Reason for clearing the hold" : "Reason for retention hold"}
            >
              {(field) => (
                <Textarea {...field} value={holdReason} onChange={(event) => setHoldReason(event.target.value)} />
              )}
            </FormField>
            <Button className="mt-4" variant={holdRecord.archive.hold ? "outline" : "destructive"} onClick={updateHold}>
              <ShieldAlert />
              {holdRecord.archive.hold ? "Clear hold" : "Place hold"}
            </Button>
          </div>
        </ContentPanel>
      )}
      <ConfirmationDialog
        open={pending !== undefined}
        onOpenChange={(next) => !next && setPending(undefined)}
        title={`${pending?.type === "restore" ? "Restore" : pending?.type === "delete" ? "Delete" : "Archive"} ${pending?.record.document.envelope.reference ?? "record"}`}
        description={
          pending?.type === "delete"
            ? "This permanently removes the document and its complete routing history."
            : pending?.type === "restore"
              ? "The record will return to the active document register as a released record."
              : "The released document will move into archived records."
        }
        confirmLabel={
          pending?.type === "restore"
            ? "Restore record"
            : pending?.type === "delete"
              ? "Delete record"
              : "Archive record"
        }
        destructive={pending?.type === "delete"}
        onConfirm={performAction}
      />
    </>
  );
}

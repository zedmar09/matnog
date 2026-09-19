"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Archive, FilePlus2, Files, SearchX } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { DocumentRegisterTable } from "../components/document-register-table";
import {
  type DocumentSummary,
  documentRoutingRepository,
  listDocumentFoundation,
} from "../services/document-foundation";

export function DocumentRegisterView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<DocumentSummary[]>([]);
  const [search, setSearch] = useState("");
  const [classification, setClassification] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState<DocumentSummary>();
  const [archiving, setArchiving] = useState<DocumentSummary>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  useEffect(() => setRecords(listDocumentFoundation(role)), [role]);

  if (role === "enumerator") {
    return (
      <PermissionState
        title="Document register unavailable"
        description="Document records are assigned to municipal, barangay, and partner staff."
      />
    );
  }

  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((record) => {
    const haystack =
      `${record.reference} ${record.subject} ${record.type} ${record.source} ${record.custodyLabel}`.toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!classification || record.classification === classification) &&
      (!status || record.status === status)
    );
  });
  const filtering = Boolean(search || classification || status);

  function resetFilters() {
    setSearch("");
    setClassification("");
    setStatus("");
  }

  function remove() {
    if (!deleting) return;
    const result = documentRoutingRepository.deleteDocument(role, deleting.id);
    if (result.kind === "success") {
      setRecords((current) => current.filter((record) => record.id !== deleting.id));
      setNotice(`${deleting.reference} was deleted.`);
      setErrors([]);
    } else {
      setErrors(
        result.kind === "invalid"
          ? result.errors
          : [
              {
                id: "delete-document",
                message: result.kind === "empty" ? (result.reason ?? "The record was not found.") : result.message,
              },
            ],
      );
    }
    setDeleting(undefined);
  }

  function archive() {
    if (!archiving) return;
    const result = documentRoutingRepository.archiveDocument(role, archiving.id);
    if (result.kind === "success") {
      setRecords((current) => current.filter((record) => record.id !== archiving.id));
      setNotice(`${archiving.reference} was archived.`);
      setErrors([]);
    } else {
      setErrors(
        result.kind === "invalid"
          ? result.errors
          : [
              {
                id: "archive-document",
                message: result.kind === "empty" ? (result.reason ?? "The record was not found.") : result.message,
              },
            ],
      );
    }
    setArchiving(undefined);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Document register</h1>
          <p>Manage incoming and outgoing records, routing status, file revisions, and physical custody.</p>
        </div>
        {role === "municipal" && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/ops/documents/archive">
                <Archive />
                Archive
              </Link>
            </Button>
            <Button asChild>
              <Link href="/ops/documents/new">
                <FilePlus2 />
                New document
              </Link>
            </Button>
          </div>
        )}
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This document record could not be changed" />
      <div className="ops-controls">
        <OpsSearch value={search} onChange={setSearch} placeholder="Reference, subject, type, source, or custodian…" />
        <OpsFilter
          label="Classification"
          value={classification}
          onChange={setClassification}
          anyLabel="Any classification"
          options={["public", "internal", "restricted"].map((value) => ({
            value,
            label: value[0].toUpperCase() + value.slice(1),
          }))}
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={["registered", "routed", "in-review", "returned", "approved", "released"].map((value) => ({
            value,
            label: value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase()),
          }))}
        />
      </div>
      {rows.length ? (
        <DocumentRegisterTable
          records={rows}
          canManage={role === "municipal"}
          onArchive={setArchiving}
          onDelete={setDeleting}
        />
      ) : (
        <EmptyState
          icon={filtering ? SearchX : Files}
          title={filtering ? "No documents match your filters." : "No document records are available."}
          description={filtering ? "Adjust the search or clear the filters." : "Register the first document record."}
          action={
            filtering ? (
              <Button variant="outline" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : role === "municipal" ? (
              <Button asChild>
                <Link href="/ops/documents/new">Register document</Link>
              </Button>
            ) : undefined
          }
        />
      )}
      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title={`Delete ${deleting?.reference ?? "document"}`}
        description="This permanently removes the document metadata, file revisions, routing tasks, custody history, and release record from the current workspace."
        confirmLabel="Delete document"
        destructive
        onConfirm={remove}
      />
      <ConfirmationDialog
        open={archiving !== undefined}
        onOpenChange={(next) => !next && setArchiving(undefined)}
        title={`Archive ${archiving?.reference ?? "document"}`}
        description="The released record will move from the active register to the records archive."
        confirmLabel="Archive document"
        onConfirm={archive}
      />
    </>
  );
}

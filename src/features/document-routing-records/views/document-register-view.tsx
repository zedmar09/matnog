"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { Archive, ArrowRight, FilePlus2, Files } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { FilterTabs, SearchField } from "@/shared/components/filter-bar";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type DocumentSummary, listDocumentFoundation } from "../services/document-foundation";

const columns: DataTableColumn<DocumentSummary>[] = [
  { key: "reference", header: "Reference", cell: (row) => row.reference },
  {
    key: "document",
    header: "Document",
    cell: (row) => (
      <>
        <strong>{row.subject}</strong>
        <small>
          {row.type} · Revision {row.fileRevision} · {row.scenario.replaceAll("-", " ")}
        </small>
        {row.archiveHold && <small>Archive hold active</small>}
      </>
    ),
  },
  {
    key: "route",
    header: "Route task",
    cell: (row) => <StatusBadge tone="pending">{row.routeState.replaceAll("-", " ")}</StatusBadge>,
  },
  {
    key: "custody",
    header: "Physical custody",
    cell: (row) => <span className="document-table-note">{row.custodyLabel}</span>,
  },
  {
    key: "action",
    header: "Action",
    headerHidden: true,
    cell: (row) => (
      <Button asChild variant="ghost" size="sm">
        <Link href={`/ops/documents/${row.id}`}>
          Open record <ArrowRight />
        </Link>
      </Button>
    ),
  },
];

export function DocumentRegisterView() {
  const { role } = useWorkspaceSession();
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("all");
  const records = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return listDocumentFoundation(role).filter(
      (row) =>
        (classification === "all" || row.classification === classification) &&
        (!normalized ||
          `${row.reference} ${row.subject} ${row.type} ${row.scenario} ${row.classification}`
            .toLowerCase()
            .includes(normalized)),
    );
  }, [classification, query, role]);

  if (role === "enumerator") {
    return (
      <PermissionState
        title="The document register is outside this demo scope"
        description="No document records are assigned to the enumerator projection. Choose a role with a document assignment."
      />
    );
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M05 · Document routing</span>
          <h1>Document register</h1>
          <p>Find a registered file and review its version, office route, and physical custody as separate records.</p>
        </div>
        {role === "municipal" && (
          <div className="ops-topline-actions">
            <Button asChild variant="outline">
              <Link href="/ops/documents/archive">
                <Archive /> Archive preview
              </Link>
            </Button>
            <Button asChild>
              <Link href="/ops/documents/new">
                <FilePlus2 /> Register document
              </Link>
            </Button>
          </div>
        )}
      </div>
      <NoticePanel className="mb-6">
        Showing only records permitted for the {role} demo projection. Search never reveals hidden restricted metadata,
        and no document is uploaded or transmitted.
      </NoticePanel>
      <div className="ops-controls">
        <SearchField
          label="Search documents"
          placeholder="Reference, subject, or type…"
          value={query}
          onChange={setQuery}
        />
      </div>
      <FilterTabs
        label="Filter documents by classification"
        options={[
          { value: "all", label: "All permitted" },
          { value: "public", label: "Public" },
          { value: "internal", label: "Internal" },
          { value: "restricted", label: "Restricted" },
        ]}
        value={classification}
        onChange={setClassification}
      />
      {records.length > 0 ? (
        <DataTable
          columns={columns}
          rows={records}
          getRowKey={(row) => row.id}
          summary={`${records.length} document record${records.length === 1 ? "" : "s"}`}
        />
      ) : (
        <EmptyState
          icon={Files}
          title="No documents match this search"
          description="Clear the search to return to the sample register."
          action={
            <Button
              onClick={() => {
                setQuery("");
                setClassification("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </>
  );
}

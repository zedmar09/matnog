"use client";

import Link from "next/link";

import { Archive, EllipsisVertical, Eye, Pencil, Trash2 } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import type { DocumentSummary } from "../services/document-foundation";

const statusTone = (status: string): StatusTone => {
  if (["approved", "released"].includes(status)) return "success";
  if (["returned", "disputed", "lost"].includes(status)) return "destructive";
  if (["routed", "in-review", "pending-acknowledgment"].includes(status)) return "pending";
  return "neutral";
};

export function DocumentRegisterTable({
  records,
  canManage,
  onArchive,
  onDelete,
}: {
  records: readonly DocumentSummary[];
  canManage: boolean;
  onArchive: (record: DocumentSummary) => void;
  onDelete: (record: DocumentSummary) => void;
}) {
  const columns: DataTableColumn<DocumentSummary>[] = [
    {
      key: "reference",
      header: "Reference",
      sortValue: (row) => row.reference,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/documents/${row.id}`}>
          {row.reference}
        </Link>
      ),
    },
    {
      key: "document",
      header: "Document",
      className: "ops-wide-cell",
      sortValue: (row) => row.subject,
      cell: (row) => (
        <>
          <strong>{row.subject}</strong>
          <small>
            {row.type} · Revision {row.fileRevision} · {row.source} · {row.direction}
          </small>
        </>
      ),
    },
    {
      key: "route",
      header: "Routing, access, and custody",
      className: "ops-wide-cell",
      sortValue: (row) => row.routeState,
      cell: (row) => (
        <>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={statusTone(row.routeState)}>{row.routeState.replaceAll("-", " ")}</StatusBadge>
            <StatusBadge tone={row.classification === "restricted" ? "warning" : "neutral"}>
              {row.classification}
            </StatusBadge>
          </div>
          <small>{row.custodyLabel}</small>
        </>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${row.reference}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/documents/${row.id}`}>
                <Eye size={14} />
                Open record
              </Link>
            </DropdownMenuItem>
            {canManage && !["released", "archived"].includes(row.status) && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/documents/${row.id}/edit`}>
                  <Pencil size={14} />
                  Edit document
                </Link>
              </DropdownMenuItem>
            )}
            {canManage && row.status === "released" && (
              <DropdownMenuItem onSelect={() => onArchive(row)}>
                <Archive size={14} />
                Archive document
              </DropdownMenuItem>
            )}
            {canManage && (
              <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(row)}>
                <Trash2 size={14} />
                Delete document
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={records}
      getRowKey={(row) => row.id}
      initialSort={{ key: "reference", direction: "desc" }}
      summary={`${records.length} ${records.length === 1 ? "document" : "documents"}`}
    />
  );
}

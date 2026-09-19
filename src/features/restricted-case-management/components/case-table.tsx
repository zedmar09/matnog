"use client";

import Link from "next/link";

import { EllipsisVertical, Eye, Pencil, Trash2 } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import type { CasePriority, CaseRecord, CaseStatus } from "../types/restricted-case";

const STATUS_TONE: Record<CaseStatus, StatusTone> = {
  New: "pending",
  "Under review": "pending",
  Scheduled: "warning",
  Referred: "warning",
  Resolved: "success",
  Closed: "neutral",
};
const PRIORITY_TONE: Record<CasePriority, StatusTone> = {
  Routine: "neutral",
  Priority: "pending",
  Urgent: "destructive",
};

export function CaseTable({
  records,
  onDelete,
}: {
  records: readonly CaseRecord[];
  onDelete: (record: CaseRecord) => void;
}) {
  const columns: DataTableColumn<CaseRecord>[] = [
    {
      key: "id",
      header: "Case reference",
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/cases/${row.id}`}>
          {row.id}
        </Link>
      ),
    },
    {
      key: "case",
      header: "Case",
      className: "ops-wide-cell",
      sortValue: (row) => row.discreetLabel,
      cell: (row) => (
        <>
          <strong>{row.discreetLabel}</strong>
          <small>{row.caseClass}</small>
        </>
      ),
    },
    { key: "scope", header: "Barangay / scope", sortValue: (row) => row.scope, cell: (row) => row.scope },
    {
      key: "desk",
      header: "Assigned desk",
      className: "ops-wide-cell ops-clamp-cell",
      sortValue: (row) => row.assignedDesk,
      cell: (row) => row.assignedDesk,
    },
    {
      key: "priority",
      header: "Priority",
      sortValue: (row) => row.priority,
      cell: (row) => <StatusBadge tone={PRIORITY_TONE[row.priority]}>{row.priority}</StatusBadge>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge tone={STATUS_TONE[row.status]}>{row.status}</StatusBadge>,
    },
    {
      key: "updated",
      header: "Last updated",
      className: "ops-nowrap-cell",
      sortValue: (row) => row.updatedAt,
      cell: (row) => row.updatedAt,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${row.id}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/cases/${row.id}`}>
                <Eye size={14} />
                Open case
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/cases/${row.id}/edit`}>
                <Pencil size={14} />
                Edit case
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(row)} className="text-destructive">
              <Trash2 size={14} />
              Delete case
            </DropdownMenuItem>
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
      pageSize={10}
      initialSort={{ key: "updated", direction: "desc" }}
      summary={`${records.length} ${records.length === 1 ? "case" : "cases"}`}
    />
  );
}

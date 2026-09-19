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

import type { AccessStatus, CaseAccessAssignment } from "../types/restricted-case";

const TONE: Record<AccessStatus, StatusTone> = { Active: "success", Revoked: "destructive", Expired: "neutral" };

export function AccessTable({
  records,
  onDelete,
}: {
  records: readonly CaseAccessAssignment[];
  onDelete: (record: CaseAccessAssignment) => void;
}) {
  const columns: DataTableColumn<CaseAccessAssignment>[] = [
    {
      key: "id",
      header: "Assignment",
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/cases/access/${row.id}`}>
          {row.id}
        </Link>
      ),
    },
    {
      key: "staff",
      header: "Staff member",
      className: "ops-wide-cell",
      sortValue: (row) => row.staffName,
      cell: (row) => (
        <>
          <strong>{row.staffName}</strong>
          <small>{row.staffRole}</small>
        </>
      ),
    },
    { key: "class", header: "Case class", sortValue: (row) => row.caseClass, cell: (row) => row.caseClass },
    { key: "scope", header: "Scope", sortValue: (row) => row.scope, cell: (row) => row.scope },
    {
      key: "purpose",
      header: "Purpose",
      className: "ops-wide-cell ops-clamp-cell",
      sortValue: (row) => row.purpose,
      cell: (row) => row.purpose,
    },
    {
      key: "expires",
      header: "Expires",
      className: "ops-nowrap-cell",
      sortValue: (row) => row.expiresAt,
      cell: (row) => row.expiresAt,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge tone={TONE[row.status]}>{row.status}</StatusBadge>,
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
              <Link href={`/ops/cases/access/${row.id}`}>
                <Eye size={14} />
                Open assignment
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/cases/access/${row.id}/edit`}>
                <Pencil size={14} />
                Edit assignment
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(row)} className="text-destructive">
              <Trash2 size={14} />
              Delete assignment
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
      initialSort={{ key: "id", direction: "desc" }}
      summary={`${records.length} access ${records.length === 1 ? "assignment" : "assignments"}`}
    />
  );
}

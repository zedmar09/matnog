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

import type { BusinessApplicationRecord, BusinessApplicationStatus } from "../types/business-records";

const STATUS_TONE: Record<BusinessApplicationStatus, StatusTone> = {
  draft: "neutral",
  submitted: "pending",
  "for-correction": "warning",
  "under-review": "pending",
  "ready-to-issue": "success",
  issued: "success",
  closed: "neutral",
};

const label = (value: string) => value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());

export function ApplicationTable({
  records,
  onDelete,
}: {
  records: readonly BusinessApplicationRecord[];
  onDelete: (record: BusinessApplicationRecord) => void;
}) {
  const columns: DataTableColumn<BusinessApplicationRecord>[] = [
    {
      key: "id",
      header: "Application",
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/bpls/applications/${row.id}`}>
          {row.id}
        </Link>
      ),
    },
    {
      key: "business",
      header: "Business",
      className: "ops-wide-cell",
      sortValue: (row) => row.businessName,
      cell: (row) => (
        <>
          <strong>{row.businessName}</strong>
          <small>{row.establishmentName}</small>
        </>
      ),
    },
    { key: "type", header: "Type", sortValue: (row) => row.path, cell: (row) => label(row.path) },
    { key: "period", header: "Period", sortValue: (row) => row.fiscalPeriod, cell: (row) => row.fiscalPeriod },
    {
      key: "officer",
      header: "Assigned officer",
      className: "ops-wide-cell ops-clamp-cell",
      sortValue: (row) => row.assignedOfficer,
      cell: (row) => row.assignedOfficer,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge tone={STATUS_TONE[row.status]}>{label(row.status)}</StatusBadge>,
    },
    {
      key: "filed",
      header: "Filed",
      className: "ops-nowrap-cell",
      sortValue: (row) => row.filedAt,
      cell: (row) => row.filedAt.split(" ")[0],
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${row.id}`}>
            <EllipsisVertical size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/bpls/applications/${row.id}`}>
                <Eye size={14} aria-hidden="true" />
                Open application
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/bpls/applications/${row.id}/edit`}>
                <Pencil size={14} aria-hidden="true" />
                Edit application
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(row)} className="text-destructive">
              <Trash2 size={14} aria-hidden="true" />
              Delete application
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
      initialSort={{ key: "filed", direction: "desc" }}
      summary={`${records.length} ${records.length === 1 ? "application" : "applications"}`}
    />
  );
}

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

import type { TourismAdvisory, TourismAdvisorySeverity, TourismAdvisoryStatus } from "../types/tourism-records";

const STATUS_TONE: Record<TourismAdvisoryStatus, StatusTone> = {
  Draft: "neutral",
  Active: "warning",
  Resolved: "success",
  Cancelled: "neutral",
};
const SEVERITY_TONE: Record<TourismAdvisorySeverity, StatusTone> = {
  Information: "pending",
  Caution: "warning",
  Restricted: "destructive",
  Closed: "destructive",
};

export function AdvisoryTable({
  records,
  onDelete,
}: {
  records: readonly TourismAdvisory[];
  onDelete: (record: TourismAdvisory) => void;
}) {
  const columns: DataTableColumn<TourismAdvisory>[] = [
    {
      key: "id",
      header: "Advisory",
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/tourism/advisories/${row.id}`}>
          {row.id}
        </Link>
      ),
    },
    {
      key: "title",
      header: "Notice",
      className: "ops-wide-cell",
      sortValue: (row) => row.title,
      cell: (row) => (
        <>
          <strong>{row.title}</strong>
          <small>{row.issuingAuthority}</small>
        </>
      ),
    },
    { key: "type", header: "Type", sortValue: (row) => row.advisoryType, cell: (row) => row.advisoryType },
    {
      key: "severity",
      header: "Severity",
      sortValue: (row) => row.severity,
      cell: (row) => <StatusBadge tone={SEVERITY_TONE[row.severity]}>{row.severity}</StatusBadge>,
    },
    {
      key: "period",
      header: "Effective period",
      className: "ops-wide-cell",
      sortValue: (row) => row.effectiveFrom,
      cell: (row) => (
        <>
          <strong>{row.effectiveFrom}</strong>
          <small>Until {row.effectiveUntil}</small>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge tone={STATUS_TONE[row.status]}>{row.status}</StatusBadge>,
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
              <Link href={`/ops/tourism/advisories/${row.id}`}>
                <Eye size={14} />
                Open advisory
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/tourism/advisories/${row.id}/edit`}>
                <Pencil size={14} />
                Edit advisory
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(row)}>
              <Trash2 size={14} />
              Delete advisory
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
      initialSort={{ key: "period", direction: "desc" }}
      summary={`${records.length} ${records.length === 1 ? "advisory" : "advisories"}`}
    />
  );
}

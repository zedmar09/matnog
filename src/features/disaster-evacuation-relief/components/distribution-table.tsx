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

import type { DistributionStatus, ReliefDistribution } from "../types/disaster-records";

const TONE: Record<DistributionStatus, StatusTone> = {
  Released: "success",
  "Pending confirmation": "pending",
  "Duplicate review": "warning",
  Cancelled: "neutral",
};

export function DistributionTable({
  records,
  onDelete,
}: {
  records: readonly ReliefDistribution[];
  onDelete: (record: ReliefDistribution) => void;
}) {
  const columns: DataTableColumn<ReliefDistribution>[] = [
    {
      key: "id",
      header: "Distribution",
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/disaster/distributions/${row.id}`}>
          {row.id}
        </Link>
      ),
    },
    {
      key: "recipient",
      header: "Recipient",
      className: "ops-wide-cell",
      sortValue: (row) => row.recipientName,
      cell: (row) => (
        <>
          <strong>{row.recipientName}</strong>
          <small>{row.recipientId}</small>
        </>
      ),
    },
    {
      key: "round",
      header: "Round",
      sortValue: (row) => row.round,
      cell: (row) => row.round,
    },
    {
      key: "items",
      header: "Relief items",
      className: "ops-wide-cell ops-clamp-cell",
      sortValue: (row) => row.items,
      cell: (row) => row.items,
    },
    {
      key: "barangay",
      header: "Barangay",
      sortValue: (row) => row.barangay,
      cell: (row) => row.barangay,
    },
    {
      key: "releasedAt",
      header: "Release date",
      className: "ops-nowrap-cell",
      sortValue: (row) => row.releasedAt,
      cell: (row) => row.releasedAt,
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
            <EllipsisVertical size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/disaster/distributions/${row.id}`}>
                <Eye size={14} aria-hidden="true" />
                Open distribution
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/disaster/distributions/${row.id}/edit`}>
                <Pencil size={14} aria-hidden="true" />
                Edit distribution
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(row)} className="text-destructive">
              <Trash2 size={14} aria-hidden="true" />
              Delete distribution
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
      initialSort={{ key: "releasedAt", direction: "desc" }}
      summary={`${records.length} ${records.length === 1 ? "distribution" : "distributions"}`}
    />
  );
}

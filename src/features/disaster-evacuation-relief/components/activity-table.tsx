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

import type { ActivityPriority, ActivityStatus, DisasterActivity } from "../types/disaster-records";

const STATUS_TONE: Record<ActivityStatus, StatusTone> = {
  Monitoring: "pending",
  "Active response": "warning",
  Contained: "success",
  Closed: "neutral",
};

const PRIORITY_TONE: Record<ActivityPriority, StatusTone> = {
  Low: "neutral",
  Moderate: "pending",
  High: "warning",
  Critical: "destructive",
};

export function ActivityTable({
  records,
  onDelete,
}: {
  records: readonly DisasterActivity[];
  onDelete: (record: DisasterActivity) => void;
}) {
  const columns: DataTableColumn<DisasterActivity>[] = [
    {
      key: "id",
      header: "Reference",
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/disaster/events/${row.id}`}>
          {row.id}
        </Link>
      ),
    },
    {
      key: "activity",
      header: "Activity",
      className: "ops-wide-cell",
      sortValue: (row) => row.name,
      cell: (row) => (
        <>
          <strong>{row.name}</strong>
          <small>{row.type}</small>
        </>
      ),
    },
    {
      key: "barangays",
      header: "Affected barangays",
      className: "ops-wide-cell ops-clamp-cell",
      sortValue: (row) => row.affectedBarangays.join(", "),
      cell: (row) => row.affectedBarangays.join(", "),
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
            <EllipsisVertical size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/disaster/events/${row.id}`}>
                <Eye size={14} aria-hidden="true" />
                Open activity
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/disaster/events/${row.id}/edit`}>
                <Pencil size={14} aria-hidden="true" />
                Edit activity
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(row)} className="text-destructive">
              <Trash2 size={14} aria-hidden="true" />
              Delete activity
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
      summary={`${records.length} ${records.length === 1 ? "activity" : "activities"}`}
    />
  );
}

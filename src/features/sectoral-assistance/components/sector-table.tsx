"use client";

import Link from "next/link";

import { EllipsisVertical, Pencil, RotateCcw, ShieldOff, UserRoundCheck } from "lucide-react";

import type { DataTableColumn } from "@/shared/components/data-table";
import { DataTable } from "@/shared/components/data-table";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import type { SectorRecord, SectorStatus } from "../types/sectoral-assistance";

export const SECTOR_TONE: Record<SectorStatus, StatusTone> = {
  Active: "success",
  Expired: "warning",
  "Evidence review": "pending",
  Deactivated: "neutral",
};

/** A period still under review has no decided dates yet. */
function period(record: SectorRecord) {
  if (record.status === "Evidence review") return "Pending decision";
  return `${record.validFrom} → ${record.validTo}`;
}

export function SectorTable({
  records,
  onDeactivate,
  onReactivate,
}: {
  records: readonly SectorRecord[];
  onDeactivate: (record: SectorRecord) => void;
  onReactivate: (record: SectorRecord) => void;
}) {
  const columns: DataTableColumn<SectorRecord>[] = [
    {
      key: "id",
      header: "Record",
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/sectors/${row.id}`}>
          {row.id}
        </Link>
      ),
    },
    {
      key: "person",
      header: "Resident",
      sortValue: (row) => row.personLabel,
      cell: (row) => (
        <>
          <strong>{row.personLabel}</strong>
          <small>{row.personId}</small>
        </>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortValue: (row) => row.category,
      cell: (row) => row.category,
    },
    {
      key: "authority",
      header: "Issuing office",
      className: "ops-wide-cell ops-clamp-cell",
      sortValue: (row) => row.authority,
      cell: (row) => row.authority,
    },
    {
      key: "validity",
      header: "Validity",
      className: "ops-nowrap-cell",
      sortValue: (row) => row.validTo,
      cell: (row) => period(row),
    },
    {
      key: "status",
      header: "Status",
      className: "ops-status-cell",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge tone={SECTOR_TONE[row.status]}>{row.status}</StatusBadge>,
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
              <Link href={`/ops/sectors/${row.id}`}>
                <UserRoundCheck size={14} aria-hidden="true" />
                Open record
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/sectors/${row.id}/edit`}>
                <Pencil size={14} aria-hidden="true" />
                Edit registration
              </Link>
            </DropdownMenuItem>
            {row.deactivation ? (
              <DropdownMenuItem onSelect={() => onReactivate(row)}>
                <RotateCcw size={14} aria-hidden="true" />
                Reactivate status
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => onDeactivate(row)}>
                <ShieldOff size={14} aria-hidden="true" />
                Deactivate status
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
      pageSize={12}
      initialSort={{ key: "validity", direction: "desc" }}
      summary={`${records.length} ${records.length === 1 ? "registration" : "registrations"}, ${
        records.filter((item) => item.status === "Active").length
      } active`}
    />
  );
}

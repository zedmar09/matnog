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

import type { TourismTrip, TourismTripStatus } from "../types/tourism-records";

const TONES: Record<TourismTripStatus, StatusTone> = {
  draft: "neutral",
  "packet-review": "pending",
  ready: "success",
  held: "warning",
  departed: "pending",
  overdue: "destructive",
  returned: "success",
  canceled: "neutral",
};
const label = (value: string) => value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());

export function TripTable({
  records,
  onDelete,
}: {
  records: readonly TourismTrip[];
  onDelete: (record: TourismTrip) => void;
}) {
  const columns: DataTableColumn<TourismTrip>[] = [
    {
      key: "id",
      header: "Trip reference",
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/tourism/trips/${row.id}`}>
          {row.id}
        </Link>
      ),
    },
    {
      key: "destination",
      header: "Destination",
      className: "ops-wide-cell",
      sortValue: (row) => row.destination,
      cell: (row) => (
        <>
          <strong>{row.destination}</strong>
          <small>{row.bookingId}</small>
        </>
      ),
    },
    {
      key: "operator",
      header: "Operator / vessel",
      className: "ops-wide-cell",
      sortValue: (row) => row.operator,
      cell: (row) => (
        <>
          <strong>{row.operator}</strong>
          <small>{row.vessel}</small>
        </>
      ),
    },
    {
      key: "departure",
      header: "Departure",
      className: "ops-nowrap-cell",
      sortValue: (row) => row.scheduledDeparture,
      cell: (row) => row.scheduledDeparture,
    },
    {
      key: "manifest",
      header: "Manifest",
      sortValue: (row) => row.passengers.length,
      cell: (row) => `${row.passengers.length}/${row.capacity}`,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge tone={TONES[row.status]}>{label(row.status)}</StatusBadge>,
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
              <Link href={`/ops/tourism/trips/${row.id}`}>
                <Eye size={14} />
                Open trip
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/tourism/trips/${row.id}/edit`}>
                <Pencil size={14} />
                Edit trip
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(row)}>
              <Trash2 size={14} />
              Delete trip
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
      initialSort={{ key: "departure", direction: "asc" }}
      summary={`${records.length} ${records.length === 1 ? "trip" : "trips"}`}
    />
  );
}

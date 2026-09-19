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

import type { BusinessRegistryRecord, BusinessRegistryStatus } from "../types/business-records";

const STATUS_TONE: Record<BusinessRegistryStatus, StatusTone> = {
  Active: "success",
  "Expiring soon": "warning",
  Expired: "destructive",
  Closed: "neutral",
};

export function BusinessTable({
  records,
  onDelete,
}: {
  records: readonly BusinessRegistryRecord[];
  onDelete: (record: BusinessRegistryRecord) => void;
}) {
  const columns: DataTableColumn<BusinessRegistryRecord>[] = [
    {
      key: "id",
      header: "Business ID",
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/bpls/businesses/${row.id}`}>
          {row.id}
        </Link>
      ),
    },
    {
      key: "business",
      header: "Business",
      className: "ops-wide-cell",
      sortValue: (row) => row.registeredName,
      cell: (row) => (
        <>
          <strong>{row.tradeName}</strong>
          <small>{row.registeredName}</small>
        </>
      ),
    },
    {
      key: "owner",
      header: "Owner / organization",
      className: "ops-wide-cell ops-clamp-cell",
      sortValue: (row) => row.ownerName,
      cell: (row) => row.ownerName,
    },
    { key: "barangay", header: "Barangay", sortValue: (row) => row.barangay, cell: (row) => row.barangay },
    {
      key: "permit",
      header: "Permit",
      className: "ops-nowrap-cell",
      sortValue: (row) => row.permitNumber,
      cell: (row) => row.permitNumber,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge tone={STATUS_TONE[row.status]}>{row.status}</StatusBadge>,
    },
    {
      key: "validity",
      header: "Valid until",
      className: "ops-nowrap-cell",
      sortValue: (row) => row.permitValidUntil,
      cell: (row) => row.permitValidUntil,
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
              <Link href={`/ops/bpls/businesses/${row.id}`}>
                <Eye size={14} aria-hidden="true" />
                Open business
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/bpls/businesses/${row.id}/edit`}>
                <Pencil size={14} aria-hidden="true" />
                Edit business
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(row)} className="text-destructive">
              <Trash2 size={14} aria-hidden="true" />
              Delete business
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
      initialSort={{ key: "business", direction: "asc" }}
      summary={`${records.length} ${records.length === 1 ? "business" : "businesses"}`}
    />
  );
}

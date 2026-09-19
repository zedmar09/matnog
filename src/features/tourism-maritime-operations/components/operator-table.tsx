"use client";

import Link from "next/link";

import { EllipsisVertical, Eye, Pencil, Trash2 } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import type { TourismOperator } from "../types/tourism-records";

export function OperatorTable({
  records,
  onDelete,
}: {
  records: readonly TourismOperator[];
  onDelete: (record: TourismOperator) => void;
}) {
  const columns: DataTableColumn<TourismOperator>[] = [
    {
      key: "id",
      header: "Operator ID",
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/tourism/operators/${row.id}`}>
          {row.id}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Operator",
      className: "ops-wide-cell",
      sortValue: (row) => row.name,
      cell: (row) => (
        <>
          <strong>{row.name}</strong>
          <small>{row.contactPerson}</small>
        </>
      ),
    },
    {
      key: "permit",
      header: "Business permit",
      sortValue: (row) => row.businessPermit,
      cell: (row) => row.businessPermit,
    },
    {
      key: "accreditation",
      header: "Accreditation",
      className: "ops-wide-cell",
      sortValue: (row) => row.accreditationNumber,
      cell: (row) => (
        <>
          <strong>{row.accreditationNumber}</strong>
          <small>Valid until {row.accreditationValidUntil}</small>
        </>
      ),
    },
    {
      key: "vessels",
      header: "Vessels",
      sortValue: (row) => row.vessels.length,
      cell: (row) => String(row.vessels.length),
    },
    { key: "crew", header: "Crew", sortValue: (row) => row.crew.length, cell: (row) => String(row.crew.length) },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => (
        <StatusBadge tone={row.status === "eligible" ? "success" : "warning"}>
          {row.status === "eligible" ? "Eligible" : "Needs attention"}
        </StatusBadge>
      ),
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
              <Link href={`/ops/tourism/operators/${row.id}`}>
                <Eye size={14} />
                Open operator
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/tourism/operators/${row.id}/edit`}>
                <Pencil size={14} />
                Edit operator
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(row)}>
              <Trash2 size={14} />
              Delete operator
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
      initialSort={{ key: "name", direction: "asc" }}
      summary={`${records.length} ${records.length === 1 ? "operator" : "operators"}`}
    />
  );
}

"use client";

import Link from "next/link";

import { EllipsisVertical, Eye, Pencil, Trash2 } from "lucide-react";

import type { DataTableColumn } from "@/shared/components/data-table";
import { DataTable } from "@/shared/components/data-table";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import type { BenefitLedgerEntry, BenefitLedgerStatus } from "../types/sectoral-assistance";

const LEDGER_TONE: Record<BenefitLedgerStatus, StatusTone> = {
  Released: "success",
  "Pending confirmation": "pending",
  Cancelled: "neutral",
};

export function LedgerTable({
  records,
  onDelete,
}: {
  records: readonly BenefitLedgerEntry[];
  onDelete: (record: BenefitLedgerEntry) => void;
}) {
  const columns: DataTableColumn<BenefitLedgerEntry>[] = [
    {
      key: "id",
      header: "Ledger entry",
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/assistance/ledger/${row.id}`}>
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
          <small>{row.recipient}</small>
        </>
      ),
    },
    {
      key: "program",
      header: "Program",
      className: "ops-wide-cell ops-clamp-cell",
      sortValue: (row) => row.program,
      cell: (row) => row.program,
    },
    {
      key: "period",
      header: "Period",
      className: "ops-nowrap-cell",
      sortValue: (row) => row.period,
      cell: (row) => row.period,
    },
    {
      key: "value",
      header: "Benefit / value",
      className: "ops-wide-cell ops-clamp-cell",
      sortValue: (row) => row.value,
      cell: (row) => row.value,
    },
    {
      key: "fund",
      header: "Fund source",
      className: "ops-wide-cell ops-clamp-cell",
      sortValue: (row) => row.fundSource,
      cell: (row) => row.fundSource,
    },
    {
      key: "status",
      header: "Status",
      className: "ops-status-cell",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge tone={LEDGER_TONE[row.status]}>{row.status}</StatusBadge>,
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
              <Link href={`/ops/assistance/ledger/${row.id}`}>
                <Eye size={14} aria-hidden="true" />
                Open entry
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/assistance/ledger/${row.id}/edit`}>
                <Pencil size={14} aria-hidden="true" />
                Edit entry
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(row)} className="text-destructive">
              <Trash2 size={14} aria-hidden="true" />
              Delete entry
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
      summary={`${records.length} ${records.length === 1 ? "ledger entry" : "ledger entries"}`}
    />
  );
}

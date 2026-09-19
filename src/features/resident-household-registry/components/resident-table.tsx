"use client";

import Link from "next/link";

import { BadgeCheck, EllipsisVertical, HeartOff, LogOut, Mars, Pencil, UserRoundX, Venus } from "lucide-react";

import type { DataTableColumn } from "@/shared/components/data-table";
import { DataTable } from "@/shared/components/data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import type { RegistryDirectoryRow } from "../services/registry-repository";
import { ageOn, fullName } from "../services/registry-rules";

const LIFE_TONE = { living: "success", deceased: "neutral", "moved-out": "warning" } as const;

/**
 * A verified person carries the check beside their name, the way a verified
 * account is marked elsewhere. The freshness badge stays in its own column.
 */
function NameCell({ row }: { row: RegistryDirectoryRow }) {
  return (
    <span className="registry-name-cell">
      <strong>{fullName(row.person)}</strong>
      {row.person.verification.state === "verified" ? (
        <BadgeCheck size={15} className="registry-verified-mark" aria-label="Verified resident" />
      ) : null}
    </span>
  );
}

export function ResidentTable({ rows, now }: { rows: readonly RegistryDirectoryRow[]; now: string }) {
  const columns: DataTableColumn<RegistryDirectoryRow>[] = [
    {
      key: "id",
      header: "Person ID",
      sortValue: (row) => row.person.envelope.id,
      cell: (row) => row.person.envelope.id,
    },
    {
      key: "name",
      header: "Name",
      sortValue: (row) => fullName(row.person),
      cell: (row) => <NameCell row={row} />,
    },
    {
      key: "age",
      header: "Age",
      className: "ops-numeric-cell",
      sortValue: (row) => ageOn(row.person, now),
      cell: (row) => ageOn(row.person, now),
    },
    {
      key: "sex",
      header: "Gender",
      sortValue: (row) => row.person.sex,
      cell: (row) =>
        row.person.sex === "female" ? (
          <span className="registry-sex-cell">
            <Venus size={14} aria-hidden="true" />
            Female
          </span>
        ) : (
          <span className="registry-sex-cell">
            <Mars size={14} aria-hidden="true" />
            Male
          </span>
        ),
    },
    {
      key: "civilStatus",
      header: "Civil status",
      sortValue: (row) => row.person.civilStatus,
      cell: (row) => row.person.civilStatus,
    },
    {
      key: "barangay",
      header: "Current barangay",
      className: "ops-group-cell",
      sortValue: (row) => row.barangayLabel ?? "",
      cell: (row) => row.barangayLabel ?? "No open residency",
    },
    {
      key: "status",
      header: "Record status",
      className: "ops-status-cell",
      sortValue: (row) => row.person.envelope.status,
      cell: (row) => <StatusBadge tone={LIFE_TONE[row.person.lifeStatus]}>{row.person.envelope.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) => {
        const id = row.person.envelope.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${id}`}>
              <EllipsisVertical size={16} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ops-row-menu-content">
              <DropdownMenuItem asChild>
                <Link href={`/ops/residents/${id}`}>
                  <UserRoundX size={14} aria-hidden="true" />
                  View profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/residents/${id}/edit`}>
                  <Pencil size={14} aria-hidden="true" />
                  Edit profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/ops/residents/${id}#life-events`}>
                  <LogOut size={14} aria-hidden="true" />
                  Moved out
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/residents/${id}#life-events`}>
                  <HeartOff size={14} aria-hidden="true" />
                  Deceased
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.person.envelope.id}
      pageSize={12}
      summary={`${rows.length} ${rows.length === 1 ? "person" : "people"} in your assigned scope`}
    />
  );
}

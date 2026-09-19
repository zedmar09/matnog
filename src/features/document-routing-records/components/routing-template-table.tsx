"use client";

import Link from "next/link";

import { EllipsisVertical, Eye, Trash2 } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import type { RoutingTemplate } from "../types/document-routing";

export function RoutingTemplateTable({
  records,
  onDelete,
}: {
  records: readonly RoutingTemplate[];
  onDelete: (record: RoutingTemplate) => void;
}) {
  const columns: DataTableColumn<RoutingTemplate>[] = [
    {
      key: "name",
      header: "Template",
      className: "ops-wide-cell",
      sortValue: (row) => row.name,
      cell: (row) => (
        <>
          <Link className="registry-member-link" href={`/ops/routing/templates/${row.id}`}>
            {row.name}
          </Link>
          <small>{row.id}</small>
        </>
      ),
    },
    {
      key: "version",
      header: "Version",
      sortValue: (row) => row.version,
      cell: (row) => (row.version > 0 ? `v${row.version}` : "Not published"),
    },
    {
      key: "mode",
      header: "Routing mode",
      sortValue: (row) => row.mode,
      cell: (row) => <span className="capitalize">{row.mode}</span>,
    },
    {
      key: "stages",
      header: "Stages",
      sortValue: (row) => row.stages.length,
      cell: (row) => `${row.stages.length} ${row.stages.length === 1 ? "stage" : "stages"}`,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge tone={row.status === "active" ? "success" : "pending"}>{row.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${row.name}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/routing/templates/${row.id}`}>
                <Eye size={14} />
                Open template
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(row)}>
              <Trash2 size={14} />
              Delete template
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
      summary={`${records.length} routing ${records.length === 1 ? "template" : "templates"}`}
    />
  );
}

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
import { formatDemoDate } from "@/shared/data/demo-clock";

import type { CertificateTemplateVersion } from "../types/certificate-records";

/** "Retired" is the inactive state: it stays on file but cannot be signed against. */
const STATUS: Record<CertificateTemplateVersion["status"], { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "success" },
  retired: { label: "Inactive", tone: "neutral" },
  restricted: { label: "Restricted", tone: "destructive" },
};

export function CertificateTemplateTable({
  templates,
  inUse,
  onDelete,
}: {
  templates: readonly CertificateTemplateVersion[];
  /** Version ids frozen into an issuance, which cannot be deleted. */
  inUse: readonly string[];
  onDelete: (template: CertificateTemplateVersion) => void;
}) {
  const columns: DataTableColumn<CertificateTemplateVersion>[] = [
    {
      key: "id",
      header: "Template",
      sortValue: (row) => row.envelope.id,
      cell: (row) => (
        <Link className="registry-member-link" href={`/ops/certificates/templates/${row.envelope.id}`}>
          {row.envelope.id}
        </Link>
      ),
    },
    {
      key: "label",
      header: "Prints as",
      sortValue: (row) => row.certificateTypeLabel,
      cell: (row) => (
        <>
          <strong>{row.certificateTypeLabel}</strong>
          <small>Version {row.version}</small>
        </>
      ),
    },
    {
      key: "signatory",
      header: "Signatory",
      className: "ops-wide-cell ops-nowrap-cell",
      sortValue: (row) => row.signatoryRole,
      cell: (row) => row.signatoryRole,
    },
    {
      key: "serial",
      header: "Next serial",
      className: "ops-wide-cell ops-nowrap-cell",
      sortValue: (row) => row.nextSerialSequence,
      cell: (row) => `${row.serialPrefix}-2026-${String(row.nextSerialSequence).padStart(4, "0")}`,
    },
    {
      key: "effective",
      header: "Effective from",
      className: "ops-nowrap-cell",
      sortValue: (row) => row.effectiveFrom,
      cell: (row) => formatDemoDate(`${row.effectiveFrom}T00:00:00+08:00`),
    },
    {
      key: "status",
      header: "Status",
      className: "ops-status-cell",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge tone={STATUS[row.status].tone}>{STATUS[row.status].label}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) => {
        const id = row.envelope.id;
        const frozen = inUse.includes(id);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${id}`}>
              <EllipsisVertical size={16} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ops-row-menu-content">
              <DropdownMenuItem asChild>
                <Link href={`/ops/certificates/templates/${id}`}>
                  <Eye size={14} aria-hidden="true" />
                  View layout
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/certificates/templates/${id}/edit`}>
                  <Pencil size={14} aria-hidden="true" />
                  Update template
                </Link>
              </DropdownMenuItem>
              {!frozen && (
                <DropdownMenuItem onSelect={() => onDelete(row)}>
                  <Trash2 size={14} aria-hidden="true" />
                  Delete template
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={templates}
      getRowKey={(row) => row.envelope.id}
      pageSize={10}
      initialSort={{ key: "effective", direction: "desc" }}
      summary={`${templates.length} ${templates.length === 1 ? "version" : "versions"}, ${
        templates.filter((item) => item.status === "active").length
      } active`}
    />
  );
}

export { STATUS as TEMPLATE_STATUS };

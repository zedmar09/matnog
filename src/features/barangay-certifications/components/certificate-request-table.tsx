"use client";

import type { DataTableColumn } from "@/shared/components/data-table";
import { DataTable } from "@/shared/components/data-table";
import type { FieldError } from "@/shared/components/error-summary";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { formatDemoDate } from "@/shared/data/demo-clock";
import { formatStatusLabel } from "@/shared/lib/utils";
import type { WorkspaceRole } from "@/shared/providers/workspace-session-provider";

import type { CertificateWorkspaceRecord } from "../types/certificate-records";
import { CertificateRowActions } from "./certificate-row-actions";

/**
 * A status reads as its own tone so the queue is scannable without opening a
 * row. Anything still moving through review stays "pending".
 */
const STATUS_TONE: Record<string, StatusTone> = {
  issued: "success",
  revoked: "destructive",
  blocked: "destructive",
  returned: "warning",
  "payment-exception": "warning",
  draft: "neutral",
};

export function CertificateRequestTable({
  records,
  role,
  onUpdated,
  onFailed,
}: {
  records: readonly CertificateWorkspaceRecord[];
  role: WorkspaceRole;
  /** Receives the updated record so the queue can apply it in place. */
  onUpdated: (record: CertificateWorkspaceRecord, message: string) => void;
  onFailed: (errors: FieldError[]) => void;
}) {
  const columns: DataTableColumn<CertificateWorkspaceRecord>[] = [
    {
      key: "reference",
      header: "Reference",
      sortValue: (row) => row.request.envelope.id,
      cell: (row) => row.request.envelope.id,
    },
    {
      key: "type",
      header: "Document type",
      sortValue: (row) => row.request.certificateTypeLabel,
      cell: (row) => <strong>{row.request.certificateTypeLabel}</strong>,
    },
    {
      key: "subject",
      header: "Subject",
      sortValue: (row) => row.request.subjectLabel,
      cell: (row) => row.request.subjectLabel,
    },
    {
      key: "barangay",
      header: "Barangay",
      className: "ops-group-cell ops-nowrap-cell",
      sortValue: (row) => row.request.barangayLabel,
      cell: (row) => row.request.barangayLabel,
    },
    {
      key: "purpose",
      header: "Purpose",
      className: "ops-group-cell ops-clamp-cell",
      sortValue: (row) => row.request.purpose,
      cell: (row) => row.request.purpose,
    },
    {
      key: "submitted",
      header: "Submitted",
      className: "ops-nowrap-cell",
      sortValue: (row) => row.request.envelope.createdAt,
      cell: (row) => formatDemoDate(row.request.envelope.createdAt),
    },
    {
      key: "status",
      header: "Status",
      className: "ops-status-cell",
      sortValue: (row) => row.request.status,
      cell: (row) => (
        <StatusBadge tone={STATUS_TONE[row.request.status] ?? "pending"}>
          {formatStatusLabel(row.request.status)}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) => <CertificateRowActions record={row} role={role} onUpdated={onUpdated} onFailed={onFailed} />,
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={records}
      getRowKey={(row) => row.request.envelope.id}
      pageSize={12}
      summary={`${records.length} ${records.length === 1 ? "request" : "requests"} in your assigned scope`}
    />
  );
}

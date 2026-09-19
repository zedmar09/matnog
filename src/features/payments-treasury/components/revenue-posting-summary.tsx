import { BookOpenCheck } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { NoticePanel } from "@/shared/components/notice-panel";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";

import { revenuePostingProjections } from "../services/payment-adapters";
import { formatPhp } from "../services/payment-presentation";
import type { PaymentLedgerRecord, RevenuePostingReadiness, RevenuePostingSummary } from "../types/payment-treasury";

const POSTING_TONES: Record<RevenuePostingReadiness, StatusTone> = {
  "ready-for-mapping": "success",
  "held-reconciliation": "warning",
  "held-unallocated": "warning",
  "held-adjustment": "destructive",
  "excluded-private-payee": "neutral",
};

const COLUMNS: DataTableColumn<RevenuePostingSummary>[] = [
  {
    key: "source",
    header: "Source / collection",
    cell: (row) => (
      <>
        <strong>{row.serviceReference}</strong>
        <small>
          {row.moduleId} · {row.collectionId}
        </small>
      </>
    ),
  },
  {
    key: "amount",
    header: "Gross / unallocated",
    cell: (row) => (
      <>
        <strong>{formatPhp(row.grossAmount.minorUnits)}</strong>
        <small>{formatPhp(row.unallocatedAmount.minorUnits)} unallocated</small>
      </>
    ),
  },
  {
    key: "mapping",
    header: "Sample mapping",
    cell: (row) => (
      <>
        <span>{row.mappingLabel}</span>
        <small>{row.postingReference}</small>
      </>
    ),
  },
  {
    key: "status",
    header: "Posting preview",
    cell: (row) => (
      <>
        <StatusBadge tone={POSTING_TONES[row.readiness]}>{row.readinessLabel}</StatusBadge>
        <small>{row.reason}</small>
      </>
    ),
  },
];

export function RevenuePostingSummaryPanel({ records }: { records: readonly PaymentLedgerRecord[] }) {
  const rows = revenuePostingProjections(records);
  const ready = rows.filter((row) => row.readiness === "ready-for-mapping").length;
  const gross = rows.reduce((sum, row) => sum + row.grossAmount.minorUnits, 0);
  return (
    <ContentPanel as="section" className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">M14 adapter · read-only projection</span>
          <h2 className="mt-1">Revenue posting preview</h2>
          <p className="muted mt-2">Confirmed M06 collections prepared for a later account-mapping review.</p>
        </div>
        <StatusBadge tone={ready === rows.length ? "success" : "warning"}>
          {ready} of {rows.length} ready
        </StatusBadge>
      </div>
      <NoticePanel className="my-5" icon={<BookOpenCheck size={18} />}>
        This adapter creates no journal entry, chart-of-account code, cash release, or accounting approval. M14 remains
        the owner of mapping and posting decisions.
      </NoticePanel>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <span className="text-muted-foreground text-xs">Confirmed collection gross</span>
          <strong className="mt-1 block text-xl">{formatPhp(gross)}</strong>
        </div>
        <div className="rounded-xl border p-4">
          <span className="text-muted-foreground text-xs">Ready for mapping review</span>
          <strong className="mt-1 block text-xl">{ready}</strong>
        </div>
        <div className="rounded-xl border p-4">
          <span className="text-muted-foreground text-xs">Held or excluded</span>
          <strong className="mt-1 block text-xl">{rows.length - ready}</strong>
        </div>
      </div>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.postingReference}
        summary={`${rows.length} local M14 posting preview rows; no accounting entries created`}
      />
    </ContentPanel>
  );
}

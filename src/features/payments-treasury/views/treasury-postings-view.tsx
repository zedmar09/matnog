"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { Ban, CheckCircle2, CircleDollarSign, Clock3, EllipsisVertical, Eye, SearchX } from "lucide-react";

import { TreasurySummaryCards } from "@/features/payments-treasury/components/treasury-summary-cards";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { revenuePostingProjections } from "../services/payment-adapters";
import { paymentLedgerRepository } from "../services/payment-ledger";
import { displayFinancialReference, formatPhp } from "../services/payment-presentation";
import type { RevenuePostingReadiness, RevenuePostingSummary } from "../types/payment-treasury";

function postingTone(readiness: RevenuePostingReadiness): StatusTone {
  if (readiness === "ready-for-mapping") return "success";
  if (readiness === "excluded-private-payee") return "neutral";
  if (readiness === "held-adjustment") return "destructive";
  return "warning";
}

export function TreasuryPostingsView() {
  const { role } = useWorkspaceSession();
  const [query, setQuery] = useState("");
  const [readiness, setReadiness] = useState("");
  const allRows = useMemo(() => revenuePostingProjections(paymentLedgerRepository.list()), []);

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return allRows.filter((posting) => {
      const haystack =
        `${posting.postingReference} ${posting.collectionId} ${posting.serviceReference} ${posting.payeeLabel} ${posting.mappingLabel}`.toLocaleLowerCase();
      return (!readiness || posting.readiness === readiness) && (!normalized || haystack.includes(normalized));
    });
  }, [allRows, query, readiness]);

  const totals = allRows.reduce(
    (sum, posting) => ({
      gross: sum.gross + posting.grossAmount.minorUnits,
      ready: sum.ready + (posting.readiness === "ready-for-mapping" ? 1 : 0),
      held:
        sum.held +
        ((["held-reconciliation", "held-unallocated", "held-adjustment"] as RevenuePostingReadiness[]).includes(
          posting.readiness,
        )
          ? 1
          : 0),
      excluded: sum.excluded + (posting.readiness === "excluded-private-payee" ? 1 : 0),
    }),
    { gross: 0, ready: 0, held: 0, excluded: 0 },
  );

  const columns: DataTableColumn<RevenuePostingSummary>[] = [
    {
      key: "reference",
      header: "Posting reference",
      sortValue: (row) => row.postingReference,
      cell: (row) => (
        <>
          <strong>{displayFinancialReference(row.postingReference)}</strong>
          <small>{displayFinancialReference(row.collectionId)}</small>
        </>
      ),
    },
    {
      key: "source",
      header: "Service and payee",
      className: "ops-wide-cell",
      sortValue: (row) => row.serviceReference,
      cell: (row) => (
        <>
          <strong>{row.serviceReference}</strong>
          <small>{row.payeeLabel}</small>
        </>
      ),
    },
    {
      key: "amount",
      header: "Gross / unallocated",
      sortValue: (row) => row.grossAmount.minorUnits,
      cell: (row) => (
        <>
          <strong>{formatPhp(row.grossAmount.minorUnits)}</strong>
          <small>{formatPhp(row.unallocatedAmount.minorUnits)} unallocated</small>
        </>
      ),
    },
    {
      key: "mapping",
      header: "Account mapping",
      className: "ops-wide-cell",
      sortValue: (row) => row.mappingLabel,
      cell: (row) => (
        <>
          <strong>{row.mappingLabel}</strong>
          <small>{row.reason}</small>
        </>
      ),
    },
    {
      key: "readiness",
      header: "Readiness",
      sortValue: (row) => row.readiness,
      cell: (row) => <StatusBadge tone={postingTone(row.readiness)}>{row.readinessLabel}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ops-row-menu"
            aria-label={`Actions for ${displayFinancialReference(row.postingReference)}`}
          >
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/treasury/collections/${row.collectionId}`}>
                <Eye size={14} />
                Open collection
              </Link>
            </DropdownMenuItem>
            {row.settlementId && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/treasury/reconciliation/${row.settlementId}`}>Open settlement</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Treasury postings require municipal access"
        description="Revenue mapping readiness is available to authorized municipal treasury staff."
      />
    );
  }

  const filtering = Boolean(query || readiness);

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Postings</h1>
          <p>Review which collections are ready for account mapping and which records still require action.</p>
        </div>
      </div>

      <TreasurySummaryCards
        label="Posting readiness totals"
        items={[
          {
            label: "Gross collections",
            value: formatPhp(totals.gross),
            recordLabel: `${allRows.length} records`,
            icon: CircleDollarSign,
          },
          { label: "Ready", value: totals.ready, recordLabel: "records", icon: CheckCircle2 },
          { label: "Held", value: totals.held, recordLabel: "records", icon: Clock3 },
          { label: "Excluded", value: totals.excluded, recordLabel: "records", icon: Ban },
        ]}
      />

      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Posting, collection, service, or payee…" />
        <OpsFilter
          label="Readiness"
          value={readiness}
          onChange={setReadiness}
          anyLabel="Any readiness"
          width={220}
          options={[
            { value: "ready-for-mapping", label: "Ready for mapping" },
            { value: "held-reconciliation", label: "Held for reconciliation" },
            { value: "held-unallocated", label: "Held for allocation" },
            { value: "held-adjustment", label: "Held for adjustment" },
            { value: "excluded-private-payee", label: "Excluded private payee" },
          ]}
        />
      </div>

      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.postingReference}
          initialSort={{ key: "reference", direction: "desc" }}
          summary={`${rows.length} posting records`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title={filtering ? "No postings match these filters" : "No posting records available"}
          description={
            filtering
              ? "Change the search or readiness filter to return to the posting register."
              : "Confirmed collections will appear here when posting readiness can be evaluated."
          }
        />
      )}
    </>
  );
}

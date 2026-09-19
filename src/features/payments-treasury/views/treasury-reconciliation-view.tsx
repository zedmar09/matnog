"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { AlertTriangle, Banknote, CircleDollarSign, EllipsisVertical, Eye, Landmark, SearchX } from "lucide-react";

import { MoneyStatusBadge } from "@/features/payments-treasury/components/money-status-badge";
import { TreasurySummaryCards } from "@/features/payments-treasury/components/treasury-summary-cards";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { paymentLedgerRepository } from "../services/payment-ledger";
import { displayFinancialReference, formatPhp } from "../services/payment-presentation";
import type { PaymentLedgerRecord, TreasurySettlement } from "../types/payment-treasury";

type SettlementRow = { record: PaymentLedgerRecord; settlement: TreasurySettlement };

function settlementRows(records: readonly PaymentLedgerRecord[]): SettlementRow[] {
  return records
    .flatMap((record) => record.lifecycle.settlements.map((settlement) => ({ record, settlement })))
    .sort((left, right) => right.settlement.periodTo.localeCompare(left.settlement.periodTo));
}

function signedPhp(minorUnits: number): string {
  if (minorUnits === 0) return formatPhp(0);
  return `${minorUnits > 0 ? "+" : "−"}${formatPhp(Math.abs(minorUnits))}`;
}

export function TreasuryReconciliationView() {
  const { role } = useWorkspaceSession();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const allRows = useMemo(() => settlementRows(paymentLedgerRepository.list()), []);

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return allRows.filter(({ record, settlement }) => {
      const assessment = record.lifecycle.assessment;
      const haystack =
        `${settlement.envelope.id} ${settlement.providerLabel} ${assessment.payer.label} ${assessment.serviceReference} ${settlement.sampleBankReference ?? ""}`.toLocaleLowerCase();
      return (!status || settlement.status === status) && (!normalized || haystack.includes(normalized));
    });
  }, [allRows, query, status]);

  const totals = allRows.reduce(
    (sum, row) => ({
      gross: sum.gross + row.settlement.grossAmount.minorUnits,
      charges: sum.charges + row.settlement.providerCharge.minorUnits,
      net: sum.net + row.settlement.netAmount.minorUnits,
      bank: sum.bank + row.settlement.bankCreditAmount.minorUnits,
      review: sum.review + (row.settlement.status === "matched" ? 0 : 1),
    }),
    { gross: 0, charges: 0, net: 0, bank: 0, review: 0 },
  );

  const columns: DataTableColumn<SettlementRow>[] = [
    {
      key: "settlement",
      header: "Settlement",
      sortValue: (row) => row.settlement.periodTo,
      cell: ({ settlement }) => (
        <>
          <Link className="registry-member-link" href={`/ops/treasury/reconciliation/${settlement.envelope.id}`}>
            {displayFinancialReference(settlement.envelope.reference)}
          </Link>
          <small>{settlement.providerLabel}</small>
        </>
      ),
    },
    {
      key: "source",
      header: "Payer and service",
      className: "ops-wide-cell",
      sortValue: (row) => row.record.lifecycle.assessment.payer.label,
      cell: ({ record }) => (
        <>
          <strong>{record.lifecycle.assessment.payer.label}</strong>
          <small>{record.lifecycle.assessment.serviceReference}</small>
        </>
      ),
    },
    {
      key: "bank",
      header: "Period and bank reference",
      className: "ops-wide-cell",
      sortValue: (row) => row.settlement.periodTo,
      cell: ({ settlement }) => (
        <>
          <strong>
            {settlement.periodFrom === settlement.periodTo
              ? settlement.periodTo
              : `${settlement.periodFrom}–${settlement.periodTo}`}
          </strong>
          <small>{displayFinancialReference(settlement.sampleBankReference ?? "Bank reference pending")}</small>
        </>
      ),
    },
    {
      key: "amount",
      header: "Net / bank credit",
      sortValue: (row) => row.settlement.netAmount.minorUnits,
      cell: ({ settlement }) => (
        <>
          <strong>{formatPhp(settlement.netAmount.minorUnits)}</strong>
          <small>{formatPhp(settlement.bankCreditAmount.minorUnits)} credited</small>
        </>
      ),
    },
    {
      key: "difference",
      header: "Difference",
      sortValue: (row) => row.settlement.bankCreditAmount.minorUnits - row.settlement.netAmount.minorUnits,
      cell: ({ settlement }) => signedPhp(settlement.bankCreditAmount.minorUnits - settlement.netAmount.minorUnits),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.settlement.status,
      cell: ({ settlement }) => <MoneyStatusBadge state={{ kind: "settlement", status: settlement.status }} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: ({ settlement }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ops-row-menu"
            aria-label={`Actions for ${displayFinancialReference(settlement.envelope.reference)}`}
          >
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/treasury/reconciliation/${settlement.envelope.id}`}>
                <Eye size={14} />
                Open settlement
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Treasury reconciliation requires municipal access"
        description="Provider and bank comparisons are available to authorized municipal treasury staff."
      />
    );
  }

  const filtering = Boolean(query || status);

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Reconciliation</h1>
          <p>Compare provider settlements with bank credits and resolve financial exceptions.</p>
        </div>
      </div>

      <TreasurySummaryCards
        label="Settlement totals"
        items={[
          {
            label: "Provider gross",
            value: formatPhp(totals.gross),
            recordLabel: `${allRows.length} records`,
            icon: Banknote,
          },
          {
            label: "Provider charges",
            value: formatPhp(totals.charges),
            recordLabel: `${allRows.length} records`,
            icon: CircleDollarSign,
          },
          {
            label: "Expected net",
            value: formatPhp(totals.net),
            recordLabel: `${allRows.length} records`,
            icon: Landmark,
          },
          {
            label: "Net difference",
            value: signedPhp(totals.bank - totals.net),
            recordLabel: `${totals.review} to review`,
            icon: AlertTriangle,
          },
        ]}
      />

      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Settlement, payer, service, or bank reference…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={[
            { value: "exception", label: "Exception" },
            { value: "partially-matched", label: "Partially matched" },
            { value: "matched", label: "Matched" },
          ]}
        />
      </div>

      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.settlement.envelope.id}
          initialSort={{ key: "settlement", direction: "desc" }}
          summary={`${rows.length} settlement ${rows.length === 1 ? "record" : "records"}`}
        />
      ) : (
        <EmptyState
          icon={filtering ? SearchX : Landmark}
          title={filtering ? "No settlements match your filters." : "No settlements are available."}
          description={
            filtering ? "Adjust the search or clear the filters." : "Provider settlement records appear here."
          }
          action={
            filtering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStatus("");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}
    </>
  );
}

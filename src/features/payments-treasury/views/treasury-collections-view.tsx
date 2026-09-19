"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Banknote,
  CircleDollarSign,
  EllipsisVertical,
  Eye,
  Plus,
  ReceiptText,
  RotateCcw,
  SearchX,
  WalletCards,
} from "lucide-react";

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
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { paymentLedgerRepository } from "../services/payment-ledger";
import { displayFinancialReference, formatPhp, PAYMENT_CHANNEL_LABELS } from "../services/payment-presentation";
import type { ConfirmedCollection, GovernmentReceipt, PaymentLedgerRecord } from "../types/payment-treasury";

type CollectionRow = {
  record: PaymentLedgerRecord;
  collection: ConfirmedCollection;
  receipt?: GovernmentReceipt;
};

function buildRows(records: readonly PaymentLedgerRecord[]): CollectionRow[] {
  return records
    .flatMap((record) =>
      record.lifecycle.collections.map((collection) => ({
        record,
        collection,
        receipt: record.lifecycle.receipts.find((receipt) => receipt.collectionId === collection.envelope.id),
      })),
    )
    .sort((left, right) => right.collection.confirmedAt.localeCompare(left.collection.confirmedAt));
}

export function TreasuryCollectionsView() {
  const { role } = useWorkspaceSession();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const allRows = useMemo(() => buildRows(paymentLedgerRepository.list()), []);

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return allRows.filter(({ record, collection, receipt }) => {
      const assessment = record.lifecycle.assessment;
      const haystack =
        `${collection.envelope.id} ${collection.confirmationEventId} ${assessment.envelope.reference} ${assessment.serviceReference} ${assessment.payer.label} ${assessment.payee.label} ${receipt?.receiptNumber ?? ""}`.toLocaleLowerCase();
      const statusMatches =
        !status ||
        (status === "attention"
          ? collection.status !== "allocated" || collection.unallocatedAmount.minorUnits > 0
          : collection.status === status);
      return (
        (!normalized || haystack.includes(normalized)) && statusMatches && (!channel || collection.channel === channel)
      );
    });
  }, [allRows, channel, query, status]);

  const totals = allRows.reduce(
    (sum, row) => ({
      gross: sum.gross + row.collection.grossAmount.minorUnits,
      allocated: sum.allocated + row.collection.allocatedAmount.minorUnits,
      unallocated: sum.unallocated + row.collection.unallocatedAmount.minorUnits,
      unallocatedRecords: sum.unallocatedRecords + (row.collection.unallocatedAmount.minorUnits > 0 ? 1 : 0),
      receipts: sum.receipts + (row.receipt ? 1 : 0),
      receiptAmount: sum.receiptAmount + (row.receipt?.amount.minorUnits ?? 0),
    }),
    { gross: 0, allocated: 0, unallocated: 0, unallocatedRecords: 0, receipts: 0, receiptAmount: 0 },
  );

  const columns: DataTableColumn<CollectionRow>[] = [
    {
      key: "collection",
      header: "Collection",
      sortValue: (row) => row.collection.confirmedAt,
      cell: ({ collection, receipt }) => (
        <>
          <Link className="registry-member-link" href={`/ops/treasury/collections/${collection.envelope.id}`}>
            {displayFinancialReference(collection.envelope.reference)}
          </Link>
          <small>{receipt ? displayFinancialReference(receipt.receiptNumber) : "Receipt pending"}</small>
        </>
      ),
    },
    {
      key: "payer",
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
      key: "date",
      header: "Date and channel",
      className: "ops-wide-cell",
      sortValue: (row) => row.collection.confirmedAt,
      cell: ({ collection }) => (
        <>
          <strong>{formatDemoDateTime(collection.confirmedAt)}</strong>
          <small>{PAYMENT_CHANNEL_LABELS[collection.channel]}</small>
        </>
      ),
    },
    {
      key: "amount",
      header: "Gross / allocated",
      sortValue: (row) => row.collection.grossAmount.minorUnits,
      cell: ({ collection }) => (
        <>
          <strong>{formatPhp(collection.grossAmount.minorUnits)}</strong>
          <small>{formatPhp(collection.allocatedAmount.minorUnits)} allocated</small>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.collection.status,
      cell: ({ collection }) => <MoneyStatusBadge state={{ kind: "collection", status: collection.status }} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: ({ collection, receipt }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ops-row-menu"
            aria-label={`Actions for ${displayFinancialReference(collection.envelope.reference)}`}
          >
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/treasury/collections/${collection.envelope.id}`}>
                <Eye size={14} />
                Open collection
              </Link>
            </DropdownMenuItem>
            {receipt && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/treasury/receipts/${receipt.envelope.id}`}>
                  <ReceiptText size={14} />
                  Open receipt
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={`/ops/treasury/adjustments/new?collectionId=${collection.envelope.id}`}>
                <RotateCcw size={14} />
                Request adjustment
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
        title="Treasury collections require municipal access"
        description="Municipality-wide collection records are available to authorized treasury staff."
      />
    );
  }

  const filtering = Boolean(query || status || channel);

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Collections</h1>
          <p>Review confirmed payments, allocations, receipts, and linked transaction records.</p>
        </div>
        <Button asChild>
          <Link href="/ops/treasury/collections/new">
            <Plus /> Record collection
          </Link>
        </Button>
      </div>

      <TreasurySummaryCards
        label="Collection totals"
        items={[
          {
            label: "Gross collections",
            value: formatPhp(totals.gross),
            recordLabel: `${allRows.length} records`,
            icon: Banknote,
          },
          {
            label: "Allocated",
            value: formatPhp(totals.allocated),
            recordLabel: `${allRows.length} records`,
            icon: CircleDollarSign,
          },
          {
            label: "Unallocated",
            value: formatPhp(totals.unallocated),
            recordLabel: `${totals.unallocatedRecords} records`,
            icon: WalletCards,
          },
          {
            label: "Issued receipts",
            value: formatPhp(totals.receiptAmount),
            recordLabel: `${totals.receipts} receipts`,
            icon: ReceiptText,
          },
        ]}
      />

      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Collection, receipt, payer, or service…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={[
            { value: "allocated", label: "Allocated" },
            { value: "partially-allocated", label: "Partially allocated" },
            { value: "refunded", label: "Refunded" },
            { value: "charged-back", label: "Charged back" },
            { value: "attention", label: "Needs attention" },
          ]}
        />
        <OpsFilter
          label="Channel"
          value={channel}
          onChange={setChannel}
          anyLabel="Any channel"
          options={[
            { value: "cashier", label: "Cashier counter" },
            { value: "mock-e-wallet", label: "GCash / e-wallet" },
            { value: "mock-bank", label: "Online bank transfer" },
          ]}
        />
      </div>

      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.collection.envelope.id}
          initialSort={{ key: "collection", direction: "desc" }}
          summary={`${rows.length} collection ${rows.length === 1 ? "record" : "records"}`}
        />
      ) : (
        <EmptyState
          icon={filtering ? SearchX : ReceiptText}
          title={filtering ? "No collections match your filters." : "No collections are available."}
          description={filtering ? "Adjust the search or clear the filters." : "Confirmed payment records appear here."}
          action={
            filtering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStatus("");
                  setChannel("");
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

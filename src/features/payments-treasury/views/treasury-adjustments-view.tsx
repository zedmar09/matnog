"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  EllipsisVertical,
  Eye,
  Plus,
  ReceiptText,
  SearchX,
  XCircle,
} from "lucide-react";

import { TreasurySummaryCards } from "@/features/payments-treasury/components/treasury-summary-cards";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
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
import { displayFinancialReference, formatPhp } from "../services/payment-presentation";
import type { PaymentAdjustment, PaymentLedgerRecord } from "../types/payment-treasury";

type AdjustmentRow = { record: PaymentLedgerRecord; adjustment: PaymentAdjustment };

function adjustmentRows(records: readonly PaymentLedgerRecord[]): AdjustmentRow[] {
  return records
    .flatMap((record) => record.adjustments.map((adjustment) => ({ record, adjustment })))
    .sort((left, right) => right.adjustment.requestedAt.localeCompare(left.adjustment.requestedAt));
}

function adjustmentTone(status: PaymentAdjustment["status"]): StatusTone {
  if (status === "completed" || status === "approved") return "success";
  if (status === "rejected" || status === "failed") return "destructive";
  if (status === "withdrawn") return "neutral";
  if (status === "processing") return "warning";
  return "pending";
}

export function TreasuryAdjustmentsView() {
  const { role } = useWorkspaceSession();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [allRows, setAllRows] = useState(() => adjustmentRows(paymentLedgerRepository.list()));
  const [withdrawing, setWithdrawing] = useState<PaymentAdjustment>();
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return allRows.filter(({ record, adjustment }) => {
      const assessment = record.lifecycle.assessment;
      const haystack =
        `${adjustment.envelope.id} ${adjustment.collectionId} ${assessment.payer.label} ${assessment.serviceReference} ${adjustment.reason}`.toLocaleLowerCase();
      return (
        (!status || adjustment.status === status) &&
        (!type || adjustment.type === type) &&
        (!normalized || haystack.includes(normalized))
      );
    });
  }, [allRows, query, status, type]);

  const totals = allRows.reduce(
    (sum, { adjustment }) => ({
      amount: sum.amount + adjustment.requestedAmount.minorUnits,
      open: sum.open + (["requested", "approved", "processing"].includes(adjustment.status) ? 1 : 0),
      completed: sum.completed + (adjustment.status === "completed" ? 1 : 0),
      closed: sum.closed + (["rejected", "failed", "withdrawn"].includes(adjustment.status) ? 1 : 0),
    }),
    { amount: 0, open: 0, completed: 0, closed: 0 },
  );

  const columns: DataTableColumn<AdjustmentRow>[] = [
    {
      key: "reference",
      header: "Adjustment",
      sortValue: (row) => row.adjustment.requestedAt,
      cell: ({ adjustment }) => (
        <>
          <Link className="registry-member-link" href={`/ops/treasury/adjustments/${adjustment.envelope.id}`}>
            {displayFinancialReference(adjustment.envelope.reference)}
          </Link>
          <small className="capitalize">{adjustment.type}</small>
        </>
      ),
    },
    {
      key: "request",
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
      key: "collection",
      header: "Collection",
      sortValue: (row) => row.adjustment.collectionId,
      cell: ({ adjustment }) => (
        <Link className="registry-member-link" href={`/ops/treasury/collections/${adjustment.collectionId}`}>
          {displayFinancialReference(adjustment.collectionId)}
        </Link>
      ),
    },
    {
      key: "date",
      header: "Requested",
      sortValue: (row) => row.adjustment.requestedAt,
      cell: ({ adjustment }) => (
        <>
          <strong>{formatDemoDateTime(adjustment.requestedAt)}</strong>
          <small>{adjustment.requestedBy}</small>
        </>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortValue: (row) => row.adjustment.requestedAmount.minorUnits,
      cell: ({ adjustment }) => <strong>{formatPhp(adjustment.requestedAmount.minorUnits)}</strong>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.adjustment.status,
      cell: ({ adjustment }) => (
        <StatusBadge tone={adjustmentTone(adjustment.status)}>
          <span className="capitalize">{adjustment.status}</span>
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: ({ adjustment }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ops-row-menu"
            aria-label={`Actions for ${displayFinancialReference(adjustment.envelope.reference)}`}
          >
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/treasury/adjustments/${adjustment.envelope.id}`}>
                <Eye size={14} />
                Open adjustment
              </Link>
            </DropdownMenuItem>
            {adjustment.status === "requested" && (
              <DropdownMenuItem onSelect={() => setWithdrawing(adjustment)}>
                <XCircle size={14} />
                Withdraw request
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
        title="Treasury adjustments require municipal access"
        description="Refund, void, reversal, and chargeback records are available to authorized treasury staff."
      />
    );
  }

  const filtering = Boolean(query || status || type);

  function refresh(message: string) {
    setAllRows(adjustmentRows(paymentLedgerRepository.list()));
    setNotice(message);
  }

  function confirmWithdrawal() {
    if (!withdrawing) return;
    const result = paymentLedgerRepository.withdrawAdjustment(withdrawing.envelope.id, "Mila A. Duran · Cashier I");
    setWithdrawing(undefined);
    if (result.kind !== "success") {
      setNotice(
        result.kind === "invalid"
          ? result.errors.map((error) => error.message).join(" ")
          : result.kind === "empty"
            ? (result.reason ?? "Adjustment not found.")
            : result.message,
      );
      return;
    }
    refresh(`Adjustment ${displayFinancialReference(result.data.envelope.reference)} was withdrawn.`);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Adjustments</h1>
          <p>Review refund, void, reversal, and chargeback requests with their linked collection records.</p>
        </div>
        <Button asChild>
          <Link href="/ops/treasury/adjustments/new">
            <Plus /> New adjustment
          </Link>
        </Button>
      </div>

      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}

      <TreasurySummaryCards
        label="Adjustment totals"
        items={[
          {
            label: "Requested amount",
            value: formatPhp(totals.amount),
            recordLabel: `${allRows.length} records`,
            icon: CircleDollarSign,
          },
          { label: "Open review", value: totals.open, recordLabel: "requests", icon: Clock3 },
          { label: "Completed", value: totals.completed, recordLabel: "records", icon: CheckCircle2 },
          { label: "Rejected or failed", value: totals.closed, recordLabel: "records", icon: ReceiptText },
        ]}
      />

      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Adjustment, collection, payer, or service…" />
        <OpsFilter
          label="Type"
          value={type}
          onChange={setType}
          anyLabel="Any type"
          options={[
            { value: "refund", label: "Refund" },
            { value: "void", label: "Void" },
            { value: "reversal", label: "Reversal" },
            { value: "chargeback", label: "Chargeback" },
          ]}
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={[
            { value: "requested", label: "Requested" },
            { value: "approved", label: "Approved" },
            { value: "processing", label: "Processing" },
            { value: "completed", label: "Completed" },
            { value: "rejected", label: "Rejected" },
            { value: "failed", label: "Failed" },
            { value: "withdrawn", label: "Withdrawn" },
          ]}
        />
      </div>

      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.adjustment.envelope.id}
          initialSort={{ key: "reference", direction: "desc" }}
          summary={`${rows.length} adjustment records`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title={filtering ? "No adjustments match these filters" : "No adjustments recorded"}
          description={
            filtering
              ? "Change the search or filters to return to the adjustment register."
              : "Refunds, voids, reversals, and chargebacks will appear here."
          }
        />
      )}

      <ConfirmationDialog
        open={Boolean(withdrawing)}
        onOpenChange={(open) => !open && setWithdrawing(undefined)}
        title="Withdraw this adjustment request?"
        description="The request remains in the financial history and can no longer be approved."
        confirmLabel="Withdraw request"
        destructive
        onConfirm={confirmWithdrawal}
      />
    </>
  );
}

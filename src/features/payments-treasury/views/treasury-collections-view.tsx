"use client";

import { type FormEvent, useMemo, useState } from "react";

import Link from "next/link";

import { Banknote, History, ReceiptText, Search, SearchX } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { FilterTabs, SearchField } from "@/shared/components/filter-bar";
import { FormField } from "@/shared/components/form-field";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { Timeline, type TimelineStep } from "@/shared/components/timeline";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { demoClock, formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { MoneyStatusBadge } from "../components/money-status-badge";
import { paymentLedgerRepository } from "../services/payment-ledger";
import { formatPhp, PAYMENT_CHANNEL_LABELS, parsePhpInput, phpInputValue } from "../services/payment-presentation";
import type { ConfirmedCollection, GovernmentReceipt, PaymentLedgerRecord } from "../types/payment-treasury";

type CollectionRow = {
  record: PaymentLedgerRecord;
  collection: ConfirmedCollection;
  receipt?: GovernmentReceipt;
};

type PendingPosting = {
  assessmentId: string;
  assessmentReference: string;
  amountMinorUnits: number;
  eventId: string;
  payer: string;
  payee: string;
};

const STATUS_FILTERS = [
  { value: "all", label: "All states" },
  { value: "allocated", label: "Allocated" },
  { value: "attention", label: "Needs attention" },
] as const;

function buildRows(records: readonly PaymentLedgerRecord[]): CollectionRow[] {
  return records
    .flatMap((record) =>
      record.lifecycle.collections.map((collection) => ({
        record,
        collection,
        receipt: record.lifecycle.receipts.find((receipt) => receipt.collectionId === collection.envelope.id),
      })),
    )
    .sort((a, b) => b.collection.confirmedAt.localeCompare(a.collection.confirmedAt));
}

function eventTimeline(row: CollectionRow): TimelineStep[] {
  const { assessment, attempts, acknowledgments, settlements } = row.record.lifecycle;
  const attempt = attempts.find((item) => item.envelope.id === row.collection.attemptId);
  const acknowledgment = acknowledgments.find(
    (item) => item.envelope.id === row.collection.acknowledgmentId || item.attemptId === attempt?.envelope.id,
  );
  const settlement = settlements.find((item) =>
    item.lines.some((line) => line.collectionId === row.collection.envelope.id),
  );
  return [
    {
      title: `Assessment ${assessment.envelope.reference}`,
      detail: `${assessment.serviceModule} · ${formatPhp(assessment.total.minorUnits)} · rule ${assessment.ruleVersion}`,
      complete: true,
    },
    {
      title: attempt ? `Attempt ${attempt.envelope.id}` : "Payment attempt",
      detail: attempt
        ? `${PAYMENT_CHANNEL_LABELS[attempt.channel]} · ${formatPhp(attempt.requestedAmount.minorUnits)} · ${formatDemoDateTime(attempt.startedAt)}`
        : "No linked attempt is present.",
      complete: Boolean(attempt),
    },
    {
      title: acknowledgment ? `Acknowledgment ${acknowledgment.envelope.id}` : "Provider acknowledgment",
      detail: acknowledgment
        ? `${acknowledgment.providerLabel} · ${acknowledgment.message}`
        : "No separate acknowledgment is present.",
      complete: Boolean(acknowledgment),
    },
    {
      title: `Collection ${row.collection.envelope.id}`,
      detail: `Event ${row.collection.confirmationEventId} · ${formatDemoDateTime(row.collection.confirmedAt)}`,
      complete: true,
    },
    {
      title: row.receipt ? `Receipt ${row.receipt.receiptNumber}` : "Government receipt",
      detail: row.receipt
        ? `${row.receipt.watermark} · ${formatPhp(row.receipt.amount.minorUnits)}`
        : "No receipt record is linked.",
      complete: Boolean(row.receipt),
    },
    {
      title: settlement ? `Settlement ${settlement.envelope.id}` : "Treasury settlement",
      detail: settlement
        ? `${settlement.status.replaceAll("-", " ")} · bank reference ${settlement.sampleBankReference ?? "not recorded"}`
        : "Not linked yet; collection history remains unchanged.",
      complete: Boolean(settlement),
    },
  ];
}

export function TreasuryCollectionsView() {
  const { role } = useWorkspaceSession();
  const [allRows, setAllRows] = useState<CollectionRow[]>(() => buildRows(paymentLedgerRepository.list()));
  const [lookupReference, setLookupReference] = useState("DEMO-ASM-003");
  const [lookupRecord, setLookupRecord] = useState<PaymentLedgerRecord | null>(null);
  const [lookupError, setLookupError] = useState<string>();
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string>();
  const [eventId, setEventId] = useState("");
  const [eventError, setEventError] = useState<string>();
  const [pendingPosting, setPendingPosting] = useState<PendingPosting | null>(null);
  const [operationMessage, setOperationMessage] = useState<string>();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const demoDate = demoClock.nowIso().slice(0, 10);

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return allRows.filter(({ record, collection, receipt }) => {
      const assessment = record.lifecycle.assessment;
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "allocated" && collection.status === "allocated") ||
        (statusFilter === "attention" && collection.status !== "allocated");
      const searchMatches =
        !normalized ||
        `${collection.envelope.id} ${collection.confirmationEventId} ${assessment.envelope.reference} ${assessment.serviceReference} ${assessment.payer.label} ${assessment.payee.label} ${receipt?.receiptNumber ?? ""}`
          .toLocaleLowerCase()
          .includes(normalized);
      return (
        searchMatches &&
        statusMatches &&
        (channelFilter === "all" || collection.channel === channelFilter) &&
        (dateFilter === "all" || collection.confirmedAt.slice(0, 10) === demoDate)
      );
    });
  }, [allRows, channelFilter, dateFilter, demoDate, query, statusFilter]);
  const selectedRow = allRows.find((row) => row.collection.envelope.id === selectedCollectionId);
  const dailyTotals = paymentLedgerRepository.collectionTotals(demoDate);
  const sessionTotals = paymentLedgerRepository.cashierSessionTotals();
  const lookupAssessment = lookupRecord?.lifecycle.assessment;
  const unresolvedAttempt = lookupRecord?.lifecycle.attempts.find((attempt) =>
    ["pending", "confirmation-uncertain"].includes(attempt.status),
  );
  const canPost =
    lookupAssessment &&
    lookupAssessment.balance.minorUnits > 0 &&
    ["issued", "partially-paid"].includes(lookupAssessment.status) &&
    !unresolvedAttempt;

  const columns: DataTableColumn<CollectionRow>[] = [
    {
      key: "collection",
      header: "Collection",
      cell: ({ collection, receipt }) => (
        <>
          <strong>{collection.envelope.id}</strong>
          <small>
            {receipt ? (
              <Link href={`/ops/treasury/receipts/${receipt.envelope.id}`}>{receipt.receiptNumber}</Link>
            ) : (
              "No receipt linked"
            )}
          </small>
        </>
      ),
    },
    {
      key: "payer",
      header: "Payer and service",
      cell: ({ record }) => (
        <>
          <strong>{record.lifecycle.assessment.payer.label}</strong>
          <small>{record.lifecycle.assessment.serviceReference}</small>
        </>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      cell: ({ collection }) => PAYMENT_CHANNEL_LABELS[collection.channel],
    },
    {
      key: "amount",
      header: "Gross / unallocated",
      cell: ({ collection }) => (
        <>
          <strong>{formatPhp(collection.grossAmount.minorUnits)}</strong>
          <small>{formatPhp(collection.unallocatedAmount.minorUnits)} unallocated</small>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: ({ collection }) => <MoneyStatusBadge state={{ kind: "collection", status: collection.status }} />,
    },
    {
      key: "action",
      header: "Action",
      headerHidden: true,
      cell: ({ collection }) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedCollectionId(collection.envelope.id)}>
          Inspect history
        </Button>
      ),
    },
  ];

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Treasury collections require the municipal demo role"
        description="Cashier posting and municipality-wide collection totals are outside barangay, partner, and enumerator projections."
      />
    );
  }

  function findAssessment(event: FormEvent) {
    event.preventDefault();
    setLookupError(undefined);
    setOperationMessage(undefined);
    const result = paymentLedgerRepository.read(lookupReference);
    if (result.kind !== "success") {
      setLookupRecord(null);
      setLookupError(result.kind === "empty" ? (result.reason ?? "Assessment not found.") : "Assessment unavailable.");
      return;
    }
    const assessment = result.data.lifecycle.assessment;
    setLookupRecord(result.data);
    setAmount(phpInputValue(assessment.balance.minorUnits));
    setEventId(`DEMO-EVT-CASH-${assessment.envelope.id.replace("DEMO-ASM-", "")}-01`);
    setAmountError(undefined);
    setEventError(undefined);
  }

  function reviewPosting(event: FormEvent) {
    event.preventDefault();
    setAmountError(undefined);
    setEventError(undefined);
    if (!lookupAssessment) {
      setLookupError("Look up an assessment before recording cash.");
      return;
    }
    const minorUnits = parsePhpInput(amount);
    if (minorUnits === null || minorUnits <= 0) {
      setAmountError("Enter a positive peso amount with no more than two decimal places.");
      return;
    }
    if (eventId.trim().length < 8) {
      setEventError("Use the generated stable event reference.");
      return;
    }
    setPendingPosting({
      assessmentId: lookupAssessment.envelope.id,
      assessmentReference: lookupAssessment.envelope.reference,
      amountMinorUnits: minorUnits,
      eventId: eventId.trim(),
      payer: lookupAssessment.payer.label,
      payee: lookupAssessment.payee.label,
    });
  }

  function confirmPosting() {
    if (!pendingPosting) return;
    const result = paymentLedgerRepository.postCashCollection(
      pendingPosting.assessmentId,
      pendingPosting.amountMinorUnits,
      pendingPosting.eventId,
    );
    setPendingPosting(null);
    if (result.kind !== "success") {
      const message =
        result.kind === "invalid"
          ? result.errors.map((error) => error.message).join(" ")
          : result.kind === "empty"
            ? (result.reason ?? "Assessment not found.")
            : "The sample posting could not be completed.";
      setOperationMessage(message);
      return;
    }
    setLookupRecord(result.data.record);
    setSelectedCollectionId(result.data.collectionId);
    setOperationMessage(
      result.data.outcome === "duplicate"
        ? `Event ${result.data.eventId} was already recorded. Totals and receipt count are unchanged.`
        : `${result.data.collectionId} and ${result.data.receiptId} were added to the local cashier session.`,
    );
    setAllRows(buildRows(paymentLedgerRepository.list()));
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M06 · Payments and Treasury</span>
          <h1>Cashier collections</h1>
          <p>Look up a governed assessment, post cash, and inspect the linked financial event history.</p>
        </div>
      </div>
      <NoticePanel className="mb-6" icon={<Banknote size={18} />}>
        UI demonstration only. Posting changes local sample records and session totals; it accepts no real cash and
        issues no official receipt.
      </NoticePanel>

      <section className="ops-stats" aria-label="Collection totals">
        <div className="ops-stat">
          <span>Demo-day gross</span>
          <strong>{formatPhp(dailyTotals.grossMinorUnits)}</strong>
          <small>
            {dailyTotals.collectionCount} collections on {demoDate}
          </small>
        </div>
        <div className="ops-stat">
          <span>Demo-day allocated</span>
          <strong>{formatPhp(dailyTotals.allocatedMinorUnits)}</strong>
          <small>Applied to governed assessments</small>
        </div>
        <div className="ops-stat">
          <span>Demo-day unallocated</span>
          <strong>{formatPhp(dailyTotals.unallocatedMinorUnits)}</strong>
          <small>Kept visible for review</small>
        </div>
        <div className="ops-stat">
          <span>Current cashier session</span>
          <strong>{formatPhp(sessionTotals.grossMinorUnits)}</strong>
          <small>{sessionTotals.collectionCount} locally posted collections</small>
        </div>
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <ContentPanel as="section">
          <span className="eyebrow">Assessment lookup</span>
          <h2 className="mt-1">Record a sample cash collection</h2>
          <p className="muted mt-2">Use DEMO-ASM-003 for the safe full-payment walkthrough.</p>
          <form className="mt-5 flex items-end gap-3" onSubmit={findAssessment}>
            <FormField id="cash-assessment" label="Assessment reference" error={lookupError}>
              {(props) => (
                <Input {...props} value={lookupReference} onChange={(e) => setLookupReference(e.target.value)} />
              )}
            </FormField>
            <Button type="submit" variant="outline" className="mb-[1px]">
              <Search /> Look up
            </Button>
          </form>

          {lookupAssessment && (
            <div className="mt-5 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong className="block">{lookupAssessment.envelope.reference}</strong>
                  <span className="text-muted-foreground text-sm">{lookupAssessment.serviceReference}</span>
                </div>
                <MoneyStatusBadge state={{ kind: "assessment", status: lookupAssessment.status }} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Payer</dt>
                  <dd>{lookupAssessment.payer.label}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Payee</dt>
                  <dd>{lookupAssessment.payee.label}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Balance</dt>
                  <dd className="font-semibold">{formatPhp(lookupAssessment.balance.minorUnits)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Policy</dt>
                  <dd>
                    {lookupAssessment.partialPaymentPolicy === "allowed" ? "Partial allowed" : "Full balance required"}
                  </dd>
                </div>
              </dl>
              {unresolvedAttempt && (
                <NoticePanel className="mt-4">
                  Recheck {unresolvedAttempt.envelope.id} before cashier posting; its result is still{" "}
                  {unresolvedAttempt.status.replaceAll("-", " ")}.
                </NoticePanel>
              )}
              {canPost ? (
                <form className="mt-5 space-y-4 border-t pt-5" onSubmit={reviewPosting}>
                  <FormField id="cash-amount" label="Amount (PHP)" error={amountError}>
                    {(props) => (
                      <Input
                        {...props}
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    )}
                  </FormField>
                  <FormField
                    id="cash-event-id"
                    label="Stable cashier event reference"
                    error={eventError}
                    hint="A repeated event reference is ignored instead of increasing totals."
                  >
                    {(props) => <Input {...props} value={eventId} onChange={(e) => setEventId(e.target.value)} />}
                  </FormField>
                  <Button type="submit" className="w-full">
                    <Banknote /> Review sample cash posting
                  </Button>
                </form>
              ) : (
                !unresolvedAttempt && (
                  <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
                    This assessment is not available for cashier posting.
                  </p>
                )
              )}
            </div>
          )}
          {operationMessage && (
            <p className="mt-4 rounded-lg bg-muted p-3 text-sm" role="status">
              {operationMessage}
            </p>
          )}
        </ContentPanel>

        <ContentPanel as="section">
          <span className="eyebrow">Linked records</span>
          <h2 className="mt-1">Auditable event history</h2>
          {selectedRow ? (
            <div className="mt-5">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-xl bg-muted p-4">
                <div>
                  <strong className="block">{selectedRow.collection.envelope.id}</strong>
                  <span className="text-muted-foreground text-sm">
                    {selectedRow.record.lifecycle.assessment.payer.label} ·{" "}
                    {formatPhp(selectedRow.collection.grossAmount.minorUnits)}
                  </span>
                </div>
                <MoneyStatusBadge state={{ kind: "collection", status: selectedRow.collection.status }} />
              </div>
              <Timeline steps={eventTimeline(selectedRow)} />
              {selectedRow.record.adjustments.filter(
                (adjustment) => adjustment.collectionId === selectedRow.collection.envelope.id,
              ).length > 0 && (
                <div className="mt-5 border-t pt-4">
                  <h3 className="text-base">Linked adjustments</h3>
                  {selectedRow.record.adjustments
                    .filter((adjustment) => adjustment.collectionId === selectedRow.collection.envelope.id)
                    .map((adjustment) => (
                      <p key={adjustment.envelope.id} className="mt-2 text-sm">
                        <strong>{adjustment.envelope.id}</strong> · {adjustment.type} · {adjustment.status} ·{" "}
                        {adjustment.reason}
                      </p>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={History}
              title="Choose a collection"
              description="Inspecting a row shows its assessment, attempt, acknowledgment, collection, receipt, and settlement as separate records."
            />
          )}
        </ContentPanel>
      </div>

      <section className="mt-8" aria-labelledby="collection-register-title">
        <div className="ops-topline">
          <div>
            <span className="eyebrow">Collection register</span>
            <h2 id="collection-register-title">Confirmed collection records</h2>
            <p>Filters change the visible projection only; financial history stays intact.</p>
          </div>
        </div>
        <div className="ops-controls">
          <SearchField
            label="Search collections"
            placeholder="Collection, event, payer, service, or receipt…"
            value={query}
            onChange={setQuery}
          />
          <label>
            Channel
            <select
              aria-label="Collection channel"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="all">All channels</option>
              <option value="cashier">Cashier</option>
              <option value="mock-e-wallet">Sample e-wallet</option>
              <option value="mock-bank">Sample bank</option>
            </select>
          </label>
          <label>
            Period
            <select aria-label="Collection period" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="today">Demo day</option>
              <option value="all">All dates</option>
            </select>
          </label>
        </div>
        <FilterTabs
          label="Filter collections by state"
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        {rows.length > 0 ? (
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.collection.envelope.id}
            summary={`${rows.length} collection record${rows.length === 1 ? "" : "s"} shown`}
          />
        ) : (
          <EmptyState
            icon={query ? SearchX : ReceiptText}
            title="No collections match these filters"
            description="Clear the search or widen the channel, period, and state filters."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setChannelFilter("all");
                  setDateFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
      </section>

      <ConfirmationDialog
        open={Boolean(pendingPosting)}
        onOpenChange={(open) => {
          if (!open) setPendingPosting(null);
        }}
        title="Post this cash collection?"
        description="This commits one collection and one watermarked sample receipt to local demo memory."
        confirmLabel="Post sample collection"
        onConfirm={confirmPosting}
      >
        {pendingPosting && (
          <dl className="grid gap-3 rounded-lg bg-muted p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Assessment</dt>
              <dd>{pendingPosting.assessmentReference}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Amount</dt>
              <dd>{formatPhp(pendingPosting.amountMinorUnits)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payer</dt>
              <dd>{pendingPosting.payer}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payee</dt>
              <dd>{pendingPosting.payee}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Event</dt>
              <dd>{pendingPosting.eventId}</dd>
            </div>
          </dl>
        )}
      </ConfirmationDialog>
    </>
  );
}

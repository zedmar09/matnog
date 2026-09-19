"use client";

import { type FormEvent, useMemo, useState } from "react";

import Link from "next/link";

import {
  Archive,
  Banknote,
  CheckCircle2,
  Clock3,
  EllipsisVertical,
  Pencil,
  Plus,
  SearchX,
  WalletCards,
} from "lucide-react";

import { MoneyStatusBadge } from "@/features/payments-treasury/components/money-status-badge";
import { TreasurySummaryCards } from "@/features/payments-treasury/components/treasury-summary-cards";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { paymentLedgerRepository } from "../services/payment-ledger";
import { displayFinancialReference, formatPhp, parsePhpInput, phpInputValue } from "../services/payment-presentation";
import type { PaymentLedgerRecord } from "../types/payment-treasury";

type PendingPosting = {
  assessmentId: string;
  assessmentReference: string;
  amountMinorUnits: number;
  eventId: string;
  payer: string;
};

function serviceGroup(record: PaymentLedgerRecord) {
  const module = record.lifecycle.assessment.serviceModule;
  if (module.startsWith("M03")) return "business";
  if (module.startsWith("M04")) return "tourism";
  return "barangay";
}

export function TreasuryAssessmentsView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => paymentLedgerRepository.list());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [amount, setAmount] = useState("");
  const [eventId, setEventId] = useState("");
  const [amountError, setAmountError] = useState("");
  const [eventError, setEventError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingPosting, setPendingPosting] = useState<PendingPosting>();
  const [archivingRecord, setArchivingRecord] = useState<PaymentLedgerRecord>();
  const [archiveReason, setArchiveReason] = useState("Service request cancelled before collection");

  const selected = selectedId
    ? records.find((record) => record.lifecycle.assessment.envelope.id === selectedId)
    : undefined;
  const assessment = selected?.lifecycle.assessment;
  const unresolvedAttempt = selected?.lifecycle.attempts.find((attempt) =>
    ["pending", "confirmation-uncertain"].includes(attempt.status),
  );
  const canPost =
    assessment &&
    assessment.balance.minorUnits > 0 &&
    ["issued", "partially-paid"].includes(assessment.status) &&
    !unresolvedAttempt;

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter((record) => {
      const item = record.lifecycle.assessment;
      const haystack =
        `${item.envelope.id} ${item.envelope.reference} ${item.serviceReference} ${item.payer.label} ${item.payee.label}`.toLocaleLowerCase();
      return (
        (!normalized || haystack.includes(normalized)) &&
        (!status || item.status === status) &&
        (!service || serviceGroup(record) === service)
      );
    });
  }, [query, records, service, status]);

  const totals = records.reduce(
    (sum, record) => {
      const item = record.lifecycle.assessment;
      return {
        assessed: sum.assessed + item.total.minorUnits,
        outstanding: sum.outstanding + item.balance.minorUnits,
        paid: sum.paid + (item.status === "paid" ? 1 : 0),
        open: sum.open + (["issued", "partially-paid"].includes(item.status) ? 1 : 0),
      };
    },
    { assessed: 0, outstanding: 0, paid: 0, open: 0 },
  );

  const columns: DataTableColumn<PaymentLedgerRecord>[] = [
    {
      key: "assessment",
      header: "Assessment",
      className: "ops-wide-cell",
      sortValue: (row) => row.lifecycle.assessment.envelope.reference,
      cell: (row) => (
        <>
          <strong>{displayFinancialReference(row.lifecycle.assessment.envelope.reference)}</strong>
          <small>{row.lifecycle.assessment.serviceReference}</small>
        </>
      ),
    },
    {
      key: "payer",
      header: "Payer",
      className: "ops-wide-cell",
      sortValue: (row) => row.lifecycle.assessment.payer.label,
      cell: (row) => (
        <>
          <strong>{row.lifecycle.assessment.payer.label}</strong>
          <small>{row.lifecycle.assessment.payee.label}</small>
        </>
      ),
    },
    {
      key: "amount",
      header: "Total / balance",
      sortValue: (row) => row.lifecycle.assessment.total.minorUnits,
      cell: (row) => (
        <>
          <strong>{formatPhp(row.lifecycle.assessment.total.minorUnits)}</strong>
          <small>{formatPhp(row.lifecycle.assessment.balance.minorUnits)} balance</small>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.lifecycle.assessment.status,
      cell: (row) => <MoneyStatusBadge state={{ kind: "assessment", status: row.lifecycle.assessment.status }} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ops-row-menu"
            aria-label={`Actions for ${displayFinancialReference(row.lifecycle.assessment.envelope.reference)}`}
          >
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem onSelect={() => chooseAssessment(row)}>
              <Banknote size={14} />
              Record payment
            </DropdownMenuItem>
            {!["paid", "waived", "expired", "revised"].includes(row.lifecycle.assessment.status) && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/treasury/assessments/${row.lifecycle.assessment.envelope.id}/edit`}>
                  <Pencil size={14} />
                  Edit assessment
                </Link>
              </DropdownMenuItem>
            )}
            {row.lifecycle.assessment.allocated.minorUnits === 0 && row.lifecycle.collections.length === 0 && (
              <DropdownMenuItem onSelect={() => setArchivingRecord(row)}>
                <Archive size={14} />
                Archive assessment
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
        title="Treasury assessments require municipal access"
        description="Assessment balances and cashier posting are available to authorized municipal treasury staff."
      />
    );
  }

  function chooseAssessment(record: PaymentLedgerRecord) {
    const item = record.lifecycle.assessment;
    setSelectedId(item.envelope.id);
    setAmount(phpInputValue(item.balance.minorUnits));
    setEventId(`EVT-CASH-${item.envelope.id.replace("DEMO-ASM-", "")}-01`);
    setAmountError("");
    setEventError("");
    setNotice("");
  }

  function reviewPosting(event: FormEvent) {
    event.preventDefault();
    if (!assessment) return;
    const minorUnits = parsePhpInput(amount);
    setAmountError("");
    setEventError("");
    if (minorUnits === null || minorUnits <= 0) {
      setAmountError("Enter a positive peso amount with no more than two decimal places.");
      return;
    }
    if (eventId.trim().length < 8) {
      setEventError("Enter a transaction event reference with at least eight characters.");
      return;
    }
    setPendingPosting({
      assessmentId: assessment.envelope.id,
      assessmentReference: displayFinancialReference(assessment.envelope.reference),
      amountMinorUnits: minorUnits,
      eventId: eventId.trim(),
      payer: assessment.payer.label,
    });
  }

  function confirmPosting() {
    if (!pendingPosting) return;
    const result = paymentLedgerRepository.postCashCollection(
      pendingPosting.assessmentId,
      pendingPosting.amountMinorUnits,
      pendingPosting.eventId,
    );
    setPendingPosting(undefined);
    if (result.kind !== "success") {
      setNotice(
        result.kind === "invalid"
          ? result.errors.map((error) => error.message).join(" ")
          : result.kind === "empty"
            ? (result.reason ?? "Assessment not found.")
            : result.message,
      );
      return;
    }
    const updated = paymentLedgerRepository.list();
    setRecords(updated);
    setSelectedId(result.data.record.lifecycle.assessment.envelope.id);
    setNotice(
      result.data.outcome === "duplicate"
        ? `Transaction ${displayFinancialReference(result.data.eventId)} was already recorded.`
        : `Collection ${displayFinancialReference(result.data.collectionId)} and receipt ${displayFinancialReference(result.data.receiptId)} were recorded.`,
    );
  }

  function refreshRecords(message: string) {
    setRecords(paymentLedgerRepository.list());
    setNotice(message);
  }

  function confirmArchive() {
    if (!archivingRecord) return;
    const item = archivingRecord.lifecycle.assessment;
    const result = paymentLedgerRepository.archiveAssessment(item.envelope.id, archiveReason, item.envelope.version);
    setArchivingRecord(undefined);
    if (result.kind !== "success") {
      setNotice(
        result.kind === "invalid"
          ? result.errors.map((error) => error.message).join(" ")
          : result.kind === "empty"
            ? (result.reason ?? "Assessment not found.")
            : result.message,
      );
      return;
    }
    refreshRecords(`Assessment ${displayFinancialReference(item.envelope.reference)} was archived.`);
  }

  const filtering = Boolean(query || status || service);

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Assessments</h1>
          <p>Find service assessments, review balances, and record cashier payments.</p>
        </div>
        <Button asChild>
          <Link href="/ops/treasury/assessments/new">
            <Plus /> New assessment
          </Link>
        </Button>
      </div>

      <TreasurySummaryCards
        label="Assessment totals"
        items={[
          {
            label: "Total assessed",
            value: formatPhp(totals.assessed),
            recordLabel: `${records.length} records`,
            icon: Banknote,
          },
          {
            label: "Outstanding",
            value: formatPhp(totals.outstanding),
            recordLabel: `${totals.open} open`,
            icon: WalletCards,
          },
          {
            label: "Paid assessments",
            value: totals.paid,
            recordLabel: `${records.length} total`,
            icon: CheckCircle2,
          },
          { label: "Open assessments", value: totals.open, recordLabel: `${totals.paid} paid`, icon: Clock3 },
        ]}
      />

      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}

      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Assessment, service reference, or payer…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={[
            { value: "issued", label: "Issued" },
            { value: "partially-paid", label: "Partially paid" },
            { value: "paid", label: "Paid" },
            { value: "expired", label: "Expired" },
          ]}
        />
        <OpsFilter
          label="Service"
          value={service}
          onChange={setService}
          anyLabel="Any service"
          options={[
            { value: "business", label: "Business permits" },
            { value: "tourism", label: "Tourism" },
            { value: "barangay", label: "Barangay clearances" },
          ]}
        />
      </div>

      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.lifecycle.assessment.envelope.id}
          initialSort={{ key: "assessment", direction: "desc" }}
          summary={`${rows.length} ${rows.length === 1 ? "assessment" : "assessments"}`}
        />
      ) : (
        <EmptyState
          icon={filtering ? SearchX : WalletCards}
          title={filtering ? "No assessments match your filters." : "No assessments are available."}
          description={
            filtering ? "Adjust the search or clear the filters." : "Service assessments appear here when issued."
          }
          action={
            filtering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStatus("");
                  setService("");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}

      {assessment && (
        <ContentPanel as="section" className="mt-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Cashier payment</span>
              <h2>{displayFinancialReference(assessment.envelope.reference)}</h2>
              <p className="muted mt-1">
                {assessment.payer.label} · {assessment.serviceReference}
              </p>
            </div>
            <MoneyStatusBadge state={{ kind: "assessment", status: assessment.status }} />
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold">{formatPhp(assessment.total.minorUnits)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-semibold">{formatPhp(assessment.allocated.minorUnits)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Balance</dt>
              <dd className="font-semibold">{formatPhp(assessment.balance.minorUnits)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payment policy</dt>
              <dd>
                {assessment.partialPaymentPolicy === "allowed" ? "Partial payments allowed" : "Full payment required"}
              </dd>
            </div>
          </dl>

          {unresolvedAttempt ? (
            <p className="mt-5 rounded-lg bg-muted p-3 text-sm">
              Resolve {displayFinancialReference(unresolvedAttempt.envelope.id)} before recording another payment.
            </p>
          ) : canPost ? (
            <form className="mt-6 grid gap-4 border-t pt-5 md:grid-cols-2" onSubmit={reviewPosting}>
              <FormField id="cash-amount" label="Amount (PHP)" error={amountError}>
                {(props) => (
                  <Input
                    {...props}
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="cash-event-id" label="Transaction event reference" error={eventError}>
                {(props) => <Input {...props} value={eventId} onChange={(event) => setEventId(event.target.value)} />}
              </FormField>
              <div className="md:col-span-2">
                <Button type="submit">
                  <Banknote /> Review payment
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-5 rounded-lg bg-muted p-3 text-sm">This assessment has no payable balance.</p>
          )}
        </ContentPanel>
      )}

      <ConfirmationDialog
        open={Boolean(pendingPosting)}
        onOpenChange={(open) => !open && setPendingPosting(undefined)}
        title="Record this cashier payment?"
        description="This creates one confirmed collection and one municipal receipt linked to the selected assessment."
        confirmLabel="Record payment"
        onConfirm={confirmPosting}
      >
        {pendingPosting && (
          <dl className="grid gap-3 rounded-lg bg-muted p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Assessment</dt>
              <dd>{pendingPosting.assessmentReference}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payer</dt>
              <dd>{pendingPosting.payer}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Amount</dt>
              <dd>{formatPhp(pendingPosting.amountMinorUnits)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Event reference</dt>
              <dd>{displayFinancialReference(pendingPosting.eventId)}</dd>
            </div>
          </dl>
        )}
      </ConfirmationDialog>

      <ConfirmationDialog
        open={Boolean(archivingRecord)}
        onOpenChange={(open) => !open && setArchivingRecord(undefined)}
        title="Archive this assessment?"
        description="The assessment remains in the register and its status changes to archived."
        confirmLabel="Archive assessment"
        destructive
        onConfirm={confirmArchive}
      >
        <FormField id="assessment-archive-reason" label="Archive reason">
          {(props) => (
            <Input {...props} value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} />
          )}
        </FormField>
      </ConfirmationDialog>
    </>
  );
}

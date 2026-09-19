"use client";

import { type FormEvent, useMemo, useState } from "react";

import Link from "next/link";

import { AlertTriangle, ArrowRight, Landmark, RefreshCw } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { FilterTabs, SearchField } from "@/shared/components/filter-bar";
import { FormField } from "@/shared/components/form-field";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { MoneyStatusBadge } from "../components/money-status-badge";
import { RevenuePostingSummaryPanel } from "../components/revenue-posting-summary";
import { paymentLedgerRepository } from "../services/payment-ledger";
import { formatPhp, parsePhpInput, phpInputValue } from "../services/payment-presentation";
import type { PaymentLedgerRecord, TreasurySettlement } from "../types/payment-treasury";

type SettlementRow = { record: PaymentLedgerRecord; settlement: TreasurySettlement };

const RECONCILIATION_FILTERS = [
  { value: "all", label: "All settlements" },
  { value: "exception", label: "Exceptions" },
  { value: "matched", label: "Matched" },
] as const;

function settlementRows(records: readonly PaymentLedgerRecord[]): SettlementRow[] {
  return records.flatMap((record) => record.lifecycle.settlements.map((settlement) => ({ record, settlement })));
}

function resultMessage<T>(result: RepositoryResult<T>): string {
  if (result.kind === "invalid") return result.errors.map((error) => error.message).join(" ");
  if (result.kind === "empty") return result.reason ?? "The sample record was not found.";
  if (result.kind === "conflict" || result.kind === "denied" || result.kind === "failure") return result.message;
  return "The sample operation could not be completed.";
}

function signedPhp(minorUnits: number): string {
  if (minorUnits === 0) return formatPhp(0);
  return `${minorUnits > 0 ? "+" : "−"}${formatPhp(Math.abs(minorUnits))}`;
}

export function TreasuryReconciliationView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => paymentLedgerRepository.list());
  const [selectedId, setSelectedId] = useState("DEMO-SET-008");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [assignee, setAssignee] = useState("Sample Treasury reconciler");
  const [assignmentReason, setAssignmentReason] = useState("Review the bank credit difference");
  const [correctedBankCredit, setCorrectedBankCredit] = useState("1075.00");
  const [correctionReason, setCorrectionReason] = useState("Corrected bank evidence reviewed");
  const [correctionEventId, setCorrectionEventId] = useState("DEMO-EVT-REC-008");
  const [message, setMessage] = useState<string>();
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const allRows = useMemo(() => settlementRows(records), [records]);
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return allRows.filter(({ record, settlement }) => {
      const assessment = record.lifecycle.assessment;
      return (
        (filter === "all" || settlement.status === filter) &&
        (!normalized ||
          `${settlement.envelope.id} ${settlement.providerLabel} ${assessment.payer.label} ${assessment.serviceReference} ${settlement.sampleBankReference ?? ""}`
            .toLocaleLowerCase()
            .includes(normalized))
      );
    });
  }, [allRows, filter, query]);
  const selected = allRows.find((row) => row.settlement.envelope.id === selectedId);
  const totals = allRows.reduce(
    (sum, row) => ({
      gross: sum.gross + row.settlement.grossAmount.minorUnits,
      charges: sum.charges + row.settlement.providerCharge.minorUnits,
      net: sum.net + row.settlement.netAmount.minorUnits,
      bank: sum.bank + row.settlement.bankCreditAmount.minorUnits,
      exceptions: sum.exceptions + (row.settlement.status === "exception" ? 1 : 0),
    }),
    { gross: 0, charges: 0, net: 0, bank: 0, exceptions: 0 },
  );

  const columns: DataTableColumn<SettlementRow>[] = [
    {
      key: "settlement",
      header: "Settlement",
      cell: ({ settlement }) => (
        <>
          <strong>{settlement.envelope.id}</strong>
          <small>{settlement.providerLabel}</small>
        </>
      ),
    },
    {
      key: "period",
      header: "Period / bank reference",
      cell: ({ settlement }) => (
        <>
          <span>{settlement.periodFrom}</span>
          <small>{settlement.sampleBankReference ?? "No bank reference"}</small>
        </>
      ),
    },
    {
      key: "net",
      header: "Net / bank credit",
      cell: ({ settlement }) => (
        <>
          <strong>{formatPhp(settlement.netAmount.minorUnits)}</strong>
          <small>{formatPhp(settlement.bankCreditAmount.minorUnits)} bank</small>
        </>
      ),
    },
    {
      key: "difference",
      header: "Difference",
      cell: ({ settlement }) => signedPhp(settlement.bankCreditAmount.minorUnits - settlement.netAmount.minorUnits),
    },
    {
      key: "status",
      header: "Status",
      cell: ({ settlement }) => <MoneyStatusBadge state={{ kind: "settlement", status: settlement.status }} />,
    },
    {
      key: "action",
      header: "Action",
      headerHidden: true,
      cell: ({ settlement }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedId(settlement.envelope.id);
            setCorrectedBankCredit(phpInputValue(settlement.netAmount.minorUnits));
            setCorrectionEventId(`DEMO-EVT-REC-${settlement.envelope.id.replace("DEMO-SET-", "")}`);
            setMessage(undefined);
          }}
        >
          Review settlement
        </Button>
      ),
    },
  ];

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Treasury reconciliation requires the municipal demo role"
        description="Provider and bank comparisons are outside barangay, partner, and enumerator projections."
      />
    );
  }

  function refresh() {
    setRecords(paymentLedgerRepository.list());
  }

  function assign(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const result = paymentLedgerRepository.assignSettlement(
      selected.settlement.envelope.id,
      assignee,
      assignmentReason,
      "Sample Treasury lead",
    );
    if (result.kind !== "success") {
      setMessage(resultMessage(result));
      return;
    }
    refresh();
    setMessage(`${result.data.settlementId} is assigned to ${assignee}. Original amounts are unchanged.`);
  }

  function reviewCorrection(event: FormEvent) {
    event.preventDefault();
    const minorUnits = parsePhpInput(correctedBankCredit);
    if (minorUnits === null) {
      setMessage("Enter a valid corrected bank amount.");
      return;
    }
    setCorrectionOpen(true);
  }

  function confirmCorrection() {
    if (!selected) return;
    const minorUnits = parsePhpInput(correctedBankCredit);
    if (minorUnits === null) return;
    const result = paymentLedgerRepository.correctSettlementBankCredit(
      selected.settlement.envelope.id,
      minorUnits,
      correctionReason,
      "Sample Treasury reconciler",
      correctionEventId,
      selected.settlement.envelope.version,
    );
    setCorrectionOpen(false);
    if (result.kind !== "success") {
      setMessage(resultMessage(result));
      return;
    }
    refresh();
    setMessage(
      result.data.outcome === "duplicate"
        ? `${correctionEventId} was already applied; settlement history is unchanged.`
        : `${result.data.settlementId} now matches the corrected sample bank evidence.`,
    );
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M06 · Payments and Treasury</span>
          <h1>Treasury reconciliation</h1>
          <p>Compare confirmed collections, provider charges, net settlement, and bank evidence.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/ops/treasury/collections">Cashier collections</Link>
        </Button>
      </div>
      <NoticePanel className="mb-6" icon={<Landmark size={18} />}>
        Every bank reference and amount is. A correction creates history and never changes the linked collection amount.
      </NoticePanel>

      <section className="ops-stats" aria-label="Settlement totals">
        <div className="ops-stat">
          <span>Provider gross</span>
          <strong>{formatPhp(totals.gross)}</strong>
          <small>{allRows.length} settlement records</small>
        </div>
        <div className="ops-stat">
          <span>Provider charges</span>
          <strong>{formatPhp(totals.charges)}</strong>
          <small>Gross minus charges equals net</small>
        </div>
        <div className="ops-stat">
          <span>Expected net</span>
          <strong>{formatPhp(totals.net)}</strong>
          <small>{formatPhp(totals.bank)} current bank evidence</small>
        </div>
        <div className="ops-stat">
          <span>Open exceptions</span>
          <strong>{totals.exceptions}</strong>
          <small>{signedPhp(totals.bank - totals.net)} combined difference</small>
        </div>
      </section>

      <div className="ops-controls">
        <SearchField
          label="Search settlements"
          placeholder="Settlement, provider, payer, or bank reference…"
          value={query}
          onChange={setQuery}
        />
      </div>
      <FilterTabs
        label="Filter settlements by status"
        options={RECONCILIATION_FILTERS}
        value={filter}
        onChange={setFilter}
      />
      {rows.length > 0 ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.settlement.envelope.id}
          summary={`${rows.length} settlement record${rows.length === 1 ? "" : "s"}`}
        />
      ) : (
        <EmptyState
          icon={RefreshCw}
          title="No settlements match these filters"
          description="Clear the search or show all settlement states."
        />
      )}

      {selected && (
        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
          <ContentPanel as="section">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Selected settlement</span>
                <h2>{selected.settlement.envelope.id}</h2>
                <p className="muted">{selected.record.lifecycle.assessment.serviceReference}</p>
              </div>
              <MoneyStatusBadge state={{ kind: "settlement", status: selected.settlement.status }} />
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs">Gross</dt>
                <dd>{formatPhp(selected.settlement.grossAmount.minorUnits)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Provider charge</dt>
                <dd>− {formatPhp(selected.settlement.providerCharge.minorUnits)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Expected net</dt>
                <dd className="font-semibold">{formatPhp(selected.settlement.netAmount.minorUnits)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Bank credit</dt>
                <dd className="font-semibold">{formatPhp(selected.settlement.bankCreditAmount.minorUnits)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Difference</dt>
                <dd>
                  {signedPhp(
                    selected.settlement.bankCreditAmount.minorUnits - selected.settlement.netAmount.minorUnits,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Assigned to</dt>
                <dd>{selected.settlement.assignedTo ?? "Unassigned"}</dd>
              </div>
            </dl>
            {selected.settlement.status === "exception" && (
              <>
                <form className="mt-6 space-y-4 border-t pt-5" onSubmit={assign}>
                  <FormField id="settlement-assignee" label="Assign exception to">
                    {(props) => (
                      <Input {...props} value={assignee} onChange={(event) => setAssignee(event.target.value)} />
                    )}
                  </FormField>
                  <FormField id="settlement-assignment-reason" label="Assignment reason">
                    {(props) => (
                      <Input
                        {...props}
                        value={assignmentReason}
                        onChange={(event) => setAssignmentReason(event.target.value)}
                      />
                    )}
                  </FormField>
                  <Button type="submit" variant="outline">
                    Assign exception
                  </Button>
                </form>
                <form className="mt-6 space-y-4 border-t pt-5" onSubmit={reviewCorrection}>
                  <FormField
                    id="corrected-bank-credit"
                    label="Corrected bank credit (PHP)"
                    hint={`Must equal the ${formatPhp(selected.settlement.netAmount.minorUnits)} expected net.`}
                  >
                    {(props) => (
                      <Input
                        {...props}
                        inputMode="decimal"
                        value={correctedBankCredit}
                        onChange={(event) => setCorrectedBankCredit(event.target.value)}
                      />
                    )}
                  </FormField>
                  <FormField id="settlement-correction-reason" label="Correction evidence note">
                    {(props) => (
                      <Input
                        {...props}
                        value={correctionReason}
                        onChange={(event) => setCorrectionReason(event.target.value)}
                      />
                    )}
                  </FormField>
                  <FormField id="settlement-event-id" label="Stable correction event">
                    {(props) => (
                      <Input
                        {...props}
                        value={correctionEventId}
                        onChange={(event) => setCorrectionEventId(event.target.value)}
                      />
                    )}
                  </FormField>
                  <Button type="submit">
                    <RefreshCw /> Review corrected evidence
                  </Button>
                </form>
              </>
            )}
            {message && (
              <p className="mt-5 rounded-lg bg-muted p-3 text-sm" role="status">
                {message}
              </p>
            )}
          </ContentPanel>

          <ContentPanel as="aside">
            <span className="eyebrow">Preserved reconciliation history</span>
            <h2 className="mt-1">Assignments and corrections</h2>
            {selected.record.reconciliationEvents.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No review events yet"
                description="Assignment and corrected-evidence events appear here without replacing collection history."
              />
            ) : (
              <ol className="mt-5 space-y-4">
                {selected.record.reconciliationEvents.map((event) => (
                  <li key={event.id} className="rounded-xl border p-4 text-sm">
                    <strong className="block">{event.action.replaceAll("-", " ")}</strong>
                    <span className="text-muted-foreground">
                      {formatDemoDateTime(event.recordedAt)} · {event.actor}
                    </span>
                    <p className="mt-2">{event.reason}</p>
                    <p className="mt-2">
                      Bank evidence: {formatPhp(event.previousBankCreditAmount.minorUnits)} →{" "}
                      {formatPhp(event.bankCreditAmount.minorUnits)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </ContentPanel>
        </div>
      )}

      <ContentPanel as="section" className="mt-8">
        <span className="eyebrow">Adjustment queue</span>
        <h2 className="mt-1">Refund, void, reversal, and chargeback review</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {records.flatMap((record) =>
            record.adjustments.map((adjustment) => (
              <article key={adjustment.envelope.id} className="rounded-xl border p-4">
                <strong className="block">{adjustment.envelope.id}</strong>
                <span className="text-muted-foreground text-sm">
                  {adjustment.type} · {formatPhp(adjustment.requestedAmount.minorUnits)} · {adjustment.status}
                </span>
                <p className="mt-2 text-sm">{adjustment.reason}</p>
                <Button asChild variant="ghost" size="sm" className="mt-3">
                  <Link href={`/ops/treasury/adjustments/${adjustment.envelope.id}`}>
                    Open adjustment <ArrowRight />
                  </Link>
                </Button>
              </article>
            )),
          )}
        </div>
      </ContentPanel>

      <RevenuePostingSummaryPanel records={records} />

      <ConfirmationDialog
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        title="Apply the corrected bank credit?"
        description="The previous bank value stays in reconciliation history. The linked collection amount will not change."
        confirmLabel="Apply sample correction"
        onConfirm={confirmCorrection}
      >
        {selected && (
          <dl className="grid gap-3 rounded-lg bg-muted p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Previous bank credit</dt>
              <dd>{formatPhp(selected.settlement.bankCreditAmount.minorUnits)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Corrected bank credit</dt>
              <dd>{formatPhp(parsePhpInput(correctedBankCredit) ?? 0)}</dd>
            </div>
          </dl>
        )}
      </ConfirmationDialog>
    </>
  );
}

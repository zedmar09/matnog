"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";

import { AlertTriangle, ArrowLeft, Landmark, RefreshCw } from "lucide-react";

import { MoneyStatusBadge } from "@/features/payments-treasury/components/money-status-badge";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { paymentLedgerRepository } from "../services/payment-ledger";
import { displayFinancialReference, formatPhp, parsePhpInput, phpInputValue } from "../services/payment-presentation";
import type { PaymentLedgerRecord } from "../types/payment-treasury";

function resultMessage<T>(result: RepositoryResult<T>): string {
  if (result.kind === "invalid") return result.errors.map((error) => error.message).join(" ");
  if (result.kind === "empty") return result.reason ?? "The settlement was not found.";
  if (result.kind === "conflict" || result.kind === "denied" || result.kind === "failure") return result.message;
  return "The operation could not be completed.";
}

function signedPhp(minorUnits: number): string {
  if (minorUnits === 0) return formatPhp(0);
  return `${minorUnits > 0 ? "+" : "−"}${formatPhp(Math.abs(minorUnits))}`;
}

export function TreasuryReconciliationDetailView({ settlementId }: { settlementId: string }) {
  const { role } = useWorkspaceSession();
  const initial = paymentLedgerRepository.readBySettlement(settlementId);
  const [record, setRecord] = useState<PaymentLedgerRecord | undefined>(
    initial.kind === "success" ? initial.data : undefined,
  );
  const [assignee, setAssignee] = useState("Elena G. Robles · Revenue Collection Clerk");
  const [assignmentReason, setAssignmentReason] = useState("Review the bank credit difference");
  const [correctedBankCredit, setCorrectedBankCredit] = useState("");
  const [correctionReason, setCorrectionReason] = useState("Corrected bank evidence reviewed");
  const [correctionEventId, setCorrectionEventId] = useState(`EVT-REC-${settlementId.replace("DEMO-SET-", "")}`);
  const [message, setMessage] = useState("");
  const [correctionOpen, setCorrectionOpen] = useState(false);

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Treasury reconciliation requires municipal access"
        description="Settlement evidence and correction workflows are available to authorized municipal treasury staff."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/treasury/reconciliation">Back to reconciliation</Link>
          </Button>
        }
      />
    );
  }

  if (!record) {
    return (
      <EmptyState
        icon={Landmark}
        headingLevel="h1"
        title="Settlement unavailable"
        description="The settlement reference was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/treasury/reconciliation">Back to reconciliation</Link>
          </Button>
        }
      />
    );
  }

  const settlement = record.lifecycle.settlements.find(
    (item) => item.envelope.id === settlementId.toUpperCase() || item.envelope.reference === settlementId.toUpperCase(),
  );
  if (!settlement) return null;
  const activeSettlement = settlement;
  const assessment = record.lifecycle.assessment;
  const linkedCollections = record.lifecycle.collections.filter((collection) =>
    settlement.lines.some((line) => line.collectionId === collection.envelope.id),
  );
  const difference = settlement.bankCreditAmount.minorUnits - settlement.netAmount.minorUnits;
  const actionable = settlement.status === "exception" || settlement.status === "partially-matched";
  const settlementEvents = record.reconciliationEvents.filter((event) => event.settlementId === settlement.envelope.id);

  function refresh() {
    const next = paymentLedgerRepository.readBySettlement(settlementId);
    if (next.kind === "success") setRecord(next.data);
  }

  function assign(event: FormEvent) {
    event.preventDefault();
    const result = paymentLedgerRepository.assignSettlement(
      activeSettlement.envelope.id,
      assignee,
      assignmentReason,
      "Ramon L. Frivaldo · Municipal Accountant",
    );
    if (result.kind !== "success") {
      setMessage(resultMessage(result));
      return;
    }
    refresh();
    setMessage(`${displayFinancialReference(result.data.settlementId)} is assigned to ${assignee}.`);
  }

  function reviewCorrection(event: FormEvent) {
    event.preventDefault();
    if (parsePhpInput(correctedBankCredit) === null) {
      setMessage("Enter a valid corrected bank amount.");
      return;
    }
    setCorrectionOpen(true);
  }

  function confirmCorrection() {
    const minorUnits = parsePhpInput(correctedBankCredit);
    if (minorUnits === null) return;
    const result = paymentLedgerRepository.correctSettlementBankCredit(
      activeSettlement.envelope.id,
      minorUnits,
      correctionReason,
      "Elena G. Robles · Revenue Collection Clerk",
      correctionEventId,
      activeSettlement.envelope.version,
    );
    setCorrectionOpen(false);
    if (result.kind !== "success") {
      setMessage(resultMessage(result));
      return;
    }
    refresh();
    setMessage(
      result.data.outcome === "duplicate"
        ? `${correctionEventId} was already applied.`
        : `${displayFinancialReference(result.data.settlementId)} now matches the corrected bank evidence.`,
    );
  }

  function prepareCorrection() {
    setCorrectedBankCredit(phpInputValue(activeSettlement.netAmount.minorUnits));
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/treasury/reconciliation">
            <ArrowLeft size={15} />
            Reconciliation
          </Link>
          <h1>{displayFinancialReference(settlement.envelope.reference)}</h1>
          <p>
            {settlement.providerLabel} · {assessment.serviceReference}
          </p>
        </div>
        <MoneyStatusBadge state={{ kind: "settlement", status: settlement.status }} />
      </div>

      {message && (
        <div className="registry-save-notice mb-6" role="status">
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,.65fr)]">
        <ContentPanel as="section">
          <span className="eyebrow">Settlement amounts</span>
          <h2>Provider and bank comparison</h2>
          <dl className="treasury-settlement-amounts mt-6">
            <div>
              <dt>Gross collections</dt>
              <dd>{formatPhp(settlement.grossAmount.minorUnits)}</dd>
            </div>
            <div>
              <dt>Provider charges</dt>
              <dd>− {formatPhp(settlement.providerCharge.minorUnits)}</dd>
            </div>
            <div>
              <dt>Expected net</dt>
              <dd>{formatPhp(settlement.netAmount.minorUnits)}</dd>
            </div>
            <div>
              <dt>Bank credit</dt>
              <dd>{formatPhp(settlement.bankCreditAmount.minorUnits)}</dd>
            </div>
            <div>
              <dt>Difference</dt>
              <dd className={difference === 0 ? "text-primary" : "text-destructive"}>{signedPhp(difference)}</dd>
            </div>
            <div>
              <dt>Assigned to</dt>
              <dd>{settlement.assignedTo ?? "Unassigned"}</dd>
            </div>
          </dl>

          <div className="mt-6 border-t pt-5">
            <h3 className="text-base">Bank evidence</h3>
            <dl className="document-facts mt-4">
              <div>
                <dt>Bank reference</dt>
                <dd>{displayFinancialReference(settlement.sampleBankReference ?? "Pending")}</dd>
              </div>
              <div>
                <dt>Bank date</dt>
                <dd>{settlement.bankDate ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt>Settlement period</dt>
                <dd>
                  {settlement.periodFrom} to {settlement.periodTo}
                </dd>
              </div>
            </dl>
          </div>
        </ContentPanel>

        <ContentPanel as="aside">
          <span className="eyebrow">Linked collections</span>
          <h2>
            {linkedCollections.length} collection {linkedCollections.length === 1 ? "record" : "records"}
          </h2>
          <div className="mt-5 space-y-3">
            {linkedCollections.map((collection) => (
              <Link
                key={collection.envelope.id}
                className="treasury-linked-record"
                href={`/ops/treasury/collections/${collection.envelope.id}`}
              >
                <span>
                  <strong>{displayFinancialReference(collection.envelope.reference)}</strong>
                  <small>{assessment.payer.label}</small>
                </span>
                <strong>{formatPhp(collection.grossAmount.minorUnits)}</strong>
              </Link>
            ))}
          </div>
        </ContentPanel>
      </div>

      {actionable && (
        <ContentPanel as="section" className="mt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Exception resolution</span>
              <h2>Assign and correct bank evidence</h2>
              <p className="muted mt-2">Complete the assignment before applying corrected evidence.</p>
            </div>
            <Button variant="outline" onClick={prepareCorrection}>
              Use expected net
            </Button>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <form className="space-y-4 rounded-xl border p-5" onSubmit={assign}>
              <h3 className="text-base">Assignment</h3>
              <FormField id="settlement-assignee" label="Assign exception to">
                {(props) => <Input {...props} value={assignee} onChange={(event) => setAssignee(event.target.value)} />}
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

            <form className="space-y-4 rounded-xl border p-5" onSubmit={reviewCorrection}>
              <h3 className="text-base">Corrected evidence</h3>
              <FormField id="corrected-bank-credit" label="Corrected bank credit (PHP)">
                {(props) => (
                  <Input
                    {...props}
                    inputMode="decimal"
                    value={correctedBankCredit}
                    onChange={(event) => setCorrectedBankCredit(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="settlement-correction-reason" label="Evidence note">
                {(props) => (
                  <Input
                    {...props}
                    value={correctionReason}
                    onChange={(event) => setCorrectionReason(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="settlement-event-id" label="Correction event reference">
                {(props) => (
                  <Input
                    {...props}
                    value={correctionEventId}
                    onChange={(event) => setCorrectionEventId(event.target.value)}
                  />
                )}
              </FormField>
              <Button type="submit">
                <RefreshCw /> Review correction
              </Button>
            </form>
          </div>
        </ContentPanel>
      )}

      <ContentPanel as="section" className="mt-6">
        <span className="eyebrow">Settlement history</span>
        <h2>Assignments and corrections</h2>
        {settlementEvents.length ? (
          <ol className="mt-5 grid gap-3 lg:grid-cols-2">
            {settlementEvents.map((event) => (
              <li key={event.id} className="rounded-xl border p-4 text-sm">
                <strong className="block capitalize">{event.action.replaceAll("-", " ")}</strong>
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
        ) : (
          <EmptyState
            icon={AlertTriangle}
            title="No reconciliation activity yet"
            description="Assignments and correction events will appear here."
          />
        )}
      </ContentPanel>

      <ConfirmationDialog
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        title="Apply the corrected bank credit?"
        description="The previous bank value stays in reconciliation history and the linked collection amount remains unchanged."
        confirmLabel="Apply correction"
        onConfirm={confirmCorrection}
      >
        <dl className="grid gap-3 rounded-lg bg-muted p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Previous bank credit</dt>
            <dd>{formatPhp(settlement.bankCreditAmount.minorUnits)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Corrected bank credit</dt>
            <dd>{formatPhp(parsePhpInput(correctedBankCredit) ?? 0)}</dd>
          </div>
        </dl>
      </ConfirmationDialog>
    </>
  );
}

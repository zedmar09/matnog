"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowLeft, CheckCircle2, ReceiptText, XCircle } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { MoneyStatusBadge } from "../components/money-status-badge";
import { paymentLedgerRepository } from "../services/payment-ledger";
import { displayFinancialReference, formatPhp } from "../services/payment-presentation";
import type { AdjustmentReviewDecision, PaymentLedgerRecord } from "../types/payment-treasury";

function resultMessage<T>(result: RepositoryResult<T>): string {
  if (result.kind === "invalid") return result.errors.map((error) => error.message).join(" ");
  if (result.kind === "empty") return result.reason ?? "The adjustment was not found.";
  if (result.kind === "conflict" || result.kind === "denied" || result.kind === "failure") return result.message;
  return "The review could not be completed.";
}

export function TreasuryAdjustmentView({ adjustmentId }: { adjustmentId: string }) {
  const { role } = useWorkspaceSession();
  const initial = paymentLedgerRepository.readByAdjustment(adjustmentId);
  const [record, setRecord] = useState<PaymentLedgerRecord | null>(initial.kind === "success" ? initial.data : null);
  const [reviewer, setReviewer] = useState("Ramon L. Frivaldo · Municipal Accountant");
  const [reviewReason, setReviewReason] = useState("Reviewed against the collection history");
  const [eventId, setEventId] = useState(`EVT-${adjustmentId.replace("DEMO-", "")}`);
  const [decision, setDecision] = useState<AdjustmentReviewDecision | null>(null);
  const [message, setMessage] = useState<string>();

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Adjustment review requires municipal access"
        description="Refund, void, reversal, and chargeback decisions are available to authorized treasury staff."
      />
    );
  }
  if (!record) {
    return (
      <EmptyState
        icon={ReceiptText}
        headingLevel="h1"
        title="Adjustment unavailable"
        description="The adjustment reference was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/treasury/adjustments">Return to adjustments</Link>
          </Button>
        }
      />
    );
  }

  const adjustment = record.adjustments.find((item) => item.envelope.id === adjustmentId.toUpperCase());
  if (!adjustment) return null;
  const collection = record.lifecycle.collections.find((item) => item.envelope.id === adjustment.collectionId);
  const receipt = record.lifecycle.receipts.find((item) => item.collectionId === collection?.envelope.id);
  const maximumResult = paymentLedgerRepository.maximumAdjustableMinorUnits(adjustment.envelope.id);
  const maximum = maximumResult.kind === "success" ? maximumResult.data : 0;
  const excessive = adjustment.requestedAmount.minorUnits > maximum;
  const open = adjustment.status === "requested";

  function confirmReview() {
    if (!adjustment || !decision) return;
    const result = paymentLedgerRepository.reviewAdjustment(
      adjustment.envelope.id,
      decision,
      reviewer,
      reviewReason,
      eventId,
      adjustment.envelope.version,
    );
    setDecision(null);
    if (result.kind !== "success") {
      setMessage(resultMessage(result));
      return;
    }
    setRecord(result.data.record);
    setMessage(
      result.data.outcome === "duplicate"
        ? `${eventId} was already reviewed; no financial record changed.`
        : `${displayFinancialReference(adjustment.envelope.id)} was ${result.data.outcome} by a separate reviewer.`,
    );
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>{displayFinancialReference(adjustment.envelope.id)}</h1>
          <p>Review the original request and collection without replacing either financial record.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/ops/treasury/adjustments">
            <ArrowLeft /> Adjustments
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Original request</span>
              <h2>{adjustment.type.replaceAll("-", " ")}</h2>
            </div>
            <StatusBadge
              tone={
                adjustment.status === "completed"
                  ? "success"
                  : adjustment.status === "withdrawn"
                    ? "neutral"
                    : adjustment.status === "rejected"
                      ? "destructive"
                      : "pending"
              }
            >
              {adjustment.status}
            </StatusBadge>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Requested amount</dt>
              <dd className="font-semibold">{formatPhp(adjustment.requestedAmount.minorUnits)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Maximum currently adjustable</dt>
              <dd className="font-semibold">{formatPhp(maximum)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Requested by</dt>
              <dd>{adjustment.requestedBy}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Collection</dt>
              <dd>{displayFinancialReference(adjustment.collectionId)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-xs">Original reason</dt>
              <dd>{adjustment.reason}</dd>
            </div>
          </dl>
          {excessive && open && (
            <NoticePanel className="mt-5">
              The request exceeds the remaining adjustable amount by{" "}
              {formatPhp(adjustment.requestedAmount.minorUnits - maximum)}. Approval is blocked; rejection remains
              available.
            </NoticePanel>
          )}
          {open ? (
            <div className="mt-6 space-y-4 border-t pt-5">
              <label className="form-field">
                <span className="form-label">Reviewing persona</span>
                <select
                  aria-label="Reviewing persona"
                  className="h-10 rounded-lg border bg-background px-3"
                  value={reviewer}
                  onChange={(event) => setReviewer(event.target.value)}
                >
                  <option>Ramon L. Frivaldo · Municipal Accountant</option>
                  <option>Elena G. Robles · Revenue Collection Clerk</option>
                  <option>Mila A. Duran · Cashier I</option>
                </select>
              </label>
              <FormField id="adjustment-review-reason" label="Review reason">
                {(props) => (
                  <Input {...props} value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} />
                )}
              </FormField>
              <FormField id="adjustment-event-id" label="Stable review event">
                {(props) => <Input {...props} value={eventId} onChange={(event) => setEventId(event.target.value)} />}
              </FormField>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setDecision("approve")}>
                  <CheckCircle2 /> Approve adjustment
                </Button>
                <Button variant="outline" onClick={() => setDecision("reject")}>
                  <XCircle /> Reject adjustment
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-muted p-4 text-sm">
              <strong className="block">
                {adjustment.status === "withdrawn" ? "Request withdrawn by" : "Review completed by"}{" "}
                {adjustment.reviewedBy}
              </strong>
              <span>
                {adjustment.resultEventId} · {adjustment.status}
              </span>
            </div>
          )}
          {message && (
            <p className="mt-5 rounded-lg bg-muted p-3 text-sm" role="status">
              {message}
            </p>
          )}
        </ContentPanel>

        <ContentPanel as="aside">
          <span className="eyebrow">Linked financial records</span>
          <h2 className="mt-1">Collection and receipt</h2>
          {collection && (
            <div className="mt-5 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <strong>{displayFinancialReference(collection.envelope.id)}</strong>
                <MoneyStatusBadge state={{ kind: "collection", status: collection.status }} />
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt>Gross collection</dt>
                  <dd>{formatPhp(collection.grossAmount.minorUnits)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Allocated</dt>
                  <dd>{formatPhp(collection.allocatedAmount.minorUnits)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Unallocated</dt>
                  <dd>{formatPhp(collection.unallocatedAmount.minorUnits)}</dd>
                </div>
              </dl>
            </div>
          )}
          {receipt && (
            <div className="mt-4 rounded-xl border p-4 text-sm">
              <strong className="block">{displayFinancialReference(receipt.receiptNumber)}</strong>
              <span>{receipt.watermark}</span>
              <div className="mt-3">
                <MoneyStatusBadge state={{ kind: "government-receipt", status: receipt.status }} />
              </div>
            </div>
          )}
        </ContentPanel>
      </div>

      <ConfirmationDialog
        open={decision !== null}
        onOpenChange={(open) => {
          if (!open) setDecision(null);
        }}
        title={decision === "approve" ? "Approve this adjustment?" : "Reject this adjustment?"}
        description={
          decision === "approve"
            ? "The local result will update adjustment and collection status while retaining the original amounts."
            : "The request and reason remain in history; the collection will not change."
        }
        confirmLabel={decision === "approve" ? "Approve adjustment" : "Reject adjustment"}
        destructive={decision === "reject"}
        onConfirm={confirmReview}
      />
    </>
  );
}

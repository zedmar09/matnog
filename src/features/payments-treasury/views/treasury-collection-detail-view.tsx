"use client";

import Link from "next/link";

import { ArrowLeft, ReceiptText, RotateCcw } from "lucide-react";

import { MoneyStatusBadge } from "@/features/payments-treasury/components/money-status-badge";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { Timeline, type TimelineStep } from "@/shared/components/timeline";
import { Button } from "@/shared/components/ui/button";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { paymentLedgerRepository } from "../services/payment-ledger";
import { displayFinancialReference, formatPhp, PAYMENT_CHANNEL_LABELS } from "../services/payment-presentation";

export function TreasuryCollectionDetailView({ collectionId }: { collectionId: string }) {
  const { role } = useWorkspaceSession();

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Collection records require municipal access"
        description="Linked financial records are available to authorized treasury staff."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/treasury/collections">Back to collections</Link>
          </Button>
        }
      />
    );
  }

  const result = paymentLedgerRepository.readByCollection(collectionId);
  if (result.kind !== "success") {
    return (
      <EmptyState
        icon={ReceiptText}
        headingLevel="h1"
        title="Collection unavailable"
        description="The collection reference was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/treasury/collections">Back to collections</Link>
          </Button>
        }
      />
    );
  }

  const record = result.data;
  const assessment = record.lifecycle.assessment;
  const collection = record.lifecycle.collections.find(
    (item) => item.envelope.id === collectionId.toUpperCase() || item.envelope.reference === collectionId.toUpperCase(),
  );
  if (!collection) return null;
  const attempt = record.lifecycle.attempts.find((item) => item.envelope.id === collection.attemptId);
  const acknowledgment = record.lifecycle.acknowledgments.find(
    (item) => item.envelope.id === collection.acknowledgmentId || item.attemptId === attempt?.envelope.id,
  );
  const receipt = record.lifecycle.receipts.find((item) => item.collectionId === collection.envelope.id);
  const settlement = record.lifecycle.settlements.find((item) =>
    item.lines.some((line) => line.collectionId === collection.envelope.id),
  );
  const adjustments = record.adjustments.filter((item) => item.collectionId === collection.envelope.id);

  const steps: TimelineStep[] = [
    {
      title: `Assessment ${displayFinancialReference(assessment.envelope.reference)}`,
      detail: `${assessment.serviceModule.replace(/^M\d+\s*/, "")} · ${assessment.serviceReference} · ${formatPhp(assessment.total.minorUnits)}`,
      complete: true,
    },
    {
      title: attempt ? `Payment ${displayFinancialReference(attempt.envelope.id)}` : "Payment attempt",
      detail: attempt
        ? `${PAYMENT_CHANNEL_LABELS[attempt.channel]} · ${formatDemoDateTime(attempt.startedAt)}`
        : "No payment attempt is linked.",
      complete: Boolean(attempt),
    },
    {
      title: acknowledgment ? `Confirmation ${displayFinancialReference(acknowledgment.envelope.id)}` : "Confirmation",
      detail: acknowledgment
        ? `${acknowledgment.providerLabel} · ${acknowledgment.message}`
        : "No confirmation is linked.",
      complete: Boolean(acknowledgment),
    },
    {
      title: `Collection ${displayFinancialReference(collection.envelope.reference)}`,
      detail: `${formatPhp(collection.grossAmount.minorUnits)} · ${formatDemoDateTime(collection.confirmedAt)}`,
      complete: true,
    },
    {
      title: receipt ? `Receipt ${displayFinancialReference(receipt.receiptNumber)}` : "Municipal receipt",
      detail: receipt ? `${formatPhp(receipt.amount.minorUnits)} · ${receipt.status}` : "No receipt is linked.",
      complete: Boolean(receipt),
    },
    {
      title: settlement ? `Settlement ${displayFinancialReference(settlement.envelope.id)}` : "Settlement",
      detail: settlement
        ? `${settlement.status.replaceAll("-", " ")} · ${displayFinancialReference(settlement.sampleBankReference ?? "Bank reference pending")}`
        : "No settlement is linked.",
      complete: Boolean(settlement),
    },
  ];

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/treasury/collections">
            <ArrowLeft size={15} />
            Collections
          </Link>
          <h1>{displayFinancialReference(collection.envelope.reference)}</h1>
          <p>Review the payment, allocation, receipt, settlement, and adjustment records linked to this collection.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {receipt && (
            <Button asChild variant="outline">
              <Link href={`/ops/treasury/receipts/${receipt.envelope.id}`}>
                <ReceiptText /> Open receipt
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/ops/treasury/adjustments/new?collectionId=${collection.envelope.id}`}>
              <RotateCcw /> Request adjustment
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Collection information</span>
              <h2>{assessment.payer.label}</h2>
            </div>
            <MoneyStatusBadge state={{ kind: "collection", status: collection.status }} />
          </div>
          <dl className="document-facts mt-6">
            <div>
              <dt>Service reference</dt>
              <dd>{assessment.serviceReference}</dd>
            </div>
            <div>
              <dt>Payment channel</dt>
              <dd>{PAYMENT_CHANNEL_LABELS[collection.channel]}</dd>
            </div>
            <div>
              <dt>Gross amount</dt>
              <dd>{formatPhp(collection.grossAmount.minorUnits)}</dd>
            </div>
            <div>
              <dt>Allocated amount</dt>
              <dd>{formatPhp(collection.allocatedAmount.minorUnits)}</dd>
            </div>
            <div>
              <dt>Unallocated amount</dt>
              <dd>{formatPhp(collection.unallocatedAmount.minorUnits)}</dd>
            </div>
            <div>
              <dt>Confirmed</dt>
              <dd>{formatDemoDateTime(collection.confirmedAt)}</dd>
            </div>
            <div>
              <dt>Transaction event</dt>
              <dd>{displayFinancialReference(collection.confirmationEventId)}</dd>
            </div>
          </dl>
        </ContentPanel>

        <ContentPanel as="section">
          <span className="eyebrow">Linked records</span>
          <h2>Transaction history</h2>
          <div className="mt-6">
            <Timeline steps={steps} />
          </div>
        </ContentPanel>
      </div>

      {adjustments.length > 0 && (
        <ContentPanel as="section" className="mt-6">
          <span className="eyebrow">Adjustments</span>
          <h2>Refunds, reversals, and chargebacks</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {adjustments.map((adjustment) => (
              <article key={adjustment.envelope.id} className="rounded-xl border p-4">
                <strong>{displayFinancialReference(adjustment.envelope.reference)}</strong>
                <p className="mt-1 text-muted-foreground text-sm">
                  {adjustment.type.replaceAll("-", " ")} · {formatPhp(adjustment.requestedAmount.minorUnits)} ·{" "}
                  {adjustment.status}
                </p>
                <p className="mt-2 text-sm">{adjustment.reason}</p>
                <Button asChild variant="ghost" size="sm" className="mt-3">
                  <Link href={`/ops/treasury/adjustments/${adjustment.envelope.id}`}>Open adjustment</Link>
                </Button>
              </article>
            ))}
          </div>
        </ContentPanel>
      )}
    </>
  );
}

"use client";

import Link from "next/link";

import { ArrowLeft, ReceiptText, ShieldCheck } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { Timeline, type TimelineStep } from "@/shared/components/timeline";
import { Button } from "@/shared/components/ui/button";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { MoneyStatusBadge } from "../components/money-status-badge";
import { paymentLedgerRepository } from "../services/payment-ledger";
import { formatPhp, PAYMENT_CHANNEL_LABELS } from "../services/payment-presentation";

export function TreasuryReceiptView({ receiptId }: { receiptId: string }) {
  const { role } = useWorkspaceSession();
  if (role !== "municipal") {
    return (
      <PermissionState
        title="Treasury receipt history requires the municipal demo role"
        description="Municipality-wide collection history is outside the selected role projection."
      />
    );
  }

  const result = paymentLedgerRepository.readByReceipt(receiptId);
  if (result.kind !== "success") {
    return (
      <EmptyState
        icon={ReceiptText}
        headingLevel="h1"
        title="Treasury receipt unavailable"
        description="The receipt reference was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/treasury/collections">Return to collections</Link>
          </Button>
        }
      />
    );
  }

  const record = result.data;
  const assessment = record.lifecycle.assessment;
  const receipt = record.lifecycle.receipts.find(
    (item) => item.envelope.id === receiptId.toUpperCase() || item.receiptNumber === receiptId.toUpperCase(),
  );
  if (!receipt) return null;
  const collection = record.lifecycle.collections.find((item) => item.envelope.id === receipt.collectionId);
  const attempt = record.lifecycle.attempts.find((item) => item.envelope.id === collection?.attemptId);
  const acknowledgment = record.lifecycle.acknowledgments.find(
    (item) => item.envelope.id === collection?.acknowledgmentId || item.attemptId === attempt?.envelope.id,
  );
  const settlement = record.lifecycle.settlements.find((item) =>
    item.lines.some((line) => line.collectionId === collection?.envelope.id),
  );
  const steps: TimelineStep[] = [
    {
      title: `Assessment ${assessment.envelope.reference}`,
      detail: `${assessment.serviceModule} · ${formatPhp(assessment.total.minorUnits)} · rule ${assessment.ruleVersion}`,
      complete: true,
    },
    {
      title: attempt ? `Attempt ${attempt.envelope.id}` : "Payment attempt",
      detail: attempt
        ? `${PAYMENT_CHANNEL_LABELS[attempt.channel]} · ${attempt.status.replaceAll("-", " ")}`
        : "No linked payment attempt is present.",
      complete: Boolean(attempt),
    },
    {
      title: acknowledgment ? `Provider acknowledgment ${acknowledgment.envelope.id}` : "Provider acknowledgment",
      detail: acknowledgment
        ? `${acknowledgment.providerLabel} · ${acknowledgment.message}`
        : "No provider acknowledgment is linked. It is never replaced by the government receipt.",
      complete: Boolean(acknowledgment),
    },
    {
      title: collection ? `Confirmed collection ${collection.envelope.id}` : "Confirmed collection",
      detail: collection
        ? `${formatPhp(collection.grossAmount.minorUnits)} · event ${collection.confirmationEventId}`
        : "No linked collection is present.",
      complete: Boolean(collection),
    },
    {
      title: `Government receipt ${receipt.receiptNumber}`,
      detail: `${receipt.watermark} · ${receipt.status}`,
      complete: true,
    },
    {
      title: settlement ? `Settlement ${settlement.envelope.id}` : "Treasury settlement",
      detail: settlement
        ? `${settlement.status.replaceAll("-", " ")} · bank reference ${settlement.sampleBankReference ?? "not recorded"}`
        : "No settlement is linked; the collection and receipt remain separate records.",
      complete: Boolean(settlement),
    },
  ];

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M06 · Treasury receipt history</span>
          <h1>Sample Treasury receipt</h1>
          <p>Inspect the receipt and every linked financial record without treating one as another.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/ops/treasury/collections">
            <ArrowLeft /> Collections
          </Link>
        </Button>
      </div>
      <NoticePanel className="mb-6" icon={<ShieldCheck size={18} />}>
        This local preview is not an official receipt and moves no money. Provider acknowledgment, confirmed collection,
        government receipt and settlement remain separate records.
      </NoticePanel>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <ContentPanel as="article">
          <div className="rounded-lg border-2 border-destructive/35 border-dashed bg-destructive/5 p-4 text-center font-bold text-destructive">
            {receipt.watermark}
          </div>
          <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Municipality of Matnog · UI demo</span>
              <h2>{receipt.receiptNumber}</h2>
            </div>
            <MoneyStatusBadge state={{ kind: "government-receipt", status: receipt.status }} />
          </div>
          <dl className="mt-7 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Amount</dt>
              <dd className="font-bold text-2xl">{formatPhp(receipt.amount.minorUnits)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Issued</dt>
              <dd>{receipt.issuedAt ? formatDemoDateTime(receipt.issuedAt) : "Not issued"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Payer</dt>
              <dd>{assessment.payer.label}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Payee</dt>
              <dd>{assessment.payee.label}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Assessment</dt>
              <dd>{assessment.envelope.reference}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Collection</dt>
              <dd>{collection?.envelope.reference ?? receipt.collectionId}</dd>
            </div>
          </dl>
          <p className="mt-6 border-t pt-5 text-muted-foreground text-sm">
            Issued by {receipt.issuedBy ?? "Sample cashier"}. No document is downloaded or shared outside this local
            prototype.
          </p>
        </ContentPanel>

        <ContentPanel as="section">
          <span className="eyebrow">Separate linked records</span>
          <h2 className="mt-1">Transaction history</h2>
          <p className="muted mt-2">Provider acknowledgment is a separate record and is not this receipt.</p>
          <div className="mt-6">
            <Timeline steps={steps} />
          </div>
          {record.adjustments.length > 0 && (
            <div className="mt-6 border-t pt-5">
              <h3 className="text-base">Linked adjustments</h3>
              {record.adjustments.map((adjustment) => (
                <p key={adjustment.envelope.id} className="mt-2 text-sm">
                  <strong>{adjustment.envelope.id}</strong> · {adjustment.type} · {adjustment.status} ·{" "}
                  {adjustment.reason}
                </p>
              ))}
            </div>
          )}
        </ContentPanel>
      </div>
    </>
  );
}

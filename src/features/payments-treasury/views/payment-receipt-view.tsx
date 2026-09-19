"use client";

import Link from "next/link";

import { ArrowLeft, ReceiptText } from "lucide-react";

import { useDemoRequester } from "@/features/unified-account-and-id/providers/demo-requester-provider";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useDemoSession } from "@/shared/providers/demo-session-provider";

import { MoneyStatusBadge } from "../components/money-status-badge";
import { paymentLedgerRepository } from "../services/payment-ledger";
import { formatPhp } from "../services/payment-presentation";

export function PaymentReceiptView({ receiptId }: { receiptId: string }) {
  const { session, ready } = useDemoSession();
  const { active } = useDemoRequester();
  const result = paymentLedgerRepository.readByReceipt(receiptId);
  if (!ready)
    return (
      <div className="site-container page-loading" role="status">
        Opening sample receipt…
      </div>
    );
  const record = result.kind === "success" ? result.data : undefined;
  const assessment = record?.lifecycle.assessment;
  const allowed =
    session &&
    assessment &&
    (assessment.payer.id === active.subjectId ||
      assessment.payer.label.toLocaleLowerCase() === active.subjectLabel.toLocaleLowerCase());
  const receipt = record?.lifecycle.receipts.find(
    (item) => item.envelope.id === receiptId.toUpperCase() || item.receiptNumber === receiptId.toUpperCase(),
  );
  if (!allowed || !receipt || !record)
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={ReceiptText}
          headingLevel="h1"
          title="Sample receipt unavailable"
          description="Sign in with the matching payer context or return to your payment records."
          action={
            <Button asChild variant="outline">
              <Link href="/payments">Return to payments</Link>
            </Button>
          }
        />
      </div>
    );
  const collection = record.lifecycle.collections.find((item) => item.envelope.id === receipt.collectionId);
  return (
    <div className="site-container page-content">
      <PageHeader
        title="Sample payment receipt"
        description="A watermarked UI preview linked to one confirmed collection."
        parent="Payments"
        parentHref="/payments"
      />
      <NoticePanel className="mb-6">
        This is not an official receipt and cannot be used as proof of payment.
      </NoticePanel>
      <ContentPanel as="article" className="mx-auto max-w-2xl">
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
          Issued by {receipt.issuedBy ?? "Sample cashier"}. No file is downloaded or shared outside this local
          prototype.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href={`/payments/assessments/${assessment.envelope.id}`}>
            <ArrowLeft /> Back to assessment
          </Link>
        </Button>
      </ContentPanel>
    </div>
  );
}

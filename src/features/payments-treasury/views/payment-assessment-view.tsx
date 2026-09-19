"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, CreditCard, ExternalLink, ReceiptText } from "lucide-react";

import { useDemoRequester } from "@/features/unified-account-and-id/providers/demo-requester-provider";
import { buildSignInPath } from "@/features/unified-account-and-id/services/account-navigation";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useDemoSession } from "@/shared/providers/demo-session-provider";

import { MoneyStatusBadge } from "../components/money-status-badge";
import { SourcePaymentHandoff } from "../components/source-payment-handoff";
import { paymentLedgerRepository } from "../services/payment-ledger";
import { formatPhp, PAYMENT_CHANNEL_LABELS, sourceServiceRoute } from "../services/payment-presentation";
import type { PaymentChannel, PaymentLedgerRecord } from "../types/payment-treasury";

function payerCanOpen(record: PaymentLedgerRecord, subjectId: string, subjectLabel: string) {
  const payer = record.lifecycle.assessment.payer;
  return payer.id === subjectId || payer.label.toLocaleLowerCase() === subjectLabel.toLocaleLowerCase();
}

export function PaymentAssessmentView({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const { session, ready } = useDemoSession();
  const { active } = useDemoRequester();
  const [channel, setChannel] = useState<PaymentChannel>("mock-e-wallet");
  const [operation, setOperation] = useState<RepositoryResult<unknown> | null>(null);
  const result = paymentLedgerRepository.read(assessmentId);

  if (!ready)
    return (
      <div className="site-container page-loading" role="status">
        Opening assessment…
      </div>
    );
  if (!session) {
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={CreditCard}
          headingLevel="h1"
          title="Sign in to open this assessment."
          description="Use the demo member flow, then return to the same sample assessment."
          action={
            <Button asChild>
              <Link href={buildSignInPath(`/payments/assessments/${assessmentId}`)}>Continue to demo sign-in</Link>
            </Button>
          }
        />
      </div>
    );
  }
  if (result.kind !== "success" || !payerCanOpen(result.data, active.subjectId, active.subjectLabel)) {
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={CreditCard}
          headingLevel="h1"
          title="Assessment unavailable"
          description="This sample assessment is not part of the current payer context."
          action={
            <Button asChild variant="outline">
              <Link href="/payments">Return to payments</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const record = result.data;
  const assessment = record.lifecycle.assessment;
  const receipt = record.lifecycle.receipts.at(-1);
  const payable = assessment.balance.minorUnits > 0 && ["issued", "partially-paid"].includes(assessment.status);
  const operationMessage =
    operation?.kind === "invalid"
      ? operation.errors.map((error) => error.message).join(" ")
      : operation?.kind === "failure"
        ? operation.message
        : undefined;

  function continueCheckout() {
    const started = paymentLedgerRepository.startAttempt(assessment.envelope.id, channel);
    setOperation(started);
    if (started.kind === "success") router.push(`/payments/attempts/${started.data.attempt.envelope.id}`);
  }

  return (
    <div className="site-container page-content">
      <PageHeader
        title={`Assessment ${assessment.envelope.reference}`}
        description="Check the payer, payee, rule snapshot, and every illustrative line before continuing."
        parent="Payments"
        parentHref="/payments"
      />
      <NoticePanel className="mb-6">
        All amounts and channels are. This screen never asks for an account number, card, PIN, OTP, or wallet
        credential.
      </NoticePanel>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">{assessment.serviceModule}</span>
              <h2>{assessment.serviceReference}</h2>
            </div>
            <MoneyStatusBadge state={{ kind: "assessment", status: assessment.status }} />
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Payer</dt>
              <dd className="font-medium">{assessment.payer.label}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Payee</dt>
              <dd className="font-medium">{assessment.payee.label}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Rule snapshot</dt>
              <dd>{assessment.ruleVersion}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Due</dt>
              <dd>{formatDemoDateTime(assessment.dueAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Payment policy</dt>
              <dd>
                {assessment.partialPaymentPolicy === "allowed" ? "Partial payment allowed" : "Full balance required"}
              </dd>
            </div>
          </dl>
          <h3 className="mt-7 text-base">Item breakdown</h3>
          <div className="mt-3 divide-y rounded-lg border">
            {assessment.lineItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-5 p-4">
                <div>
                  <strong className="block">{item.label}</strong>
                  <span className="text-muted-foreground text-sm">{item.basis}</span>
                </div>
                <span className="shrink-0 font-medium">
                  {item.effect === "subtract" ? "−" : ""}
                  {formatPhp(item.amount.minorUnits)}
                </span>
              </div>
            ))}
          </div>
          <dl className="mt-5 space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <dt>Total</dt>
              <dd>{formatPhp(assessment.total.minorUnits)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Confirmed allocation</dt>
              <dd>− {formatPhp(assessment.allocated.minorUnits)}</dd>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <dt>Balance due</dt>
              <dd>{formatPhp(assessment.balance.minorUnits)}</dd>
            </div>
          </dl>
        </ContentPanel>

        <ContentPanel as="aside" className="h-fit">
          <span className="eyebrow">Local checkout simulation</span>
          <h2 className="mt-1">Choose a sample channel</h2>
          <p className="muted mt-2">
            The next screen creates or reopens a local attempt. It does not contact a provider.
          </p>
          <p className="mt-3 rounded-lg bg-muted p-3 text-sm">No provider charge is calculated in this prototype.</p>
          {payable ? (
            <>
              <RadioGroup
                value={channel}
                onValueChange={(value) => setChannel(value as PaymentChannel)}
                className="mt-5"
              >
                {(Object.entries(PAYMENT_CHANNEL_LABELS) as [PaymentChannel, string][]).map(([value, label]) => (
                  <div key={value} className="flex items-center gap-3 rounded-lg border p-3">
                    <RadioGroupItem value={value} aria-label={label} />
                    <span>{label}</span>
                  </div>
                ))}
              </RadioGroup>
              {operationMessage && (
                <p className="mt-4 text-destructive text-sm" role="alert">
                  {operationMessage}
                </p>
              )}
              <Button className="mt-5 w-full" onClick={continueCheckout}>
                <CreditCard /> Continue sample checkout
              </Button>
            </>
          ) : receipt ? (
            <Button asChild className="mt-5 w-full">
              <Link href={`/payments/receipts/${receipt.envelope.id}`}>
                <ReceiptText /> View sample receipt
              </Link>
            </Button>
          ) : (
            <p className="mt-5 rounded-lg bg-muted p-4 text-sm">
              This assessment is not currently available for checkout.
            </p>
          )}
          <div className="mt-5 grid gap-2 border-t pt-5">
            <Button asChild variant="outline">
              <Link href={sourceServiceRoute(record)}>
                <ExternalLink /> Return to source service
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/payments">
                <ArrowLeft /> All assessments
              </Link>
            </Button>
          </div>
        </ContentPanel>
      </div>
      <SourcePaymentHandoff record={record} />
    </div>
  );
}

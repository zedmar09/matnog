"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowLeft, CheckCircle2, Clock3, CreditCard, ExternalLink, ReceiptText, RotateCw } from "lucide-react";

import { useDemoRequester } from "@/features/unified-account-and-id/providers/demo-requester-provider";
import { buildSignInPath } from "@/features/unified-account-and-id/services/account-navigation";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useDemoSession } from "@/shared/providers/demo-session-provider";

import { MoneyStatusBadge } from "../components/money-status-badge";
import { paymentLedgerRepository } from "../services/payment-ledger";
import {
  confirmationEventId,
  formatPhp,
  PAYMENT_CHANNEL_LABELS,
  sourceServiceRoute,
} from "../services/payment-presentation";
import type { PaymentLedgerRecord } from "../types/payment-treasury";

function payerCanOpen(record: PaymentLedgerRecord, subjectId: string, subjectLabel: string) {
  const payer = record.lifecycle.assessment.payer;
  return payer.id === subjectId || payer.label.toLocaleLowerCase() === subjectLabel.toLocaleLowerCase();
}

export function PaymentAttemptView({ attemptId }: { attemptId: string }) {
  const { session, ready } = useDemoSession();
  const { active } = useDemoRequester();
  const [result, setResult] = useState<RepositoryResult<PaymentLedgerRecord>>(() =>
    paymentLedgerRepository.readByAttempt(attemptId),
  );
  const [message, setMessage] = useState<string>();

  if (!ready)
    return (
      <div className="site-container page-loading" role="status">
        Checking sample attempt…
      </div>
    );
  if (!session)
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={CreditCard}
          headingLevel="h1"
          title="Sign in to review this attempt."
          description="The same sample result will remain available after demo sign-in."
          action={
            <Button asChild>
              <Link href={buildSignInPath(`/payments/attempts/${attemptId}`)}>Continue to demo sign-in</Link>
            </Button>
          }
        />
      </div>
    );
  if (result.kind !== "success" || !payerCanOpen(result.data, active.subjectId, active.subjectLabel)) {
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={CreditCard}
          headingLevel="h1"
          title="Payment attempt unavailable"
          description="This attempt is not part of the current payer context."
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
  const attempt = record.lifecycle.attempts.find((item) => item.envelope.id === attemptId.toUpperCase());
  if (!attempt) return null;
  const resolvedAttemptId = attempt.envelope.id;
  const acknowledgment = record.lifecycle.acknowledgments.find((item) => item.attemptId === attempt.envelope.id);
  const collection = record.lifecycle.collections.find((item) => item.attemptId === attempt.envelope.id);
  const receipt = collection
    ? record.lifecycle.receipts.find((item) => item.collectionId === collection.envelope.id)
    : undefined;
  const canRecheck = ["created", "pending", "confirmation-uncertain"].includes(attempt.status);

  function recheck() {
    const checked = paymentLedgerRepository.confirmAttempt(
      assessment.envelope.id,
      resolvedAttemptId,
      confirmationEventId(resolvedAttemptId),
    );
    if (checked.kind === "success") {
      setResult({ kind: "success", data: checked.data.record });
      setMessage(
        checked.data.outcome === "confirmed"
          ? "Sample confirmation received. One collection and one sample receipt were created."
          : "The repeated event was ignored; totals did not change.",
      );
    } else {
      setMessage(
        checked.kind === "invalid"
          ? checked.errors.map((error) => error.message).join(" ")
          : "The sample result could not be refreshed.",
      );
    }
  }

  return (
    <div className="site-container page-content">
      <PageHeader
        title="Payment attempt"
        description="Recheck an uncertain local result before starting another checkout."
        parent="Assessment"
        parentHref={`/payments/assessments/${assessment.envelope.id}`}
      />
      <NoticePanel className="mb-6">
        A provider message is separate from a confirmed municipal collection. This preview calls no external service.
      </NoticePanel>
      {message && (
        <div className="registry-save-notice mb-6" role="status">
          {message}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="eyebrow">{attempt.envelope.reference}</span>
              <h2 className="mt-1">{PAYMENT_CHANNEL_LABELS[attempt.channel]}</h2>
            </div>
            <MoneyStatusBadge state={{ kind: "attempt", status: attempt.status }} />
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Requested amount</dt>
              <dd className="font-semibold text-lg">{formatPhp(attempt.requestedAmount.minorUnits)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Started</dt>
              <dd>{formatDemoDateTime(attempt.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Sample external reference</dt>
              <dd>{attempt.sampleExternalReference ?? "None"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Last checked</dt>
              <dd>{attempt.lastCheckedAt ? formatDemoDateTime(attempt.lastCheckedAt) : "Not checked"}</dd>
            </div>
          </dl>
          {acknowledgment && (
            <div className="mt-6 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base">Provider acknowledgment</h3>
                <MoneyStatusBadge state={{ kind: "provider-acknowledgment", status: acknowledgment.status }} />
              </div>
              <p className="muted mt-2">{acknowledgment.message}</p>
            </div>
          )}
          {canRecheck && (
            <Button className="mt-6" onClick={recheck}>
              <RotateCw /> Recheck sample result
            </Button>
          )}
          {attempt.status === "failed" && (
            <Button asChild className="mt-6">
              <Link href={`/payments/assessments/${assessment.envelope.id}`}>
                <CreditCard /> Try another sample channel
              </Link>
            </Button>
          )}
        </ContentPanel>

        <ContentPanel as="aside" className="h-fit">
          {collection ? (
            <>
              <CheckCircle2 className="text-primary" size={32} />
              <h2 className="mt-3">Confirmed collection</h2>
              <MoneyStatusBadge state={{ kind: "collection", status: collection.status }} />
              <dl className="mt-5 space-y-3">
                <div>
                  <dt className="text-muted-foreground text-xs">Collection reference</dt>
                  <dd>{collection.envelope.reference}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Confirmed amount</dt>
                  <dd className="font-semibold">{formatPhp(collection.grossAmount.minorUnits)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Stable event</dt>
                  <dd>{collection.confirmationEventId}</dd>
                </div>
              </dl>
              {receipt && (
                <Button asChild className="mt-5 w-full">
                  <Link href={`/payments/receipts/${receipt.envelope.id}`}>
                    <ReceiptText /> View sample receipt
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <Clock3 className="text-primary" size={32} />
              <h2 className="mt-3">No confirmed collection</h2>
              <p className="muted mt-2">Pending, uncertain, and failed attempts never show a paid result or receipt.</p>
            </>
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
    </div>
  );
}

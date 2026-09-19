"use client";

import Link from "next/link";

import { ArrowRight, CreditCard, WalletCards } from "lucide-react";

import { useDemoRequester } from "@/features/unified-account-and-id/providers/demo-requester-provider";
import { buildSignInPath } from "@/features/unified-account-and-id/services/account-navigation";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { SectionHeading } from "@/shared/components/section-heading";
import { Button } from "@/shared/components/ui/button";
import { useDemoSession } from "@/shared/providers/demo-session-provider";

import { AssessmentSummary } from "../components/assessment-summary";
import { PaymentScenarioPicker } from "../components/payment-scenario-picker";
import { paymentLedgerRepository } from "../services/payment-ledger";

export function PaymentsView() {
  const { session, ready } = useDemoSession();
  const { active } = useDemoRequester();

  if (!ready) {
    return (
      <div className="site-container page-loading" role="status">
        Opening sample assessments…
      </div>
    );
  }
  if (!session) {
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={WalletCards}
          headingLevel="h1"
          title="Sign in to review assessments."
          description="The demo sign-in opens payment records for a named requester."
          action={
            <Button asChild>
              <Link href={buildSignInPath("/payments")}>
                Continue to demo sign-in <ArrowRight />
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const records = paymentLedgerRepository.listForPayer(active.subjectId, active.subjectLabel);
  const due = records.filter(({ lifecycle }) => lifecycle.assessment.balance.minorUnits > 0);
  const closed = records.filter(({ lifecycle }) => lifecycle.assessment.balance.minorUnits === 0);
  return (
    <div className="site-container page-content">
      <PageHeader
        title="Payments and assessments"
        description="Review amounts, try a local checkout, and distinguish attempts from confirmed collections."
        parent="Services"
        parentHref="/services"
      />
      <NoticePanel className="mb-6">
        UI demonstration only. No wallet, bank, card, account credential, or real payment is requested or sent.
      </NoticePanel>
      <ContentPanel className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Current payer context</span>
          <h2>{active.subjectLabel}</h2>
          <p className="muted">
            {active.authorityLabel} · {active.subjectId}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/account/profile">
            Review requester context <ArrowRight />
          </Link>
        </Button>
      </ContentPanel>

      {records.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No assessments for this requester"
          description="Choose another authorized requester from the account profile, or return to municipal services."
          action={
            <Button asChild variant="outline">
              <Link href="/account/profile">Open account profile</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-9">
          <PaymentScenarioPicker records={records} />
          <section aria-labelledby="due-assessments">
            <SectionHeading
              eyebrow="Action required"
              title="Due assessments"
              description={`${due.length} sample assessment${due.length === 1 ? "" : "s"} with a remaining balance.`}
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {due.map((record) => (
                <AssessmentSummary key={record.lifecycle.assessment.envelope.id} record={record} />
              ))}
            </div>
          </section>
          <section aria-labelledby="payment-history">
            <SectionHeading eyebrow="History" title="Paid and closed assessments" />
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {closed.map((record) => (
                <AssessmentSummary key={record.lifecycle.assessment.envelope.id} record={record} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

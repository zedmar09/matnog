import Link from "next/link";

import { ArrowRight, ReceiptText } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { Button } from "@/shared/components/ui/button";
import { formatDemoDateTime } from "@/shared/data/demo-clock";

import { formatPhp } from "../services/payment-presentation";
import type { PaymentLedgerRecord } from "../types/payment-treasury";
import { MoneyStatusBadge } from "./money-status-badge";

export function AssessmentSummary({ record }: { record: PaymentLedgerRecord }) {
  const assessment = record.lifecycle.assessment;
  return (
    <ContentPanel as="article" className="flex h-full flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">{assessment.serviceModule}</span>
          <h2 className="mt-1 text-xl">{assessment.serviceReference}</h2>
          <p className="muted mt-1">Assessment {assessment.envelope.reference}</p>
        </div>
        <MoneyStatusBadge state={{ kind: "assessment", status: assessment.status }} />
      </div>
      <dl className="grid grid-cols-2 gap-4 border-y py-4">
        <div>
          <dt className="text-muted-foreground text-xs">Total</dt>
          <dd className="font-semibold">{formatPhp(assessment.total.minorUnits)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Balance</dt>
          <dd className="font-semibold text-primary">{formatPhp(assessment.balance.minorUnits)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground text-xs">Payee</dt>
          <dd>{assessment.payee.label}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground text-xs">Due</dt>
          <dd>{formatDemoDateTime(assessment.dueAt)}</dd>
        </div>
      </dl>
      <div className="mt-auto">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/payments/assessments/${assessment.envelope.id}`}>
            <ReceiptText /> Review assessment <ArrowRight />
          </Link>
        </Button>
      </div>
    </ContentPanel>
  );
}

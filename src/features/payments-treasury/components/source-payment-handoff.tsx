import Link from "next/link";

import { ArrowRight, Link2 } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";

import { sourceModulePaymentProjection } from "../services/payment-adapters";
import type { PaymentLedgerRecord, SourcePaymentGateStatus } from "../types/payment-treasury";

const GATE_TONES: Record<SourcePaymentGateStatus, StatusTone> = {
  satisfied: "success",
  partial: "warning",
  pending: "pending",
  exception: "destructive",
};

export function SourcePaymentHandoff({ record }: { record: PaymentLedgerRecord }) {
  const projection = sourceModulePaymentProjection(record);
  return (
    <ContentPanel as="section" className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">Source-module payment handoff</span>
          <h2 className="mt-1">{projection.moduleId} payment gate</h2>
          <p className="muted mt-2">{projection.moduleLabel}</p>
        </div>
        <StatusBadge tone={GATE_TONES[projection.paymentGateStatus]}>{projection.paymentGateLabel}</StatusBadge>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <strong className="block">M06 reports</strong>
          <p className="mt-2 text-sm">{projection.guidance}</p>
          <p className="mt-3 text-muted-foreground text-sm">{projection.payeeBoundary}</p>
        </div>
        <div className="rounded-xl border p-4">
          <strong className="block">Source module decides</strong>
          <p className="mt-2 text-sm">{projection.sourceDecisionLabel}.</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Service</dt>
              <dd>{projection.serviceReference}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Assessment</dt>
              <dd>{projection.assessmentId}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <p className="text-muted-foreground text-sm">
          <Link2 className="mr-2 inline size-4" /> This projection creates no source-module decision.
        </p>
        <Button asChild variant="outline">
          <Link href={projection.sourceRoute}>
            Open source service guide <ArrowRight />
          </Link>
        </Button>
      </div>
    </ContentPanel>
  );
}

"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowRight, FlaskConical } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { Button } from "@/shared/components/ui/button";

import { PAYMENT_SCENARIO_DETAILS, paymentScenarioRoute } from "../services/payment-presentation";
import type { PaymentLedgerRecord } from "../types/payment-treasury";

export function PaymentScenarioPicker({ records }: { records: readonly PaymentLedgerRecord[] }) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(records[0]?.lifecycle.assessment.envelope.id ?? "");
  const selected =
    records.find((record) => record.lifecycle.assessment.envelope.id === selectedAssessmentId) ?? records[0];
  if (!selected) return null;
  const detail = PAYMENT_SCENARIO_DETAILS[selected.scenario];

  return (
    <ContentPanel as="section" className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow">S10 scenario coverage</span>
          <h2 className="mt-1">Scenario walkthrough</h2>
          <p className="muted mt-2">
            Choose a fixture available to the current payer. Other fixtures appear after changing requester context.
          </p>
        </div>
        <FlaskConical className="text-primary" aria-hidden="true" />
      </div>
      <div className="mt-5 grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="form-field">
          <span className="form-label">Payment scenario</span>
          <select
            className="h-10 w-full rounded-lg border bg-background px-3"
            value={selected.lifecycle.assessment.envelope.id}
            onChange={(event) => setSelectedAssessmentId(event.target.value)}
          >
            {records.map((record) => (
              <option key={record.lifecycle.assessment.envelope.id} value={record.lifecycle.assessment.envelope.id}>
                {PAYMENT_SCENARIO_DETAILS[record.scenario].label} · {record.lifecycle.assessment.serviceReference}
              </option>
            ))}
          </select>
        </label>
        <Button asChild>
          <Link href={paymentScenarioRoute(selected)}>
            Open selected scenario <ArrowRight />
          </Link>
        </Button>
      </div>
      <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
        <strong>{detail.label}.</strong> {detail.description}
      </p>
    </ContentPanel>
  );
}

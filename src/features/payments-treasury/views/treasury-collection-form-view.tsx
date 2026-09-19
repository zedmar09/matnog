"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Banknote } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { paymentLedgerRepository } from "../services/payment-ledger";
import { displayFinancialReference, formatPhp, parsePhpInput, phpInputValue } from "../services/payment-presentation";

function messageFor<T>(result: RepositoryResult<T>) {
  if (result.kind === "invalid") return result.errors.map((error) => error.message).join(" ");
  if (result.kind === "empty") return result.reason ?? "The assessment was not found.";
  if (result.kind === "conflict" || result.kind === "denied" || result.kind === "failure") return result.message;
  return "The collection could not be recorded.";
}

function eligibleAssessments() {
  return paymentLedgerRepository.list().filter((record) => {
    const assessment = record.lifecycle.assessment;
    const unresolved = record.lifecycle.attempts.some((attempt) =>
      ["pending", "confirmation-uncertain"].includes(attempt.status),
    );
    return assessment.balance.minorUnits > 0 && ["issued", "partially-paid"].includes(assessment.status) && !unresolved;
  });
}

export function TreasuryCollectionFormView() {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const assessments = eligibleAssessments();
  const initial = assessments.at(0)?.lifecycle.assessment;
  const [assessmentId, setAssessmentId] = useState(initial?.envelope.id ?? "");
  const [amount, setAmount] = useState(initial ? phpInputValue(initial.balance.minorUnits) : "");
  const [eventId, setEventId] = useState(initial ? `EVT-CASH-${initial.envelope.id.replace("DEMO-ASM-", "")}-02` : "");
  const [error, setError] = useState("");

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Collection recording requires municipal access"
        description="Only authorized municipal treasury staff can record cashier collections."
      />
    );
  }

  function changeAssessment(nextId: string) {
    setAssessmentId(nextId);
    const assessment = assessments.find((record) => record.lifecycle.assessment.envelope.id === nextId)?.lifecycle
      .assessment;
    if (!assessment) return;
    setAmount(phpInputValue(assessment.balance.minorUnits));
    setEventId(`EVT-CASH-${assessment.envelope.id.replace("DEMO-ASM-", "")}-02`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const amountMinorUnits = parsePhpInput(amount);
    if (amountMinorUnits === null) {
      setError("Enter a valid collection amount.");
      return;
    }
    const result = paymentLedgerRepository.postCashCollection(assessmentId, amountMinorUnits, eventId);
    if (result.kind !== "success") {
      setError(messageFor(result));
      return;
    }
    router.push(`/ops/treasury/collections/${result.data.collectionId}`);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/treasury/collections">
            <ArrowLeft size={15} /> Collections
          </Link>
          <h1>Record collection</h1>
          <p>Select an open assessment and record the amount received at the cashier counter.</p>
        </div>
      </div>

      {assessments.length ? (
        <ContentPanel as="section">
          <form className="grid gap-5" onSubmit={submit}>
            <label className="form-field">
              <span className="form-label">Assessment</span>
              <select
                className="h-10 rounded-lg border bg-background px-3"
                value={assessmentId}
                onChange={(event) => changeAssessment(event.target.value)}
              >
                {assessments.map((record) => {
                  const assessment = record.lifecycle.assessment;
                  return (
                    <option key={assessment.envelope.id} value={assessment.envelope.id}>
                      {displayFinancialReference(assessment.envelope.reference)} · {assessment.payer.label} ·{" "}
                      {formatPhp(assessment.balance.minorUnits)} due
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="collection-amount" label="Amount received (PHP)">
                {(props) => (
                  <Input
                    {...props}
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="collection-event-reference" label="Transaction event reference">
                {(props) => <Input {...props} value={eventId} onChange={(event) => setEventId(event.target.value)} />}
              </FormField>
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3 border-t pt-5">
              <Button asChild type="button" variant="outline">
                <Link href="/ops/treasury/collections">Cancel</Link>
              </Button>
              <Button type="submit">
                <Banknote /> Record collection
              </Button>
            </div>
          </form>
        </ContentPanel>
      ) : (
        <EmptyState
          icon={Banknote}
          title="No assessment is ready for collection"
          description="Resolve pending payment attempts or create an assessment before recording a cashier collection."
          action={
            <Button asChild>
              <Link href="/ops/treasury/assessments/new">Create assessment</Link>
            </Button>
          }
        />
      )}
    </>
  );
}

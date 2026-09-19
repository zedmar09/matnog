"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Plus, Save, WalletCards } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { BARANGAY_TREASURY_PAYEE, MUNICIPAL_TREASURY_PAYEE } from "../data/payment-ledger-fixtures";
import { paymentLedgerRepository } from "../services/payment-ledger";
import { parsePhpInput, phpInputValue } from "../services/payment-presentation";
import type { AssessmentIssueInput } from "../types/payment-treasury";

type ServiceModule = AssessmentIssueInput["serviceModule"];

function messageFor<T>(result: RepositoryResult<T>) {
  if (result.kind === "invalid") return result.errors.map((error) => error.message).join(" ");
  if (result.kind === "empty") return result.reason ?? "The assessment was not found.";
  if (result.kind === "conflict" || result.kind === "denied" || result.kind === "failure") return result.message;
  return "The assessment could not be saved.";
}

export function TreasuryAssessmentFormView({ assessmentId }: { assessmentId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const result = assessmentId ? paymentLedgerRepository.read(assessmentId) : undefined;
  const assessment = result?.kind === "success" ? result.data.lifecycle.assessment : undefined;
  const editing = Boolean(assessmentId);
  const [serviceModule, setServiceModule] = useState<ServiceModule>(
    (assessment?.serviceModule as ServiceModule | undefined) ?? "M03 Business permits",
  );
  const [serviceReference, setServiceReference] = useState(assessment?.serviceReference ?? "");
  const [payerLabel, setPayerLabel] = useState(assessment?.payer.label ?? "");
  const [payerKind, setPayerKind] = useState<"person" | "business">(
    assessment?.payer.kind === "business" ? "business" : "person",
  );
  const [amount, setAmount] = useState(assessment ? phpInputValue(assessment.total.minorUnits) : "");
  const [dueDate, setDueDate] = useState(assessment?.dueAt.slice(0, 10) ?? "2026-10-15");
  const [partialPaymentPolicy, setPartialPaymentPolicy] = useState<"allowed" | "disallowed">(
    assessment?.partialPaymentPolicy ?? "disallowed",
  );
  const [error, setError] = useState("");

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Assessment maintenance requires municipal access"
        description="Only authorized municipal treasury staff can create or edit assessments."
      />
    );
  }
  if (editing && !assessment) {
    return (
      <EmptyState
        icon={WalletCards}
        headingLevel="h1"
        title="Assessment unavailable"
        description="The assessment reference was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/treasury/assessments">Back to assessments</Link>
          </Button>
        }
      />
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const totalMinorUnits = parsePhpInput(amount);
    if (totalMinorUnits === null || totalMinorUnits <= 0) {
      setError("Enter a positive assessment amount with no more than two decimal places.");
      return;
    }
    const saveResult = assessment
      ? paymentLedgerRepository.updateAssessment(
          assessment.envelope.id,
          { serviceReference, payerLabel, totalMinorUnits, dueAt: dueDate, partialPaymentPolicy },
          assessment.envelope.version,
        )
      : paymentLedgerRepository.issueAssessment({
          serviceModule,
          serviceReference,
          payer: {
            id: `LOCAL-${payerKind.toUpperCase()}-${serviceReference
              .trim()
              .toUpperCase()
              .replaceAll(/[^A-Z0-9]+/g, "-")}`,
            kind: payerKind,
            label: payerLabel.trim(),
          },
          payee: serviceModule === "M07 Barangay clearances" ? BARANGAY_TREASURY_PAYEE : MUNICIPAL_TREASURY_PAYEE,
          ruleVersion: "MTO-FEE-SCHEDULE-2026.1",
          lineItems: [
            {
              id: "NEW-ASSESSMENT-L1",
              label: "Assessed municipal service fee",
              basis: "Approved municipal fee schedule",
              effect: "add",
              amount: { currency: "PHP", minorUnits: totalMinorUnits },
            },
          ],
          partialPaymentPolicy,
          dueAt: dueDate,
        });
    if (saveResult.kind !== "success") {
      setError(messageFor(saveResult));
      return;
    }
    router.push("/ops/treasury/assessments");
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/treasury/assessments">
            <ArrowLeft size={15} /> Assessments
          </Link>
          <h1>{assessment ? "Edit assessment" : "New assessment"}</h1>
          <p>Record the service reference, payer, amount, due date, and collection policy.</p>
        </div>
      </div>

      <ContentPanel as="section">
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <label className="form-field">
            <span className="form-label">Service</span>
            <select
              className="h-10 rounded-lg border bg-background px-3"
              value={serviceModule}
              disabled={Boolean(assessment)}
              onChange={(event) => setServiceModule(event.target.value as ServiceModule)}
            >
              <option value="M03 Business permits">Business permits</option>
              <option value="M04 Tourism">Tourism and maritime</option>
              <option value="M07 Barangay clearances">Barangay clearances</option>
            </select>
          </label>
          <FormField id="assessment-service-reference" label="Service reference">
            {(props) => (
              <Input
                {...props}
                value={serviceReference}
                onChange={(event) => setServiceReference(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="assessment-payer" label="Payer name">
            {(props) => <Input {...props} value={payerLabel} onChange={(event) => setPayerLabel(event.target.value)} />}
          </FormField>
          <label className="form-field">
            <span className="form-label">Payer type</span>
            <select
              className="h-10 rounded-lg border bg-background px-3"
              value={payerKind}
              disabled={Boolean(assessment)}
              onChange={(event) => setPayerKind(event.target.value as "person" | "business")}
            >
              <option value="person">Resident</option>
              <option value="business">Business</option>
            </select>
          </label>
          <FormField id="assessment-total" label="Assessment amount (PHP)">
            {(props) => (
              <Input
                {...props}
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="assessment-due-date" label="Due date">
            {(props) => (
              <Input {...props} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            )}
          </FormField>
          <label className="form-field sm:col-span-2">
            <span className="form-label">Collection policy</span>
            <select
              className="h-10 rounded-lg border bg-background px-3"
              value={partialPaymentPolicy}
              onChange={(event) => setPartialPaymentPolicy(event.target.value as "allowed" | "disallowed")}
            >
              <option value="disallowed">Full payment required</option>
              <option value="allowed">Partial payments allowed</option>
            </select>
          </label>
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
            <Button asChild type="button" variant="outline">
              <Link href="/ops/treasury/assessments">Cancel</Link>
            </Button>
            <Button type="submit">
              {assessment ? <Save /> : <Plus />}
              {assessment ? "Save changes" : "Create assessment"}
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}

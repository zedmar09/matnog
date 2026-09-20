"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Plus, Save } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { budgetAccountingRepository as repository } from "../services/budget-accounting-repository";

export type BudgetRecordKind =
  | "allocation"
  | "obligation"
  | "disbursement"
  | "adjustment"
  | "reconciliation"
  | "period";
const plural: Record<BudgetRecordKind, string> = {
  allocation: "allocations",
  obligation: "obligations",
  disbursement: "disbursements",
  adjustment: "adjustments",
  reconciliation: "reconciliation",
  period: "periods",
};

export function BudgetFormView({
  kind,
  recordId,
  prefillReference,
}: {
  kind: BudgetRecordKind;
  recordId?: string;
  prefillReference?: string;
}) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const allocationRecord = kind === "allocation" && recordId ? repository.findAllocation(recordId) : undefined;
  const obligationRecord = kind === "obligation" && recordId ? repository.findObligation(recordId) : undefined;
  const disbursementRecord = kind === "disbursement" && recordId ? repository.findDisbursement(recordId) : undefined;
  const adjustmentRecord = kind === "adjustment" && recordId ? repository.findChange(recordId) : undefined;
  const reconciliationRecord = kind === "reconciliation" && recordId ? repository.findRevenue(recordId) : undefined;
  const periodRecord = kind === "period" && recordId ? repository.findPeriod(recordId) : undefined;
  const record =
    allocationRecord ??
    obligationRecord ??
    disbursementRecord ??
    adjustmentRecord ??
    reconciliationRecord ??
    periodRecord;
  const editing = Boolean(recordId);
  const [error, setError] = useState("");
  const [fiscalPeriod, setFiscalPeriod] = useState(allocationRecord?.fiscalPeriod ?? "FY 2027");
  const [fund, setFund] = useState(allocationRecord?.fund ?? "");
  const [department, setDepartment] = useState(allocationRecord?.department ?? "");
  const [projectReference, setProjectReference] = useState(allocationRecord?.projectReference ?? "");
  const [allocationAmount, setAllocationAmount] = useState(
    allocationRecord ? String(allocationRecord.appropriatedMinor / 100) : "",
  );
  const [source, setSource] = useState(allocationRecord?.source ?? "");
  const [allocationReference, setAllocationReference] = useState(
    obligationRecord?.appropriationReference ?? (kind === "obligation" ? (prefillReference ?? "") : ""),
  );
  const [payee, setPayee] = useState(obligationRecord?.payeeProjection ?? "");
  const [purpose, setPurpose] = useState(obligationRecord?.purpose ?? "");
  const [requested, setRequested] = useState(obligationRecord ? String(obligationRecord.requestedMinor / 100) : "");
  const [evidence, setEvidence] = useState(obligationRecord?.evidenceReferences.join(", ") ?? "");
  const [requester, setRequester] = useState(obligationRecord?.requester ?? "");
  const [reviewer, setReviewer] = useState(obligationRecord?.reviewer ?? "Municipal Budget Office");
  const [reason, setReason] = useState(obligationRecord?.reason ?? "");
  const [obligationReference, setObligationReference] = useState(
    disbursementRecord?.obligationReference ?? (kind === "disbursement" ? (prefillReference ?? "") : ""),
  );
  const [projectBilling, setProjectBilling] = useState(disbursementRecord?.projectBillingReference ?? "");
  const [assistanceReference, setAssistanceReference] = useState(disbursementRecord?.assistanceReference ?? "");
  const [gross, setGross] = useState(disbursementRecord ? String(disbursementRecord.grossMinor / 100) : "");
  const [retention, setRetention] = useState(
    disbursementRecord ? String(disbursementRecord.retentionMinor / 100) : "0",
  );
  const [adjustmentType, setAdjustmentType] = useState(adjustmentRecord?.type ?? "realignment");
  const [fromReference, setFromReference] = useState(adjustmentRecord?.fromReference ?? "");
  const [toReference, setToReference] = useState(adjustmentRecord?.toReference ?? "");
  const [adjustmentAmount, setAdjustmentAmount] = useState(
    adjustmentRecord ? String(adjustmentRecord.amountMinor / 100) : "",
  );
  const [beforeAmount, setBeforeAmount] = useState(adjustmentRecord ? String(adjustmentRecord.beforeMinor / 100) : "");
  const [afterAmount, setAfterAmount] = useState(adjustmentRecord ? String(adjustmentRecord.afterMinor / 100) : "");
  const [adjustmentRequester, setAdjustmentRequester] = useState(adjustmentRecord?.requester ?? "");
  const [adjustmentReviewer, setAdjustmentReviewer] = useState(adjustmentRecord?.reviewer ?? "Municipal Budget Office");
  const [adjustmentReason, setAdjustmentReason] = useState(adjustmentRecord?.reason ?? "");
  const [collectionReference, setCollectionReference] = useState(reconciliationRecord?.collectionReference ?? "");
  const [settlementReference, setSettlementReference] = useState(reconciliationRecord?.settlementReference ?? "");
  const [collectionAmount, setCollectionAmount] = useState(
    reconciliationRecord ? String(reconciliationRecord.amountMinor / 100) : "",
  );
  const [mappedAccount, setMappedAccount] = useState(reconciliationRecord?.mappedAccount ?? "");
  const [postingBatch, setPostingBatch] = useState(reconciliationRecord?.postingBatch ?? "");
  const [reconciliationStatus, setReconciliationStatus] = useState(
    reconciliationRecord?.status ?? "For reconciliation",
  );
  const [differenceAmount, setDifferenceAmount] = useState(
    reconciliationRecord ? String(reconciliationRecord.differenceMinor / 100) : "0",
  );
  const [periodLabel, setPeriodLabel] = useState(periodRecord?.label ?? "");
  const [periodStatus, setPeriodStatus] = useState(periodRecord?.status ?? "open");
  const [revenueComplete, setRevenueComplete] = useState(
    periodRecord?.checklist.find((item) => item.label === "Revenue reconciliation")?.complete ?? false,
  );
  const [voucherComplete, setVoucherComplete] = useState(
    periodRecord?.checklist.find((item) => item.label === "Open voucher review")?.complete ?? false,
  );
  const [postingComplete, setPostingComplete] = useState(
    periodRecord?.checklist.find((item) => item.label === "Posting exceptions")?.complete ?? false,
  );
  if (role !== "municipal")
    return (
      <PermissionState
        title="Budget maintenance requires municipal access"
        description="Authorized municipal staff can maintain financial records."
      />
    );
  if (editing && !record)
    return (
      <EmptyState
        icon={Plus}
        headingLevel="h1"
        title="Record unavailable"
        description="The requested financial record could not be found."
      />
    );
  const destination = `/ops/finance/${plural[kind]}`;
  function pesos(value: string) {
    return Math.round(Number(value) * 100);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    let saved: unknown;
    if (kind === "allocation") {
      const input = {
        fiscalPeriod,
        fund,
        department,
        projectReference: projectReference || undefined,
        appropriatedMinor: pesos(allocationAmount),
        source,
      };
      saved = editing ? repository.updateAllocation(recordId ?? "", input) : repository.createAllocation(input);
    }
    if (kind === "obligation") {
      const input = {
        appropriationReference: allocationReference,
        payeeProjection: payee,
        purpose,
        requestedMinor: pesos(requested),
        evidenceReferences: evidence
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        requester,
        reviewer: reviewer || undefined,
        reason: reason || undefined,
        status: obligationRecord?.status,
      };
      saved = editing ? repository.updateObligation(recordId ?? "", input) : repository.createObligation(input);
    }
    if (kind === "disbursement") {
      const input = {
        obligationReference,
        projectBillingReference: projectBilling || undefined,
        assistanceReference: assistanceReference || undefined,
        grossMinor: pesos(gross),
        retentionMinor: pesos(retention),
        releaseReference: disbursementRecord?.releaseReference,
        postingReference: disbursementRecord?.postingReference,
        status: disbursementRecord?.status,
      };
      saved = editing ? repository.updateDisbursement(recordId ?? "", input) : repository.createDisbursement(input);
    }
    if (kind === "adjustment") {
      const input = {
        type: adjustmentType as "realignment" | "supplemental" | "adjustment",
        fromReference,
        toReference,
        amountMinor: pesos(adjustmentAmount),
        beforeMinor: pesos(beforeAmount),
        afterMinor: pesos(afterAmount),
        requester: adjustmentRequester,
        reviewer: adjustmentReviewer,
        reason: adjustmentReason,
        status: adjustmentRecord?.status,
      };
      saved = editing ? repository.updateChange(recordId ?? "", input) : repository.createChange(input);
    }
    if (kind === "reconciliation") {
      const input = {
        collectionReference,
        settlementReference,
        amountMinor: pesos(collectionAmount),
        mappedAccount,
        postingBatch: postingBatch || undefined,
        status: reconciliationStatus,
        differenceMinor: pesos(differenceAmount),
      };
      saved = editing ? repository.updateRevenue(recordId ?? "", input) : repository.createRevenue(input);
    }
    if (kind === "period") {
      const input = {
        label: periodLabel,
        status: periodStatus as "open" | "closing" | "closed",
        checklist: [
          { label: "Revenue reconciliation", complete: revenueComplete },
          { label: "Open voucher review", complete: voucherComplete },
          { label: "Posting exceptions", complete: postingComplete },
        ],
      };
      saved = editing ? repository.updatePeriod(recordId ?? "", input) : repository.createPeriod(input);
    }
    if (!saved) {
      setError("Complete all required fields with valid values before saving.");
      return;
    }
    router.push(editing ? `${destination}/${recordId}` : destination);
  }
  const label = kind === "reconciliation" ? "reconciliation record" : kind;
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href={destination}>
            <ArrowLeft size={15} /> {plural[kind][0].toUpperCase() + plural[kind].slice(1)}
          </Link>
          <h1>{editing ? `Edit ${label}` : `New ${label}`}</h1>
          <p>
            {editing
              ? `Update ${recordId} while retaining its financial workflow state.`
              : `Create a new ${label} for the municipal financial workspace.`}
          </p>
        </div>
      </div>
      <ContentPanel as="section">
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          {kind === "allocation" && (
            <>
              <FormField id="allocation-period" label="Fiscal period" required>
                {(props) => (
                  <Input {...props} value={fiscalPeriod} onChange={(event) => setFiscalPeriod(event.target.value)} />
                )}
              </FormField>
              <FormField id="allocation-fund" label="Fund or funding source" required>
                {(props) => <Input {...props} value={fund} onChange={(event) => setFund(event.target.value)} />}
              </FormField>
              <FormField id="allocation-office" label="Responsible office" required>
                {(props) => (
                  <Input {...props} value={department} onChange={(event) => setDepartment(event.target.value)} />
                )}
              </FormField>
              <FormField id="allocation-project" label="Project reference">
                {(props) => (
                  <Input
                    {...props}
                    value={projectReference}
                    onChange={(event) => setProjectReference(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="allocation-amount" label="Approved amount (PHP)" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="1"
                    value={allocationAmount}
                    onChange={(event) => setAllocationAmount(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="allocation-source" label="Appropriation authority" required>
                {(props) => <Input {...props} value={source} onChange={(event) => setSource(event.target.value)} />}
              </FormField>
            </>
          )}
          {kind === "obligation" && (
            <>
              <FormField id="obligation-allocation" label="Allocation reference" required>
                {(props) => (
                  <NativeSelect
                    {...props}
                    value={allocationReference}
                    onChange={(event) => setAllocationReference(event.target.value)}
                  >
                    <option value="">Select allocation</option>
                    {repository.allocations().map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id} · {item.fund}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="obligation-payee" label="Payee" required>
                {(props) => <Input {...props} value={payee} onChange={(event) => setPayee(event.target.value)} />}
              </FormField>
              <label className="form-field sm:col-span-2">
                <span className="form-label">Purpose</span>
                <Textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} />
              </label>
              <FormField id="obligation-amount" label="Requested amount (PHP)" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="1"
                    value={requested}
                    onChange={(event) => setRequested(event.target.value)}
                  />
                )}
              </FormField>
              <FormField
                id="obligation-evidence"
                label="Supporting references"
                hint="Separate references with commas"
                required
              >
                {(props) => <Input {...props} value={evidence} onChange={(event) => setEvidence(event.target.value)} />}
              </FormField>
              <FormField id="obligation-requester" label="Requesting office" required>
                {(props) => (
                  <Input {...props} value={requester} onChange={(event) => setRequester(event.target.value)} />
                )}
              </FormField>
              <FormField id="obligation-reviewer" label="Budget reviewer" required>
                {(props) => <Input {...props} value={reviewer} onChange={(event) => setReviewer(event.target.value)} />}
              </FormField>
              <label className="form-field sm:col-span-2">
                <span className="form-label">Review note</span>
                <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
              </label>
            </>
          )}
          {kind === "disbursement" && (
            <>
              <FormField id="disbursement-obligation" label="Obligation reference" required>
                {(props) => (
                  <NativeSelect
                    {...props}
                    value={obligationReference}
                    onChange={(event) => setObligationReference(event.target.value)}
                  >
                    <option value="">Select obligation</option>
                    {repository.listObligations().map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id} · {item.purpose}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="disbursement-billing" label="Project billing reference">
                {(props) => (
                  <Input
                    {...props}
                    value={projectBilling}
                    onChange={(event) => setProjectBilling(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="disbursement-assistance" label="Assistance reference">
                {(props) => (
                  <Input
                    {...props}
                    value={assistanceReference}
                    onChange={(event) => setAssistanceReference(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="disbursement-gross" label="Gross amount (PHP)" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="1"
                    value={gross}
                    onChange={(event) => setGross(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="disbursement-retention" label="Retention (PHP)" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="0"
                    value={retention}
                    onChange={(event) => setRetention(event.target.value)}
                  />
                )}
              </FormField>
            </>
          )}
          {kind === "adjustment" && (
            <>
              <FormField id="adjustment-type" label="Adjustment type" required>
                {(props) => (
                  <NativeSelect
                    {...props}
                    value={adjustmentType}
                    onChange={(event) =>
                      setAdjustmentType(event.target.value as "realignment" | "supplemental" | "adjustment")
                    }
                  >
                    <option value="realignment">Realignment</option>
                    <option value="supplemental">Supplemental</option>
                    <option value="adjustment">Correction</option>
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="adjustment-from" label="Source reference" required>
                {(props) => (
                  <Input {...props} value={fromReference} onChange={(event) => setFromReference(event.target.value)} />
                )}
              </FormField>
              <FormField id="adjustment-to" label="Destination reference" required>
                {(props) => (
                  <Input {...props} value={toReference} onChange={(event) => setToReference(event.target.value)} />
                )}
              </FormField>
              <FormField id="adjustment-amount" label="Adjustment amount (PHP)" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="1"
                    value={adjustmentAmount}
                    onChange={(event) => setAdjustmentAmount(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="adjustment-before" label="Balance before (PHP)" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="0"
                    value={beforeAmount}
                    onChange={(event) => setBeforeAmount(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="adjustment-after" label="Balance after (PHP)" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="0"
                    value={afterAmount}
                    onChange={(event) => setAfterAmount(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="adjustment-requester" label="Requesting office" required>
                {(props) => (
                  <Input
                    {...props}
                    value={adjustmentRequester}
                    onChange={(event) => setAdjustmentRequester(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="adjustment-reviewer" label="Independent reviewer" required>
                {(props) => (
                  <Input
                    {...props}
                    value={adjustmentReviewer}
                    onChange={(event) => setAdjustmentReviewer(event.target.value)}
                  />
                )}
              </FormField>
              <label className="form-field sm:col-span-2">
                <span className="form-label">Reason and authority</span>
                <Textarea value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} />
              </label>
            </>
          )}
          {kind === "reconciliation" && (
            <>
              <FormField id="reconciliation-collection" label="Collection reference" required>
                {(props) => (
                  <Input
                    {...props}
                    value={collectionReference}
                    onChange={(event) => setCollectionReference(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="reconciliation-settlement" label="Settlement reference" required>
                {(props) => (
                  <Input
                    {...props}
                    value={settlementReference}
                    onChange={(event) => setSettlementReference(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="reconciliation-amount" label="Collection amount (PHP)" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="1"
                    value={collectionAmount}
                    onChange={(event) => setCollectionAmount(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="reconciliation-difference" label="Difference (PHP)" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="0"
                    value={differenceAmount}
                    onChange={(event) => setDifferenceAmount(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="reconciliation-account" label="Mapped account" required>
                {(props) => (
                  <Input {...props} value={mappedAccount} onChange={(event) => setMappedAccount(event.target.value)} />
                )}
              </FormField>
              <FormField id="reconciliation-batch" label="Posting batch">
                {(props) => (
                  <Input {...props} value={postingBatch} onChange={(event) => setPostingBatch(event.target.value)} />
                )}
              </FormField>
              <FormField id="reconciliation-status" label="Status" required>
                {(props) => (
                  <NativeSelect
                    {...props}
                    value={reconciliationStatus}
                    onChange={(event) => setReconciliationStatus(event.target.value)}
                  >
                    <option>For reconciliation</option>
                    <option>Exception</option>
                    <option>Reconciled</option>
                    <option>For posting</option>
                    <option>Posted</option>
                  </NativeSelect>
                )}
              </FormField>
            </>
          )}
          {kind === "period" && (
            <>
              <FormField id="period-label" label="Fiscal period label" required>
                {(props) => (
                  <Input {...props} value={periodLabel} onChange={(event) => setPeriodLabel(event.target.value)} />
                )}
              </FormField>
              <FormField id="period-status" label="Status" required>
                {(props) => (
                  <NativeSelect
                    {...props}
                    value={periodStatus}
                    onChange={(event) => setPeriodStatus(event.target.value as "open" | "closing" | "closed")}
                  >
                    <option value="open">Open</option>
                    <option value="closing">Closing</option>
                  </NativeSelect>
                )}
              </FormField>
              <fieldset className="rounded-xl border p-4 sm:col-span-2">
                <legend className="px-2 font-semibold">Closing checklist</legend>
                {[
                  ["Revenue reconciliation", revenueComplete, setRevenueComplete],
                  ["Open voucher review", voucherComplete, setVoucherComplete],
                  ["Posting exceptions", postingComplete, setPostingComplete],
                ].map(([label, checked, setter]) => (
                  <label className="flex items-center gap-3 border-b py-3 last:border-0" key={String(label)}>
                    <input
                      type="checkbox"
                      checked={Boolean(checked)}
                      onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)}
                    />
                    <span>{String(label)}</span>
                  </label>
                ))}
              </fieldset>
            </>
          )}
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
            <Button asChild type="button" variant="outline">
              <Link href={destination}>Cancel</Link>
            </Button>
            <Button type="submit">
              {editing ? <Save /> : <Plus />}
              {editing ? "Save changes" : `Create ${label}`}
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}

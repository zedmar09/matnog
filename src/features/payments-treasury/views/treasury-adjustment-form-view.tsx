"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Plus } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { paymentLedgerRepository } from "../services/payment-ledger";
import { displayFinancialReference, formatPhp, parsePhpInput, phpInputValue } from "../services/payment-presentation";
import type { AdjustmentType } from "../types/payment-treasury";

function messageFor<T>(result: RepositoryResult<T>) {
  if (result.kind === "invalid") return result.errors.map((error) => error.message).join(" ");
  if (result.kind === "empty") return result.reason ?? "The collection was not found.";
  if (result.kind === "conflict" || result.kind === "denied" || result.kind === "failure") return result.message;
  return "The adjustment request could not be saved.";
}

export function TreasuryAdjustmentFormView({ initialCollectionId }: { initialCollectionId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const options = paymentLedgerRepository
    .list()
    .flatMap((record) => record.lifecycle.collections.map((collection) => ({ record, collection })));
  const initial = options.find((option) => option.collection.envelope.id === initialCollectionId) ?? options.at(0);
  const [collectionId, setCollectionId] = useState(initial?.collection.envelope.id ?? "");
  const [type, setType] = useState<AdjustmentType>("refund");
  const [amount, setAmount] = useState(initial ? phpInputValue(initial.collection.grossAmount.minorUnits) : "");
  const [reason, setReason] = useState("");
  const [requestedBy, setRequestedBy] = useState("Mila A. Duran · Cashier I");
  const [error, setError] = useState("");
  const selected = options.find((option) => option.collection.envelope.id === collectionId);

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Adjustment requests require municipal access"
        description="Only authorized municipal treasury staff can create adjustment requests."
      />
    );
  }

  function changeCollection(nextId: string) {
    setCollectionId(nextId);
    const next = options.find((option) => option.collection.envelope.id === nextId);
    if (next) setAmount(phpInputValue(next.collection.grossAmount.minorUnits));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const amountMinorUnits = parsePhpInput(amount);
    if (amountMinorUnits === null) {
      setError("Enter a valid adjustment amount.");
      return;
    }
    const result = paymentLedgerRepository.requestAdjustment({
      collectionId,
      type,
      amountMinorUnits,
      reason,
      requestedBy,
    });
    if (result.kind !== "success") {
      setError(messageFor(result));
      return;
    }
    router.push(`/ops/treasury/adjustments/${result.data.envelope.id}`);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/treasury/adjustments">
            <ArrowLeft size={15} /> Adjustments
          </Link>
          <h1>New adjustment</h1>
          <p>Record a refund, void, reversal, or chargeback request against an existing collection.</p>
        </div>
      </div>

      <ContentPanel as="section">
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <label className="form-field sm:col-span-2">
            <span className="form-label">Collection</span>
            <select
              className="h-10 rounded-lg border bg-background px-3"
              value={collectionId}
              onChange={(event) => changeCollection(event.target.value)}
            >
              {options.map((option) => (
                <option key={option.collection.envelope.id} value={option.collection.envelope.id}>
                  {displayFinancialReference(option.collection.envelope.reference)} ·{" "}
                  {option.record.lifecycle.assessment.payer.label} ·{" "}
                  {formatPhp(option.collection.grossAmount.minorUnits)}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="form-label">Adjustment type</span>
            <select
              className="h-10 rounded-lg border bg-background px-3"
              value={type}
              onChange={(event) => setType(event.target.value as AdjustmentType)}
            >
              <option value="refund">Refund</option>
              <option value="void">Void</option>
              <option value="reversal">Reversal</option>
              <option value="chargeback">Chargeback</option>
            </select>
          </label>
          <FormField id="adjustment-amount" label="Amount (PHP)">
            {(props) => (
              <Input
                {...props}
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="adjustment-requester" label="Requesting officer">
            {(props) => (
              <Input {...props} value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} />
            )}
          </FormField>
          <label className="form-field sm:col-span-2">
            <span className="form-label">Reason</span>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          {selected && (
            <p className="rounded-lg bg-muted p-3 text-muted-foreground text-sm sm:col-span-2">
              Available collection amount: {formatPhp(selected.collection.grossAmount.minorUnits)} ·{" "}
              {selected.record.lifecycle.assessment.serviceReference}
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
            <Button asChild type="button" variant="outline">
              <Link href="/ops/treasury/adjustments">Cancel</Link>
            </Button>
            <Button type="submit">
              <Plus /> Create request
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}

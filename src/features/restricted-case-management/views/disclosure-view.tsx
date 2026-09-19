"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowLeft, EyeOff, ShieldCheck, Trash2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type DisclosureValues, disclosureSchema } from "../schemas/case-schema";
import { localRestrictedCaseRepository as repository } from "../services/local-restricted-case-repository";
import type { DisclosureDecision } from "../types/restricted-case";

const BLANK: DisclosureValues = {
  purpose: "",
  requestedFields: "case reference, eligibility decision",
  actor: "",
  outcome: "Approved",
};

export function DisclosureView({ caseId }: { caseId: string }) {
  const { role } = useWorkspaceSession();
  const [, refresh] = useState(0);
  const [values, setValues] = useState<DisclosureValues>(BLANK);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [deleting, setDeleting] = useState<DisclosureDecision>();
  const [notice, setNotice] = useState<string>();
  const record = repository.caseRecord(caseId);
  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Disclosure review is not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );
  if (!record)
    return (
      <PermissionState
        title="Case unavailable"
        description="The requested case record was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/cases">Back to cases</Link>
          </Button>
        }
      />
    );
  const decisions = repository.caseDisclosures(record.id);
  function set<K extends keyof DisclosureValues>(key: K, next: DisclosureValues[K]) {
    setValues((current) => ({ ...current, [key]: next }));
  }
  function save() {
    if (!record) return;
    const parsed = disclosureSchema.safeParse(values);
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })),
      );
    const result = repository.createDisclosure(record.id, parsed.data);
    if (!result) return setErrors([{ id: "form", message: "The disclosure decision could not be recorded." }]);
    setValues(BLANK);
    setErrors([]);
    setNotice(`${result.outcome} disclosure decision recorded.`);
    refresh((value) => value + 1);
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">Disclosure review</span>
          <h1>{record.discreetLabel}</h1>
          <p>{record.id} · minimum necessary fields only</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/ops/cases/${record.id}`}>
            <ArrowLeft />
            Back to case
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This disclosure decision could not be recorded" />
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <ContentPanel as="section">
          <ShieldCheck className="text-primary" />
          <h2 className="mt-3">New disclosure decision</h2>
          <p className="muted">Record the purpose, requested fields, reviewing officer, and outcome.</p>
          <div className="mt-5 grid gap-4">
            <FormField id="purpose" label="Disclosure purpose" required>
              {(field) => (
                <Textarea {...field} value={values.purpose} onChange={(event) => set("purpose", event.target.value)} />
              )}
            </FormField>
            <FormField id="requestedFields" label="Requested fields" hint="Separate fields with commas." required>
              {(field) => (
                <Input
                  {...field}
                  value={values.requestedFields}
                  onChange={(event) => set("requestedFields", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="actor" label="Reviewing officer" required>
              {(field) => (
                <Input {...field} value={values.actor} onChange={(event) => set("actor", event.target.value)} />
              )}
            </FormField>
            <FormField id="outcome" label="Decision" required>
              {(field) => (
                <Select
                  value={values.outcome}
                  onValueChange={(next) => set("outcome", next as DisclosureValues["outcome"])}
                >
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>
          <Button className="mt-5" onClick={save}>
            Record decision
          </Button>
        </ContentPanel>
        <ContentPanel as="section">
          <EyeOff className="text-primary" />
          <h2 className="mt-3">Disclosure history</h2>
          <p className="muted">
            Case narrative, party details, evidence contents, and protected referrals remain excluded unless explicitly
            authorized.
          </p>
          <div className="mt-5 grid gap-3">
            {decisions.length ? (
              decisions.map((item) => (
                <div className="rounded-xl border p-4" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <strong>{item.purpose}</strong>
                      <p className="muted mt-1 text-sm">
                        {item.actor} · {item.at}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={item.outcome === "Approved" ? "success" : "destructive"}>
                        {item.outcome}
                      </StatusBadge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 />
                        <span className="sr-only">Delete disclosure</span>
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm">Requested: {item.requestedFields.join(", ")}</p>
                </div>
              ))
            ) : (
              <p className="muted text-sm">No disclosure decisions are recorded for this case.</p>
            )}
          </div>
        </ContentPanel>
      </div>
      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title="Delete disclosure decision"
        description="This removes the selected decision from the case disclosure history."
        confirmLabel="Delete decision"
        destructive
        onConfirm={() => {
          if (deleting) repository.deleteDisclosure(deleting.id);
          setDeleting(undefined);
          setNotice("Disclosure decision deleted.");
          refresh((value) => value + 1);
        }}
      />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";

import { REGISTRY_ACTORS } from "@/features/resident-household-registry/services/registry-projections";
import {
  listPersonRecordOptions,
  type PersonRecordOption,
} from "@/features/resident-household-registry/services/registry-selectors";
import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { LoadingState } from "@/shared/components/loading-state";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type LedgerEntryValues, ledgerEntrySchema } from "../schemas/ledger-schema";
import { localSectoralAssistanceRepository as repository } from "../services/local-sectoral-assistance-repository";
import type { BenefitLedgerStatus } from "../types/sectoral-assistance";

const STATUSES: BenefitLedgerStatus[] = ["Released", "Pending confirmation", "Cancelled"];
const BLANK: LedgerEntryValues = {
  requestId: "",
  recipient: "",
  recipientName: "",
  program: "",
  period: "",
  value: "",
  fundSource: "",
  releasedAt: "2026-09-19T08:00",
  acknowledgment: "",
  status: "Pending confirmation",
};

function inputDateTime(value: string) {
  return value.replace(" ", "T").slice(0, 16);
}

function storedDateTime(value: string) {
  return value.replace("T", " ");
}

export function LedgerFormView({ entryId }: { entryId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [values, setValues] = useState<LedgerEntryValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  const [residentOptions, setResidentOptions] = useState<PersonRecordOption[]>([]);

  useEffect(() => {
    const actor =
      role === "municipal"
        ? REGISTRY_ACTORS["data-steward"]
        : role === "barangay"
          ? REGISTRY_ACTORS["barangay-staff"]
          : null;
    if (!actor) return;
    let active = true;
    void listPersonRecordOptions(actor).then((result) => {
      if (active) setResidentOptions(result.kind === "success" ? result.data : []);
    });
    return () => {
      active = false;
    };
  }, [role]);

  useEffect(() => {
    if (!entryId) {
      setValues(BLANK);
      return;
    }
    const entry = repository.ledgerEntry(entryId);
    if (!entry) {
      setValues(null);
      return;
    }
    setValues({
      requestId: entry.requestId,
      recipient: entry.recipient,
      recipientName: entry.recipientName,
      program: entry.program,
      period: entry.period,
      value: entry.value,
      fundSource: entry.fundSource,
      releasedAt: inputDateTime(entry.releasedAt),
      acknowledgment: entry.acknowledgment,
      status: entry.status,
    });
  }, [entryId]);

  if (role !== "municipal" && role !== "barangay") {
    return (
      <PermissionState
        title="The assistance ledger is not assigned to this role"
        description="Choose the municipal or barangay role."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/assistance/ledger">Back to ledger</Link>
          </Button>
        }
      />
    );
  }

  if (values === undefined) return <LoadingState label="Loading ledger entry" message="Opening the ledger entry…" />;
  if (values === null) {
    return (
      <PermissionState
        title="Ledger entry unavailable"
        description="That local ledger reference was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/assistance/ledger">Back to ledger</Link>
          </Button>
        }
      />
    );
  }

  function set<K extends keyof LedgerEntryValues>(key: K, next: LedgerEntryValues[K]) {
    setValues((current) => (current ? { ...current, [key]: next } : current));
  }

  function save() {
    if (!values || saving) return;
    if (!entryId) {
      const linked = repository.request(values.requestId);
      if (!linked) {
        setErrors([{ id: "requestId", message: "Choose an assistance request ready for release." }]);
        return;
      }
      const program = repository.programs.find((item) => item.id === linked.programId);
      const expectedRecipient = program?.recipientUnit === "person" ? linked.personId : linked.householdId;
      if (
        linked.status !== "Ready for release" ||
        !residentOptions.some((item) => item.personId === linked.personId) ||
        repository.ledger.some((item) => item.requestId === linked.id) ||
        values.recipient !== expectedRecipient ||
        values.program !== linked.programName ||
        values.period !== linked.period
      ) {
        setErrors([
          {
            id: "requestId",
            message:
              "Choose an in-scope request ready for release. Its recipient, program and period must stay linked.",
          },
        ]);
        return;
      }
    }
    const parsed = ledgerEntrySchema.safeParse({ ...values, releasedAt: storedDateTime(values.releasedAt) });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })));
      return;
    }
    setSaving(true);
    const result = entryId
      ? repository.updateLedgerEntry(entryId, parsed.data)
      : repository.createLedgerEntry(parsed.data);
    setSaving(false);
    if (!result) {
      setErrors([{ id: "form", message: "The ledger entry could not be saved." }]);
      return;
    }
    router.push(`/ops/assistance/ledger/${result.id}`);
  }

  const programOptions = [
    ...new Set([...repository.programs.map((item) => item.name), ...repository.ledger.map((item) => item.program)]),
  ];
  const fundOptions = [...new Set(repository.ledger.map((item) => item.fundSource))];
  const eligibleRequests = repository.requests.filter(
    (item) =>
      item.status === "Ready for release" &&
      residentOptions.some((person) => person.personId === item.personId) &&
      !repository.ledger.some((entry) => entry.requestId === item.id),
  );

  function selectRequest(requestId: string) {
    const request = repository.request(requestId);
    if (!request) return;
    const program = repository.programs.find((item) => item.id === request.programId);
    const person = residentOptions.find((item) => item.personId === request.personId);
    const recipient = program?.recipientUnit === "person" ? request.personId : request.householdId;
    setValues((current) =>
      current
        ? {
            ...current,
            requestId,
            recipient,
            recipientName:
              program?.recipientUnit === "person"
                ? (person?.displayName ?? request.personId)
                : `Household ${request.householdId}`,
            program: request.programName,
            period: request.period,
            value: request.approvedValue ?? request.requestedValue,
          }
        : current,
    );
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{entryId ? "Edit ledger entry" : "New ledger entry"}</h1>
        <p>
          {entryId
            ? `Update ${entryId} while keeping its assistance request and recipient references visible.`
            : "Record one assistance release with its recipient, program, period, value, fund source, and acknowledgment."}
        </p>
      </div>

      <ErrorSummary errors={errors} title="This ledger entry could not be saved" />

      <ContentPanel className="mb-6">
        <SectionHeading
          title="Recipient and assistance"
          description="Identify the request, recipient, program, and benefit covered by this entry."
        />
        <div className="mt-6">
          <FormSection title="Linked records">
            <FormField id="requestId" label="Assistance request reference" required>
              {(field) =>
                entryId ? (
                  <Input {...field} readOnly value={values.requestId} />
                ) : (
                  <Select value={values.requestId} onValueChange={selectRequest}>
                    <SelectTrigger id={field.id} className="form-select-trigger">
                      <SelectValue placeholder="Choose a request ready for release" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleRequests.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.id} · {item.programName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }
            </FormField>
            <FormField id="recipient" label="Resident or household reference" required>
              {(field) => (
                <Input
                  {...field}
                  readOnly={!entryId}
                  value={values.recipient}
                  placeholder="DEMO-HH-001"
                  onChange={(event) => set("recipient", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="recipientName" label="Recipient name" required>
              {(field) => (
                <Input
                  {...field}
                  readOnly={!entryId}
                  value={values.recipientName}
                  placeholder="Household or resident name"
                  onChange={(event) => set("recipientName", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="program" label="Program" required>
              {(field) => (
                <Select value={values.program} onValueChange={(next) => set("program", next)} disabled={!entryId}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue placeholder="Choose a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="period" label="Benefit period" required>
              {(field) => (
                <Input
                  {...field}
                  readOnly={!entryId}
                  value={values.period}
                  placeholder="September 2026"
                  onChange={(event) => set("period", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="value" label="Benefit or released value" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.value}
                  placeholder="₱3,000 medical assistance"
                  onChange={(event) => set("value", event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>

      <ContentPanel className="mb-6">
        <SectionHeading
          title="Release and funding"
          description="Record the fund source, acknowledgment, release time, and current ledger status."
        />
        <div className="mt-6">
          <FormSection title="Release record">
            <FormField id="fundSource" label="Fund source" required>
              {(field) => (
                <Select value={values.fundSource} onValueChange={(next) => set("fundSource", next)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue placeholder="Choose a fund source" />
                  </SelectTrigger>
                  <SelectContent>
                    {fundOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="releasedAt" label="Release date and time" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.releasedAt}
                  onChange={(event) => set("releasedAt", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="acknowledgment" label="Acknowledgment reference" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.acknowledgment}
                  placeholder="ACK-DEMO-009"
                  onChange={(event) => set("acknowledgment", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="status" label="Status" required>
              {(field) => (
                <Select value={values.status} onValueChange={(next) => set("status", next as BenefitLedgerStatus)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>

      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving}>
          <Save />
          {saving ? "Saving…" : entryId ? "Save changes" : "Create ledger entry"}
        </Button>
        <Button asChild variant="outline">
          <Link href={entryId ? `/ops/assistance/ledger/${entryId}` : "/ops/assistance/ledger"}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

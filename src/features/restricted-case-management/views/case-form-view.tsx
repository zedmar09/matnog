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
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type CaseRecordValues, caseRecordSchema } from "../schemas/case-schema";
import { localRestrictedCaseRepository as repository } from "../services/local-restricted-case-repository";
import type { CaseClass, CasePriority, CaseStatus } from "../types/restricted-case";

const CLASSES: CaseClass[] = ["Barangay justice", "VAWC referral", "Child protection", "Blotter record"];
const PRIORITIES: CasePriority[] = ["Routine", "Priority", "Urgent"];
const STATUSES: CaseStatus[] = ["New", "Under review", "Scheduled", "Referred", "Resolved", "Closed"];
const ELIGIBILITY: CaseRecordValues["certificateEligibility"][] = ["Eligible", "Not eligible", "Pending review"];
const BLANK: CaseRecordValues = {
  caseClass: "Barangay justice",
  participantPersonIds: [],
  discreetLabel: "",
  scope: "",
  assignedDesk: "Lupon Tagapamayapa",
  assignedOfficer: "",
  procedureVersion: "Katarungang Pambarangay Procedure 2026.1",
  priority: "Routine",
  status: "New",
  openedAt: "2026-09-19T08:00",
  updatedAt: "2026-09-19T08:00",
  schedule: "Not scheduled",
  administrativeSummary: "",
  evidence: "",
  referral: "Pending desk assessment",
  certificateEligibility: "Pending review",
};
const inputDate = (value: string) => value.replace(" ", "T").slice(0, 16);
const storedDate = (value: string) => value.replace("T", " ");

export function CaseFormView({ caseId }: { caseId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [values, setValues] = useState<CaseRecordValues | null>();
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
      if (active && result.kind === "success") setResidentOptions(result.data);
    });
    return () => {
      active = false;
    };
  }, [role]);

  useEffect(() => {
    if (!caseId) return setValues(BLANK);
    const record = repository.caseRecord(caseId);
    if (!record) return setValues(null);
    setValues({
      ...record,
      participantPersonIds: record.participantPersonIds ?? [],
      openedAt: inputDate(record.openedAt),
      updatedAt: inputDate(record.updatedAt),
      evidence: record.evidence.join(", "),
    });
  }, [caseId]);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Case management is not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );
  if (values === undefined) return <LoadingState label="Loading case" message="Opening the case record…" />;
  if (values === null)
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

  function set<K extends keyof CaseRecordValues>(key: K, next: CaseRecordValues[K]) {
    setValues((current) => (current ? { ...current, [key]: next } : current));
  }
  function changeClass(next: CaseClass) {
    const presets: Record<CaseClass, Pick<CaseRecordValues, "assignedDesk" | "procedureVersion">> = {
      "Barangay justice": {
        assignedDesk: "Lupon Tagapamayapa",
        procedureVersion: "Katarungang Pambarangay Procedure 2026.1",
      },
      "VAWC referral": { assignedDesk: "VAWC Desk", procedureVersion: "VAWC Referral Protocol 2026.2" },
      "Child protection": {
        assignedDesk: "Barangay Council for the Protection of Children",
        procedureVersion: "Child Protection Referral Protocol 2026.1",
      },
      "Blotter record": {
        assignedDesk: "Barangay Public Safety Desk",
        procedureVersion: "Barangay Incident Recording Procedure 2026.1",
      },
    };
    setValues((current) => (current ? { ...current, caseClass: next, ...presets[next] } : current));
  }
  function save() {
    if (!values || saving) return;
    const parsed = caseRecordSchema.safeParse({
      ...values,
      openedAt: storedDate(values.openedAt),
      updatedAt: storedDate(values.updatedAt),
    });
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })),
      );
    setSaving(true);
    const result = caseId ? repository.updateCase(caseId, parsed.data) : repository.createCase(parsed.data);
    setSaving(false);
    if (!result) return setErrors([{ id: "form", message: "The case record could not be saved." }]);
    router.push(`/ops/cases/${result.id}`);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{caseId ? "Edit case" : "New case"}</h1>
        <p>
          {caseId
            ? `Update ${caseId} while preserving its case history and disclosure records.`
            : "Create a protected case record and assign it to the responsible desk and officer."}
        </p>
      </div>
      <ErrorSummary errors={errors} title="This case could not be saved" />
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Classification and assignment"
          description="Classify the record, define its scope, and identify the responsible desk and officer."
        />
        <div className="mt-6">
          <FormSection title="Case assignment">
            <FormField id="caseClass" label="Case class" required>
              {(field) => (
                <Select value={values.caseClass} onValueChange={(next) => changeClass(next as CaseClass)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="discreetLabel" label="Discreet case label" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.discreetLabel}
                  placeholder="Mediation matter 2026-015"
                  onChange={(event) => set("discreetLabel", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="scope" label="Barangay or scope" required>
              {(field) => (
                <Input {...field} value={values.scope} onChange={(event) => set("scope", event.target.value)} />
              )}
            </FormField>
            <FormField
              id="participantPersonIds"
              label="Linked resident participants"
              hint="These IDs remain inside the restricted case workspace."
            >
              {(field) => (
                <>
                  <NativeSelect
                    {...field}
                    value=""
                    onChange={(event) => {
                      const personId = event.target.value;
                      if (personId && !values.participantPersonIds.includes(personId)) {
                        set("participantPersonIds", [...values.participantPersonIds, personId]);
                      }
                    }}
                  >
                    <option value="">Add a resident</option>
                    {residentOptions
                      .filter((person) => !values.participantPersonIds.includes(person.personId))
                      .map((person) => (
                        <option key={person.personId} value={person.personId}>
                          {person.displayName} · {person.personId}
                        </option>
                      ))}
                  </NativeSelect>
                  {values.participantPersonIds.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {values.participantPersonIds.map((personId) => (
                        <li
                          key={personId}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <span>
                            {residentOptions.find((person) => person.personId === personId)?.displayName ?? "Resident"}{" "}
                            · {personId}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              set(
                                "participantPersonIds",
                                values.participantPersonIds.filter((id) => id !== personId),
                              )
                            }
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </FormField>
            <FormField id="assignedDesk" label="Assigned desk" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.assignedDesk}
                  onChange={(event) => set("assignedDesk", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="assignedOfficer" label="Assigned officer" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.assignedOfficer}
                  onChange={(event) => set("assignedOfficer", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="procedureVersion" label="Procedure" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.procedureVersion}
                  onChange={(event) => set("procedureVersion", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="priority" label="Priority" required>
              {(field) => (
                <Select value={values.priority} onValueChange={(next) => set("priority", next as CasePriority)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="status" label="Status" required>
              {(field) => (
                <Select value={values.status} onValueChange={(next) => set("status", next as CaseStatus)}>
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
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Administrative record"
          description="Record operational dates, evidence references, disposition, and the minimum administrative summary."
        />
        <div className="mt-6">
          <FormSection title="Case information">
            <FormField id="openedAt" label="Opened at" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.openedAt}
                  onChange={(event) => set("openedAt", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="updatedAt" label="Last updated" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.updatedAt}
                  onChange={(event) => set("updatedAt", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="schedule" label="Schedule or next action" required>
              {(field) => (
                <Input {...field} value={values.schedule} onChange={(event) => set("schedule", event.target.value)} />
              )}
            </FormField>
            <FormField id="certificateEligibility" label="Certificate eligibility" required>
              {(field) => (
                <Select
                  value={values.certificateEligibility}
                  onValueChange={(next) =>
                    set("certificateEligibility", next as CaseRecordValues["certificateEligibility"])
                  }
                >
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ELIGIBILITY.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField
              id="evidence"
              label="Evidence references"
              hint="List references only and separate them with commas."
              required
            >
              {(field) => (
                <Input {...field} value={values.evidence} onChange={(event) => set("evidence", event.target.value)} />
              )}
            </FormField>
            <FormField id="referral" label="Referral or disposition" required>
              {(field) => (
                <Input {...field} value={values.referral} onChange={(event) => set("referral", event.target.value)} />
              )}
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="administrativeSummary" label="Administrative summary" required>
                {(field) => (
                  <Textarea
                    {...field}
                    value={values.administrativeSummary}
                    onChange={(event) => set("administrativeSummary", event.target.value)}
                  />
                )}
              </FormField>
            </div>
          </FormSection>
        </div>
      </ContentPanel>
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving}>
          <Save />
          {saving ? "Saving…" : caseId ? "Save changes" : "Create case"}
        </Button>
        <Button asChild variant="outline">
          <Link href={caseId ? `/ops/cases/${caseId}` : "/ops/cases"}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

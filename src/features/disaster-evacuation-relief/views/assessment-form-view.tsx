"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";

import { REGISTRY_ACTORS } from "@/features/resident-household-registry/services/registry-projections";
import {
  type HouseholdRecordOption,
  listHouseholdRecordOptions,
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
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type AssessmentValues, assessmentSchema } from "../schemas/disaster-schema";
import { localDisasterRepository as repository } from "../services/local-disaster-repository";
import type { AssessmentStatus } from "../types/disaster-records";

const STATUSES: AssessmentStatus[] = ["Draft", "For verification", "Verified", "Referred"];
const inputDate = (value: string) => value.replace(" ", "T").slice(0, 16);
const storedDate = (value: string) => value.replace("T", " ");

export function AssessmentFormView({
  assessmentId,
  defaultActivityId,
}: {
  assessmentId?: string;
  defaultActivityId?: string;
}) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [values, setValues] = useState<AssessmentValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  const [registryHouseholds, setRegistryHouseholds] = useState<HouseholdRecordOption[]>([]);

  useEffect(() => {
    const actor =
      role === "municipal"
        ? REGISTRY_ACTORS["data-steward"]
        : role === "barangay"
          ? REGISTRY_ACTORS["barangay-staff"]
          : null;
    if (!actor) return;
    let active = true;
    void listHouseholdRecordOptions(actor).then((result) => {
      if (active && result.kind === "success") setRegistryHouseholds(result.data);
    });
    return () => {
      active = false;
    };
  }, [role]);

  useEffect(() => {
    if (!assessmentId) {
      setValues({
        activityId: defaultActivityId ?? repository.activities[0]?.id ?? "",
        householdId: "",
        residentName: "",
        barangay: "",
        structureId: "",
        category: "",
        observation: "",
        evidence: "",
        assessedAt: "2026-09-19T08:00",
        assessor: "",
        status: "Draft",
        referral: "",
      });
      return;
    }
    const item = repository.assessment(assessmentId);
    if (!item) return setValues(null);
    setValues({ ...item, evidence: item.evidence.join(", "), assessedAt: inputDate(item.assessedAt) });
  }, [assessmentId, defaultActivityId]);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Damage assessment is not assigned to this role"
        description="Choose the municipal or barangay role."
      />
    );
  if (values === undefined)
    return <LoadingState label="Loading damage assessment" message="Opening the assessment record…" />;
  if (values === null)
    return (
      <PermissionState
        title="Assessment unavailable"
        description="The requested damage assessment was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/disaster/events">Back to activities</Link>
          </Button>
        }
      />
    );

  function set<K extends keyof AssessmentValues>(key: K, next: AssessmentValues[K]) {
    setValues((current) => (current ? { ...current, [key]: next } : current));
  }
  function save() {
    if (!values || saving) return;
    if (!assessmentId && !registryHouseholds.some((household) => household.householdId === values.householdId)) {
      setErrors([{ id: "householdId", message: "Choose a household from the municipal resident registry." }]);
      return;
    }
    const parsed = assessmentSchema.safeParse({ ...values, assessedAt: storedDate(values.assessedAt) });
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })),
      );
    setSaving(true);
    const result = assessmentId
      ? repository.updateAssessment(assessmentId, parsed.data)
      : repository.createAssessment(parsed.data);
    setSaving(false);
    if (!result) return setErrors([{ id: "form", message: "The damage assessment could not be saved." }]);
    router.push(`/ops/disaster/assessments/${result.id}`);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{assessmentId ? "Edit damage assessment" : "New damage assessment"}</h1>
        <p>
          {assessmentId
            ? `Update ${assessmentId}, its findings, evidence, status, and referral.`
            : "Record household and structure damage under the correct response activity."}
        </p>
      </div>
      <ErrorSummary errors={errors} title="This damage assessment could not be saved" />
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Household and structure"
          description="Identify the affected household, barangay, structure, response activity, and assigned assessor."
        />
        <div className="mt-6">
          <FormSection title="Assessment subject">
            <FormField
              id="registryHousehold"
              label="Municipal registry household"
              hint="New assessments use the permanent M01 household and structure references."
            >
              {(field) => (
                <Select
                  value={
                    registryHouseholds.some((row) => row.householdId === values.householdId) ? values.householdId : ""
                  }
                  onValueChange={(id) => {
                    const row = registryHouseholds.find((household) => household.householdId === id);
                    if (!row) return;
                    setValues((current) =>
                      current
                        ? {
                            ...current,
                            householdId: row.householdId,
                            residentName: row.label,
                            barangay: row.barangay?.label ?? "",
                            structureId: row.structureId ?? "",
                          }
                        : current,
                    );
                  }}
                >
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue placeholder="Choose a registered household" />
                  </SelectTrigger>
                  <SelectContent>
                    {registryHouseholds.map((row) => (
                      <SelectItem key={row.householdId} value={row.householdId}>
                        {row.label} · {row.householdId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="activityId" label="Activity" required>
              {(field) => (
                <Select value={values.activityId} onValueChange={(next) => set("activityId", next)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {repository.activities.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="householdId" label="Household reference" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.householdId}
                  placeholder="HH-MAT-01120"
                  readOnly={!assessmentId || registryHouseholds.some((row) => row.householdId === values.householdId)}
                  onChange={(event) => set("householdId", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="residentName" label="Household or resident name" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.residentName}
                  readOnly={!assessmentId || registryHouseholds.some((row) => row.householdId === values.householdId)}
                  onChange={(event) => set("residentName", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="barangay" label="Barangay" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.barangay}
                  readOnly={!assessmentId || registryHouseholds.some((row) => row.householdId === values.householdId)}
                  onChange={(event) => set("barangay", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="structureId" label="Structure reference" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.structureId}
                  placeholder="STR-MAT-01120"
                  readOnly={!assessmentId || registryHouseholds.some((row) => row.householdId === values.householdId)}
                  onChange={(event) => set("structureId", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="assessor" label="Assessor or team" required>
              {(field) => (
                <Input {...field} value={values.assessor} onChange={(event) => set("assessor", event.target.value)} />
              )}
            </FormField>
            <FormField id="assessedAt" label="Assessment date and time" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.assessedAt}
                  onChange={(event) => set("assessedAt", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="status" label="Status" required>
              {(field) => (
                <Select value={values.status} onValueChange={(next) => set("status", next as AssessmentStatus)}>
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
          title="Findings and referral"
          description="Document the observed damage, evidence references, and required next action."
        />
        <div className="mt-6">
          <FormSection title="Assessment findings">
            <FormField id="category" label="Damage category" required>
              {(field) => (
                <Input {...field} value={values.category} onChange={(event) => set("category", event.target.value)} />
              )}
            </FormField>
            <FormField
              id="evidence"
              label="Evidence references"
              hint="Separate multiple references with commas."
              required
            >
              {(field) => (
                <Input {...field} value={values.evidence} onChange={(event) => set("evidence", event.target.value)} />
              )}
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="observation" label="Assessment observation" required>
                {(field) => (
                  <Textarea
                    {...field}
                    value={values.observation}
                    onChange={(event) => set("observation", event.target.value)}
                  />
                )}
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField id="referral" label="Referral or next action" required>
                {(field) => (
                  <Input {...field} value={values.referral} onChange={(event) => set("referral", event.target.value)} />
                )}
              </FormField>
            </div>
          </FormSection>
        </div>
      </ContentPanel>
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving}>
          <Save />
          {saving ? "Saving…" : assessmentId ? "Save changes" : "Create assessment"}
        </Button>
        <Button asChild variant="outline">
          <Link
            href={
              assessmentId ? `/ops/disaster/assessments/${assessmentId}` : `/ops/disaster/events/${values.activityId}`
            }
          >
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

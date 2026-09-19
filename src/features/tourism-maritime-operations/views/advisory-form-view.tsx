"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";

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

import { type AdvisoryValues, advisorySchema } from "../schemas/tourism-schema";
import { tourismRepository as repository } from "../services/tourism-repository";
import type { TourismAdvisory } from "../types/tourism-records";

const BLANK: AdvisoryValues = {
  title: "",
  advisoryType: "Sea condition",
  severity: "Caution",
  status: "Draft",
  issuingAuthority: "Municipal Tourism Office",
  effectiveFrom: "2026-09-19T08:00",
  effectiveUntil: "2026-09-20T08:00",
  affectedDestinations: "",
  affectedOperators: "",
  details: "",
  instructions: "",
};
const split = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
export function AdvisoryFormView({ advisoryId }: { advisoryId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [values, setValues] = useState<AdvisoryValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!advisoryId) return setValues(BLANK);
    const item = repository.readAdvisory(advisoryId);
    setValues(
      item
        ? {
            title: item.title,
            advisoryType: item.advisoryType,
            severity: item.severity,
            status: item.status,
            issuingAuthority: item.issuingAuthority,
            effectiveFrom: item.effectiveFrom.replace(" ", "T"),
            effectiveUntil: item.effectiveUntil.replace(" ", "T"),
            affectedDestinations: item.affectedDestinations.join(", "),
            affectedOperators: item.affectedOperators.join(", "),
            details: item.details,
            instructions: item.instructions,
          }
        : null,
    );
  }, [advisoryId]);
  if (role !== "municipal")
    return (
      <PermissionState
        title="Tourism advisories are not assigned to this role"
        description="Choose the municipal staff role."
      />
    );
  if (values === undefined) return <LoadingState label="Loading advisory" message="Opening the advisory…" />;
  if (values === null)
    return (
      <PermissionState
        title="Advisory unavailable"
        description="The requested advisory was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/tourism/advisories">Back to advisories</Link>
          </Button>
        }
      />
    );
  function set<K extends keyof AdvisoryValues>(key: K, value: AdvisoryValues[K]) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }
  function save() {
    if (!values || saving) return;
    const parsed = advisorySchema.safeParse(values);
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })),
      );
    setSaving(true);
    const input: Omit<TourismAdvisory, "id" | "updatedAt"> = {
      ...parsed.data,
      effectiveFrom: parsed.data.effectiveFrom.replace("T", " "),
      effectiveUntil: parsed.data.effectiveUntil.replace("T", " "),
      affectedDestinations: split(parsed.data.affectedDestinations),
      affectedOperators: split(parsed.data.affectedOperators),
    };
    const result = advisoryId ? repository.updateAdvisory(advisoryId, input) : repository.createAdvisory(input);
    setSaving(false);
    if (!result) return setErrors([{ id: "form", message: "The advisory could not be saved." }]);
    router.push(`/ops/tourism/advisories/${result.id}`);
  }
  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{advisoryId ? "Edit advisory" : "New advisory"}</h1>
        <p>
          {advisoryId
            ? `Update ${advisoryId} and its operational scope.`
            : "Create a tourism or maritime notice with a defined authority, period, and affected routes."}
        </p>
      </div>
      <ErrorSummary errors={errors} title="This advisory could not be saved" />
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Advisory classification"
          description="Identify the notice, issuing authority, severity, publication state, and effective period."
        />
        <div className="mt-6">
          <FormSection title="Notice information">
            <div className="sm:col-span-2">
              <FormField id="title" label="Advisory title" required>
                {(field) => (
                  <Input {...field} value={values.title} onChange={(event) => set("title", event.target.value)} />
                )}
              </FormField>
            </div>
            <FormField id="advisoryType" label="Type" required>
              {(field) => (
                <Select
                  value={values.advisoryType}
                  onValueChange={(next) => set("advisoryType", next as AdvisoryValues["advisoryType"])}
                >
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Weather", "Sea condition", "Port operation", "Destination", "Safety"].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="severity" label="Severity" required>
              {(field) => (
                <Select
                  value={values.severity}
                  onValueChange={(next) => set("severity", next as AdvisoryValues["severity"])}
                >
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Information", "Caution", "Restricted", "Closed"].map((item) => (
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
                <Select value={values.status} onValueChange={(next) => set("status", next as AdvisoryValues["status"])}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Draft", "Active", "Resolved", "Cancelled"].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="issuingAuthority" label="Issuing authority" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.issuingAuthority}
                  onChange={(event) => set("issuingAuthority", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="effectiveFrom" label="Effective from" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.effectiveFrom}
                  onChange={(event) => set("effectiveFrom", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="effectiveUntil" label="Effective until" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.effectiveUntil}
                  onChange={(event) => set("effectiveUntil", event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Operational scope and guidance"
          description="List affected destinations and operators, describe the condition, and state the required action."
        />
        <div className="mt-6">
          <FormSection title="Scope and instructions">
            <FormField
              id="affectedDestinations"
              label="Affected destinations"
              hint="Separate multiple destinations with commas."
              required
            >
              {(field) => (
                <Input
                  {...field}
                  value={values.affectedDestinations}
                  onChange={(event) => set("affectedDestinations", event.target.value)}
                />
              )}
            </FormField>
            <FormField
              id="affectedOperators"
              label="Affected operators"
              hint="Separate multiple operators with commas."
            >
              {(field) => (
                <Input
                  {...field}
                  value={values.affectedOperators}
                  onChange={(event) => set("affectedOperators", event.target.value)}
                />
              )}
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="details" label="Condition or restriction" required>
                {(field) => (
                  <Textarea
                    {...field}
                    value={values.details}
                    onChange={(event) => set("details", event.target.value)}
                  />
                )}
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField id="instructions" label="Required action or public guidance" required>
                {(field) => (
                  <Textarea
                    {...field}
                    value={values.instructions}
                    onChange={(event) => set("instructions", event.target.value)}
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
          {saving ? "Saving…" : advisoryId ? "Save changes" : "Create advisory"}
        </Button>
        <Button asChild variant="outline">
          <Link href={advisoryId ? `/ops/tourism/advisories/${advisoryId}` : "/ops/tourism/advisories"}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

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

import { type DistributionValues, distributionSchema } from "../schemas/disaster-schema";
import { localDisasterRepository as repository } from "../services/local-disaster-repository";
import type { DistributionStatus } from "../types/disaster-records";

const STATUSES: DistributionStatus[] = ["Released", "Pending confirmation", "Duplicate review", "Cancelled"];
const BLANK: DistributionValues = {
  activityId: repository.activities[0]?.id ?? "",
  round: "",
  recipientId: "",
  recipientName: "",
  barangay: "",
  items: "",
  distributionSite: "",
  releasedAt: "2026-09-19T08:00",
  acknowledgment: "",
  status: "Pending confirmation",
};
const inputDate = (value: string) => value.replace(" ", "T").slice(0, 16);
const storedDate = (value: string) => value.replace("T", " ");

export function DistributionFormView({
  distributionId,
  defaultActivityId,
}: {
  distributionId?: string;
  defaultActivityId?: string;
}) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [values, setValues] = useState<DistributionValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!distributionId) return setValues({ ...BLANK, activityId: defaultActivityId ?? BLANK.activityId });
    const item = repository.distribution(distributionId);
    if (!item) return setValues(null);
    setValues({ ...item, releasedAt: inputDate(item.releasedAt) });
  }, [distributionId, defaultActivityId]);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Distribution management is not assigned to this role"
        description="Choose the municipal or barangay role."
      />
    );
  if (values === undefined)
    return <LoadingState label="Loading distribution" message="Opening the distribution record…" />;
  if (values === null)
    return (
      <PermissionState
        title="Distribution unavailable"
        description="The requested distribution record was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/disaster/distributions">Back to distributions</Link>
          </Button>
        }
      />
    );

  function set<K extends keyof DistributionValues>(key: K, next: DistributionValues[K]) {
    setValues((current) => (current ? { ...current, [key]: next } : current));
  }

  function save() {
    if (!values || saving) return;
    const parsed = distributionSchema.safeParse({ ...values, releasedAt: storedDate(values.releasedAt) });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })));
      return;
    }
    setSaving(true);
    const result = distributionId
      ? repository.updateDistribution(distributionId, parsed.data)
      : repository.createDistribution(parsed.data);
    setSaving(false);
    if (!result) return setErrors([{ id: "form", message: "The distribution could not be saved." }]);
    router.push(`/ops/disaster/distributions/${result.id}`);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{distributionId ? "Edit distribution" : "New distribution"}</h1>
        <p>
          {distributionId
            ? `Update ${distributionId} while preserving its activity and recipient references.`
            : "Record a relief release with its recipient, items, site, acknowledgment, and current status."}
        </p>
      </div>
      <ErrorSummary errors={errors} title="This distribution could not be saved" />

      <ContentPanel className="mb-6">
        <SectionHeading
          title="Recipient and activity"
          description="Connect the relief release to the correct operational activity and recipient record."
        />
        <div className="mt-6">
          <FormSection title="Linked records">
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
            <FormField id="round" label="Distribution round" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.round}
                  placeholder="Initial release"
                  onChange={(event) => set("round", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="recipientId" label="Household or resident reference" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.recipientId}
                  placeholder="HH-MAT-01120"
                  onChange={(event) => set("recipientId", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="recipientName" label="Recipient name" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.recipientName}
                  placeholder="Household or resident name"
                  onChange={(event) => set("recipientName", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="barangay" label="Barangay" required>
              {(field) => (
                <Input {...field} value={values.barangay} onChange={(event) => set("barangay", event.target.value)} />
              )}
            </FormField>
            <FormField id="distributionSite" label="Distribution site" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.distributionSite}
                  onChange={(event) => set("distributionSite", event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>

      <ContentPanel className="mb-6">
        <SectionHeading
          title="Release record"
          description="List the released items and record the date, acknowledgment, and status."
        />
        <div className="mt-6">
          <FormSection title="Distribution details">
            <div className="sm:col-span-2">
              <FormField id="items" label="Relief items" required>
                {(field) => (
                  <Textarea
                    {...field}
                    value={values.items}
                    placeholder="Family food pack × 1; hygiene kit × 1"
                    onChange={(event) => set("items", event.target.value)}
                  />
                )}
              </FormField>
            </div>
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
                  placeholder="ACK-DRRM-2026-009"
                  onChange={(event) => set("acknowledgment", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="status" label="Status" required>
              {(field) => (
                <Select value={values.status} onValueChange={(next) => set("status", next as DistributionStatus)}>
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
          {saving ? "Saving…" : distributionId ? "Save changes" : "Create distribution"}
        </Button>
        <Button asChild variant="outline">
          <Link href={distributionId ? `/ops/disaster/distributions/${distributionId}` : "/ops/disaster/distributions"}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

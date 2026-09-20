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

import { type ActivityValues, activitySchema } from "../schemas/disaster-schema";
import { localDisasterRepository as repository } from "../services/local-disaster-repository";
import type { ActivityPriority, ActivityStatus, ActivityType } from "../types/disaster-records";

const TYPES: ActivityType[] = [
  "Typhoon",
  "Flood",
  "Storm surge",
  "Tsunami",
  "Landslide",
  "Fire",
  "Earthquake",
  "Volcanic activity",
  "Maritime incident",
];
const STATUSES: ActivityStatus[] = ["Monitoring", "Active response", "Contained", "Closed"];
const PRIORITIES: ActivityPriority[] = ["Low", "Moderate", "High", "Critical"];
const BLANK: ActivityValues = {
  name: "",
  type: "Typhoon",
  status: "Monitoring",
  priority: "Moderate",
  leadOffice: "Municipal Disaster Risk Reduction and Management Office",
  incidentCommander: "",
  startedAt: "2026-09-19T08:00",
  updatedAt: "2026-09-19T08:00",
  affectedBarangays: "",
  summary: "",
  advisoryReference: "",
};

const inputDate = (value: string) => value.replace(" ", "T").slice(0, 16);
const storedDate = (value: string) => value.replace("T", " ");

export function ActivityFormView({
  activityId,
  initialValues,
}: {
  activityId?: string;
  initialValues?: Partial<ActivityValues>;
}) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [values, setValues] = useState<ActivityValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activityId) return setValues({ ...BLANK, ...initialValues });
    const activity = repository.activity(activityId);
    if (!activity) return setValues(null);
    setValues({
      name: activity.name,
      type: activity.type,
      status: activity.status,
      priority: activity.priority,
      leadOffice: activity.leadOffice,
      incidentCommander: activity.incidentCommander,
      startedAt: inputDate(activity.startedAt),
      updatedAt: inputDate(activity.updatedAt),
      affectedBarangays: activity.affectedBarangays.join(", "),
      summary: activity.summary,
      advisoryReference: activity.advisoryReference,
    });
  }, [activityId, initialValues]);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Activity management is not assigned to this role"
        description="Choose the municipal or barangay role."
      />
    );
  if (values === undefined) return <LoadingState label="Loading activity" message="Opening the operational record…" />;
  if (values === null)
    return (
      <PermissionState
        title="Activity unavailable"
        description="The requested activity record was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/disaster/events">Back to activities</Link>
          </Button>
        }
      />
    );

  function set<K extends keyof ActivityValues>(key: K, next: ActivityValues[K]) {
    setValues((current) => (current ? { ...current, [key]: next } : current));
  }

  function save() {
    if (!values || saving) return;
    const parsed = activitySchema.safeParse({
      ...values,
      startedAt: storedDate(values.startedAt),
      updatedAt: storedDate(values.updatedAt),
    });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })));
      return;
    }
    setSaving(true);
    const result = activityId
      ? repository.updateActivity(activityId, parsed.data)
      : repository.createActivity(parsed.data);
    setSaving(false);
    if (!result) return setErrors([{ id: "form", message: "The activity could not be saved." }]);
    router.push(`/ops/disaster/events/${result.id}`);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{activityId ? "Edit activity" : "New activity"}</h1>
        <p>
          {activityId
            ? `Update ${activityId} and its current operational status.`
            : "Create an MDRRMO activity for monitoring, response, evacuation, or recovery coordination."}
        </p>
      </div>
      <ErrorSummary errors={errors} title="This activity could not be saved" />

      <ContentPanel className="mb-6">
        <SectionHeading
          title="Activity classification"
          description="Identify the event, operational priority, current status, and responsible command."
        />
        <div className="mt-6">
          <FormSection title="Operational record">
            <FormField id="name" label="Activity name" required>
              {(field) => (
                <Input {...field} value={values.name} onChange={(event) => set("name", event.target.value)} />
              )}
            </FormField>
            <FormField id="type" label="Hazard or activity type" required>
              {(field) => (
                <Select value={values.type} onValueChange={(next) => set("type", next as ActivityType)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="priority" label="Priority" required>
              {(field) => (
                <Select value={values.priority} onValueChange={(next) => set("priority", next as ActivityPriority)}>
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
                <Select value={values.status} onValueChange={(next) => set("status", next as ActivityStatus)}>
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
            <FormField id="leadOffice" label="Lead office" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.leadOffice}
                  onChange={(event) => set("leadOffice", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="incidentCommander" label="Incident commander" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.incidentCommander}
                  onChange={(event) => set("incidentCommander", event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>

      <ContentPanel className="mb-6">
        <SectionHeading
          title="Situation and coverage"
          description="Record the operational period, affected barangays, advisory reference, and current situation."
        />
        <div className="mt-6">
          <FormSection title="Situation record">
            <FormField id="startedAt" label="Started at" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.startedAt}
                  onChange={(event) => set("startedAt", event.target.value)}
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
            <FormField
              id="affectedBarangays"
              label="Affected barangays"
              hint="Separate multiple barangays with commas."
              required
            >
              {(field) => (
                <Input
                  {...field}
                  value={values.affectedBarangays}
                  placeholder="Poblacion, Camcaman"
                  onChange={(event) => set("affectedBarangays", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="advisoryReference" label="Advisory or report reference" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.advisoryReference}
                  placeholder="MDRRMO-ADV-2026-042"
                  onChange={(event) => set("advisoryReference", event.target.value)}
                />
              )}
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="summary" label="Situation summary" required>
                {(field) => (
                  <Textarea
                    {...field}
                    value={values.summary}
                    onChange={(event) => set("summary", event.target.value)}
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
          {saving ? "Saving…" : activityId ? "Save changes" : "Create activity"}
        </Button>
        <Button asChild variant="outline">
          <Link href={activityId ? `/ops/disaster/events/${activityId}` : "/ops/disaster/events"}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

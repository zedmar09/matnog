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
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type CenterValues, centerSchema } from "../schemas/disaster-schema";
import { localDisasterRepository as repository } from "../services/local-disaster-repository";
import type { CenterStatus } from "../types/disaster-records";

const STATUSES: CenterStatus[] = ["Open", "Standby", "Closed"];

export function CenterFormView({ centerId, defaultActivityId }: { centerId?: string; defaultActivityId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [values, setValues] = useState<CenterValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!centerId) {
      setValues({
        activityId: defaultActivityId ?? repository.activities[0]?.id ?? "",
        name: "",
        barangay: "",
        address: "",
        capacity: 1,
        acceptedOccupants: 0,
        pendingOccupants: 0,
        status: "Standby",
        manager: "",
        contactNumber: "",
        facilities: "",
      });
      return;
    }
    const center = repository.center(centerId);
    if (!center) return setValues(null);
    setValues({ ...center, facilities: center.facilities.join(", ") });
  }, [centerId, defaultActivityId]);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Evacuation center management is not assigned to this role"
        description="Choose the municipal or barangay role."
      />
    );
  if (values === undefined)
    return <LoadingState label="Loading evacuation center" message="Opening the center record…" />;
  if (values === null)
    return (
      <PermissionState
        title="Evacuation center unavailable"
        description="The requested center record was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/disaster/events">Back to activities</Link>
          </Button>
        }
      />
    );

  function set<K extends keyof CenterValues>(key: K, next: CenterValues[K]) {
    setValues((current) => (current ? { ...current, [key]: next } : current));
  }
  function save() {
    if (!values || saving) return;
    const parsed = centerSchema.safeParse(values);
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })),
      );
    setSaving(true);
    const result = centerId ? repository.updateCenter(centerId, parsed.data) : repository.createCenter(parsed.data);
    setSaving(false);
    if (!result) return setErrors([{ id: "form", message: "The evacuation center could not be saved." }]);
    router.push(`/ops/disaster/centers/${result.id}`);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{centerId ? "Edit evacuation center" : "New evacuation center"}</h1>
        <p>
          {centerId
            ? `Update ${centerId}, its operating capacity, facilities, and responsible team.`
            : "Register an evacuation center under an active disaster response activity."}
        </p>
      </div>
      <ErrorSummary errors={errors} title="This evacuation center could not be saved" />
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Center identity"
          description="Record the assigned activity, location, operating status, and responsible center manager."
        />
        <div className="mt-6">
          <FormSection title="Center record">
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
            <FormField id="name" label="Center name" required>
              {(field) => (
                <Input {...field} value={values.name} onChange={(event) => set("name", event.target.value)} />
              )}
            </FormField>
            <FormField id="barangay" label="Barangay" required>
              {(field) => (
                <Input {...field} value={values.barangay} onChange={(event) => set("barangay", event.target.value)} />
              )}
            </FormField>
            <FormField id="address" label="Complete address" required>
              {(field) => (
                <Input {...field} value={values.address} onChange={(event) => set("address", event.target.value)} />
              )}
            </FormField>
            <FormField id="manager" label="Center manager or team" required>
              {(field) => (
                <Input {...field} value={values.manager} onChange={(event) => set("manager", event.target.value)} />
              )}
            </FormField>
            <FormField id="contactNumber" label="Contact number" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.contactNumber}
                  onChange={(event) => set("contactNumber", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="status" label="Operating status" required>
              {(field) => (
                <Select value={values.status} onValueChange={(next) => set("status", next as CenterStatus)}>
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
          title="Capacity and facilities"
          description="Maintain accepted occupancy, pending arrivals, and available center services."
        />
        <div className="mt-6">
          <FormSection title="Operating capacity">
            <FormField id="capacity" label="Maximum capacity" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min={1}
                  value={values.capacity}
                  onChange={(event) => set("capacity", Number(event.target.value))}
                />
              )}
            </FormField>
            <FormField id="acceptedOccupants" label="Accepted occupants" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min={0}
                  value={values.acceptedOccupants}
                  onChange={(event) => set("acceptedOccupants", Number(event.target.value))}
                />
              )}
            </FormField>
            <FormField id="pendingOccupants" label="Pending arrivals" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min={0}
                  value={values.pendingOccupants}
                  onChange={(event) => set("pendingOccupants", Number(event.target.value))}
                />
              )}
            </FormField>
            <FormField
              id="facilities"
              label="Available facilities"
              hint="Separate multiple facilities with commas."
              required
            >
              {(field) => (
                <Input
                  {...field}
                  value={values.facilities}
                  placeholder="Water station, Health desk"
                  onChange={(event) => set("facilities", event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving}>
          <Save />
          {saving ? "Saving…" : centerId ? "Save changes" : "Create center"}
        </Button>
        <Button asChild variant="outline">
          <Link href={centerId ? `/ops/disaster/centers/${centerId}` : `/ops/disaster/events/${values.activityId}`}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

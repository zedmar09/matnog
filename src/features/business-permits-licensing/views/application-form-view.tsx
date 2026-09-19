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

import { type BusinessApplicationValues, businessApplicationSchema } from "../schemas/business-schema";
import { businessRepository as repository } from "../services/business-repository";
import type { BusinessApplicationPathId } from "../types/business-journey";
import type { BusinessApplicationStatus } from "../types/business-records";

const TYPES: BusinessApplicationPathId[] = ["new", "renewal", "amendment", "closure"];
const STATUSES: BusinessApplicationStatus[] = [
  "draft",
  "submitted",
  "for-correction",
  "under-review",
  "ready-to-issue",
  "issued",
  "closed",
];
const label = (value: string) => value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());

export function ApplicationFormView({ applicationId }: { applicationId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const businesses = repository.listBusinesses();
  const initialBusiness = businesses[0];
  const [values, setValues] = useState<BusinessApplicationValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!applicationId) {
      const business = initialBusiness;
      return setValues({
        businessId: business?.id ?? "",
        path: "new",
        fiscalPeriod: "2026",
        status: "draft",
        filedAt: "2026-09-19T08:00",
        targetRelease: "2026-09-26",
        assignedOfficer: "Unassigned",
        representativeLabel: business ? `${business.ownerName} — owner` : "",
        activity: business?.activity ?? "",
        location: business?.address ?? "",
        declaredChange: "",
      });
    }
    const record = repository.read(applicationId);
    setValues(
      record
        ? {
            businessId: record.businessId,
            path: record.path,
            fiscalPeriod: record.fiscalPeriod,
            status: record.status,
            filedAt: record.filedAt.replace(" ", "T"),
            targetRelease: record.targetRelease,
            assignedOfficer: record.assignedOfficer,
            representativeLabel: record.representativeLabel,
            activity: record.activity,
            location: record.location,
            declaredChange: record.declaredChange ?? "",
          }
        : null,
    );
  }, [applicationId, initialBusiness]);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Business permit applications are not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );
  if (values === undefined)
    return <LoadingState label="Loading application" message="Opening the permit application…" />;
  if (values === null)
    return (
      <PermissionState
        title="Application unavailable"
        description="The requested application was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/bpls/applications">Back to applications</Link>
          </Button>
        }
      />
    );

  function set<K extends keyof BusinessApplicationValues>(key: K, value: BusinessApplicationValues[K]) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }
  function selectBusiness(id: string) {
    const business = repository.readBusiness(id);
    setValues((current) =>
      current && business
        ? {
            ...current,
            businessId: id,
            representativeLabel: `${business.ownerName} — owner`,
            activity: business.activity,
            location: business.address,
          }
        : current,
    );
  }
  function save() {
    if (!values || saving) return;
    const parsed = businessApplicationSchema.safeParse({ ...values, filedAt: values.filedAt.replace("T", " ") });
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })),
      );
    setSaving(true);
    const result = applicationId
      ? repository.updateApplication(applicationId, parsed.data)
      : repository.createApplication(parsed.data);
    setSaving(false);
    if (!result) return setErrors([{ id: "form", message: "The permit application could not be saved." }]);
    router.push(`/ops/bpls/applications/${result.id}`);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{applicationId ? "Edit application" : "New application"}</h1>
        <p>
          {applicationId
            ? `Update ${applicationId} while preserving its requirements, reviews, and timeline.`
            : "Create a permit application and assign it for processing."}
        </p>
      </div>
      <ErrorSummary errors={errors} title="This application could not be saved" />
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Application information"
          description="Identify the business, transaction type, filing period, applicant, and responsible officer."
        />
        <div className="mt-6">
          <FormSection title="Filing details">
            <FormField id="businessId" label="Business" required>
              {(field) => (
                <Select value={values.businessId} onValueChange={selectBusiness}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.tradeName} · {business.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="path" label="Application type" required>
              {(field) => (
                <Select value={values.path} onValueChange={(next) => set("path", next as BusinessApplicationPathId)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {label(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="fiscalPeriod" label="Fiscal period" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.fiscalPeriod}
                  onChange={(event) => set("fiscalPeriod", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="status" label="Status" required>
              {(field) => (
                <Select
                  value={values.status}
                  onValueChange={(next) => set("status", next as BusinessApplicationStatus)}
                >
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {label(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="filedAt" label="Filed at" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.filedAt}
                  onChange={(event) => set("filedAt", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="targetRelease" label="Target release" required>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  value={values.targetRelease}
                  onChange={(event) => set("targetRelease", event.target.value)}
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
            <FormField id="representativeLabel" label="Applicant or representative" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.representativeLabel}
                  onChange={(event) => set("representativeLabel", event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Business activity and location"
          description="Confirm what the establishment does, where it operates, and the declared change when applicable."
        />
        <div className="mt-6">
          <FormSection title="Establishment details">
            <div className="sm:col-span-2">
              <FormField id="activity" label="Business activity" required>
                {(field) => (
                  <Textarea
                    {...field}
                    value={values.activity}
                    onChange={(event) => set("activity", event.target.value)}
                  />
                )}
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField id="location" label="Establishment location" required>
                {(field) => (
                  <Input {...field} value={values.location} onChange={(event) => set("location", event.target.value)} />
                )}
              </FormField>
            </div>
            {(values.path === "amendment" || values.path === "closure") && (
              <div className="sm:col-span-2">
                <FormField
                  id="declaredChange"
                  label={values.path === "closure" ? "Closure details" : "Declared change"}
                  required
                >
                  {(field) => (
                    <Textarea
                      {...field}
                      value={values.declaredChange}
                      onChange={(event) => set("declaredChange", event.target.value)}
                    />
                  )}
                </FormField>
              </div>
            )}
          </FormSection>
        </div>
      </ContentPanel>
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving}>
          <Save />
          {saving ? "Saving…" : applicationId ? "Save changes" : "Create application"}
        </Button>
        <Button asChild variant="outline">
          <Link href={applicationId ? `/ops/bpls/applications/${applicationId}` : "/ops/bpls/applications"}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

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

import { type BusinessRegistryValues, businessRegistrySchema } from "../schemas/business-schema";
import { businessRepository as repository } from "../services/business-repository";
import type { BusinessOrganizationType, BusinessRegistryStatus } from "../types/business-records";

const ORGANIZATIONS: BusinessOrganizationType[] = ["Sole proprietorship", "Partnership", "Corporation", "Cooperative"];
const STATUSES: BusinessRegistryStatus[] = ["Active", "Expiring soon", "Expired", "Closed"];
const BLANK: BusinessRegistryValues = {
  registeredName: "",
  tradeName: "",
  organizationType: "Sole proprietorship",
  ownerName: "",
  contactNumber: "",
  email: "",
  tin: "",
  activity: "",
  address: "",
  barangay: "",
  employeeCount: 0,
  status: "Active",
  permitNumber: "N/A",
  permitValidUntil: "2026-12-31",
};

export function BusinessFormView({ businessId }: { businessId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [values, setValues] = useState<BusinessRegistryValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!businessId) return setValues(BLANK);
    const record = repository.readBusiness(businessId);
    setValues(record ? { ...record } : null);
  }, [businessId]);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Business records are not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );
  if (values === undefined) return <LoadingState label="Loading business" message="Opening the business record…" />;
  if (values === null)
    return (
      <PermissionState
        title="Business unavailable"
        description="The requested business was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/bpls/businesses">Back to businesses</Link>
          </Button>
        }
      />
    );

  function set<K extends keyof BusinessRegistryValues>(key: K, value: BusinessRegistryValues[K]) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }

  function save() {
    if (!values || saving) return;
    const parsed = businessRegistrySchema.safeParse(values);
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })),
      );
    setSaving(true);
    const result = businessId
      ? repository.updateBusiness(businessId, parsed.data)
      : repository.createBusiness(parsed.data);
    setSaving(false);
    if (!result) return setErrors([{ id: "form", message: "The business record could not be saved." }]);
    router.push(`/ops/bpls/businesses/${result.id}`);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{businessId ? "Edit business" : "New business"}</h1>
        <p>
          {businessId
            ? `Update ${businessId} and keep its permit application history connected.`
            : "Create a business and establishment record for permit processing."}
        </p>
      </div>
      <ErrorSummary errors={errors} title="This business could not be saved" />
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Business identity"
          description="Record the legal identity, organization, owner, and contact information."
        />
        <div className="mt-6">
          <FormSection title="Registration information">
            <FormField id="registeredName" label="Registered business name" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.registeredName}
                  onChange={(event) => set("registeredName", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="tradeName" label="Trade or establishment name" required>
              {(field) => (
                <Input {...field} value={values.tradeName} onChange={(event) => set("tradeName", event.target.value)} />
              )}
            </FormField>
            <FormField id="organizationType" label="Organization type" required>
              {(field) => (
                <Select
                  value={values.organizationType}
                  onValueChange={(next) => set("organizationType", next as BusinessOrganizationType)}
                >
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGANIZATIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="tin" label="Taxpayer identification number" required>
              {(field) => <Input {...field} value={values.tin} onChange={(event) => set("tin", event.target.value)} />}
            </FormField>
            <FormField id="ownerName" label="Owner or authorized organization" required>
              {(field) => (
                <Input {...field} value={values.ownerName} onChange={(event) => set("ownerName", event.target.value)} />
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
            <FormField id="email" label="Email address" required>
              {(field) => (
                <Input
                  {...field}
                  type="email"
                  value={values.email}
                  onChange={(event) => set("email", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="employeeCount" label="Number of employees" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min="0"
                  value={values.employeeCount}
                  onChange={(event) => set("employeeCount", Number(event.target.value))}
                />
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Establishment and permit"
          description="Record the operating location, primary activity, and current permit standing."
        />
        <div className="mt-6">
          <FormSection title="Operating information">
            <FormField id="barangay" label="Barangay" required>
              {(field) => (
                <Input {...field} value={values.barangay} onChange={(event) => set("barangay", event.target.value)} />
              )}
            </FormField>
            <FormField id="address" label="Complete establishment address" required>
              {(field) => (
                <Input {...field} value={values.address} onChange={(event) => set("address", event.target.value)} />
              )}
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="activity" label="Primary business activity" required>
                {(field) => (
                  <Textarea
                    {...field}
                    value={values.activity}
                    onChange={(event) => set("activity", event.target.value)}
                  />
                )}
              </FormField>
            </div>
            <FormField id="status" label="Permit status" required>
              {(field) => (
                <Select value={values.status} onValueChange={(next) => set("status", next as BusinessRegistryStatus)}>
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
            <FormField id="permitNumber" label="Current permit number" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.permitNumber}
                  onChange={(event) => set("permitNumber", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="permitValidUntil" label="Permit valid until" required>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  value={values.permitValidUntil}
                  onChange={(event) => set("permitValidUntil", event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving}>
          <Save />
          {saving ? "Saving…" : businessId ? "Save changes" : "Create business"}
        </Button>
        <Button asChild variant="outline">
          <Link href={businessId ? `/ops/bpls/businesses/${businessId}` : "/ops/bpls/businesses"}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

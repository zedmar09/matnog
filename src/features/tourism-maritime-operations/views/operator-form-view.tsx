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

import { type OperatorValues, operatorSchema } from "../schemas/tourism-schema";
import { tourismRepository as repository } from "../services/tourism-repository";

const BLANK: OperatorValues = {
  name: "",
  businessPermit: "",
  status: "eligible",
  contactPerson: "",
  contactNumber: "",
  email: "",
  address: "",
  accreditationNumber: "",
  accreditationValidUntil: "2026-12-31",
};
export function OperatorFormView({ operatorId }: { operatorId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [values, setValues] = useState<OperatorValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!operatorId) return setValues(BLANK);
    const item = repository.readOperator(operatorId);
    setValues(
      item
        ? {
            name: item.name,
            businessPermit: item.businessPermit,
            status: item.status,
            contactPerson: item.contactPerson,
            contactNumber: item.contactNumber,
            email: item.email,
            address: item.address,
            accreditationNumber: item.accreditationNumber,
            accreditationValidUntil: item.accreditationValidUntil,
          }
        : null,
    );
  }, [operatorId]);
  if (role !== "municipal")
    return (
      <PermissionState
        title="Tourism operators are not assigned to this role"
        description="Choose the municipal staff role."
      />
    );
  if (values === undefined) return <LoadingState label="Loading operator" message="Opening the operator record…" />;
  if (values === null)
    return (
      <PermissionState
        title="Operator unavailable"
        description="The requested operator was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/tourism/operators">Back to operators</Link>
          </Button>
        }
      />
    );
  function set<K extends keyof OperatorValues>(key: K, value: OperatorValues[K]) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }
  function save() {
    if (!values || saving) return;
    const parsed = operatorSchema.safeParse(values);
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })),
      );
    setSaving(true);
    const result = operatorId
      ? repository.updateOperator(operatorId, parsed.data)
      : repository.createOperator(parsed.data);
    setSaving(false);
    if (!result) return setErrors([{ id: "form", message: "The operator could not be saved." }]);
    router.push(`/ops/tourism/operators/${result.id}`);
  }
  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{operatorId ? "Edit operator" : "New operator"}</h1>
        <p>
          {operatorId
            ? `Update ${operatorId} while preserving its vessels, crew, and trip history.`
            : "Create an accredited tourism transport operator record."}
        </p>
      </div>
      <ErrorSummary errors={errors} title="This operator could not be saved" />
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Operator identity"
          description="Record the operator, responsible contact, business permit, and accreditation."
        />
        <div className="mt-6">
          <FormSection title="Operator information">
            <FormField id="name" label="Operator name" required>
              {(field) => (
                <Input {...field} value={values.name} onChange={(event) => set("name", event.target.value)} />
              )}
            </FormField>
            <FormField id="status" label="Eligibility" required>
              {(field) => (
                <Select value={values.status} onValueChange={(next) => set("status", next as OperatorValues["status"])}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eligible">Eligible</SelectItem>
                    <SelectItem value="attention">Needs attention</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="businessPermit" label="Business permit" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.businessPermit}
                  onChange={(event) => set("businessPermit", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="accreditationNumber" label="Accreditation number" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.accreditationNumber}
                  onChange={(event) => set("accreditationNumber", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="accreditationValidUntil" label="Accreditation valid until" required>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  value={values.accreditationValidUntil}
                  onChange={(event) => set("accreditationValidUntil", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="contactPerson" label="Contact person" required>
              {(field) => (
                <Input
                  {...field}
                  value={values.contactPerson}
                  onChange={(event) => set("contactPerson", event.target.value)}
                />
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
            <div className="sm:col-span-2">
              <FormField id="address" label="Business address" required>
                {(field) => (
                  <Input {...field} value={values.address} onChange={(event) => set("address", event.target.value)} />
                )}
              </FormField>
            </div>
          </FormSection>
        </div>
      </ContentPanel>
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving}>
          <Save />
          {saving ? "Saving…" : operatorId ? "Save changes" : "Create operator"}
        </Button>
        <Button asChild variant="outline">
          <Link href={operatorId ? `/ops/tourism/operators/${operatorId}` : "/ops/tourism/operators"}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

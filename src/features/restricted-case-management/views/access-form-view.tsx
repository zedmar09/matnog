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

import { type AccessAssignmentValues, accessAssignmentSchema } from "../schemas/case-schema";
import { localRestrictedCaseRepository as repository } from "../services/local-restricted-case-repository";
import type { AccessStatus, CaseClass } from "../types/restricted-case";

const CLASSES: CaseClass[] = ["Barangay justice", "VAWC referral", "Child protection", "Blotter record"];
const STATUSES: AccessStatus[] = ["Active", "Revoked", "Expired"];
const inputDate = (value: string) => value.replace(" ", "T").slice(0, 16);
const storedDate = (value: string) => value.replace("T", " ");

export function AccessFormView({ assignmentId }: { assignmentId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [values, setValues] = useState<AccessAssignmentValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!assignmentId) {
      setValues({
        staffName: "",
        staffRole: "Municipal staff",
        caseClass: "Barangay justice",
        scope: "",
        purpose: "",
        grantedAt: "2026-09-19T08:00",
        expiresAt: "2026-12-31T17:00",
        status: "Active",
      });
      return;
    }
    const item = repository.assignment(assignmentId);
    if (!item) return setValues(null);
    setValues({ ...item, grantedAt: inputDate(item.grantedAt), expiresAt: inputDate(item.expiresAt) });
  }, [assignmentId]);
  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Case access management is not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );
  if (values === undefined) return <LoadingState label="Loading access assignment" message="Opening the assignment…" />;
  if (values === null)
    return (
      <PermissionState
        title="Access assignment unavailable"
        description="The requested assignment was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/cases/access">Back to access</Link>
          </Button>
        }
      />
    );
  function set<K extends keyof AccessAssignmentValues>(key: K, next: AccessAssignmentValues[K]) {
    setValues((current) => (current ? { ...current, [key]: next } : current));
  }
  function save() {
    if (!values || saving) return;
    const parsed = accessAssignmentSchema.safeParse({
      ...values,
      grantedAt: storedDate(values.grantedAt),
      expiresAt: storedDate(values.expiresAt),
    });
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })),
      );
    setSaving(true);
    const result = assignmentId
      ? repository.updateAssignment(assignmentId, parsed.data)
      : repository.createAssignment(parsed.data);
    setSaving(false);
    if (!result) return setErrors([{ id: "form", message: "The access assignment could not be saved." }]);
    router.push(`/ops/cases/access/${result.id}`);
  }
  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{assignmentId ? "Edit access assignment" : "New access assignment"}</h1>
        <p>
          {assignmentId
            ? `Update ${assignmentId}, its scope, validity, and current status.`
            : "Assign a staff member to a case class and operational scope for a defined purpose."}
        </p>
      </div>
      <ErrorSummary errors={errors} title="This access assignment could not be saved" />
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Staff assignment"
          description="Identify the staff member, case class, scope, and specific purpose for access."
        />
        <div className="mt-6">
          <FormSection title="Assignment details">
            <FormField id="staffName" label="Staff member or position" required>
              {(field) => (
                <Input {...field} value={values.staffName} onChange={(event) => set("staffName", event.target.value)} />
              )}
            </FormField>
            <FormField id="staffRole" label="Staff role" required>
              {(field) => (
                <Select value={values.staffRole} onValueChange={(next) => set("staffRole", next)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Municipal staff">Municipal staff</SelectItem>
                    <SelectItem value="Barangay staff">Barangay staff</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="caseClass" label="Case class" required>
              {(field) => (
                <Select value={values.caseClass} onValueChange={(next) => set("caseClass", next as CaseClass)}>
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
            <FormField id="scope" label="Barangay or scope" required>
              {(field) => (
                <Input {...field} value={values.scope} onChange={(event) => set("scope", event.target.value)} />
              )}
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="purpose" label="Access purpose" required>
                {(field) => (
                  <Textarea
                    {...field}
                    value={values.purpose}
                    onChange={(event) => set("purpose", event.target.value)}
                  />
                )}
              </FormField>
            </div>
          </FormSection>
        </div>
      </ContentPanel>
      <ContentPanel className="mb-6">
        <SectionHeading title="Validity" description="Set the assignment period and current access status." />
        <div className="mt-6">
          <FormSection title="Access period">
            <FormField id="grantedAt" label="Granted at" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.grantedAt}
                  onChange={(event) => set("grantedAt", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="expiresAt" label="Expires at" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.expiresAt}
                  onChange={(event) => set("expiresAt", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="status" label="Status" required>
              {(field) => (
                <Select value={values.status} onValueChange={(next) => set("status", next as AccessStatus)}>
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
          {saving ? "Saving…" : assignmentId ? "Save changes" : "Create assignment"}
        </Button>
        <Button asChild variant="outline">
          <Link href={assignmentId ? `/ops/cases/access/${assignmentId}` : "/ops/cases/access"}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

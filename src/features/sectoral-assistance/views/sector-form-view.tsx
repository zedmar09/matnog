"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type SectorRecordValues, sectorRecordSchema } from "../schemas/sector-schema";
import { localSectoralAssistanceRepository as repository } from "../services/local-sectoral-assistance-repository";
import { SECTOR_CATEGORIES } from "../types/sectoral-assistance";

const STATUSES = ["Evidence review", "Active", "Expired", "Deactivated"] as const;
const OFFICES = [
  "Municipal Social Welfare and Development Office",
  "Office of the Senior Citizens Affairs",
  "Municipal Youth Office",
];

const BLANK: SectorRecordValues = {
  personId: "",
  personLabel: "",
  category: "Senior",
  authority: OFFICES[0] ?? "",
  status: "Evidence review",
  validFrom: "Pending decision",
  validTo: "Pending decision",
  source: "Walk-in application",
  evidence: "",
  credential: "Not issued",
};

/**
 * Register or correct one sector status. The resident comes from the registry
 * rather than free text, so a status always points at a real person record.
 */
export function SectorFormView({ recordId }: { recordId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [values, setValues] = useState<SectorRecordValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  const [residentOptions, setResidentOptions] = useState<PersonRecordOption[]>([]);
  const [residentLookupError, setResidentLookupError] = useState(false);

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
      if (!active) return;
      if (result.kind === "success") {
        setResidentOptions(result.data);
        setResidentLookupError(false);
      } else {
        setResidentLookupError(true);
      }
    });
    return () => {
      active = false;
    };
  }, [role]);

  useEffect(() => {
    if (!recordId) return setValues(BLANK);
    const found = repository.sectorRecord(recordId);
    if (!found) return setValues(null);
    setValues({
      personId: found.personId,
      personLabel: found.personLabel,
      category: found.category,
      authority: found.authority,
      status: found.status,
      validFrom: found.validFrom,
      validTo: found.validTo,
      source: found.source,
      evidence: found.evidence.join("\n"),
      credential: found.credential,
    });
  }, [recordId]);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Sector registrations are not assigned to this role"
        description="Choose the municipal or barangay role."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/sectors">Back to registrations</Link>
          </Button>
        }
      />
    );

  if (values === undefined) return <LoadingState label="Loading registration" message="Opening the registration…" />;
  if (values === null)
    return (
      <PermissionState
        title="Registration unavailable"
        description="That sector record was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/sectors">Back to registrations</Link>
          </Button>
        }
      />
    );

  function set<K extends keyof SectorRecordValues>(key: K, next: SectorRecordValues[K]) {
    setValues((prev) => (prev ? { ...prev, [key]: next } : prev));
  }

  function save() {
    if (!values || saving) return;
    const parsed = sectorRecordSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })));
      return;
    }
    setSaving(true);
    const result = recordId
      ? repository.updateSectorRecord(recordId, parsed.data)
      : repository.createSectorRecord(parsed.data);
    setSaving(false);
    if (!result) return setErrors([{ id: "form", message: "The registration could not be saved." }]);
    router.push(`/ops/sectors/${result.id}`);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{recordId ? "Edit registration" : "Register a sector status"}</h1>
        <p>
          {recordId
            ? `Correcting ${recordId}. Validity is always a dated period, never a permanent flag.`
            : "A new registration starts under evidence review. Approving it is a separate decision from recording it."}
        </p>
      </div>

      <ErrorSummary errors={errors} />

      <ContentPanel className="mb-6">
        <SectionHeading
          title="Subject and category"
          description="Who holds the status, and which sector it belongs to."
        />
        <div className="mt-6">
          <FormSection title="Registration">
            <FormField id="personId" label="Resident" required>
              {(field) => (
                <Select
                  value={values.personId}
                  onValueChange={(next) => {
                    const person = residentOptions.find((item) => item.personId === next);
                    set("personId", next);
                    set("personLabel", person?.displayName ?? next);
                  }}
                >
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue placeholder="Choose a resident" />
                  </SelectTrigger>
                  <SelectContent>
                    {residentOptions.map((person) => (
                      <SelectItem key={person.personId} value={person.personId}>
                        {person.displayName} · {person.personId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            {residentLookupError && (
              <p className="small-note" role="status">
                The resident registry is unavailable. Try this form again when its records can be loaded.
              </p>
            )}
            <FormField id="category" label="Category" required>
              {(field) => (
                <Select
                  value={values.category}
                  onValueChange={(next) => set("category", next as SectorRecordValues["category"])}
                >
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTOR_CATEGORIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="authority" label="Issuing office" required>
              {(field) => (
                <Select value={values.authority} onValueChange={(next) => set("authority", next)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFICES.map((item) => (
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
                <Select
                  value={values.status}
                  onValueChange={(next) => set("status", next as SectorRecordValues["status"])}
                >
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

      <ContentPanel>
        <SectionHeading
          title="Validity and evidence"
          description="An active status needs decided dates. A record still under review keeps its period open."
        />
        <div className="mt-6">
          <FormSection title="Period">
            <FormField id="validFrom" label="Valid from" required>
              {(field) => (
                <Input
                  {...field}
                  placeholder="2026-01-01 or Pending decision"
                  value={values.validFrom}
                  onChange={(event) => set("validFrom", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="validTo" label="Valid to" required>
              {(field) => (
                <Input
                  {...field}
                  placeholder="2027-12-31 or Pending decision"
                  value={values.validTo}
                  onChange={(event) => set("validTo", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="credential" label="Credential or booklet" required>
              {(field) => (
                <Input
                  {...field}
                  placeholder="OSCA-ID-014"
                  value={values.credential}
                  onChange={(event) => set("credential", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="source" label="Source" required hint="Where this status came from.">
              {(field) => (
                <Input
                  {...field}
                  placeholder="Local evidence review"
                  value={values.source}
                  onChange={(event) => set("source", event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
          <FormSection title="Evidence">
            <FormField id="evidence" label="Evidence" required hint="One item per line.">
              {(field) => (
                <Textarea
                  {...field}
                  rows={3}
                  placeholder={"Medical certificate\nBarangay certification"}
                  value={values.evidence}
                  onChange={(event) => set("evidence", event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
        </div>
        <div className="form-actions">
          <Button type="button" variant="ghost" asChild>
            <Link href="/ops/sectors">Cancel</Link>
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : recordId ? "Save registration" : "Register status"}
          </Button>
        </div>
      </ContentPanel>
    </div>
  );
}

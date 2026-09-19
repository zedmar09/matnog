"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mars, Venus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { LoadingState } from "@/shared/components/loading-state";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { useRegistryActor } from "../hooks/use-registry-actor";
import { type ResidentValues, residentSchema } from "../schemas/registry-schema";
import { saveResidentDraft } from "../services/registry-operations";
import { canEditRegistry } from "../services/registry-projections";
import { readPerson } from "../services/registry-repository";
import { fullName } from "../services/registry-rules";
import type { Person } from "../types/registry";

const CIVIL_STATUS = ["Single", "Married", "Widowed", "Separated", "Annulled"];

/** Corrects the identity fields of an existing record. Residency and household
 *  membership are changed through their own reviewed journeys, not here. */
export function ResidentEditView({ personId }: { personId: string }) {
  const actor = useRegistryActor();
  const router = useRouter();
  const { scenario, generation } = useWorkspaceSession();
  const [result, setResult] = useState<RepositoryResult<Person> | null>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors: fieldErrors },
  } = useForm<ResidentValues>({ resolver: zodResolver(residentSchema) });

  const load = useCallback(() => {
    if (!actor) return;
    void readPerson(actor, personId, scenario).then((next) => {
      setResult(next);
      if (next.kind === "success") {
        const person = next.data;
        reset({
          firstName: person.firstName,
          middleName: person.middleName ?? "",
          lastName: person.lastName,
          suffix: person.suffix ?? "",
          birthDate: person.birthDate,
          sex: person.sex,
          civilStatus: person.civilStatus,
          citizenship: person.citizenship,
          occupation: person.occupation ?? "",
          contactNumber: person.contactNumber ?? "",
        });
      }
    });
  }, [actor, personId, scenario, reset]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate refetch trigger.
  useEffect(load, [load, generation]);

  if (!actor || !canEditRegistry(actor)) {
    return (
      <PermissionState
        title="You cannot edit this record"
        description="Your demo role can read the registry but not correct it."
        action={
          <Button asChild variant="outline">
            <Link href={`/ops/residents/${personId}`}>Back to the record</Link>
          </Button>
        }
      />
    );
  }
  if (result === null) return <LoadingState label="Loading record" message="Loading the resident record…" />;
  if (result.kind !== "success") {
    return (
      <PermissionState
        title="Record unavailable"
        description="This record is not in your assigned scope."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/residents">Back to residents</Link>
          </Button>
        }
      />
    );
  }

  const person = result.data;

  async function submit(values: ResidentValues) {
    if (!actor || saving) return;
    setSaving(true);
    setErrors([]);
    const saved = await saveResidentDraft(actor, personId, values, scenario);
    setSaving(false);
    if (saved.kind === "invalid") {
      setErrors(saved.errors);
      return;
    }
    if (saved.kind !== "success") {
      setErrors([{ id: "form", message: "The record could not be saved in this preview." }]);
      return;
    }
    router.push(`/ops/residents/${personId}`);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>Edit profile</h1>
        <p>
          Correcting {fullName(person)} · {person.envelope.id}. Residency and household membership are changed through
          their own journeys.
        </p>
      </div>

      <ErrorSummary errors={errors} />

      <ContentPanel>
        <SectionHeading title="Identity" description="Names and demographic details on the existing record." />
        <form onSubmit={handleSubmit(submit)} noValidate className="mt-6">
          <FormSection title="Name">
            <FormField id="firstName" label="First name" required error={fieldErrors.firstName?.message}>
              {(field) => <Input {...field} placeholder="Mara" {...register("firstName")} />}
            </FormField>
            <FormField id="middleName" label="Middle name">
              {(field) => <Input {...field} placeholder="Reyes" {...register("middleName")} />}
            </FormField>
            <FormField id="lastName" label="Last name" required error={fieldErrors.lastName?.message}>
              {(field) => <Input {...field} placeholder="Dela Cruz" {...register("lastName")} />}
            </FormField>
            <FormField id="suffix" label="Suffix">
              {(field) => <Input {...field} placeholder="Jr., III" {...register("suffix")} />}
            </FormField>
          </FormSection>

          <FormSection title="Demographics">
            <FormField id="birthDate" label="Date of birth" required error={fieldErrors.birthDate?.message}>
              {(field) => <Input {...field} type="date" {...register("birthDate")} />}
            </FormField>
            <FormField id="sex" label="Gender" required error={fieldErrors.sex?.message}>
              {() => (
                <Controller
                  control={control}
                  name="sex"
                  render={({ field: bound }) => (
                    <RadioGroup className="form-radio-row" value={bound.value} onValueChange={bound.onChange}>
                      <label className="form-radio">
                        <RadioGroupItem value="female" />
                        <Venus size={14} aria-hidden="true" />
                        Female
                      </label>
                      <label className="form-radio">
                        <RadioGroupItem value="male" />
                        <Mars size={14} aria-hidden="true" />
                        Male
                      </label>
                    </RadioGroup>
                  )}
                />
              )}
            </FormField>
            <FormField id="civilStatus" label="Civil status" required error={fieldErrors.civilStatus?.message}>
              {(field) => (
                <Controller
                  control={control}
                  name="civilStatus"
                  render={({ field: bound }) => (
                    <Select value={bound.value} onValueChange={bound.onChange}>
                      <SelectTrigger id={field.id} className="form-select-trigger">
                        <SelectValue placeholder="Select a civil status" />
                      </SelectTrigger>
                      <SelectContent>
                        {CIVIL_STATUS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>
            <FormField id="citizenship" label="Citizenship" required error={fieldErrors.citizenship?.message}>
              {(field) => <Input {...field} placeholder="Filipino" {...register("citizenship")} />}
            </FormField>
            <FormField id="occupation" label="Occupation">
              {(field) => <Input {...field} placeholder="Fisher, teacher, vendor" {...register("occupation")} />}
            </FormField>
            <FormField id="contactNumber" label="Contact number">
              {(field) => <Input {...field} placeholder="09XX XXX XXXX" {...register("contactNumber")} />}
            </FormField>
          </FormSection>

          <div className="form-actions form-actions-split">
            <Button type="button" variant="outline" asChild>
              <Link href={`/ops/residents/${personId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </ContentPanel>
    </div>
  );
}

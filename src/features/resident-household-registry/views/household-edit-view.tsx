"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { AddressFields, DwellingFields, LivelihoodFields } from "../components/household-form-fields";
import { BARANGAYS } from "../data/barangays";
import { useRegistryActor } from "../hooks/use-registry-actor";
import {
  type HouseholdAddressValues,
  type HouseholdDetailsValues,
  householdAddressSchema,
  householdDetailsSchema,
} from "../schemas/registry-schema";
import { changeHouseholdAddress, saveHouseholdDetails } from "../services/registry-operations";
import { canEditRegistry } from "../services/registry-projections";
import { type HouseholdDetail, readHousehold } from "../services/registry-repository";
import { fullName } from "../services/registry-rules";

/** No head recorded yet. Radix reserves the empty string, so a sentinel stands in. */
const NO_HEAD = "__none__";

export function HouseholdEditView({ householdId }: { householdId: string }) {
  const actor = useRegistryActor();
  const router = useRouter();
  const { scenario, generation } = useWorkspaceSession();
  const [result, setResult] = useState<RepositoryResult<HouseholdDetail> | null>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();
  const [saving, setSaving] = useState(false);

  const detailsForm = useForm<HouseholdDetailsValues>({ resolver: zodResolver(householdDetailsSchema) });
  const addressForm = useForm<HouseholdAddressValues>({ resolver: zodResolver(householdAddressSchema) });
  const { reset: resetDetails } = detailsForm;
  const { reset: resetAddress } = addressForm;

  const load = useCallback(() => {
    if (!actor) return;
    void readHousehold(actor, householdId, scenario).then((next) => {
      setResult(next);
      if (next.kind !== "success") return;
      const { household, structure } = next.data;
      resetDetails({
        label: household.envelope.scope.label,
        headPersonId: household.headPersonId,
        constructionMaterial: household.dwelling.constructionMaterial,
        tenure: household.dwelling.tenure,
        waterSource: household.dwelling.waterSource,
        toiletFacility: household.dwelling.toiletFacility,
        powerSource: household.dwelling.powerSource,
        wasteDisposal: household.dwelling.wasteDisposal,
        internet: household.dwelling.internet,
        incomeBracket: household.socioeconomic.incomeBracket,
        livelihood: household.socioeconomic.livelihood,
        foodSecurity: household.socioeconomic.foodSecurity,
      });
      resetAddress({
        barangayId: structure?.barangay.id ?? BARANGAYS[0]?.id ?? "",
        houseNumber: structure?.houseNumber ?? "",
        street: structure?.street ?? "",
        sitio: structure?.sitio ?? "",
        purok: structure?.purok ?? "",
      });
    });
  }, [actor, householdId, scenario, resetDetails, resetAddress]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate refetch trigger.
  useEffect(load, [load, generation]);

  if (!actor || !canEditRegistry(actor)) {
    return (
      <PermissionState
        title="You cannot edit this household"
        description="Your role can read the registry but not correct it."
        action={
          <Button asChild variant="outline">
            <Link href={`/ops/households/${householdId}`}>Back to the record</Link>
          </Button>
        }
      />
    );
  }

  if (result === null) return <LoadingState label="Loading household" message="Opening the household record…" />;
  if (result.kind !== "success") {
    return (
      <PermissionState
        title="Household unavailable"
        description="This household is not in your assigned scope."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/households">Back to households</Link>
          </Button>
        }
      />
    );
  }

  const { household, members } = result.data;
  const current = members.filter((member) => !member.to);
  const closed = Boolean(household.closure);

  async function submitDetails(values: HouseholdDetailsValues) {
    if (!actor || saving) return;
    setSaving(true);
    setErrors([]);
    setNotice(undefined);
    const saved = await saveHouseholdDetails(actor, householdId, values, scenario);
    setSaving(false);
    if (saved.kind === "invalid") return setErrors(saved.errors);
    if (saved.kind !== "success") {
      return setErrors([{ id: "form", message: "The household could not be saved." }]);
    }
    router.push(`/ops/households/${householdId}`);
  }

  async function submitAddress(values: HouseholdAddressValues) {
    if (!actor || saving) return;
    const barangay = BARANGAYS.find((item) => item.id === values.barangayId);
    if (!barangay) return setErrors([{ id: "barangayId", message: "Select a barangay." }]);
    setSaving(true);
    setErrors([]);
    setNotice(undefined);
    const saved = await changeHouseholdAddress(actor, householdId, { ...values, barangay }, scenario);
    setSaving(false);
    if (saved.kind === "invalid") return setErrors(saved.errors);
    if (saved.kind !== "success") {
      return setErrors([{ id: "form", message: "The address could not be saved." }]);
    }
    setNotice("The corrected address was recorded as a new structure.");
    load();
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>Edit household</h1>
        <p>
          Correcting {household.envelope.scope.label} · {household.envelope.id}. Members are moved through their own
          membership journey.
        </p>
      </div>

      {closed && (
        <NoticePanel className="mb-6">
          This household is closed. Reopen it from the record before correcting its details.
        </NoticePanel>
      )}
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} />

      <ContentPanel className="mb-6">
        <SectionHeading
          title="Household details"
          description="Name, head and the dwelling answers the survey also writes to."
        />
        <form onSubmit={detailsForm.handleSubmit(submitDetails)} noValidate className="mt-6">
          <FormSection title="Identification">
            <FormField id="label" label="Household name" required error={detailsForm.formState.errors.label?.message}>
              {(field) => <Input {...field} {...detailsForm.register("label")} />}
            </FormField>
            <FormField
              id="headPersonId"
              label="Household head"
              error={detailsForm.formState.errors.headPersonId?.message}
              hint={
                current.length === 0
                  ? "No current members yet. Register or move a resident in first."
                  : "Only a current member can be the head."
              }
            >
              {(field) => (
                <Controller
                  control={detailsForm.control}
                  name="headPersonId"
                  render={({ field: bound }) => (
                    <Select
                      value={bound.value ? bound.value : NO_HEAD}
                      onValueChange={(next) => bound.onChange(next === NO_HEAD ? "" : next)}
                    >
                      <SelectTrigger id={field.id} className="form-select-trigger">
                        <SelectValue placeholder="Select the head" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_HEAD}>No head recorded</SelectItem>
                        {current.map((member) => (
                          <SelectItem key={member.person.envelope.id} value={member.person.envelope.id}>
                            {fullName(member.person)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>
          </FormSection>
          <DwellingFields
            register={detailsForm.register}
            control={detailsForm.control}
            errors={detailsForm.formState.errors}
          />
          <LivelihoodFields
            register={detailsForm.register}
            control={detailsForm.control}
            errors={detailsForm.formState.errors}
          />
          <div className="form-actions">
            <Button type="button" variant="ghost" asChild>
              <Link href={`/ops/households/${householdId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving || closed}>
              {saving ? "Saving…" : "Save household"}
            </Button>
          </div>
        </form>
      </ContentPanel>

      <ContentPanel>
        <SectionHeading
          title="Address"
          description="Saving an address records a new structure. The previous building is left as it is, because other households may still be attached to it."
        />
        <form onSubmit={addressForm.handleSubmit(submitAddress)} noValidate className="mt-6">
          <AddressFields
            register={addressForm.register}
            control={addressForm.control}
            errors={addressForm.formState.errors}
            barangays={BARANGAYS}
          />
          <div className="form-actions">
            <Button type="submit" variant="outline" disabled={saving || closed}>
              Save address
            </Button>
          </div>
        </form>
      </ContentPanel>
    </div>
  );
}

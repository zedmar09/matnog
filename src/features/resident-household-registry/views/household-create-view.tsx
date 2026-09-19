"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useForm } from "react-hook-form";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
import { createHousehold } from "../services/registry-operations";
import { canEditRegistry } from "../services/registry-projections";

type Step = "address" | "details" | "review";

const STEPS: { id: Step; label: string }[] = [
  { id: "address", label: "Address" },
  { id: "details", label: "Dwelling and livelihood" },
  { id: "review", label: "Review" },
];

/**
 * Records a household and the structure it sits at. Members are registered into
 * it afterwards, so a new family can be recorded before anyone has a record.
 */
export function HouseholdCreateView() {
  const actor = useRegistryActor();
  const router = useRouter();
  const { scenario } = useWorkspaceSession();
  const [step, setStep] = useState<Step>("address");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  const addressForm = useForm<HouseholdAddressValues>({
    resolver: zodResolver(householdAddressSchema),
    defaultValues: { barangayId: BARANGAYS[0]?.id ?? "", houseNumber: "", street: "", sitio: "", purok: "" },
  });
  const detailsForm = useForm<HouseholdDetailsValues>({
    resolver: zodResolver(householdDetailsSchema),
    defaultValues: {
      label: "",
      headPersonId: "",
      constructionMaterial: "",
      tenure: "",
      waterSource: "",
      toiletFacility: "",
      powerSource: "",
      wasteDisposal: "",
      internet: "unknown",
      incomeBracket: "",
      livelihood: "",
      foodSecurity: "unknown",
    },
  });

  if (!actor || !canEditRegistry(actor)) {
    return (
      <PermissionState
        title="You cannot create households"
        description="Your role can read the registry but not add to it."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/households">Back to households</Link>
          </Button>
        }
      />
    );
  }

  const address = addressForm.watch();
  const details = detailsForm.watch();
  const barangay = BARANGAYS.find((item) => item.id === address.barangayId);
  const activeIndex = STEPS.findIndex((item) => item.id === step);

  async function create() {
    if (!actor || saving) return;
    const barangayRef = BARANGAYS.find((item) => item.id === addressForm.getValues("barangayId"));
    if (!barangayRef) {
      setErrors([{ id: "barangayId", message: "Select a barangay." }]);
      return;
    }
    setSaving(true);
    setErrors([]);
    const result = await createHousehold(
      actor,
      { ...detailsForm.getValues(), address: { ...addressForm.getValues(), barangay: barangayRef } },
      scenario,
    );
    setSaving(false);
    if (result.kind === "invalid") {
      setErrors(result.errors);
      return;
    }
    if (result.kind !== "success") {
      setErrors([
        { id: "form", message: result.kind === "denied" ? result.message : "The household could not be created." },
      ]);
      return;
    }
    router.push(`/ops/households/${result.data.envelope.id}`);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>Add a household</h1>
        <p>
          A household is a group of residents at one structure. Record the address and dwelling here, then register or
          move residents into it.
        </p>
      </div>

      <ol className="registry-steps">
        {STEPS.map((item, index) => (
          <li key={item.id} data-state={index === activeIndex ? "current" : index < activeIndex ? "done" : "todo"}>
            <span>{index < activeIndex ? <Check size={13} /> : index + 1}</span>
            {item.label}
          </li>
        ))}
      </ol>

      <ErrorSummary errors={errors} />

      {step === "address" && (
        <ContentPanel>
          <SectionHeading
            title="Where is this household?"
            description="The address is recorded as its own structure, so it never rewrites a building other households share."
          />
          <form onSubmit={addressForm.handleSubmit(() => setStep("details"))} noValidate className="mt-6">
            <AddressFields
              register={addressForm.register}
              control={addressForm.control}
              errors={addressForm.formState.errors}
              barangays={BARANGAYS}
            />
            <div className="form-actions">
              <Button type="button" variant="ghost" asChild>
                <Link href="/ops/households">Cancel</Link>
              </Button>
              <Button type="submit">
                Next
                <ArrowRight />
              </Button>
            </div>
          </form>
        </ContentPanel>
      )}

      {step === "details" && (
        <ContentPanel>
          <SectionHeading
            title="What is the household like?"
            description="These answers use the same vocabulary as the household survey, so a later visit updates them rather than duplicating them."
          />
          <form onSubmit={detailsForm.handleSubmit(() => setStep("review"))} noValidate className="mt-6">
            <FormSection title="Identification">
              <FormField
                id="label"
                label="Household name"
                required
                error={detailsForm.formState.errors.label?.message}
                hint="Usually the family name, for example “Dela Cruz household”."
              >
                {(field) => <Input {...field} placeholder="Dela Cruz household" {...detailsForm.register("label")} />}
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
              <Button type="button" variant="ghost" onClick={() => setStep("address")}>
                <ArrowLeft />
                Back
              </Button>
              <Button type="submit">
                Next
                <ArrowRight />
              </Button>
            </div>
          </form>
        </ContentPanel>
      )}

      {step === "review" && (
        <ContentPanel>
          <SectionHeading
            title="Review before creating"
            description="The household starts with no members and no verification date. Every vulnerability indicator starts unknown until a survey asks."
          />
          <dl className="registry-facts mt-5">
            <div>
              <dt>Household name</dt>
              <dd>{details.label}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>
                {address.houseNumber} {address.street}
                {address.sitio ? `, ${address.sitio}` : ""}, {address.purok}
              </dd>
            </div>
            <div>
              <dt>Barangay</dt>
              <dd>{barangay?.label}</dd>
            </div>
            <div>
              <dt>Construction</dt>
              <dd>{details.constructionMaterial}</dd>
            </div>
            <div>
              <dt>Tenure</dt>
              <dd>{details.tenure}</dd>
            </div>
            <div>
              <dt>Water source</dt>
              <dd>{details.waterSource}</dd>
            </div>
            <div>
              <dt>Toilet facility</dt>
              <dd>{details.toiletFacility}</dd>
            </div>
            <div>
              <dt>Power source</dt>
              <dd>{details.powerSource}</dd>
            </div>
            <div>
              <dt>Waste disposal</dt>
              <dd>{details.wasteDisposal}</dd>
            </div>
            <div>
              <dt>Income bracket</dt>
              <dd>{details.incomeBracket}</dd>
            </div>
            <div>
              <dt>Main livelihood</dt>
              <dd>{details.livelihood}</dd>
            </div>
          </dl>
          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={() => setStep("details")}>
              <ArrowLeft />
              Back
            </Button>
            <Button type="button" onClick={create} disabled={saving}>
              {saving ? "Creating…" : "Create household"}
            </Button>
          </div>
        </ContentPanel>
      )}
    </div>
  );
}

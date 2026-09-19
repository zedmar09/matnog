"use client";

import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Controller } from "react-hook-form";

import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

import { SURVEY_FIELDS, TRI_OPTIONS } from "../data/survey-fields";
import type { HouseholdAddressValues, HouseholdDetailsValues } from "../schemas/registry-schema";

/**
 * Option lists come from the survey definition so a clerk typing a household in
 * and an enumerator capturing one on a visit choose from the same vocabulary.
 */
function optionsFor(path: string): string[] {
  for (const fields of Object.values(SURVEY_FIELDS)) {
    const match = fields.find((field) => field.path === path);
    if (match?.options) return match.options;
  }
  return [];
}

const CONSTRUCTION = optionsFor("dwelling.constructionMaterial");
const TENURE = optionsFor("dwelling.tenure");
const WATER = optionsFor("dwelling.waterSource");
const TOILET = optionsFor("dwelling.toiletFacility");
const POWER = optionsFor("dwelling.powerSource");
const WASTE = optionsFor("dwelling.wasteDisposal");
const INCOME = optionsFor("socioeconomic.incomeBracket");

type DetailsForm = {
  register: UseFormRegister<HouseholdDetailsValues>;
  control: Control<HouseholdDetailsValues>;
  errors: FieldErrors<HouseholdDetailsValues>;
};

/** One labelled shadcn select bound to a household details field. */
function ChoiceField({
  control,
  name,
  label,
  options,
  placeholder,
  error,
}: {
  control: Control<HouseholdDetailsValues>;
  name: keyof HouseholdDetailsValues;
  label: string;
  options: readonly string[];
  placeholder: string;
  error?: string;
}) {
  return (
    <FormField id={name} label={label} required error={error}>
      {(field) => (
        <Controller
          control={control}
          name={name}
          render={({ field: bound }) => (
            <Select value={bound.value ?? ""} onValueChange={bound.onChange}>
              <SelectTrigger id={field.id} className="form-select-trigger">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      )}
    </FormField>
  );
}

/** Three-state answer: "unknown" stays distinct from "no". */
function TriField({
  control,
  name,
  label,
  hint,
  error,
}: {
  control: Control<HouseholdDetailsValues>;
  name: "internet" | "foodSecurity";
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <FormField id={name} label={label} required error={error} hint={hint}>
      {(field) => (
        <Controller
          control={control}
          name={name}
          render={({ field: bound }) => (
            <Select value={bound.value ?? ""} onValueChange={bound.onChange}>
              <SelectTrigger id={field.id} className="form-select-trigger">
                <SelectValue placeholder="Select an answer" />
              </SelectTrigger>
              <SelectContent>
                {TRI_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      )}
    </FormField>
  );
}

export function DwellingFields({ control, errors }: DetailsForm) {
  return (
    <>
      <FormSection title="Dwelling">
        <ChoiceField
          control={control}
          name="constructionMaterial"
          label="Construction material"
          options={CONSTRUCTION}
          placeholder="Select the material"
          error={errors.constructionMaterial?.message}
        />
        <ChoiceField
          control={control}
          name="tenure"
          label="Tenure"
          options={TENURE}
          placeholder="Select the tenure"
          error={errors.tenure?.message}
        />
      </FormSection>

      <FormSection title="Services">
        <ChoiceField
          control={control}
          name="waterSource"
          label="Water source"
          options={WATER}
          placeholder="Select the water source"
          error={errors.waterSource?.message}
        />
        <ChoiceField
          control={control}
          name="toiletFacility"
          label="Toilet facility"
          options={TOILET}
          placeholder="Select the facility"
          error={errors.toiletFacility?.message}
        />
        <ChoiceField
          control={control}
          name="powerSource"
          label="Power source"
          options={POWER}
          placeholder="Select the power source"
          error={errors.powerSource?.message}
        />
        <ChoiceField
          control={control}
          name="wasteDisposal"
          label="Waste disposal"
          options={WASTE}
          placeholder="Select the arrangement"
          error={errors.wasteDisposal?.message}
        />
        <TriField control={control} name="internet" label="Internet at home" error={errors.internet?.message} />
      </FormSection>
    </>
  );
}

export function LivelihoodFields({ register, control, errors }: DetailsForm) {
  return (
    <FormSection title="Livelihood">
      <ChoiceField
        control={control}
        name="incomeBracket"
        label="Income bracket"
        options={INCOME}
        placeholder="Select the bracket"
        error={errors.incomeBracket?.message}
      />
      <FormField id="livelihood" label="Main livelihood" required error={errors.livelihood?.message}>
        {(field) => <Input {...field} placeholder="Fishing, farming, tourism services" {...register("livelihood")} />}
      </FormField>
      <TriField
        control={control}
        name="foodSecurity"
        label="Enough food in the past week"
        hint="Unknown when the question was not asked."
        error={errors.foodSecurity?.message}
      />
    </FormSection>
  );
}

export function AddressFields({
  register,
  control,
  errors,
  barangays,
}: {
  register: UseFormRegister<HouseholdAddressValues>;
  control: Control<HouseholdAddressValues>;
  errors: FieldErrors<HouseholdAddressValues>;
  barangays: readonly { id: string; label: string }[];
}) {
  return (
    <FormSection title="Address">
      <FormField id="barangayId" label="Barangay" required error={errors.barangayId?.message}>
        {(field) => (
          <Controller
            control={control}
            name="barangayId"
            render={({ field: bound }) => (
              <Select value={bound.value ?? ""} onValueChange={bound.onChange}>
                <SelectTrigger id={field.id} className="form-select-trigger">
                  <SelectValue placeholder="Select a barangay" />
                </SelectTrigger>
                <SelectContent>
                  {barangays.map((barangay) => (
                    <SelectItem key={barangay.id} value={barangay.id}>
                      {barangay.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>
      <FormField id="houseNumber" label="House or lot number" required error={errors.houseNumber?.message}>
        {(field) => <Input {...field} placeholder="12" {...register("houseNumber")} />}
      </FormField>
      <FormField id="street" label="Street" required error={errors.street?.message}>
        {(field) => <Input {...field} placeholder="Seaside Street" {...register("street")} />}
      </FormField>
      <FormField id="sitio" label="Sitio">
        {(field) => <Input {...field} placeholder="Sitio Maligaya" {...register("sitio")} />}
      </FormField>
      <FormField id="purok" label="Purok" required error={errors.purok?.message}>
        {(field) => <Input {...field} placeholder="Purok 1" {...register("purok")} />}
      </FormField>
    </FormSection>
  );
}

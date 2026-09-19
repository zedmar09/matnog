import { z } from "zod";

import { demoClock } from "@/shared/data/demo-clock";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const dateOnly = z.string().regex(DATE_ONLY, "Use the YYYY-MM-DD format.");

/** Date-only values are compared at Manila midnight, never as timestamps. */
export function parseDateOnly(value: string): number {
  return Date.parse(`${value}T00:00:00+08:00`);
}

export const residentSchema = z.object({
  firstName: z.string().trim().min(1, "Enter the first name."),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().min(1, "Enter the last name."),
  suffix: z.string().trim().optional(),
  birthDate: dateOnly.refine(
    // Checked against the demo clock so the rule is reproducible.
    (value) => parseDateOnly(value) <= demoClock.now().getTime(),
    "The birth date cannot be in the future.",
  ),
  sex: z.enum(["female", "male"]),
  civilStatus: z.string().trim().min(1, "Select a civil status."),
  citizenship: z.string().trim().min(1, "Enter the citizenship."),
  occupation: z.string().trim().optional(),
  contactNumber: z.string().trim().optional(),
});

export type ResidentValues = z.infer<typeof residentSchema>;

export const residencyPeriodSchema = z
  .object({
    barangayId: z.string().min(1, "Select a barangay."),
    structureId: z.string().min(1, "Select a structure."),
    from: dateOnly,
    to: dateOnly.optional().or(z.literal("")),
  })
  .refine((value) => !value.to || parseDateOnly(value.to) >= parseDateOnly(value.from), {
    message: "The end date cannot be before the start date.",
    path: ["to"],
  });

export type ResidencyPeriodValues = z.infer<typeof residencyPeriodSchema>;

export const membershipSchema = z.object({
  householdId: z.string().min(1, "Select a household."),
  relationshipToHead: z.string().trim().min(1, "Describe the relationship to the head."),
  from: dateOnly,
  temporaryAbsence: z.string().trim().optional(),
});

export type MembershipValues = z.infer<typeof membershipSchema>;

export const decisionSchema = z.object({
  reason: z.string().trim().min(8, "Record a reason of at least eight characters."),
});

export type DecisionValues = z.infer<typeof decisionSchema>;

/** A household's own details. Membership is changed through its own journey. */
export const householdDetailsSchema = z.object({
  label: z.string().trim().min(1, "Name the household."),
  /** Empty until someone is registered into the household. */
  headPersonId: z.string().trim().optional(),
  constructionMaterial: z.string().trim().min(1, "Select the construction material."),
  tenure: z.string().trim().min(1, "Select the tenure."),
  waterSource: z.string().trim().min(1, "Select the water source."),
  toiletFacility: z.string().trim().min(1, "Select the toilet facility."),
  powerSource: z.string().trim().min(1, "Select the power source."),
  wasteDisposal: z.string().trim().min(1, "Select the waste disposal."),
  internet: z.enum(["yes", "no", "unknown"]),
  incomeBracket: z.string().trim().min(1, "Select the income bracket."),
  livelihood: z.string().trim().min(1, "Enter the main livelihood."),
  foodSecurity: z.enum(["yes", "no", "unknown"]),
});

export type HouseholdDetailsValues = z.infer<typeof householdDetailsSchema>;

/**
 * A typed address. Saving one records a new structure rather than rewriting the
 * building other households are still attached to.
 */
export const householdAddressSchema = z.object({
  barangayId: z.string().min(1, "Select a barangay."),
  houseNumber: z.string().trim().min(1, "Enter the house or lot number."),
  street: z.string().trim().min(1, "Enter the street."),
  sitio: z.string().trim().optional(),
  purok: z.string().trim().min(1, "Enter the purok."),
});

export type HouseholdAddressValues = z.infer<typeof householdAddressSchema>;

export const householdClosureSchema = z
  .object({
    reason: z.enum(["dissolved", "merged", "moved-away", "created-in-error"]),
    note: z.string().trim().min(8, "Record a reason of at least eight characters."),
    /** Required when merging: the household the members move into. */
    mergedIntoId: z.string().trim().optional(),
    on: dateOnly,
  })
  .refine((value) => value.reason !== "merged" || Boolean(value.mergedIntoId), {
    message: "Choose the household the members move into.",
    path: ["mergedIntoId"],
  });

export type HouseholdClosureValues = z.infer<typeof householdClosureSchema>;

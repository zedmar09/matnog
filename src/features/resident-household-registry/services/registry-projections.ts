import type { Household, Person, RegistryPersona, Structure } from "../types/registry";

/**
 * Who is looking at the registry, and what they are allowed to see.
 *
 * These projections demonstrate intended presentation behaviour. Bundled
 * fixtures and client-side filtering are not production confidentiality or
 * authorisation.
 */
export type RegistryActor = {
  persona: RegistryPersona;
  label: string;
  /** Barangay scope for barangay staff and enumerators. */
  barangayId?: string;
  /** The resident's own person ID. */
  personId?: string;
  /** Households an enumerator has been assigned. */
  assignedHouseholdIds?: string[];
};

export const REGISTRY_ACTORS: Record<RegistryPersona, RegistryActor> = {
  "barangay-staff": {
    persona: "barangay-staff",
    label: "Barangay registry staff",
    barangayId: "DEMO-BRGY-A",
  },
  "data-steward": { persona: "data-steward", label: "Municipal data steward" },
  enumerator: {
    persona: "enumerator",
    label: "Field Surveyor",
    barangayId: "DEMO-BRGY-A",
    assignedHouseholdIds: ["DEMO-HH-003"],
  },
  resident: { persona: "resident", label: "Resident (Mara Dela Cruz)", personId: "DEMO-PER-001" },
};

/** The barangay of a person's open residency period, if any. */
export function currentBarangayId(person: Person): string | undefined {
  return person.residency.find((period) => !period.to)?.barangay.id;
}

/** The household of a person's open membership, if any. */
export function currentHouseholdId(person: Person): string | undefined {
  return person.memberships.find((membership) => !membership.to)?.householdId;
}

export function canSeePerson(actor: RegistryActor, person: Person): boolean {
  switch (actor.persona) {
    case "data-steward":
      return true;
    case "barangay-staff":
      // Staff keep sight of people who have ever lived in their barangay, so
      // closing a residency does not erase the history they are accountable for.
      return person.residency.some((period) => period.barangay.id === actor.barangayId);
    case "enumerator":
      return person.memberships.some((membership) => actor.assignedHouseholdIds?.includes(membership.householdId));
    case "resident":
      return person.envelope.id === actor.personId;
  }
}

export function canSeeHousehold(actor: RegistryActor, household: Household, structure?: Structure): boolean {
  switch (actor.persona) {
    case "data-steward":
      return true;
    case "barangay-staff":
      return structure?.barangay.id === actor.barangayId;
    case "enumerator":
      return actor.assignedHouseholdIds?.includes(household.envelope.id) ?? false;
    case "resident":
      return false;
  }
}

/** Only a steward adjudicates duplicates and transfers. */
export function canAdjudicate(actor: RegistryActor): boolean {
  return actor.persona === "data-steward";
}

export function canEditRegistry(actor: RegistryActor): boolean {
  return actor.persona === "barangay-staff" || actor.persona === "data-steward";
}

/**
 * Household projection for a given actor. A household head does not gain sight
 * of every member's confidential details, so restricted vulnerability flags are
 * removed rather than blanked, and the count of withheld flags is reported so
 * the omission is visible instead of silent.
 */
export function projectHousehold(
  actor: RegistryActor,
  household: Household,
): { household: Household; withheldFlags: number } {
  if (actor.persona === "data-steward" || actor.persona === "barangay-staff") {
    return { household, withheldFlags: 0 };
  }
  const visible = household.vulnerabilityFlags.filter((flag) => !flag.restricted);
  return {
    household: { ...household, vulnerabilityFlags: visible },
    withheldFlags: household.vulnerabilityFlags.length - visible.length,
  };
}

/**
 * Person projection for a given actor. A resident sees their own record in
 * full; anyone else's contact details are withheld from non-registry personas.
 */
export function projectPerson(actor: RegistryActor, person: Person): Person {
  if (canEditRegistry(actor) || person.envelope.id === actor.personId) return person;
  const { contactNumber: _withheld, ...rest } = person;
  return rest as Person;
}

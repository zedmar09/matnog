import type { ScenarioState } from "@/shared/data/local-repository";
import { ok, type RepositoryResult } from "@/shared/data/repository-result";

import type { BarangayRef, Household, Person, Structure, VerificationState } from "../types/registry";
import type { RegistryActor } from "./registry-projections";
import { listHouseholds, listResidents, readPerson, registryStores } from "./registry-repository";

/**
 * Minimal M01-owned projections that another module may place in a selector.
 * Contact details, evidence, demographics, household profiles, and restricted
 * flags deliberately never cross this boundary.
 */
export type PersonRecordOption = {
  personId: string;
  reference: string;
  displayName: string;
  status: string;
  recordVersion: number;
  verificationState: VerificationState;
  currentBarangay?: BarangayRef;
  currentHouseholdId?: string;
};

export type HouseholdRecordOption = {
  householdId: string;
  structureId?: string;
  reference: string;
  label: string;
  status: string;
  recordVersion: number;
  memberCount: number;
  barangay?: BarangayRef;
};

/** The linked account may see its own profile and current address, not the
 * household's other members or its restricted vulnerability answers. */
export type OwnResidentProfile = {
  personId: string;
  displayName: string;
  birthDate: string;
  sex: Person["sex"];
  civilStatus: string;
  citizenship: string;
  occupation?: string;
  currentBarangay?: BarangayRef;
  currentHouseholdId?: string;
  address?: string;
};

export async function readOwnResidentProfile(
  personId: string,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<OwnResidentProfile>> {
  const actor: RegistryActor = { persona: "resident", personId, label: "Linked resident account" };
  const result = await readPerson(actor, personId, scenario);
  if (result.kind !== "success") return result as RepositoryResult<OwnResidentProfile>;
  const person = result.data;
  const currentResidency = person.residency.find((period) => !period.to);
  const currentMembership = person.memberships.find((membership) => !membership.to);
  const structure = currentResidency
    ? await registryStores.structures.read(currentResidency.structureId, { actor: actor.label, scenario })
    : null;
  const address =
    structure?.kind === "success"
      ? [
          `${structure.data.houseNumber} ${structure.data.street}`.trim(),
          structure.data.sitio,
          structure.data.purok,
          structure.data.barangay.label,
          "Matnog, Sorsogon",
        ]
          .filter(Boolean)
          .join(", ")
      : undefined;
  return ok({
    personId: person.envelope.id,
    displayName: [person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(" "),
    birthDate: person.birthDate,
    sex: person.sex,
    civilStatus: person.civilStatus,
    citizenship: person.citizenship,
    occupation: person.occupation,
    currentBarangay: currentResidency?.barangay,
    currentHouseholdId: currentMembership?.householdId,
    address,
  });
}

function personOption(person: Person): PersonRecordOption {
  const currentResidency = person.residency.find((period) => !period.to);
  const currentMembership = person.memberships.find((membership) => !membership.to);
  return {
    personId: person.envelope.id,
    reference: person.envelope.reference,
    displayName: [person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(" "),
    status: person.envelope.status,
    recordVersion: person.envelope.version,
    verificationState: person.verification.state,
    currentBarangay: currentResidency?.barangay,
    currentHouseholdId: currentMembership?.householdId,
  };
}

function householdOption(row: {
  household: Household;
  structure?: Structure;
  memberCount: number;
}): HouseholdRecordOption {
  return {
    householdId: row.household.envelope.id,
    structureId: row.structure?.envelope.id,
    reference: row.household.envelope.reference,
    label: row.household.envelope.scope.label,
    status: row.household.envelope.status,
    recordVersion: row.household.envelope.version,
    memberCount: row.memberCount,
    barangay: row.structure?.barangay,
  };
}

export async function listPersonRecordOptions(
  actor: RegistryActor,
  search = "",
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<PersonRecordOption[]>> {
  const result = await listResidents(actor, { search }, scenario);
  if (result.kind !== "success") return result as RepositoryResult<PersonRecordOption[]>;
  return ok(result.data.map((row) => personOption(row.person)));
}

export async function readPersonRecordOption(
  actor: RegistryActor,
  personId: string,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<PersonRecordOption>> {
  const result = await readPerson(actor, personId, scenario);
  if (result.kind !== "success") return result as RepositoryResult<PersonRecordOption>;
  return ok(personOption(result.data));
}

export async function listHouseholdRecordOptions(
  actor: RegistryActor,
  search = "",
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<HouseholdRecordOption[]>> {
  const result = await listHouseholds(actor, { search }, scenario);
  if (result.kind !== "success") return result as RepositoryResult<HouseholdRecordOption[]>;
  return ok(result.data.map(householdOption));
}

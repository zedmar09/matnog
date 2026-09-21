import { demoClock } from "@/shared/data/demo-clock";
import { InMemoryRepository } from "@/shared/data/in-memory-repository";
import type { OperationContext, ScenarioState } from "@/shared/data/local-repository";
import { createEnvelope, type HistoryEntry, type MunicipalRecord } from "@/shared/data/record-envelope";
import { denied, empty, invalid, ok, type RepositoryResult } from "@/shared/data/repository-result";

import { HOUSEHOLDS, STRUCTURES } from "../data/households";
import { PEOPLE } from "../data/people";
import { DUPLICATE_CANDIDATES, TRANSFER_REQUESTS } from "../data/review";
import { SURVEY_ASSIGNMENTS } from "../data/surveys";
import type { BarangayRef, DuplicateCandidate, Household, Person, Structure, TransferRequest } from "../types/registry";
import type { SurveyAssignment } from "../types/survey";
import {
  canAdjudicate,
  canSeeHousehold,
  canSeePerson,
  currentBarangayId,
  projectHousehold,
  projectPerson,
  type RegistryActor,
} from "./registry-projections";
import { ageOn } from "./registry-rules";

const people = new InMemoryRepository<Person>({
  fixtures: PEOPLE,
  searchableText: (person) =>
    [person.firstName, person.middleName, person.lastName, person.suffix, ...person.aliases].filter(Boolean).join(" "),
  latencyMs: 250,
  exportTitle: (person) => `${person.firstName} ${person.lastName}`,
  exportLines: (person) => [
    `Person ID: ${person.envelope.id}`,
    `Name: ${person.firstName} ${person.lastName}`,
    `Date of birth: ${person.birthDate}`,
    `Status: ${person.envelope.status}`,
  ],
});

const households = new InMemoryRepository<Household>({
  fixtures: HOUSEHOLDS,
  searchableText: (household) => household.envelope.scope.label,
  latencyMs: 250,
});

const structures = new InMemoryRepository<Structure>({
  fixtures: STRUCTURES,
  searchableText: (structure) =>
    `${structure.houseNumber} ${structure.street} ${structure.sitio} ${structure.purok} ${structure.barangay.label}`,
  latencyMs: 250,
});

const duplicates = new InMemoryRepository<DuplicateCandidate>({
  fixtures: DUPLICATE_CANDIDATES,
  searchableText: (candidate) => candidate.personIds.join(" "),
  latencyMs: 250,
});

const transfers = new InMemoryRepository<TransferRequest>({
  fixtures: TRANSFER_REQUESTS,
  searchableText: (transfer) => `${transfer.personId} ${transfer.from.label} ${transfer.to.label}`,
  latencyMs: 250,
});

export const registryStores: {
  people: typeof people;
  households: typeof households;
  structures: typeof structures;
  duplicates: typeof duplicates;
  transfers: typeof transfers;
  surveys?: InMemoryRepository<SurveyAssignment>;
} = { people, households, structures, duplicates, transfers };

/** Restores every registry fixture, for a deterministic scenario replay. */
export function resetRegistry(): void {
  for (const store of Object.values(registryStores)) store?.reset();
}

function contextFor(actor: RegistryActor, scenario: ScenarioState, extra: Partial<OperationContext> = {}) {
  return { actor: actor.label, scenario, ...extra } satisfies OperationContext;
}

async function allOf<T extends MunicipalRecord>(
  store: InMemoryRepository<T>,
  context: OperationContext,
): Promise<RepositoryResult<T[]>> {
  const result = await store.list({ pageSize: 500 }, context);
  if (result.kind === "success") return ok(result.data.items);
  if (result.kind === "empty") return ok([]);
  return result as RepositoryResult<T[]>;
}

export type RegistryDirectoryRow = {
  person: Person;
  barangayLabel?: string;
  householdId?: string;
};

/** Directory rows the actor may see, already projected. */
/**
 * Records a corrected address as its own structure. A typed address never
 * rewrites the building other households are still attached to.
 */
export async function createStructureForAddress(
  actor: RegistryActor,
  address: { houseNumber: string; street: string; sitio: string; purok: string; barangay: BarangayRef },
  householdIds: string[],
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Structure>> {
  const context = contextFor(actor, scenario);
  const all = await allOf(structures, context);
  const nextNumber = (all.kind === "success" ? all.data.length : 0) + 1;
  const id = `DEMO-STR-${String(nextNumber).padStart(3, "0")}-A`;
  const record: Structure = {
    envelope: createEnvelope({
      id,
      status: "Active",
      scope: { kind: "barangay", id: address.barangay.id, label: address.barangay.label },
      createdAt: demoClock.nowIso(),
    }),
    barangay: address.barangay,
    sitio: address.sitio,
    purok: address.purok,
    street: address.street,
    houseNumber: address.houseNumber,
    householdIds,
  };
  return structures.create(record, context);
}

export async function listResidents(
  actor: RegistryActor,
  options: {
    search?: string;
    barangayId?: string;
    verification?: string;
    lifeStatus?: string;
    sex?: string;
    /** Inclusive age band, evaluated against the demo clock. */
    ageBand?: string;
  } = {},
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<RegistryDirectoryRow[]>> {
  const context = contextFor(actor, scenario);
  const result = await people.list({ search: options.search, pageSize: 500 }, context);
  if (result.kind === "empty") return ok([]);
  if (result.kind !== "success") return result as RepositoryResult<RegistryDirectoryRow[]>;

  const rows = result.data.items
    .filter((person) => canSeePerson(actor, person))
    .filter((person) => {
      const barangay = currentBarangayId(person);
      return !options.barangayId || barangay === options.barangayId;
    })
    .filter((person) => !options.verification || person.verification.state === options.verification)
    .filter((person) => !options.lifeStatus || person.lifeStatus === options.lifeStatus)
    .filter((person) => !options.sex || person.sex === options.sex)
    .filter((person) => {
      if (!options.ageBand) return true;
      const [from, to] = options.ageBand.split("-").map(Number);
      const age = ageOn(person, demoClock.now().toISOString());
      return age >= from && (Number.isNaN(to) || age <= to);
    })
    .map((person) => {
      const open = person.residency.find((period) => !period.to);
      const membership = person.memberships.find((entry) => !entry.to);
      return {
        person: projectPerson(actor, person),
        barangayLabel: open?.barangay.label,
        householdId: membership?.householdId,
      };
    });
  return ok(rows);
}

export async function readPerson(
  actor: RegistryActor,
  personId: string,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Person>> {
  const result = await people.read(personId, contextFor(actor, scenario));
  if (result.kind !== "success") return result;
  if (!canSeePerson(actor, result.data)) {
    // A generic message: naming the record would confirm a hidden identity.
    return denied("This record is outside your assigned scope.");
  }
  return ok(projectPerson(actor, result.data));
}

export async function personHistory(
  actor: RegistryActor,
  personId: string,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<HistoryEntry[]>> {
  return people.history(personId, contextFor(actor, scenario));
}

export type HouseholdDetail = {
  household: Household;
  structure?: Structure;
  members: { person: Person; relationshipToHead: string; from: string; to?: string; temporaryAbsence?: string }[];
  withheldFlags: number;
  /** Other households sharing the same structure. */
  coResident: Household[];
};

export async function listHouseholds(
  actor: RegistryActor,
  options: { search?: string; staleOnly?: boolean; includeClosed?: boolean } = {},
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<{ household: Household; structure?: Structure; memberCount: number }[]>> {
  const context = contextFor(actor, scenario);
  const householdResult = await allOf(households, context);
  if (householdResult.kind !== "success") return householdResult as never;
  const structureResult = await allOf(structures, context);
  if (structureResult.kind !== "success") return structureResult as never;
  const peopleResult = await allOf(people, context);
  if (peopleResult.kind !== "success") return peopleResult as never;

  const search = (options.search ?? "").trim().toLowerCase();
  const rows = householdResult.data
    .map((household) => ({
      household,
      structure: structureResult.data.find((item) => item.envelope.id === household.structureId),
    }))
    .filter((row) => canSeeHousehold(actor, row.household, row.structure))
    .filter((row) => (options.includeClosed ?? false) || !row.household.closure)
    .filter((row) => {
      if (!search) return true;
      const haystack = `${row.household.envelope.id} ${row.household.envelope.scope.label} ${
        row.structure
          ? `${row.structure.houseNumber} ${row.structure.street} ${row.structure.sitio} ${row.structure.purok}`
          : ""
      }`;
      return haystack.toLowerCase().includes(search);
    })
    .filter((row) => !options.staleOnly || isStale(row.household))
    .map((row) => ({
      ...row,
      memberCount: peopleResult.data.filter((person) =>
        person.memberships.some((membership) => membership.householdId === row.household.envelope.id && !membership.to),
      ).length,
    }));
  return ok(rows);
}

/** The next free household reference, in the registry's own numbering. */
export async function nextHouseholdId(actor: RegistryActor, scenario: ScenarioState = "normal"): Promise<string> {
  const listed = await allOf(households, contextFor(actor, scenario));
  const existing = listed.kind === "success" ? listed.data : [];
  const highest = existing.reduce((max, household) => {
    const parsed = Number.parseInt(household.envelope.id.replace("DEMO-HH-", ""), 10);
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 0);
  return `DEMO-HH-${String(highest + 1).padStart(3, "0")}`;
}

export async function readHousehold(
  actor: RegistryActor,
  householdId: string,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<HouseholdDetail>> {
  const context = contextFor(actor, scenario);
  const result = await households.read(householdId, context);
  if (result.kind !== "success") return result as RepositoryResult<HouseholdDetail>;

  const structureResult = await allOf(structures, context);
  if (structureResult.kind !== "success") return structureResult as never;
  const structure = structureResult.data.find((item) => item.envelope.id === result.data.structureId);
  if (!canSeeHousehold(actor, result.data, structure)) {
    return denied("This household is outside your assigned scope.");
  }

  const peopleResult = await allOf(people, context);
  if (peopleResult.kind !== "success") return peopleResult as never;

  const members = peopleResult.data
    .flatMap((person) =>
      person.memberships
        .filter((membership) => membership.householdId === householdId)
        .map((membership) => ({
          person: projectPerson(actor, person),
          relationshipToHead: membership.relationshipToHead,
          from: membership.from,
          to: membership.to,
          temporaryAbsence: membership.temporaryAbsence,
        })),
    )
    .sort((a, b) => a.from.localeCompare(b.from));

  const projected = projectHousehold(actor, result.data);
  const coResident = structure
    ? householdsOf(structure, await allOf(households, context)).filter((item) => item.envelope.id !== householdId)
    : [];

  return ok({ household: projected.household, structure, members, withheldFlags: projected.withheldFlags, coResident });
}

function householdsOf(structure: Structure, result: RepositoryResult<Household[]>): Household[] {
  if (result.kind !== "success") return [];
  return result.data.filter((household) => structure.householdIds.includes(household.envelope.id));
}

/** A household is stale when it has not been verified within a year. */
export function isStale(household: Household): boolean {
  if (household.closure) return false;
  if (!household.lastVerifiedAt) return true;
  const verified = Date.parse(`${household.lastVerifiedAt}T00:00:00+08:00`);
  return demoClock.now().getTime() - verified > 365 * 24 * 60 * 60 * 1000;
}

export async function listDuplicates(
  actor: RegistryActor,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<DuplicateCandidate[]>> {
  if (!canAdjudicate(actor)) return denied("Duplicate adjudication is limited to the municipal data steward.");
  return allOf(duplicates, contextFor(actor, scenario));
}

export async function listTransfers(
  actor: RegistryActor,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<TransferRequest[]>> {
  if (!canAdjudicate(actor) && actor.persona !== "barangay-staff") {
    return denied("Transfer review is limited to registry staff and the municipal data steward.");
  }
  const result = await allOf(transfers, contextFor(actor, scenario));
  if (result.kind !== "success") return result;
  if (actor.persona === "data-steward") return result;
  return ok(
    result.data.filter((transfer) => transfer.from.id === actor.barangayId || transfer.to.id === actor.barangayId),
  );
}

export { empty };

const surveys = new InMemoryRepository<SurveyAssignment>({
  fixtures: SURVEY_ASSIGNMENTS,
  searchableText: (assignment) => `${assignment.householdId} ${assignment.envelope.scope.label}`,
  latencyMs: 250,
});

registryStores.surveys = surveys;

/**
 * Survey assignments the actor may see. An enumerator sees their own
 * assignments; registry staff and the steward see the queue they supervise.
 */
export async function listSurveys(
  actor: RegistryActor,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<SurveyAssignment[]>> {
  if (actor.persona === "resident") {
    return denied("Survey assignments are not part of the resident view.");
  }
  const result = await allOf(surveys, contextFor(actor, scenario));
  if (result.kind !== "success") return result;
  if (actor.persona !== "enumerator") return result;
  return ok(result.data.filter((assignment) => actor.assignedHouseholdIds?.includes(assignment.householdId)));
}

/** Applies one side of a field conflict and clears it from the assignment. */
export async function resolveSurveyConflict(
  actor: RegistryActor,
  assignmentId: string,
  field: string,
  keep: "local" | "current",
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<SurveyAssignment>> {
  const current = await surveys.read(assignmentId, contextFor(actor, scenario));
  if (current.kind !== "success") return current;

  const remaining = current.data.conflicts.filter((conflict) => conflict.field !== field);
  const resolved = current.data.conflicts.find((conflict) => conflict.field === field);
  if (!resolved) {
    return invalid([{ id: field, message: "That field is no longer in conflict." }]);
  }

  const updated = await surveys.saveDraft(
    assignmentId,
    { conflicts: remaining } as Partial<Omit<SurveyAssignment, "envelope">>,
    contextFor(actor, scenario),
  );
  if (updated.kind !== "success") return updated;

  return surveys.appendTimeline(
    assignmentId,
    {
      action: `Conflict resolved on ${resolved.label}`,
      reason: `Kept the ${keep === "local" ? "field-captured" : "current stored"} value: ${
        keep === "local" ? resolved.local : resolved.current
      }`,
    },
    contextFor(actor, scenario),
  );
}

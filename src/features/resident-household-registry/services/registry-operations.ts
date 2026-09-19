import { demoClock } from "@/shared/data/demo-clock";
import type { ScenarioState } from "@/shared/data/local-repository";
import { createEnvelope } from "@/shared/data/record-envelope";
import { denied, invalid, ok, type RepositoryResult } from "@/shared/data/repository-result";

import { VULNERABILITY_TEMPLATE } from "../data/households";
import { SURVEY_FIELDS } from "../data/survey-fields";
import type {
  HouseholdAddressValues,
  HouseholdClosureValues,
  HouseholdDetailsValues,
  ResidentValues,
} from "../schemas/registry-schema";
import type { BarangayRef, DuplicateCandidate, Household, Person, TransferRequest, TriState } from "../types/registry";
import type { SurveyAssignment, SurveyDraft, SurveySection } from "../types/survey";
import { canAdjudicate, canEditRegistry, canSeePerson, type RegistryActor } from "./registry-projections";
import { createStructureForAddress, nextHouseholdId, registryStores } from "./registry-repository";
import { closeMembership, closeResidency, matchSignals, residencyOverlapErrors } from "./registry-rules";

const { people, duplicates, transfers, surveys, households } = registryStores;

function today(): string {
  return demoClock.now().toISOString().slice(0, 10);
}

function context(actor: RegistryActor, scenario: ScenarioState, extra: Record<string, unknown> = {}) {
  return { actor: actor.label, scenario, ...extra };
}

/** Saves identity edits as a draft. The version does not advance. */
export async function saveResidentDraft(
  actor: RegistryActor,
  personId: string,
  values: ResidentValues,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Person>> {
  if (!canEditRegistry(actor)) return denied("Your demo role cannot edit registry records.");
  return people.saveDraft(personId, values as Partial<Omit<Person, "envelope">>, context(actor, scenario));
}

/** Submits a draft for verification. */
export async function submitResident(
  actor: RegistryActor,
  personId: string,
  expectedVersion: number,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Person>> {
  if (!canEditRegistry(actor)) return denied("Your demo role cannot submit registry records.");
  return people.recordDecision(
    personId,
    { outcome: "approved", status: "Pending verification" },
    context(actor, scenario, { expectedVersion }),
  );
}

/**
 * Records one captured survey section. Capture is normally done on a phone in
 * the field; the same steps are available here so a desk officer can complete a
 * visit that was reported by phone, or finish one a device could not sync.
 */
export async function captureSurveySection(
  actor: RegistryActor,
  assignmentId: string,
  sectionId: string,
  answers: SurveyDraft,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<SurveyAssignment>> {
  if (!canEditRegistry(actor)) return denied("Your demo role cannot capture survey sections.");
  if (!surveys) return denied("The survey store is not available in this workspace.");
  const result = await surveys.read(assignmentId, context(actor, scenario));
  if (result.kind !== "success") return result;
  if (result.data.state === "accepted") {
    return invalid([{ id: "state", message: "This survey was already accepted." }]);
  }

  const draft = { ...result.data.draft, ...answers };
  // A section counts as captured once every one of its questions is answered.
  // "unknown" is an answer; an empty value is not.
  const required = SURVEY_FIELDS[sectionId] ?? [];
  const answered = (path: string) => (draft[path] ?? "").trim().length > 0;
  // The member step is captured once every listed member has an outcome, which
  // the screen supplies; other steps are judged against their own questions.
  const outcomeKeys = Object.keys(answers).filter((key) => key.endsWith(".outcome"));
  const complete =
    sectionId === "members"
      ? outcomeKeys.length > 0 && outcomeKeys.every(answered)
      : required.length === 0
        ? true
        : required.every((field) => answered(field.path));

  const sections: SurveySection[] = result.data.sections.map((section) =>
    section.id === sectionId ? { ...section, complete } : section,
  );
  const done = sections.filter((section) => section.complete).length;
  return surveys.saveDraft(
    assignmentId,
    {
      sections,
      draft,
      // A survey moves to queued only once every step has been captured.
      state: done === sections.length ? "queued" : "in-progress",
    } as Partial<Omit<SurveyAssignment, "envelope">>,
    context(actor, scenario),
  );
}

/**
 * Writes a fully captured survey onto the household record.
 *
 * This is the only path that changes dwelling, livelihood and vulnerability
 * data: those answers come from a visit, so they arrive through the survey that
 * recorded the visit rather than through a free-form edit.
 */
export async function applySurvey(
  actor: RegistryActor,
  assignmentId: string,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<SurveyAssignment>> {
  if (!canEditRegistry(actor)) return denied("Your demo role cannot apply a survey.");
  if (!surveys || !households) return denied("The registry stores are not available in this workspace.");
  const result = await surveys.read(assignmentId, context(actor, scenario));
  if (result.kind !== "success") return result;
  const assignment = result.data;
  if (assignment.state === "accepted") return invalid([{ id: "state", message: "This survey was already accepted." }]);
  if (assignment.sections.some((section) => !section.complete)) {
    return invalid([{ id: "sections", message: "Capture every section before applying the survey." }]);
  }
  if (assignment.conflicts.length > 0) {
    return invalid([{ id: "conflicts", message: "Resolve the field conflicts before applying the survey." }]);
  }

  const household = await households.read(assignment.householdId, context(actor, scenario));
  if (household.kind !== "success") return household as RepositoryResult<SurveyAssignment>;

  const dwelling = { ...household.data.dwelling };
  const socioeconomic = { ...household.data.socioeconomic };
  const vulnerabilityFlags = household.data.vulnerabilityFlags.map((flag) => {
    const answer = assignment.draft[`vulnerability.${flag.id}`];
    return answer ? { ...flag, value: answer as TriState } : flag;
  });
  for (const [path, value] of Object.entries(assignment.draft)) {
    const [group, key] = path.split(".");
    if (group === "dwelling" && key in dwelling) Object.assign(dwelling, { [key]: value });
    if (group === "socioeconomic" && key in socioeconomic) Object.assign(socioeconomic, { [key]: value });
  }

  const memberErrors = await applyMemberOutcomes(actor, assignment, scenario);
  if (memberErrors.length > 0) return invalid(memberErrors);

  const applied = await households.saveDraft(
    assignment.householdId,
    { dwelling, socioeconomic, vulnerabilityFlags, lastVerifiedAt: today() } as Partial<Omit<Household, "envelope">>,
    context(actor, scenario),
  );
  if (applied.kind !== "success") return applied as RepositoryResult<SurveyAssignment>;

  return surveys.saveDraft(
    assignmentId,
    { state: "accepted" } as Partial<Omit<SurveyAssignment, "envelope">>,
    context(actor, scenario),
  );
}

/**
 * Applies what the enumerator recorded about each member during the visit.
 *
 * A member who has left stops being a member on the visit date; their earlier
 * membership stays closed-but-readable, and their person record is untouched
 * because leaving one household is not leaving the municipality.
 */
async function applyMemberOutcomes(
  actor: RegistryActor,
  assignment: SurveyAssignment,
  scenario: ScenarioState,
): Promise<{ id: string; message: string }[]> {
  const on = today();
  const errors: { id: string; message: string }[] = [];
  const outcomes = Object.entries(assignment.draft)
    .filter(([key]) => key.startsWith("member.") && key.endsWith(".outcome"))
    .map(([key, outcome]) => ({ personId: key.slice("member.".length, -".outcome".length), outcome }));

  for (const { personId, outcome } of outcomes) {
    const person = await people.read(personId, context(actor, scenario));
    if (person.kind !== "success") continue;
    const open = person.data.memberships.find(
      (membership) => !membership.to && membership.householdId === assignment.householdId,
    );
    if (!open) continue;

    const relationship = assignment.draft[`member.${personId}.relationship`]?.trim();
    const absence = assignment.draft[`member.${personId}.absence`]?.trim();
    const memberships = person.data.memberships.map((membership) => {
      if (membership.id !== open.id) return membership;
      if (outcome === "left") return { ...membership, to: on, temporaryAbsence: undefined };
      return {
        ...membership,
        relationshipToHead: relationship || membership.relationshipToHead,
        temporaryAbsence: outcome === "away" ? absence || "Away at the time of the visit" : undefined,
      };
    });

    const saved = await people.saveDraft(
      personId,
      { memberships } as Partial<Omit<Person, "envelope">>,
      context(actor, scenario),
    );
    if (saved.kind !== "success") {
      errors.push({ id: `member.${personId}`, message: `${personId} could not be updated.` });
    }
  }
  return errors;
}

export type MembershipChange = {
  householdId: string;
  relationshipToHead: string;
  /** Defaults to the demo date when left empty. */
  on?: string;
  reason: string;
};

/**
 * Moves a person to another household, or corrects the relationship on the one
 * they already have.
 *
 * A move is a new membership period: the old one closes on the event date and
 * stays readable, because a later report must still be able to say where this
 * person lived last year. Correcting a mistyped relationship is not a move, so
 * it edits the open period in place rather than inventing a period boundary
 * that never happened.
 */
export async function changeMembership(
  actor: RegistryActor,
  personId: string,
  input: MembershipChange,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Person>> {
  if (!canEditRegistry(actor)) return denied("Your demo role cannot change household membership.");
  if (input.reason.trim().length < 8) {
    return invalid([{ id: "reason", message: "Give a reason of at least eight characters." }]);
  }
  if (!input.householdId) return invalid([{ id: "householdId", message: "Choose a household." }]);

  const result = await people.read(personId, context(actor, scenario));
  if (result.kind !== "success") return result;
  if (!canSeePerson(actor, result.data)) return denied("This record is outside your assigned scope.");

  const open = result.data.memberships.find((membership) => !membership.to);
  const on = input.on?.trim() || today();
  if (open && open.householdId === input.householdId) {
    // Same household: a correction, not a move.
    const memberships = result.data.memberships.map((membership) =>
      membership.id === open.id ? { ...membership, relationshipToHead: input.relationshipToHead } : membership,
    );
    return people.saveDraft(personId, { memberships } as Partial<Omit<Person, "envelope">>, context(actor, scenario));
  }

  if (open && on < open.from) {
    return invalid([{ id: "on", message: "The move cannot start before the current membership began." }]);
  }

  const closed = open ? closeMembership(result.data.memberships, open.householdId, on) : result.data.memberships;
  return people.saveDraft(
    personId,
    {
      memberships: [
        ...closed,
        {
          id: `${personId}-MEM-${closed.length + 1}`,
          householdId: input.householdId,
          relationshipToHead: input.relationshipToHead,
          from: on,
        },
      ],
    } as Partial<Omit<Person, "envelope">>,
    context(actor, scenario, { reason: input.reason.trim() }),
  );
}

export type LifeEvent = "deceased" | "moved-out";

/**
 * Records a death or migration. The person's record deactivates and the open
 * residency and membership close on the event date; nothing is deleted, so
 * historical reports stay reproducible.
 */
export async function recordLifeEvent(
  actor: RegistryActor,
  personId: string,
  event: LifeEvent,
  reason: string,
  expectedVersion: number,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Person>> {
  if (!canEditRegistry(actor)) return denied("Your demo role cannot record life events.");
  if (reason.trim().length < 8) {
    return invalid([{ id: "reason", message: "Record a reason of at least eight characters." }]);
  }

  const current = await people.read(personId, context(actor, scenario));
  if (current.kind !== "success") return current;

  const on = today();
  const status = event === "deceased" ? "Deceased" : "Moved out";
  return people
    .recordDecision(personId, { outcome: "cancelled", status, reason }, context(actor, scenario, { expectedVersion }))
    .then(async (result) => {
      if (result.kind !== "success") return result;
      return people.saveDraft(
        personId,
        {
          lifeStatus: event,
          residency: closeResidency(result.data.residency, on),
          memberships: result.data.memberships.map((membership) =>
            membership.to ? membership : { ...membership, to: on },
          ),
        } as Partial<Omit<Person, "envelope">>,
        context(actor, scenario),
      );
    });
}

/** Records a distinct-or-merge decision. Nothing merges without a reason. */
export async function decideDuplicate(
  actor: RegistryActor,
  candidateId: string,
  outcome: "distinct" | "merged",
  reason: string,
  expectedVersion: number,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<DuplicateCandidate>> {
  if (!canAdjudicate(actor)) {
    return denied("Duplicate adjudication is limited to the municipal data steward.");
  }
  if (reason.trim().length < 8) {
    return invalid([{ id: "reason", message: "Record a reason of at least eight characters." }]);
  }

  const decided = await duplicates.recordDecision(
    candidateId,
    {
      outcome: outcome === "merged" ? "approved" : "returned",
      status: outcome === "merged" ? "Merged" : "Distinct",
      reason,
    },
    context(actor, scenario, { expectedVersion }),
  );
  if (decided.kind !== "success") return decided;

  return duplicates.saveDraft(
    candidateId,
    {
      decision: { outcome, actor: actor.label, reason, at: demoClock.nowIso() },
    } as Partial<Omit<DuplicateCandidate, "envelope">>,
    context(actor, scenario),
  );
}

/** Reverses a merge, keeping both the original decision and the reversal. */
export async function reverseDuplicateDecision(
  actor: RegistryActor,
  candidateId: string,
  reason: string,
  expectedVersion: number,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<DuplicateCandidate>> {
  if (!canAdjudicate(actor)) {
    return denied("Duplicate adjudication is limited to the municipal data steward.");
  }
  if (reason.trim().length < 8) {
    return invalid([{ id: "reason", message: "Record a reason of at least eight characters." }]);
  }

  const current = await duplicates.read(candidateId, context(actor, scenario));
  if (current.kind !== "success") return current;
  if (!current.data.decision) {
    return invalid([{ id: "reason", message: "There is no recorded decision to reverse." }]);
  }

  const reversed = await duplicates.recordDecision(
    candidateId,
    { outcome: "cancelled", status: "Awaiting review", reason },
    context(actor, scenario, { expectedVersion }),
  );
  if (reversed.kind !== "success") return reversed;

  return duplicates.saveDraft(
    candidateId,
    {
      decision: undefined,
      reversedFrom: current.data.decision,
    } as Partial<Omit<DuplicateCandidate, "envelope">>,
    context(actor, scenario),
  );
}

/**
 * S01. The origin barangay releases, the destination accepts, and the person ID
 * never changes: the old residency period closes and a new one opens.
 */
export async function advanceTransfer(
  actor: RegistryActor,
  transferId: string,
  action: "release" | "accept" | "reject" | "dispute",
  reason: string,
  expectedVersion: number,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<TransferRequest>> {
  if (!canEditRegistry(actor)) return denied("Your demo role cannot act on transfer requests.");
  // Releasing and accepting are affirmative acts by an office. Only a refusal
  // or an escalation has to say why.
  if ((action === "reject" || action === "dispute") && reason.trim().length < 8) {
    return invalid([{ id: "reason", message: "Record a reason of at least eight characters." }]);
  }

  const current = await transfers.read(transferId, context(actor, scenario));
  if (current.kind !== "success") return current;

  const expected: Record<typeof action, TransferRequest["state"][]> = {
    release: ["requested"],
    accept: ["released"],
    reject: ["requested", "released"],
    dispute: ["requested", "released", "rejected"],
  };
  if (!expected[action].includes(current.data.state)) {
    return invalid([{ id: "reason", message: `A ${current.data.state} transfer cannot be ${action}ed.` }]);
  }

  const nextState: Record<typeof action, TransferRequest["state"]> = {
    release: "released",
    accept: "completed",
    reject: "rejected",
    dispute: "disputed",
  };
  const statusLabel: Record<TransferRequest["state"], string> = {
    requested: "Requested",
    released: "Released by origin",
    accepted: "Accepted",
    rejected: "Rejected",
    disputed: "Disputed",
    completed: "Completed",
  };

  const advanced = await transfers.recordDecision(
    transferId,
    {
      // Releasing and accepting are affirmative acts by an office, so they do
      // not require a reason. Rejecting and disputing do, and the check above
      // enforces that before we get here.
      outcome: action === "accept" || action === "release" ? "approved" : action === "reject" ? "rejected" : "returned",
      status: statusLabel[nextState[action]],
      reason: reason.trim() || undefined,
    },
    context(actor, scenario, { expectedVersion }),
  );
  if (advanced.kind !== "success") return advanced;

  const stored = await transfers.saveDraft(
    transferId,
    { state: nextState[action] } as Partial<Omit<TransferRequest, "envelope">>,
    context(actor, scenario),
  );
  if (stored.kind !== "success") return stored;

  if (action === "accept") {
    const moved = await applyCompletedTransfer(actor, stored.data, scenario);
    if (moved.kind !== "success") return moved as RepositoryResult<TransferRequest>;
  }
  return stored;
}

/** Closes the origin residency and membership, then opens the destination pair. */
async function applyCompletedTransfer(
  actor: RegistryActor,
  transfer: TransferRequest,
  scenario: ScenarioState,
): Promise<RepositoryResult<Person>> {
  const person = await people.read(transfer.personId, context(actor, scenario));
  if (person.kind !== "success") return person;
  if (!canSeePerson(actor, person.data)) return denied("This record is outside your assigned scope.");

  const on = today();
  const residency = closeResidency(person.data.residency, on, transfer.envelope.id);
  const memberships = closeMembership(
    person.data.memberships,
    person.data.memberships.find((membership) => !membership.to)?.householdId ?? "",
    on,
  );

  const overlap = residencyOverlapErrors(residency, { from: on });
  if (overlap.length > 0) return invalid(overlap);

  return people.saveDraft(
    transfer.personId,
    {
      residency: [
        ...residency,
        {
          id: `${transfer.envelope.id}-RES`,
          barangay: transfer.to,
          // The destination structure is derived from the receiving household.
          structureId: "DEMO-STR-002",
          from: on,
          transferId: transfer.envelope.id,
        },
      ],
      memberships: [
        ...memberships,
        {
          id: `${transfer.envelope.id}-MEM`,
          householdId: transfer.destinationHouseholdId,
          relationshipToHead: "Member",
          from: on,
        },
      ],
    } as Partial<Omit<Person, "envelope">>,
    context(actor, scenario),
  );
}

export { ok };

export type PossibleMatch = {
  person: Person;
  score: number;
  signals: string[];
};

/**
 * Suggests existing people who might already be this person.
 *
 * Registration must never silently create a second record for someone who is
 * already registered, and it must never merge on its own either: the reviewer
 * is shown the candidates and decides.
 */
export async function findPossibleMatches(
  actor: RegistryActor,
  candidate: { firstName: string; lastName: string; birthDate: string; middleName?: string },
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<PossibleMatch[]>> {
  const listed = await people.list({ pageSize: 500 }, context(actor, scenario));
  if (listed.kind === "empty") return ok([]);
  if (listed.kind !== "success") return listed as RepositoryResult<PossibleMatch[]>;

  const matches = listed.data.items
    .filter((person) => canSeePerson(actor, person))
    .map((person) => ({ person, ...matchSignals(candidate, person) }))
    .filter((entry) => entry.score >= 0.4)
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({
      person: entry.person,
      score: entry.score,
      signals: entry.signals.map((signal) => signal.label),
    }));
  return ok(matches);
}

/** Next free person ID in the sample series. */
async function nextPersonId(actor: RegistryActor, scenario: ScenarioState): Promise<string> {
  const listed = await people.list({ pageSize: 500 }, context(actor, scenario));
  const existing = listed.kind === "success" ? listed.data.items : [];
  const highest = existing.reduce((max, person) => {
    const parsed = Number.parseInt(person.envelope.id.replace("DEMO-PER-", ""), 10);
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 0);
  return `DEMO-PER-${String(highest + 1).padStart(3, "0")}`;
}

export type RegistrationInput = ResidentValues & {
  barangay: BarangayRef;
  structureId: string;
  householdId: string;
  relationshipToHead: string;
  from: string;
};

/**
 * Registers a new resident in draft. The reviewer has already seen any possible
 * matches; `acknowledgedMatches` records that they looked, so a later reader can
 * tell an unnoticed duplicate from a deliberate decision.
 */
export async function registerResident(
  actor: RegistryActor,
  input: RegistrationInput,
  acknowledgedMatches: string[],
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Person>> {
  if (!canEditRegistry(actor)) return denied("Your demo role cannot register residents.");

  const id = await nextPersonId(actor, scenario);
  const on = today();
  const person: Person = {
    envelope: createEnvelope({
      id,
      status: "Draft",
      scope: { kind: "person", id, label: `${input.firstName} ${input.lastName}` },
      createdAt: demoClock.nowIso(),
    }),
    firstName: input.firstName,
    lastName: input.lastName,
    aliases: [],
    birthDate: input.birthDate,
    sex: input.sex,
    civilStatus: input.civilStatus,
    citizenship: input.citizenship,
    lifeStatus: "living",
    verification: { state: "unverified", source: "Registry intake" },
    residency: [
      {
        id: `${id}-RES-1`,
        barangay: input.barangay,
        structureId: input.structureId,
        from: input.from || on,
      },
    ],
    memberships: [
      {
        id: `${id}-MEM-1`,
        householdId: input.householdId,
        relationshipToHead: input.relationshipToHead,
        from: input.from || on,
      },
    ],
    evidence: [],
    ...(input.middleName ? { middleName: input.middleName } : {}),
    ...(input.suffix ? { suffix: input.suffix } : {}),
    ...(input.occupation ? { occupation: input.occupation } : {}),
    ...(input.contactNumber ? { contactNumber: input.contactNumber } : {}),
  };

  const reason =
    acknowledgedMatches.length > 0
      ? `Registered after reviewing possible matches: ${acknowledgedMatches.join(", ")}`
      : "Registered with no possible match found";

  return people.create(person, { ...context(actor, scenario), reason });
}

/* ---------------------------------------------------------------- households */

/** Members whose membership in this household is still open. */
async function currentMembersOf(actor: RegistryActor, householdId: string, scenario: ScenarioState): Promise<Person[]> {
  const listed = await people.list({ pageSize: 500 }, context(actor, scenario));
  if (listed.kind !== "success") return [];
  return listed.data.items.filter((person) =>
    person.memberships.some((membership) => membership.householdId === householdId && !membership.to),
  );
}

/**
 * A household's display label and record status live on the shared envelope,
 * which `saveDraft` does not expose. The repository applies a patch before it
 * re-spreads the envelope, so an envelope carried in the patch survives. This
 * is the one place that relies on that ordering; see the household lifecycle
 * tests, which pin it.
 */
function householdPatch(
  patch: Partial<Omit<Household, "envelope">> & { envelope?: Household["envelope"] },
): Partial<Omit<Household, "envelope">> {
  return patch as Partial<Omit<Household, "envelope">>;
}

/** Maps flat form values onto the household's own nested shape. */
function householdFieldsFrom(values: HouseholdDetailsValues) {
  return {
    dwelling: {
      constructionMaterial: values.constructionMaterial,
      tenure: values.tenure,
      waterSource: values.waterSource,
      toiletFacility: values.toiletFacility,
      powerSource: values.powerSource,
      wasteDisposal: values.wasteDisposal,
      internet: values.internet as TriState,
    },
    socioeconomic: {
      incomeBracket: values.incomeBracket,
      livelihood: values.livelihood,
      foodSecurity: values.foodSecurity as TriState,
    },
  };
}

export type HouseholdCreateInput = HouseholdDetailsValues & {
  address: HouseholdAddressValues & { barangay: BarangayRef };
};

/**
 * Creates a household and the structure it sits at. A new family can be
 * recorded before anyone is registered into it, so the head is optional here
 * and set once the first member exists.
 */
export async function createHousehold(
  actor: RegistryActor,
  input: HouseholdCreateInput,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Household>> {
  if (!canEditRegistry(actor)) return denied("Your role cannot create households.");

  const id = await nextHouseholdId(actor, scenario);
  const structure = await createStructureForAddress(
    actor,
    {
      houseNumber: input.address.houseNumber,
      street: input.address.street,
      sitio: input.address.sitio ?? "",
      purok: input.address.purok,
      barangay: input.address.barangay,
    },
    [id],
    scenario,
  );
  if (structure.kind !== "success") return structure as RepositoryResult<Household>;

  const household: Household = {
    envelope: createEnvelope({
      id,
      status: "Active",
      scope: { kind: "household", id, label: input.label.trim() },
      createdAt: demoClock.nowIso(),
    }),
    headPersonId: input.headPersonId?.trim() ?? "",
    structureId: structure.data.envelope.id,
    ...householdFieldsFrom(input),
    // A new household has never been surveyed, so every indicator starts
    // unknown rather than defaulting to "no".
    vulnerabilityFlags: VULNERABILITY_TEMPLATE.map((flag) => ({ ...flag, value: "unknown" as TriState })),
  };
  return households.create(household, context(actor, scenario, { reason: "Household created at registry intake" }));
}

/** Corrects a household's own details. Membership and address have their own paths. */
export async function saveHouseholdDetails(
  actor: RegistryActor,
  householdId: string,
  values: HouseholdDetailsValues,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Household>> {
  if (!canEditRegistry(actor)) return denied("Your role cannot edit households.");
  const current = await households.read(householdId, context(actor, scenario));
  if (current.kind !== "success") return current;
  if (current.data.closure) {
    return invalid([{ id: "form", message: "This household is closed. Reopen it before editing its details." }]);
  }

  const head = values.headPersonId?.trim() ?? "";
  if (head) {
    const members = await currentMembersOf(actor, householdId, scenario);
    if (!members.some((person) => person.envelope.id === head)) {
      return invalid([{ id: "headPersonId", message: "The head must be a current member of this household." }]);
    }
  }

  return households.saveDraft(
    householdId,
    householdPatch({
      ...householdFieldsFrom(values),
      headPersonId: head,
      envelope: { ...current.data.envelope, scope: { ...current.data.envelope.scope, label: values.label.trim() } },
    }),
    context(actor, scenario, { reason: "Household details corrected" }),
  );
}

/**
 * Points a household at a newly recorded structure. The previous building is
 * left untouched because other households may still be attached to it.
 */
export async function changeHouseholdAddress(
  actor: RegistryActor,
  householdId: string,
  address: HouseholdAddressValues & { barangay: BarangayRef },
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Household>> {
  if (!canEditRegistry(actor)) return denied("Your role cannot edit households.");
  const structure = await createStructureForAddress(
    actor,
    {
      houseNumber: address.houseNumber,
      street: address.street,
      sitio: address.sitio ?? "",
      purok: address.purok,
      barangay: address.barangay,
    },
    [householdId],
    scenario,
  );
  if (structure.kind !== "success") return structure as RepositoryResult<Household>;
  return households.saveDraft(
    householdId,
    { structureId: structure.data.envelope.id } as Partial<Omit<Household, "envelope">>,
    context(actor, scenario, { reason: "Household address corrected" }),
  );
}

/**
 * Closes a household. The record and its membership history are kept; the
 * household simply leaves the active directory.
 *
 * A household holding current members cannot be closed silently: either the
 * members move to a named household ("merged"), or they must be moved out
 * first. Nothing here orphans a person's membership.
 */
export async function closeHousehold(
  actor: RegistryActor,
  householdId: string,
  values: HouseholdClosureValues,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Household>> {
  if (!canEditRegistry(actor)) return denied("Your role cannot close households.");
  const current = await households.read(householdId, context(actor, scenario));
  if (current.kind !== "success") return current;
  if (current.data.closure) return invalid([{ id: "form", message: "This household is already closed." }]);

  const on = values.on || today();
  const members = await currentMembersOf(actor, householdId, scenario);

  if (values.reason === "merged") {
    const target = values.mergedIntoId?.trim() ?? "";
    if (target === householdId) {
      return invalid([{ id: "mergedIntoId", message: "Choose a different household to merge into." }]);
    }
    const destination = await households.read(target, context(actor, scenario));
    if (destination.kind !== "success") {
      return invalid([{ id: "mergedIntoId", message: "That household could not be found." }]);
    }
    if (destination.data.closure) {
      return invalid([{ id: "mergedIntoId", message: "That household is closed. Choose an open household." }]);
    }
    for (const person of members) {
      const moved = await changeMembership(
        actor,
        person.envelope.id,
        {
          householdId: target,
          relationshipToHead:
            person.memberships.find((membership) => !membership.to)?.relationshipToHead ?? "Household member",
          on,
          reason: `Moved by the merge of ${householdId} into ${target}`,
        },
        scenario,
      );
      if (moved.kind !== "success") return moved as RepositoryResult<Household>;
    }
  } else if (members.length > 0) {
    return invalid([
      {
        id: "form",
        message: `${members.length} ${members.length === 1 ? "member is" : "members are"} still in this household. Move them out, or close the household as a merge into another one.`,
      },
    ]);
  }

  return households.saveDraft(
    householdId,
    householdPatch({
      closure: {
        reason: values.reason,
        note: values.note.trim(),
        actor: actor.label,
        on,
        ...(values.reason === "merged" && values.mergedIntoId ? { mergedIntoId: values.mergedIntoId.trim() } : {}),
      },
      envelope: { ...current.data.envelope, status: "Closed" },
    }),
    context(actor, scenario, { reason: `Household closed: ${values.note.trim()}` }),
  );
}

/** Reverses a closure. The closure record is removed, its history entry stays. */
export async function reopenHousehold(
  actor: RegistryActor,
  householdId: string,
  reason: string,
  scenario: ScenarioState = "normal",
): Promise<RepositoryResult<Household>> {
  if (!canEditRegistry(actor)) return denied("Your role cannot reopen households.");
  if (reason.trim().length < 8) {
    return invalid([{ id: "reason", message: "Give a reason of at least eight characters." }]);
  }
  const current = await households.read(householdId, context(actor, scenario));
  if (current.kind !== "success") return current;
  if (!current.data.closure) return invalid([{ id: "form", message: "This household is not closed." }]);

  return households.saveDraft(
    householdId,
    householdPatch({
      closure: undefined,
      envelope: { ...current.data.envelope, status: "Active" },
    }),
    context(actor, scenario, { reason: `Household reopened: ${reason.trim()}` }),
  );
}

import { demoClock } from "@/shared/data/demo-clock";
import type { RepositoryResult } from "@/shared/data/repository-result";

import { residentSchema } from "../schemas/registry-schema";
import {
  advanceTransfer,
  applySurvey,
  captureSurveySection,
  changeMembership,
  decideDuplicate,
  findPossibleMatches,
  recordLifeEvent,
  registerResident,
  reverseDuplicateDecision,
  saveResidentDraft,
} from "./registry-operations";
import { canAdjudicate, projectHousehold, REGISTRY_ACTORS } from "./registry-projections";
import {
  listDuplicates,
  listHouseholds,
  listResidents,
  listSurveys,
  listTransfers,
  personHistory,
  readHousehold,
  readPerson,
  resetRegistry,
} from "./registry-repository";
import { closeMembership, matchSignals, normalizeName, residencyOverlapErrors } from "./registry-rules";
import { listHouseholdRecordOptions, listPersonRecordOptions, readPersonRecordOption } from "./registry-selectors";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

const staff = REGISTRY_ACTORS["barangay-staff"];
const steward = REGISTRY_ACTORS["data-steward"];
const enumerator = REGISTRY_ACTORS.enumerator;
const resident = REGISTRY_ACTORS.resident;

function expectSuccess<T>(result: RepositoryResult<T>): T {
  assert.equal(result.kind, "success", `expected success, got ${result.kind}`);
  return (result as { kind: "success"; data: T }).data;
}

beforeEach(() => {
  resetRegistry();
  demoClock.reset();
});

describe("registry projections", () => {
  it("scopes barangay staff to people who lived in their barangay", async () => {
    const rows = expectSuccess(await listResidents(staff));
    const ids = rows.map((row) => row.person.envelope.id);
    assert.ok(ids.includes("DEMO-PER-001"));
    // DEMO-PER-003 has only ever lived in Barangay B.
    assert.ok(!ids.includes("DEMO-PER-003"));
  });

  it("gives the municipal steward a cross-barangay view", async () => {
    const rows = expectSuccess(await listResidents(steward));
    const ids = rows.map((row) => row.person.envelope.id);
    assert.ok(ids.includes("DEMO-PER-001"));
    assert.ok(ids.includes("DEMO-PER-003"));
  });

  it("limits an enumerator to assigned households", async () => {
    const rows = expectSuccess(await listResidents(enumerator));
    const ids = rows.map((row) => row.person.envelope.id);
    // DEMO-HH-003 is the only assignment.
    assert.deepEqual(ids.sort(), ["DEMO-PER-005", "DEMO-PER-006"]);
  });

  it("limits a resident to their own record", async () => {
    const rows = expectSuccess(await listResidents(resident));
    assert.deepEqual(
      rows.map((row) => row.person.envelope.id),
      ["DEMO-PER-001"],
    );
  });

  it("refuses another person's record with a generic message", async () => {
    const result = await readPerson(resident, "DEMO-PER-002");
    assert.equal(result.kind, "denied");
    // The message must not confirm who the hidden record belongs to.
    assert.doesNotMatch(result.kind === "denied" ? result.message : "", /Nico|Dela Cruz|DEMO-PER-002/);
  });

  it("withholds restricted vulnerability flags from a resident view", async () => {
    const household = expectSuccess(await readHousehold(steward, "DEMO-HH-003")).household;
    const projected = projectHousehold(resident, household);
    assert.equal(projected.withheldFlags, 2);
    assert.ok(!projected.household.vulnerabilityFlags.some((flag) => flag.restricted));
    // The omission is reported rather than silent.
    assert.ok(projected.withheldFlags > 0);
  });

  it("keeps duplicate adjudication with the steward alone", async () => {
    assert.equal(canAdjudicate(steward), true);
    assert.equal(canAdjudicate(staff), false);
    assert.equal((await listDuplicates(staff)).kind, "denied");
    assert.equal((await listDuplicates(resident)).kind, "denied");
    // The steward sees the queue; the point is who may adjudicate, not how
    // many suggestions the fixtures happen to hold.
    assert.ok(expectSuccess(await listDuplicates(steward)).length > 0);
  });

  it("shows a barangay only the transfers that involve it", async () => {
    const forStaff = expectSuccess(await listTransfers(staff));
    assert.ok(forStaff.length > 0);
    // Every visible transfer names the actor's barangay at one end.
    assert.ok(forStaff.every((transfer) => transfer.from.id === "DEMO-BRGY-A" || transfer.to.id === "DEMO-BRGY-A"));
    // And the ones that do not are withheld, rather than the filter being a no-op.
    const all = expectSuccess(await listTransfers(steward));
    const withheld = all.filter((transfer) => transfer.from.id !== "DEMO-BRGY-A" && transfer.to.id !== "DEMO-BRGY-A");
    assert.ok(withheld.length > 0, "a transfer between two other barangays must exist for this to prove anything");
    const visible = new Set(forStaff.map((transfer) => transfer.envelope.id));
    assert.ok(withheld.every((transfer) => !visible.has(transfer.envelope.id)));
    assert.equal((await listTransfers(resident)).kind, "denied");
  });
});

describe("dependent-module selectors", () => {
  it("returns a minimal person option without contact, evidence, or demographics", async () => {
    const option = expectSuccess(await readPersonRecordOption(resident, "DEMO-PER-001"));
    assert.equal(option.personId, "DEMO-PER-001");
    assert.equal(option.currentHouseholdId, "DEMO-HH-001");
    assert.equal(option.currentBarangay?.id, "DEMO-BRGY-A");
    assert.deepEqual(Object.keys(option).sort(), [
      "currentBarangay",
      "currentHouseholdId",
      "displayName",
      "personId",
      "recordVersion",
      "reference",
      "status",
      "verificationState",
    ]);
  });

  it("keeps person selector results inside the requesting actor's scope", async () => {
    const options = expectSuccess(await listPersonRecordOptions(enumerator));
    assert.deepEqual(options.map((option) => option.personId).sort(), ["DEMO-PER-005", "DEMO-PER-006"]);
  });

  it("returns household labels and counts without the household profile", async () => {
    const options = expectSuccess(await listHouseholdRecordOptions(steward));
    const household = options.find((option) => option.householdId === "DEMO-HH-001");
    assert.ok(household);
    assert.equal(household.memberCount, 2);
    assert.deepEqual(Object.keys(household).sort(), [
      "barangay",
      "householdId",
      "label",
      "memberCount",
      "recordVersion",
      "reference",
      "status",
    ]);
  });
});

describe("household directory", () => {
  it("counts the households sharing one structure separately", async () => {
    const rows = expectSuccess(await listHouseholds(steward));
    const atStructureOne = rows.filter((row) => row.structure?.envelope.id === "DEMO-STR-001");
    assert.equal(atStructureOne.length, 2);
    const counts = Object.fromEntries(atStructureOne.map((row) => [row.household.envelope.id, row.memberCount]));
    // DEMO-PER-004 died and DEMO-PER-005 moved out, so they are not current members.
    assert.equal(counts["DEMO-HH-001"], 2);
    assert.equal(counts["DEMO-HH-003"], 1);
  });

  it("filters to stale households against the demo clock", async () => {
    const stale = expectSuccess(await listHouseholds(steward, { staleOnly: true }));
    assert.deepEqual(
      stale.map((row) => row.household.envelope.id),
      ["DEMO-HH-003"],
    );
  });

  it("lists other households at the same structure", async () => {
    const detail = expectSuccess(await readHousehold(steward, "DEMO-HH-001"));
    assert.deepEqual(
      detail.coResident.map((item) => item.envelope.id),
      ["DEMO-HH-003"],
    );
  });

  it("keeps a closed membership visible in the member list", async () => {
    const detail = expectSuccess(await readHousehold(steward, "DEMO-HH-001"));
    const closed = detail.members.find((member) => member.person.envelope.id === "DEMO-PER-004");
    assert.ok(closed, "the deceased member is still listed");
    assert.equal(closed?.to, "2026-03-18");
  });

  it("refuses a household outside the actor's scope", async () => {
    assert.equal((await readHousehold(staff, "DEMO-HH-002")).kind, "denied");
    assert.equal((await readHousehold(resident, "DEMO-HH-001")).kind, "denied");
  });
});

describe("registry rules", () => {
  it("rejects a birth date in the future on the demo clock", () => {
    const base = {
      firstName: "Test",
      lastName: "Person",
      sex: "female" as const,
      civilStatus: "Single",
      citizenship: "Filipino",
    };
    assert.equal(residentSchema.safeParse({ ...base, birthDate: "2026-09-14" }).success, true);
    assert.equal(residentSchema.safeParse({ ...base, birthDate: "2027-01-01" }).success, false);
  });

  it("refuses a second open residency period", () => {
    const errors = residencyOverlapErrors(
      [{ id: "a", barangay: { id: "x", label: "X" }, structureId: "s", from: "2019-06-01" }],
      {
        from: "2026-09-15",
      },
    );
    assert.equal(errors.length, 1);
    assert.match(errors[0]?.message ?? "", /Close the current residency period/);
  });

  it("refuses an overlapping closed period", () => {
    const existing = [
      { id: "a", barangay: { id: "x", label: "X" }, structureId: "s", from: "2019-06-01", to: "2022-01-01" },
    ];
    assert.equal(residencyOverlapErrors(existing, { from: "2021-01-01", to: "2023-01-01" }).length, 1);
    assert.equal(residencyOverlapErrors(existing, { from: "2022-02-01", to: "2023-01-01" }).length, 0);
  });

  it("closes a membership instead of deleting it", () => {
    const memberships = [{ id: "m1", householdId: "DEMO-HH-001", relationshipToHead: "Head", from: "2015-02-10" }];
    const closed = closeMembership(memberships, "DEMO-HH-001", "2026-09-15");
    assert.equal(closed.length, 1);
    assert.equal(closed[0]?.to, "2026-09-15");
    assert.equal(closed[0]?.from, "2015-02-10");
  });
});

describe("life events", () => {
  it("deactivates the record and closes the open periods", async () => {
    const before = expectSuccess(await readPerson(staff, "DEMO-PER-006"));
    const after = expectSuccess(
      await recordLifeEvent(staff, "DEMO-PER-006", "deceased", "Sample civil registry entry", before.envelope.version),
    );
    assert.equal(after.lifeStatus, "deceased");
    assert.equal(after.envelope.status, "Deceased");
    assert.ok(after.residency.every((period) => period.to));
    assert.ok(after.memberships.every((membership) => membership.to));
    // History is preserved, not deleted.
    assert.equal(after.residency.length, before.residency.length);
  });

  it("requires a reason", async () => {
    const person = expectSuccess(await readPerson(staff, "DEMO-PER-006"));
    const result = await recordLifeEvent(staff, "DEMO-PER-006", "moved-out", "too短", person.envelope.version);
    assert.equal(result.kind, "invalid");
  });

  it("refuses a role that cannot edit", async () => {
    assert.equal(
      (await recordLifeEvent(resident, "DEMO-PER-001", "moved-out", "Long enough reason", 3)).kind,
      "denied",
    );
    assert.equal((await saveResidentDraft(resident, "DEMO-PER-001", {} as never)).kind, "denied");
  });
});

describe("S01 transfer", () => {
  async function completeTransfer() {
    const first = expectSuccess(await listTransfers(steward))[0];
    assert.ok(first);
    const released = expectSuccess(
      await advanceTransfer(steward, "DEMO-TRF-001", "release", "", first.envelope.version),
    );
    // Acceptance is an affirmative act and needs no reason.
    return advanceTransfer(steward, "DEMO-TRF-001", "accept", "", released.envelope.version);
  }

  it("requires a reason to reject but not to accept", async () => {
    const first = expectSuccess(await listTransfers(steward))[0];
    assert.ok(first);
    const rejected = await advanceTransfer(steward, "DEMO-TRF-001", "reject", "", first.envelope.version);
    assert.equal(rejected.kind, "invalid");
    assert.equal(expectSuccess(await completeTransfer()).state, "completed");
  });

  it("preserves the person ID and the previous residency", async () => {
    const before = expectSuccess(await readPerson(steward, "DEMO-PER-001"));
    expectSuccess(await completeTransfer());
    const after = expectSuccess(await readPerson(steward, "DEMO-PER-001"));

    assert.equal(after.envelope.id, before.envelope.id);
    // The original Barangay A period is still there, now closed.
    const original = after.residency.find((period) => period.id === "DEMO-RES-001");
    assert.ok(original, "the original residency period is retained");
    assert.ok(original?.to, "the original period is closed, not removed");
    // A new open period in Barangay B.
    const open = after.residency.filter((period) => !period.to);
    assert.equal(open.length, 1);
    assert.equal(open[0]?.barangay.id, "DEMO-BRGY-B");
  });

  it("moves the household membership without erasing the old one", async () => {
    expectSuccess(await completeTransfer());
    const after = expectSuccess(await readPerson(steward, "DEMO-PER-001"));
    assert.ok(after.memberships.some((m) => m.householdId === "DEMO-HH-001" && m.to));
    assert.ok(after.memberships.some((m) => m.householdId === "DEMO-HH-002" && !m.to));
  });

  it("refuses an out-of-order transition", async () => {
    const first = expectSuccess(await listTransfers(steward))[0];
    assert.ok(first);
    const result = await advanceTransfer(steward, "DEMO-TRF-001", "accept", "Skipping release", first.envelope.version);
    assert.equal(result.kind, "invalid");
  });

  it("records a dispute without losing residency history", async () => {
    const first = expectSuccess(await listTransfers(steward))[0];
    assert.ok(first);
    const disputed = expectSuccess(
      await advanceTransfer(
        steward,
        "DEMO-TRF-001",
        "dispute",
        "Destination questions the address",
        first.envelope.version,
      ),
    );
    assert.equal(disputed.state, "disputed");
    const person = expectSuccess(await readPerson(steward, "DEMO-PER-001"));
    assert.equal(person.residency.filter((period) => !period.to).length, 1);
  });
});

describe("duplicate adjudication", () => {
  it("never merges without a recorded reason", async () => {
    const candidate = expectSuccess(await listDuplicates(steward))[0];
    assert.ok(candidate);
    const tooShort = await decideDuplicate(steward, "DEMO-DUP-001", "merged", "short", candidate.envelope.version);
    assert.equal(tooShort.kind, "invalid");
  });

  it("keeps the two people separate until a decision is recorded", async () => {
    const candidate = expectSuccess(await listDuplicates(steward))[0];
    assert.equal(candidate?.decision, undefined);
    const first = expectSuccess(await readPerson(steward, "DEMO-PER-001"));
    const second = expectSuccess(await readPerson(steward, "DEMO-PER-003"));
    assert.notEqual(first.envelope.id, second.envelope.id);
  });

  it("records a distinct decision with its reason", async () => {
    const candidate = expectSuccess(await listDuplicates(steward))[0];
    assert.ok(candidate);
    const decided = expectSuccess(
      await decideDuplicate(
        steward,
        "DEMO-DUP-001",
        "distinct",
        "Different mother's maiden name",
        candidate.envelope.version,
      ),
    );
    assert.equal(decided.decision?.outcome, "distinct");
    assert.equal(decided.decision?.reason, "Different mother's maiden name");
    assert.equal(decided.envelope.status, "Distinct");
  });

  it("reverses a merge and keeps the original decision inspectable", async () => {
    const candidate = expectSuccess(await listDuplicates(steward))[0];
    assert.ok(candidate);
    const merged = expectSuccess(
      await decideDuplicate(steward, "DEMO-DUP-001", "merged", "Same person, married name", candidate.envelope.version),
    );
    const reversed = expectSuccess(
      await reverseDuplicateDecision(steward, "DEMO-DUP-001", "Evidence was insufficient", merged.envelope.version),
    );
    assert.equal(reversed.decision, undefined);
    assert.equal(reversed.reversedFrom?.outcome, "merged");
    assert.equal(reversed.reversedFrom?.reason, "Same person, married name");
    assert.equal(reversed.envelope.status, "Awaiting review");
  });

  it("refuses adjudication by a non-steward", async () => {
    assert.equal((await decideDuplicate(staff, "DEMO-DUP-001", "merged", "A valid reason here", 1)).kind, "denied");
  });
});

describe("registration and duplicate precheck", () => {
  const BASE = {
    firstName: "Mara",
    middleName: "Reyes",
    lastName: "Dela Cruz",
    birthDate: "1998-04-12",
    sex: "female" as const,
    civilStatus: "Single",
    citizenship: "Filipino",
  };

  it("folds case, accents and punctuation when comparing names", () => {
    assert.equal(normalizeName("  Dela-Cruz  "), "dela cruz");
    assert.equal(normalizeName("Peña"), "pena");
  });

  it("surfaces an existing person before a duplicate is created", async () => {
    const matches = expectSuccess(await findPossibleMatches(steward, BASE));
    const ids = matches.map((match) => match.person.envelope.id);
    assert.ok(ids.includes("DEMO-PER-001"), "the existing record is suggested");
    assert.ok((matches[0]?.score ?? 0) >= 0.4);
    assert.ok(matches[0]?.signals.includes("Same date of birth"));
  });

  it("recognises a married-name variant rather than missing it", async () => {
    const existing = expectSuccess(await readPerson(steward, "DEMO-PER-003"));
    const { signals } = matchSignals(BASE, existing);
    assert.ok(
      signals.some((signal) => signal.label.includes("married-name")),
      "a maiden surname extended by a married name is flagged",
    );
  });

  it("returns nothing for a genuinely new person", async () => {
    const matches = expectSuccess(
      await findPossibleMatches(steward, {
        firstName: "Teodoro",
        lastName: "Villanueva",
        birthDate: "1969-02-11",
      }),
    );
    assert.deepEqual(matches, []);
  });

  it("creates a draft record with an unverified state", async () => {
    const created = expectSuccess(
      await registerResident(
        steward,
        {
          ...BASE,
          firstName: "Teodoro",
          middleName: undefined,
          lastName: "Villanueva",
          birthDate: "1969-02-11",
          barangay: { id: "DEMO-BRGY-A", label: "Demo Barangay A" },
          structureId: "DEMO-STR-001",
          householdId: "DEMO-HH-001",
          relationshipToHead: "Uncle",
          from: "2026-09-15",
        },
        [],
      ),
    );
    assert.equal(created.envelope.status, "Draft");
    assert.equal(created.verification.state, "unverified");
    assert.equal(created.lifeStatus, "living");
    // Registration alone never proves residency.
    assert.equal(created.residency.length, 1);
    assert.equal(created.memberships.length, 1);
  });

  it("records that possible matches were reviewed", async () => {
    const created = expectSuccess(
      await registerResident(
        steward,
        {
          ...BASE,
          barangay: { id: "DEMO-BRGY-A", label: "Demo Barangay A" },
          structureId: "DEMO-STR-001",
          householdId: "DEMO-HH-001",
          relationshipToHead: "Cousin",
          from: "2026-09-15",
        },
        ["DEMO-PER-001"],
      ),
    );
    const history = expectSuccess(await personHistory(steward, created.envelope.id));
    assert.match(history[0]?.reason ?? "", /DEMO-PER-001/);
  });

  it("refuses registration by a role that cannot edit", async () => {
    const result = await registerResident(
      resident,
      {
        ...BASE,
        barangay: { id: "DEMO-BRGY-A", label: "Demo Barangay A" },
        structureId: "DEMO-STR-001",
        householdId: "DEMO-HH-001",
        relationshipToHead: "Cousin",
        from: "2026-09-15",
      },
      [],
    );
    assert.equal(result.kind, "denied");
  });
});

describe("household membership", () => {
  it("moving to another household closes the old period and keeps it readable", async () => {
    const before = expectSuccess(await readPerson(staff, "DEMO-PER-001"));
    const open = before.memberships.find((membership) => !membership.to);
    assert.ok(open, "fixture should start with an open membership");

    const after = expectSuccess(
      await changeMembership(staff, "DEMO-PER-001", {
        householdId: "DEMO-HH-002",
        relationshipToHead: "Niece",
        reason: "Moved to her aunt's household",
      }),
    );

    // The previous period is closed, not deleted.
    const previous = after.memberships.find((membership) => membership.id === open.id);
    assert.ok(previous?.to, "the previous membership should be closed");
    assert.equal(previous.householdId, open.householdId);
    assert.equal(previous.from, open.from);

    const current = after.memberships.find((membership) => !membership.to);
    assert.equal(current?.householdId, "DEMO-HH-002");
    assert.equal(current?.relationshipToHead, "Niece");
    assert.equal(after.memberships.length, before.memberships.length + 1);
  });

  it("correcting the relationship edits the open period instead of creating one", async () => {
    const before = expectSuccess(await readPerson(staff, "DEMO-PER-001"));
    const open = before.memberships.find((membership) => !membership.to);
    assert.ok(open);

    const after = expectSuccess(
      await changeMembership(staff, "DEMO-PER-001", {
        householdId: open.householdId,
        relationshipToHead: "Daughter",
        reason: "Relationship was recorded incorrectly",
      }),
    );

    assert.equal(after.memberships.length, before.memberships.length, "a correction is not a move");
    const current = after.memberships.find((membership) => !membership.to);
    assert.equal(current?.id, open.id);
    assert.equal(current?.relationshipToHead, "Daughter");
    assert.equal(current?.from, open.from, "the period start must not move");
  });

  it("requires a reason", async () => {
    const result = await changeMembership(staff, "DEMO-PER-001", {
      householdId: "DEMO-HH-002",
      relationshipToHead: "Niece",
      reason: "moved",
    });
    assert.equal(result.kind, "invalid");
  });

  it("rejects a move dated before the current membership began", async () => {
    const before = expectSuccess(await readPerson(staff, "DEMO-PER-001"));
    const open = before.memberships.find((membership) => !membership.to);
    assert.ok(open);
    const result = await changeMembership(staff, "DEMO-PER-001", {
      householdId: "DEMO-HH-002",
      relationshipToHead: "Niece",
      on: "1990-01-01",
      reason: "Backdated beyond the current period",
    });
    assert.equal(result.kind, "invalid");
  });

  it("a resident cannot change their own membership", async () => {
    const result = await changeMembership(resident, "DEMO-PER-001", {
      householdId: "DEMO-HH-002",
      relationshipToHead: "Niece",
      reason: "Attempting a self-service move",
    });
    assert.equal(result.kind, "denied");
  });
});

describe("survey capture", () => {
  const dwellingAnswers = {
    "dwelling.constructionMaterial": "Concrete",
    "dwelling.tenure": "Owned",
  };

  it("a section is captured only once every question is answered", async () => {
    const partial = expectSuccess(
      await captureSurveySection(steward, "DEMO-SVY-001", "dwelling", {
        "dwelling.constructionMaterial": "Concrete",
      }),
    );
    assert.equal(
      partial.sections.find((section) => section.id === "dwelling")?.complete,
      false,
      "one answer of two is not a captured section",
    );

    const full = expectSuccess(await captureSurveySection(steward, "DEMO-SVY-001", "dwelling", dwellingAnswers));
    assert.equal(full.sections.find((section) => section.id === "dwelling")?.complete, true);
    assert.equal(full.draft["dwelling.tenure"], "Owned", "answers are kept on the draft");
    assert.equal(full.state, "in-progress");
  });

  it("unknown counts as an answer, empty does not", async () => {
    const unknown = expectSuccess(
      await captureSurveySection(steward, "DEMO-SVY-001", "livelihood", {
        "socioeconomic.incomeBracket": "Below PHP 10,000 monthly",
        "socioeconomic.livelihood": "Fishing",
        "socioeconomic.foodSecurity": "unknown",
      }),
    );
    assert.equal(unknown.sections.find((section) => section.id === "livelihood")?.complete, true);

    const blank = expectSuccess(
      await captureSurveySection(steward, "DEMO-SVY-001", "livelihood", { "socioeconomic.foodSecurity": "" }),
    );
    assert.equal(blank.sections.find((section) => section.id === "livelihood")?.complete, false);
  });

  it("an accepted survey cannot be captured against", async () => {
    const accepted = expectSuccess(await listSurveys(steward)).find((item) => item.state === "accepted");
    assert.ok(accepted, "fixtures should include an accepted survey");
    const result = await captureSurveySection(steward, accepted.envelope.id, "dwelling", dwellingAnswers);
    assert.equal(result.kind, "invalid");
  });

  it("a resident cannot capture a survey", async () => {
    const result = await captureSurveySection(resident, "DEMO-SVY-001", "dwelling", dwellingAnswers);
    assert.equal(result.kind, "denied");
  });

  it("applying a completed survey writes the answers onto the household", async () => {
    const assignment = expectSuccess(await listSurveys(steward)).find((item) => item.envelope.id === "DEMO-SVY-002");
    assert.ok(assignment);

    // Finish the two sections the fixture has not captured.
    await captureSurveySection(steward, "DEMO-SVY-002", "livelihood", {
      "socioeconomic.incomeBracket": "PHP 20,000 – 29,999 monthly",
      "socioeconomic.livelihood": "Tourism services",
      "socioeconomic.foodSecurity": "yes",
    });
    await captureSurveySection(steward, "DEMO-SVY-002", "vulnerability", {});

    const applied = expectSuccess(await applySurvey(steward, "DEMO-SVY-002"));
    assert.equal(applied.state, "accepted");

    const household = expectSuccess(await readHousehold(steward, assignment.householdId));
    assert.equal(household.household.socioeconomic.livelihood, "Tourism services");
    assert.equal(household.household.socioeconomic.incomeBracket, "PHP 20,000 – 29,999 monthly");
    assert.equal(household.household.dwelling.waterSource, "Piped supply", "earlier answers apply too");
  });

  it("an incomplete survey cannot be applied", async () => {
    const result = await applySurvey(steward, "DEMO-SVY-001");
    assert.equal(result.kind, "invalid");
  });

  it("a survey with conflicts cannot be applied", async () => {
    const conflicted = expectSuccess(await listSurveys(steward)).find((item) => item.conflicts.length > 0);
    assert.ok(conflicted, "fixtures should include a conflicting survey");
    const result = await applySurvey(steward, conflicted.envelope.id);
    assert.equal(result.kind, "invalid");
  });
});

describe("survey member outcomes", () => {
  async function completeAllSections(assignmentId: string, householdId: string) {
    const detail = expectSuccess(await readHousehold(steward, householdId));
    const members = detail.members.filter((member) => !member.to);
    await captureSurveySection(
      steward,
      assignmentId,
      "members",
      Object.fromEntries(
        members.flatMap((member) => [
          [`member.${member.person.envelope.id}.outcome`, "present"],
          [`member.${member.person.envelope.id}.relationship`, member.relationshipToHead],
        ]),
      ),
    );
    await captureSurveySection(steward, assignmentId, "livelihood", {
      "socioeconomic.incomeBracket": "Below PHP 10,000 monthly",
      "socioeconomic.livelihood": "Fishing",
      "socioeconomic.foodSecurity": "unknown",
    });
    await captureSurveySection(steward, assignmentId, "vulnerability", {});
    return members;
  }

  it("the member step is captured only once every member has an outcome", async () => {
    const partial = expectSuccess(await captureSurveySection(steward, "DEMO-SVY-002", "members", {}));
    assert.equal(
      partial.sections.find((section) => section.id === "members")?.complete,
      false,
      "no outcomes is not a captured step",
    );
  });

  it("a member recorded as away keeps their membership and gains the reason", async () => {
    const members = await completeAllSections("DEMO-SVY-002", "DEMO-HH-001");
    const target = members[0];
    assert.ok(target);
    const personId = target.person.envelope.id;
    await captureSurveySection(steward, "DEMO-SVY-002", "members", {
      ...Object.fromEntries(members.map((member) => [`member.${member.person.envelope.id}.outcome`, "present"])),
      [`member.${personId}.outcome`]: "away",
      [`member.${personId}.absence`]: "Working overseas",
    });
    expectSuccess(await applySurvey(steward, "DEMO-SVY-002"));

    const person = expectSuccess(await readPerson(steward, personId));
    const open = person.memberships.find((membership) => !membership.to);
    assert.equal(open?.temporaryAbsence, "Working overseas");
    assert.ok(open, "an absent member is still a member");
  });

  it("a member recorded as no longer here has their membership closed, not deleted", async () => {
    const members = await completeAllSections("DEMO-SVY-002", "DEMO-HH-001");
    const target = members.find((member) => member.person.envelope.id !== "DEMO-PER-002");
    assert.ok(target);
    const personId = target.person.envelope.id;
    const before = expectSuccess(await readPerson(steward, personId));

    await captureSurveySection(steward, "DEMO-SVY-002", "members", {
      ...Object.fromEntries(members.map((member) => [`member.${member.person.envelope.id}.outcome`, "present"])),
      [`member.${personId}.outcome`]: "left",
    });
    expectSuccess(await applySurvey(steward, "DEMO-SVY-002"));

    const after = expectSuccess(await readPerson(steward, personId));
    assert.equal(after.memberships.length, before.memberships.length, "nothing is deleted");
    assert.ok(
      after.memberships.every((membership) => membership.to),
      "the household membership is closed",
    );
    assert.equal(after.lifeStatus, "living", "leaving a household is not leaving the municipality");
  });
});

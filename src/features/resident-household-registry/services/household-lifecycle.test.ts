import { BARANGAY_A } from "../data/barangays";
import type { HouseholdDetailsValues } from "../schemas/registry-schema";
import {
  changeHouseholdAddress,
  changeMembership,
  closeHousehold,
  createHousehold,
  reopenHousehold,
  saveHouseholdDetails,
} from "./registry-operations";
import { REGISTRY_ACTORS } from "./registry-projections";
import { listHouseholds, readHousehold, resetRegistry } from "./registry-repository";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

const STEWARD = REGISTRY_ACTORS["data-steward"];
const RESIDENT = REGISTRY_ACTORS.resident;

const DETAILS: HouseholdDetailsValues = {
  label: "Bermudo household",
  constructionMaterial: "Concrete",
  tenure: "Renting",
  waterSource: "Piped supply",
  toiletFacility: "Water-sealed",
  powerSource: "Grid connection",
  wasteDisposal: "Collected",
  internet: "unknown",
  incomeBracket: "Below PHP 10,000 monthly",
  livelihood: "Fishing",
  foodSecurity: "unknown",
};

const ADDRESS = {
  barangayId: BARANGAY_A.id,
  houseNumber: "18",
  street: "Bagong Silang Street",
  sitio: "",
  purok: "Purok 3",
  barangay: BARANGAY_A,
};

async function create() {
  const made = await createHousehold(STEWARD, { ...DETAILS, address: ADDRESS }, "normal");
  assert.equal(made.kind, "success", "the household should be created");
  return made.kind === "success" ? made.data : undefined;
}

describe("household lifecycle", () => {
  beforeEach(() => resetRegistry());

  it("creates a household with its own structure and no assumed indicators", async () => {
    const household = await create();
    assert.ok(household);
    assert.equal(household.envelope.scope.label, "Bermudo household");
    assert.equal(household.envelope.status, "Active");
    assert.ok(household.structureId, "a structure is recorded for the address");
    // An unasked question is never a negative finding.
    assert.ok(household.vulnerabilityFlags.length > 0);
    assert.ok(household.vulnerabilityFlags.every((flag) => flag.value === "unknown"));

    const read = await readHousehold(STEWARD, household.envelope.id);
    assert.equal(read.kind, "success");
    if (read.kind === "success") {
      assert.equal(read.data.structure?.houseNumber, "18");
      assert.equal(read.data.structure?.barangay.id, BARANGAY_A.id);
    }
  });

  it("refuses to create or close for a role that cannot edit the registry", async () => {
    const made = await createHousehold(RESIDENT, { ...DETAILS, address: ADDRESS }, "normal");
    assert.equal(made.kind, "denied");
    const closed = await closeHousehold(RESIDENT, "DEMO-HH-001", {
      reason: "dissolved",
      note: "Not permitted for this role",
      on: "2026-09-19",
    });
    assert.equal(closed.kind, "denied");
  });

  it("saves corrected details, including the displayed label", async () => {
    const household = await create();
    assert.ok(household);
    const saved = await saveHouseholdDetails(STEWARD, household.envelope.id, {
      ...DETAILS,
      label: "Bermudo-Reyes household",
      tenure: "Owned",
      livelihood: "Farming",
    });
    assert.equal(saved.kind, "success");
    if (saved.kind !== "success") return;
    assert.equal(saved.data.envelope.scope.label, "Bermudo-Reyes household");
    assert.equal(saved.data.dwelling.tenure, "Owned");
    assert.equal(saved.data.socioeconomic.livelihood, "Farming");
  });

  it("rejects a head who is not a current member", async () => {
    const household = await create();
    assert.ok(household);
    const saved = await saveHouseholdDetails(STEWARD, household.envelope.id, {
      ...DETAILS,
      headPersonId: "DEMO-PER-001",
    });
    assert.equal(saved.kind, "invalid");
    if (saved.kind === "invalid") assert.equal(saved.errors[0]?.id, "headPersonId");
  });

  it("records a corrected address as a new structure, leaving the old building alone", async () => {
    const before = await readHousehold(STEWARD, "DEMO-HH-001");
    assert.equal(before.kind, "success");
    const previousStructureId = before.kind === "success" ? before.data.structure?.envelope.id : undefined;

    const moved = await changeHouseholdAddress(STEWARD, "DEMO-HH-001", { ...ADDRESS, houseNumber: "44" });
    assert.equal(moved.kind, "success");
    if (moved.kind !== "success") return;
    assert.notEqual(moved.data.structureId, previousStructureId);

    const after = await readHousehold(STEWARD, "DEMO-HH-001");
    assert.equal(after.kind === "success" && after.data.structure?.houseNumber, "44");
  });

  it("will not close a household that still holds members", async () => {
    const closed = await closeHousehold(STEWARD, "DEMO-HH-001", {
      reason: "dissolved",
      note: "The family no longer lives here",
      on: "2026-09-19",
    });
    assert.equal(closed.kind, "invalid");
    if (closed.kind === "invalid") assert.match(closed.errors[0]?.message ?? "", /still in this household/);
  });

  it("closes an empty household and takes it out of the active directory", async () => {
    const household = await create();
    assert.ok(household);
    const closed = await closeHousehold(STEWARD, household.envelope.id, {
      reason: "created-in-error",
      note: "Duplicate of an existing record",
      on: "2026-09-19",
    });
    assert.equal(closed.kind, "success");
    if (closed.kind !== "success") return;
    assert.equal(closed.data.envelope.status, "Closed");
    assert.equal(closed.data.closure?.reason, "created-in-error");
    assert.equal(closed.data.closure?.actor, STEWARD.label);

    const active = await listHouseholds(STEWARD);
    assert.equal(active.kind, "success");
    if (active.kind === "success") {
      assert.ok(!active.data.some((row) => row.household.envelope.id === household.envelope.id));
    }
    const all = await listHouseholds(STEWARD, { includeClosed: true });
    assert.ok(all.kind === "success" && all.data.some((row) => row.household.envelope.id === household.envelope.id));
    // The record itself stays readable by reference.
    assert.equal((await readHousehold(STEWARD, household.envelope.id)).kind, "success");
  });

  it("moves every current member when a household is merged into another", async () => {
    const before = await readHousehold(STEWARD, "DEMO-HH-001");
    assert.equal(before.kind, "success");
    const movingIds =
      before.kind === "success"
        ? before.data.members.filter((member) => !member.to).map((member) => member.person.envelope.id)
        : [];
    assert.ok(movingIds.length > 0, "the fixture household has current members");

    const merged = await closeHousehold(STEWARD, "DEMO-HH-001", {
      reason: "merged",
      note: "The two households now share one dwelling",
      mergedIntoId: "DEMO-HH-002",
      on: "2026-09-19",
    });
    assert.equal(merged.kind, "success");
    if (merged.kind !== "success") return;
    assert.equal(merged.data.closure?.mergedIntoId, "DEMO-HH-002");

    const destination = await readHousehold(STEWARD, "DEMO-HH-002");
    assert.equal(destination.kind, "success");
    if (destination.kind !== "success") return;
    const landed = destination.data.members.filter((member) => !member.to).map((member) => member.person.envelope.id);
    for (const id of movingIds) assert.ok(landed.includes(id), `${id} should have moved`);

    // The closed household keeps its history: the old memberships are closed, not erased.
    const source = await readHousehold(STEWARD, "DEMO-HH-001");
    assert.equal(source.kind, "success");
    if (source.kind === "success") {
      assert.ok(source.data.members.length > 0, "past memberships survive the closure");
      assert.equal(source.data.members.filter((member) => !member.to).length, 0);
    }
  });

  it("refuses a merge into a missing or closed household, and into itself", async () => {
    const household = await create();
    assert.ok(household);
    const intoSelf = await closeHousehold(STEWARD, household.envelope.id, {
      reason: "merged",
      note: "Merging into itself makes no sense",
      mergedIntoId: household.envelope.id,
      on: "2026-09-19",
    });
    assert.equal(intoSelf.kind, "invalid");

    const intoMissing = await closeHousehold(STEWARD, household.envelope.id, {
      reason: "merged",
      note: "The destination does not exist",
      mergedIntoId: "DEMO-HH-999",
      on: "2026-09-19",
    });
    assert.equal(intoMissing.kind, "invalid");
  });

  it("blocks edits to a closed household until it is reopened", async () => {
    const household = await create();
    assert.ok(household);
    await closeHousehold(STEWARD, household.envelope.id, {
      reason: "dissolved",
      note: "Recorded in error during intake",
      on: "2026-09-19",
    });
    const blocked = await saveHouseholdDetails(STEWARD, household.envelope.id, { ...DETAILS, tenure: "Owned" });
    assert.equal(blocked.kind, "invalid");

    const reopened = await reopenHousehold(STEWARD, household.envelope.id, "Closed by mistake, restoring the record");
    assert.equal(reopened.kind, "success");
    if (reopened.kind === "success") {
      assert.equal(reopened.data.closure, undefined);
      assert.equal(reopened.data.envelope.status, "Active");
    }
    assert.equal(
      (await saveHouseholdDetails(STEWARD, household.envelope.id, { ...DETAILS, tenure: "Owned" })).kind,
      "success",
    );
  });

  it("requires a reason to reopen, and refuses to reopen an open household", async () => {
    const household = await create();
    assert.ok(household);
    assert.equal((await reopenHousehold(STEWARD, household.envelope.id, "oops")).kind, "invalid");
    assert.equal((await reopenHousehold(STEWARD, household.envelope.id, "A sufficiently long reason")).kind, "invalid");
  });

  it("accepts a head once that person is a member", async () => {
    const household = await create();
    assert.ok(household);
    const moved = await changeMembership(STEWARD, "DEMO-PER-001", {
      householdId: household.envelope.id,
      relationshipToHead: "Head",
      on: "2026-09-19",
      reason: "Moved into the newly recorded household",
    });
    assert.equal(moved.kind, "success");
    const saved = await saveHouseholdDetails(STEWARD, household.envelope.id, {
      ...DETAILS,
      headPersonId: "DEMO-PER-001",
    });
    assert.equal(saved.kind, "success");
    if (saved.kind === "success") assert.equal(saved.data.headPersonId, "DEMO-PER-001");
  });
});

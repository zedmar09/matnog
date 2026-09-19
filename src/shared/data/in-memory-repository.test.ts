import { DemoClock } from "./demo-clock";
import { InMemoryRepository } from "./in-memory-repository";
import type { OperationContext } from "./local-repository";
import { createEnvelope, type MunicipalRecord, type RecordScope } from "./record-envelope";
import type { RepositoryResult } from "./repository-result";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

type Permit = MunicipalRecord & { title: string; office: string };

const BARANGAY_A: RecordScope = { kind: "barangay", id: "DEMO-BRGY-A", label: "Demo Barangay A" };
const BUSINESS: RecordScope = { kind: "business", id: "DEMO-BIZ-001", label: "Demo Bay Tours" };

const FIXTURES: Permit[] = [
  {
    envelope: createEnvelope({
      id: "DEMO-CERT-001",
      status: "Under review",
      scope: BARANGAY_A,
      createdAt: "2026-09-10T09:00:00+08:00",
    }),
    title: "Barangay residency certificate",
    office: "Barangay A",
  },
  {
    envelope: createEnvelope({
      id: "DEMO-BPL-001",
      status: "For correction",
      scope: BUSINESS,
      createdAt: "2026-09-11T09:00:00+08:00",
    }),
    title: "Business permit renewal",
    office: "Business Permits and Licensing Office",
  },
];

const STAFF: OperationContext = { actor: "Municipal staff" };

function build(overrides: Partial<ConstructorParameters<typeof InMemoryRepository<Permit>>[0]> = {}) {
  return new InMemoryRepository<Permit>({
    fixtures: FIXTURES,
    searchableText: (record) => `${record.title} ${record.office}`,
    latencyMs: 0,
    clock: new DemoClock(),
    ...overrides,
  });
}

function expectSuccess<T>(result: RepositoryResult<T>): T {
  assert.equal(result.kind, "success", `expected success, got ${result.kind}`);
  return (result as { kind: "success"; data: T }).data;
}

describe("in-memory repository", () => {
  let repository: InMemoryRepository<Permit>;

  beforeEach(() => {
    repository = build();
  });

  describe("list", () => {
    it("returns every visible record", async () => {
      const page = expectSuccess(await repository.list({}, STAFF));
      assert.equal(page.total, 2);
      assert.equal(page.page, 1);
    });

    it("searches the ID and the module text", async () => {
      assert.equal(expectSuccess(await repository.list({ search: "renewal" }, STAFF)).total, 1);
      assert.equal(expectSuccess(await repository.list({ search: "demo-cert-001" }, STAFF)).total, 1);
    });

    it("reports an empty result rather than an empty success", async () => {
      assert.equal((await repository.list({ search: "nothing-matches" }, STAFF)).kind, "empty");
    });

    it("applies module filters", async () => {
      const scoped = build({
        matchesFilter: (record, filters) => !filters.scope || record.envelope.scope.id === filters.scope,
      });
      const page = expectSuccess(await scoped.list({ filters: { scope: "DEMO-BIZ-001" } }, STAFF));
      assert.deepEqual(
        page.items.map((item) => item.envelope.id),
        ["DEMO-BPL-001"],
      );
    });

    it("pages results", async () => {
      const page = expectSuccess(await repository.list({ page: 2, pageSize: 1 }, STAFF));
      assert.equal(page.items.length, 1);
      assert.equal(page.total, 2);
      assert.equal(page.items[0]?.envelope.id, "DEMO-BPL-001");
    });
  });

  describe("read", () => {
    it("finds a record by a loosely typed reference", async () => {
      const record = expectSuccess(await repository.read("  demo-cert-001 ", STAFF));
      assert.equal(record.envelope.id, "DEMO-CERT-001");
    });

    it("returns empty for an unknown reference", async () => {
      assert.equal((await repository.read("DEMO-NOPE-000", STAFF)).kind, "empty");
    });

    it("denies a record outside the actor's projection", async () => {
      const scoped = build({
        isVisible: (record) => record.envelope.scope.kind !== "business",
      });
      assert.equal((await scoped.read("DEMO-BPL-001", STAFF)).kind, "denied");
    });

    it("hands back a copy, so a caller cannot mutate the store", async () => {
      const record = expectSuccess(await repository.read("DEMO-CERT-001", STAFF));
      record.title = "Tampered";
      const again = expectSuccess(await repository.read("DEMO-CERT-001", STAFF));
      assert.equal(again.title, "Barangay residency certificate");
    });
  });

  describe("transitions", () => {
    it("advances the version and the status on submit", async () => {
      const record = expectSuccess(await repository.submit("DEMO-CERT-001", STAFF));
      assert.equal(record.envelope.version, 2);
      assert.equal(record.envelope.status, "Submitted");
    });

    it("keeps the version when a draft is saved", async () => {
      const record = expectSuccess(await repository.saveDraft("DEMO-CERT-001", { title: "Draft title" }, STAFF));
      assert.equal(record.envelope.version, 1);
      assert.equal(record.title, "Draft title");
    });

    it("rejects a draft that fails validation", async () => {
      const validating = build({
        validateDraft: (changes) =>
          (changes as Partial<Permit>).title ? [] : [{ id: "title", message: "Enter a title." }],
      });
      const result = await validating.saveDraft("DEMO-CERT-001", {}, STAFF);
      assert.equal(result.kind, "invalid");
      assert.deepEqual(result.kind === "invalid" ? result.errors : [], [{ id: "title", message: "Enter a title." }]);
    });

    it("requires a reason before returning a record for correction", async () => {
      assert.equal((await repository.requestCorrection("DEMO-CERT-001", STAFF)).kind, "invalid");
      const withReason = await repository.requestCorrection("DEMO-CERT-001", {
        ...STAFF,
        reason: "Attach the updated barangay clearance.",
      });
      assert.equal(expectSuccess(withReason).envelope.status, "For correction");
    });

    it("requires a reason for a decision that is not an approval", async () => {
      const rejected = await repository.recordDecision(
        "DEMO-CERT-001",
        { outcome: "rejected", status: "Rejected" },
        STAFF,
      );
      assert.equal(rejected.kind, "invalid");
    });

    it("refuses a write against a stale version and names the current one", async () => {
      await repository.submit("DEMO-CERT-001", STAFF);
      const result = await repository.submit("DEMO-CERT-001", { ...STAFF, expectedVersion: 1 });
      assert.equal(result.kind, "conflict");
      assert.equal(result.kind === "conflict" ? result.currentVersion : 0, 2);
    });

    it("accepts a write that names the current version", async () => {
      const record = expectSuccess(await repository.submit("DEMO-CERT-001", { ...STAFF, expectedVersion: 1 }));
      assert.equal(record.envelope.version, 2);
    });

    it("commits the record and its history together", async () => {
      await repository.submit("DEMO-CERT-001", { ...STAFF, reason: "Complete requirements" });
      const history = expectSuccess(await repository.history("DEMO-CERT-001", STAFF));
      assert.equal(history.length, 2);
      assert.equal(history[1]?.version, 2);
      assert.equal(history[1]?.actor, "Municipal staff");
      assert.equal(history[1]?.reason, "Complete requirements");
    });

    it("writes nothing when validation fails", async () => {
      const validating = build({ validateDraft: () => [{ id: "title", message: "Enter a title." }] });
      await validating.saveDraft("DEMO-CERT-001", { title: "x" }, STAFF);
      const history = expectSuccess(await validating.history("DEMO-CERT-001", STAFF));
      assert.equal(history.length, 1);
    });

    it("ignores a replayed event instead of repeating its outcome", async () => {
      const context = { ...STAFF, eventId: "EVT-001" };
      const first = expectSuccess(await repository.submit("DEMO-CERT-001", context));
      const replay = expectSuccess(await repository.submit("DEMO-CERT-001", context));
      assert.equal(first.envelope.version, 2);
      assert.equal(replay.envelope.version, 2);
      assert.equal(expectSuccess(await repository.history("DEMO-CERT-001", STAFF)).length, 2);
    });

    it("stamps transitions with the demo clock, not the real date", async () => {
      const clock = new DemoClock();
      const dated = build({ clock });
      clock.advanceDays(4);
      const record = expectSuccess(await dated.submit("DEMO-CERT-001", STAFF));
      assert.equal(record.envelope.updatedAt, clock.nowIso());
    });
  });

  describe("scenarios", () => {
    const cases = [
      ["empty", "empty"],
      ["error", "failure"],
      ["denied", "denied"],
      ["conflict", "conflict"],
    ] as const;

    for (const [scenario, expected] of cases) {
      it(`returns ${expected} for the ${scenario} scenario`, async () => {
        const result = await repository.list({}, { ...STAFF, scenario });
        assert.equal(result.kind, expected);
      });
    }

    it("applies the scenario to writes as well as reads", async () => {
      const result = await repository.submit("DEMO-CERT-001", { ...STAFF, scenario: "error" });
      assert.equal(result.kind, "failure");
    });
  });

  describe("sample export", () => {
    it("always carries the sample watermark", async () => {
      const preview = expectSuccess(await repository.exportSampleView("DEMO-CERT-001", STAFF));
      assert.equal(preview.watermark, "SAMPLE — NOT VALID FOR OFFICIAL USE");
    });

    it("uses the module's own lines when supplied", async () => {
      const custom = build({ exportLines: (record) => [record.title, record.office] });
      const preview = expectSuccess(await custom.exportSampleView("DEMO-CERT-001", STAFF));
      assert.deepEqual(preview.lines, ["Barangay residency certificate", "Barangay A"]);
    });
  });

  describe("reset", () => {
    it("restores the seeded state for a scenario replay", async () => {
      await repository.submit("DEMO-CERT-001", STAFF);
      repository.reset();
      const record = expectSuccess(await repository.read("DEMO-CERT-001", STAFF));
      assert.equal(record.envelope.version, 1);
      assert.equal(record.envelope.status, "Under review");
      assert.equal(expectSuccess(await repository.history("DEMO-CERT-001", STAFF)).length, 1);
    });

    it("never mutates the shared fixture seed", async () => {
      await repository.saveDraft("DEMO-CERT-001", { title: "Changed" }, STAFF);
      const fresh = build();
      const record = expectSuccess(await fresh.read("DEMO-CERT-001", STAFF));
      assert.equal(record.title, "Barangay residency certificate");
    });
  });
});

describe("create", () => {
  const NEW_PERMIT: Permit = {
    envelope: createEnvelope({
      id: "DEMO-CERT-900",
      status: "Draft",
      scope: BARANGAY_A,
      createdAt: "2026-09-15T09:00:00+08:00",
    }),
    title: "New sample request",
    office: "Barangay A",
  };

  it("adds a record with its own first history entry", async () => {
    const repository = build();
    const created = expectSuccess(await repository.create(NEW_PERMIT, STAFF));
    assert.equal(created.envelope.id, "DEMO-CERT-900");
    assert.equal(created.envelope.version, 1);

    const history = expectSuccess(await repository.history("DEMO-CERT-900", STAFF));
    assert.equal(history.length, 1);
    assert.equal(history[0]?.action, "Record created");
    assert.equal(history[0]?.actor, "Municipal staff");
  });

  it("refuses a duplicate identifier", async () => {
    const repository = build();
    await repository.create(NEW_PERMIT, STAFF);
    const again = await repository.create(NEW_PERMIT, STAFF);
    assert.equal(again.kind, "invalid");
  });

  it("does not leak a created record into the seed", async () => {
    const repository = build();
    await repository.create(NEW_PERMIT, STAFF);
    assert.equal(expectSuccess(await repository.list({}, STAFF)).total, 3);

    const fresh = build();
    assert.equal(expectSuccess(await fresh.list({}, STAFF)).total, 2);
  });

  it("is reverted by a reset", async () => {
    const repository = build();
    await repository.create(NEW_PERMIT, STAFF);
    repository.reset();
    assert.equal((await repository.read("DEMO-CERT-900", STAFF)).kind, "empty");
  });
});

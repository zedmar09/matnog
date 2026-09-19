import { SECTOR_RECORDS } from "../data/sectoral-assistance-fixtures";
import { type SectorRecordValues, sectorRecordSchema } from "../schemas/sector-schema";
import { LocalSectoralAssistanceRepository } from "./local-sectoral-assistance-repository";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

const VALUES: SectorRecordValues = {
  personId: "DEMO-PER-005",
  personLabel: "Ariel Mendoza",
  category: "PWD",
  authority: "Municipal Social Welfare and Development Office",
  status: "Active",
  validFrom: "2026-09-01",
  validTo: "2027-08-31",
  source: "Local evidence review",
  evidence: "Medical certificate\nBarangay certification",
  credential: "PWD-BOOKLET-099",
};

let repository: LocalSectoralAssistanceRepository;

describe("sector registrations", () => {
  beforeEach(() => {
    repository = new LocalSectoralAssistanceRepository();
  });

  it("registers a status and shows it on the next read", () => {
    const before = repository.sectorRecords.length;
    const created = repository.createSectorRecord(VALUES);
    assert.equal(repository.sectorRecords.length, before + 1);
    assert.equal(repository.sectorRecord(created.id)?.personLabel, "Ariel Mendoza");
    // The evidence field is captured one item per line.
    assert.deepEqual(created.evidence, ["Medical certificate", "Barangay certification"]);
  });

  it("numbers a new record above the highest existing one", () => {
    const highest = repository.sectorRecords.reduce((max, item) => {
      const parsed = Number.parseInt(item.id.replace("DEMO-SECTOR-", ""), 10);
      return Number.isNaN(parsed) ? max : Math.max(max, parsed);
    }, 0);
    assert.equal(repository.createSectorRecord(VALUES).id, `DEMO-SECTOR-${String(highest + 1).padStart(3, "0")}`);
  });

  it("saves a correction, visible on the next read", () => {
    const updated = repository.updateSectorRecord("DEMO-SECTOR-001", { ...VALUES, credential: "PWD-BOOKLET-001-R" });
    assert.ok(updated);
    assert.equal(repository.sectorRecord("DEMO-SECTOR-001")?.credential, "PWD-BOOKLET-001-R");
  });

  it("reports a missing record rather than silently doing nothing", () => {
    assert.equal(repository.updateSectorRecord("DEMO-SECTOR-999", VALUES), undefined);
    assert.equal(
      repository.deactivateSectorRecord(
        "DEMO-SECTOR-999",
        { reason: "moved-out", note: "No such record", on: "2026-09-19" },
        "Officer",
      ),
      undefined,
    );
  });

  it("deactivates without erasing the period or the evidence", () => {
    const before = repository.sectorRecord("DEMO-SECTOR-001");
    assert.ok(before);
    const done = repository.deactivateSectorRecord(
      "DEMO-SECTOR-001",
      { reason: "moved-out", note: "The resident left the municipality in September.", on: "2026-09-19" },
      "MSWDO records officer",
    );
    assert.ok(done);
    assert.equal(done.status, "Deactivated");
    assert.equal(done.deactivation?.reason, "moved-out");
    assert.equal(done.deactivation?.actor, "MSWDO records officer");
    // The dated period and the evidence behind it survive.
    assert.equal(done.validFrom, before.validFrom);
    assert.equal(done.validTo, before.validTo);
    assert.deepEqual(done.evidence, before.evidence);
  });

  it("refuses to deactivate a record that is already deactivated", () => {
    const already = repository.sectorRecords.find((item) => item.deactivation);
    assert.ok(already, "a fixture must already be deactivated");
    assert.equal(
      repository.deactivateSectorRecord(
        already.id,
        { reason: "deceased", note: "A second attempt", on: "2026-09-19" },
        "Officer",
      ),
      undefined,
    );
  });

  it("reactivates a deactivation recorded in error", () => {
    repository.deactivateSectorRecord(
      "DEMO-SECTOR-001",
      { reason: "recorded-in-error", note: "Registered against the wrong resident.", on: "2026-09-19" },
      "Officer",
    );
    const restored = repository.reactivateSectorRecord("DEMO-SECTOR-001");
    assert.ok(restored);
    assert.equal(restored.deactivation, undefined);
    assert.equal(restored.status, "Active");
    // Reactivating something that is not deactivated is refused.
    assert.equal(repository.reactivateSectorRecord("DEMO-SECTOR-001"), undefined);
  });

  it("keeps an earlier period beside a renewal instead of overwriting it", () => {
    const renewal = repository.startRenewal("DEMO-SECTOR-005");
    assert.ok(renewal);
    const original = repository.sectorRecord("DEMO-SECTOR-005");
    assert.equal(original?.validFrom, "2025-02-14", "the expired period is untouched");
    assert.equal(renewal.status, "Evidence review");
  });

  it("requires a decided period before a status can be active", () => {
    const pending = sectorRecordSchema.safeParse({
      ...VALUES,
      validFrom: "Pending decision",
      validTo: "Pending decision",
    });
    assert.equal(pending.success, false);
    // The same open period is fine while the record is still under review.
    assert.equal(
      sectorRecordSchema.safeParse({
        ...VALUES,
        status: "Evidence review",
        validFrom: "Pending decision",
        validTo: "Pending decision",
      }).success,
      true,
    );
  });

  it("rejects a period that ends before it starts", () => {
    const result = sectorRecordSchema.safeParse({ ...VALUES, validFrom: "2027-01-01", validTo: "2026-01-01" });
    assert.equal(result.success, false);
  });

  it("gives every fixture a dated period rather than a permanent flag", () => {
    for (const record of SECTOR_RECORDS) {
      assert.ok(record.validFrom.length > 0, record.id);
      assert.ok(record.validTo.length > 0, record.id);
    }
  });
});

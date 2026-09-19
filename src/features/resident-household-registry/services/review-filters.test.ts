import { PEOPLE } from "../data/people";
import { DUPLICATE_CANDIDATES, TRANSFER_REQUESTS } from "../data/review";
import { fullName } from "./registry-rules";
import { duplicateOutcome, filterDuplicates, filterTransfers, TRANSFER_STATES } from "./review-filters";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const nameOf = (personId: string) => {
  const person = PEOPLE.find((item) => item.envelope.id === personId);
  return person ? fullName(person) : personId;
};

describe("duplicate queue filters", () => {
  it("leaves the queue untouched when nothing is set", () => {
    assert.equal(filterDuplicates(DUPLICATE_CANDIDATES, {}, nameOf).length, DUPLICATE_CANDIDATES.length);
  });

  it("matches a person by name as well as by ID", () => {
    const byId = filterDuplicates(DUPLICATE_CANDIDATES, { search: "DEMO-PER-012" }, nameOf);
    const byName = filterDuplicates(DUPLICATE_CANDIDATES, { search: "obias-rada" }, nameOf);
    assert.ok(byId.length > 0);
    assert.deepEqual(
      byId.map((row) => row.envelope.id),
      byName.map((row) => row.envelope.id),
    );
  });

  it("splits the score bands without overlap and without dropping a row", () => {
    const bands = ["high", "medium", "low"].map((band) =>
      filterDuplicates(DUPLICATE_CANDIDATES, { band }, nameOf).map((row) => row.envelope.id),
    );
    assert.equal(bands.flat().length, DUPLICATE_CANDIDATES.length, "every candidate falls in exactly one band");
    assert.equal(new Set(bands.flat()).size, DUPLICATE_CANDIDATES.length, "no candidate appears in two bands");
    for (const row of filterDuplicates(DUPLICATE_CANDIDATES, { band: "high" }, nameOf)) {
      assert.ok(row.score >= 0.8, row.envelope.id);
    }
    for (const row of filterDuplicates(DUPLICATE_CANDIDATES, { band: "low" }, nameOf)) {
      assert.ok(row.score < 0.6, row.envelope.id);
    }
  });

  it("separates an open suggestion from a recorded or reversed decision", () => {
    const open = filterDuplicates(DUPLICATE_CANDIDATES, { outcome: "open" }, nameOf);
    assert.ok(open.length > 0);
    assert.ok(open.every((row) => !row.decision && !row.reversedFrom));

    const distinct = filterDuplicates(DUPLICATE_CANDIDATES, { outcome: "distinct" }, nameOf);
    assert.ok(distinct.length > 0);
    assert.ok(distinct.every((row) => row.decision?.outcome === "distinct"));

    // A reversed merge reads as reversed, not as merged.
    const reversed = filterDuplicates(DUPLICATE_CANDIDATES, { outcome: "reversed" }, nameOf);
    assert.ok(reversed.length > 0);
    assert.ok(reversed.every((row) => Boolean(row.reversedFrom)));
    assert.ok(reversed.every((row) => duplicateOutcome(row) === "reversed"));
  });

  it("combines filters rather than replacing one with another", () => {
    const combined = filterDuplicates(DUPLICATE_CANDIDATES, { band: "high", outcome: "open" }, nameOf);
    assert.ok(combined.every((row) => row.score >= 0.8 && duplicateOutcome(row) === "open"));
  });
});

describe("transfer queue filters", () => {
  it("covers every stage the queue can show", () => {
    for (const state of TRANSFER_STATES) {
      const rows = filterTransfers(TRANSFER_REQUESTS, { state }, nameOf);
      assert.ok(rows.length > 0, `no fixture in the "${state}" stage`);
      assert.ok(rows.every((row) => row.state === state));
    }
  });

  it("filters by origin and destination independently", () => {
    const fromA = filterTransfers(TRANSFER_REQUESTS, { from: "DEMO-BRGY-A" }, nameOf);
    assert.ok(fromA.length > 0);
    assert.ok(fromA.every((row) => row.from.id === "DEMO-BRGY-A"));

    const toA = filterTransfers(TRANSFER_REQUESTS, { to: "DEMO-BRGY-A" }, nameOf);
    assert.ok(toA.length > 0);
    assert.ok(toA.every((row) => row.to.id === "DEMO-BRGY-A"));

    // Origin and destination are different questions, so the sets differ.
    assert.notDeepEqual(
      fromA.map((row) => row.envelope.id),
      toA.map((row) => row.envelope.id),
    );
  });

  it("matches a resident by name, and a barangay by label", () => {
    const byName = filterTransfers(TRANSFER_REQUESTS, { search: "alcantara" }, nameOf);
    assert.ok(byName.length > 0);
    const byBarangay = filterTransfers(TRANSFER_REQUESTS, { search: "Demo Barangay C" }, nameOf);
    assert.ok(byBarangay.length > 0);
    assert.ok(byBarangay.every((row) => row.from.label.includes("C") || row.to.label.includes("C")));
  });

  it("returns nothing rather than everything when a filter matches no row", () => {
    assert.equal(filterTransfers(TRANSFER_REQUESTS, { search: "no such resident" }, nameOf).length, 0);
  });
});

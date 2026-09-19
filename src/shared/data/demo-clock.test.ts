import { DAY_MS, DEMO_EPOCH_ISO, DemoClock, daysSince, formatDemoDate, isOverdue } from "./demo-clock";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

describe("demo clock", () => {
  let clock: DemoClock;

  beforeEach(() => {
    clock = new DemoClock();
  });

  it("starts at the fixed demo epoch, not the real date", () => {
    assert.equal(clock.now().getTime(), Date.parse(DEMO_EPOCH_ISO));
  });

  it("advances by whole days", () => {
    const before = clock.now().getTime();
    clock.advanceDays(3);
    assert.equal(clock.now().getTime() - before, 3 * DAY_MS);
  });

  it("resets to the epoch so a scenario can be replayed", () => {
    clock.advanceDays(30);
    clock.reset();
    assert.equal(clock.nowIso(), new Date(Date.parse(DEMO_EPOCH_ISO)).toISOString());
  });

  it("notifies subscribers and stops after unsubscribe", () => {
    let calls = 0;
    const unsubscribe = clock.subscribe(() => calls++);
    clock.advanceDays(1);
    assert.equal(calls, 1);
    unsubscribe();
    clock.advanceDays(1);
    assert.equal(calls, 1);
  });

  it("derives overdue state from the demo clock, not the real one", () => {
    const due = "2026-09-20T09:00:00+08:00";
    assert.equal(isOverdue(due, clock), false);
    clock.advanceDays(6);
    assert.equal(isOverdue(due, clock), true);
  });

  it("counts whole days since a timestamp", () => {
    assert.equal(daysSince("2026-09-13T09:00:00+08:00", clock), 2);
  });

  it("formats dates in the Manila time zone", () => {
    // 16:30 UTC on 15 September is already 00:30 on 16 September in Manila,
    // so the date must roll over. en-PH renders this as "September 16, 2026".
    assert.match(formatDemoDate("2026-09-15T16:30:00Z"), /September 16, 2026/);
    assert.match(formatDemoDate("2026-09-15T15:30:00Z"), /September 15, 2026/);
  });
});

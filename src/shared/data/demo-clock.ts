/**
 * A fixed, advanceable clock for the prototype.
 *
 * Expiry, overdue and "updated N days ago" behaviour must be reproducible, so
 * nothing reads the real current date. Scenario controls move this clock
 * instead, which keeps a review on Monday identical to the same review a month
 * later.
 */

/** Asia/Manila. Demo "today" for every module. */
export const DEMO_EPOCH_ISO = "2026-09-15T09:00:00+08:00";

export const MANILA_TIME_ZONE = "Asia/Manila";

const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export class DemoClock {
  #current: number;
  #listeners = new Set<() => void>();

  constructor(startIso: string = DEMO_EPOCH_ISO) {
    this.#current = Date.parse(startIso);
  }

  now(): Date {
    return new Date(this.#current);
  }

  nowIso(): string {
    return this.now().toISOString();
  }

  /** Moves the clock forward (or back, with a negative value). */
  advance(milliseconds: number): void {
    this.#current += milliseconds;
    this.#emit();
  }

  advanceDays(days: number): void {
    this.advance(days * DAY_MS);
  }

  set(iso: string): void {
    this.#current = Date.parse(iso);
    this.#emit();
  }

  reset(): void {
    this.set(DEMO_EPOCH_ISO);
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit(): void {
    for (const listener of this.#listeners) listener();
  }
}

/** The clock every feature should read. */
export const demoClock = new DemoClock();

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

/** Date-only display, separate from an event timestamp. */
export function formatDemoDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

/** Event timestamp display. */
export function formatDemoDateTime(iso: string): string {
  const value = new Date(iso);
  return `${DATE_FORMAT.format(value)} · ${TIME_FORMAT.format(value)}`;
}

/** Whole days between an ISO timestamp and the clock's current instant. */
export function daysSince(iso: string, clock: DemoClock = demoClock): number {
  return Math.floor((clock.now().getTime() - Date.parse(iso)) / DAY_MS);
}

/** True when the deadline has passed on the demo clock. */
export function isOverdue(dueIso: string, clock: DemoClock = demoClock): boolean {
  return clock.now().getTime() > Date.parse(dueIso);
}

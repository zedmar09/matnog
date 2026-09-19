import type { FieldError } from "@/shared/data/repository-result";

import { parseDateOnly } from "../schemas/registry-schema";
import type { HouseholdMembership, Person, ResidencyPeriod } from "../types/registry";

/**
 * Cross-record rules that a single-field schema cannot express.
 *
 * These guard the demonstration's internal consistency: a person cannot be
 * currently resident in two places at once, and closing a membership must never
 * delete the history that a later report would need.
 */

/** A person may hold only one open residency period at a time. */
export function residencyOverlapErrors(
  existing: readonly ResidencyPeriod[],
  candidate: { from: string; to?: string },
): FieldError[] {
  const errors: FieldError[] = [];
  const from = parseDateOnly(candidate.from);
  const to = candidate.to ? parseDateOnly(candidate.to) : Number.POSITIVE_INFINITY;

  if (!candidate.to && existing.some((period) => !period.to)) {
    errors.push({
      id: "from",
      message: "Close the current residency period before opening another one.",
    });
    return errors;
  }

  // Periods are half-open: `to` is the day residency ended, so a new period
  // may begin on that same day. A handover does not make someone resident in
  // two barangays at once, and strict comparison keeps adjacency legal while
  // still catching a genuine overlap.
  const overlapping = existing.some((period) => {
    const start = parseDateOnly(period.from);
    const end = period.to ? parseDateOnly(period.to) : Number.POSITIVE_INFINITY;
    return from < end && start < to;
  });
  if (overlapping) {
    errors.push({ id: "from", message: "This period overlaps an existing residency period." });
  }
  return errors;
}

/**
 * Closes the open membership instead of removing it. Changing the household
 * head must leave the previous membership readable in history.
 */
export function closeMembership(
  memberships: readonly HouseholdMembership[],
  householdId: string,
  on: string,
): HouseholdMembership[] {
  return memberships.map((membership) =>
    membership.householdId === householdId && !membership.to ? { ...membership, to: on } : membership,
  );
}

/** Closes the open residency period without discarding it. */
export function closeResidency(
  residency: readonly ResidencyPeriod[],
  on: string,
  transferId?: string,
): ResidencyPeriod[] {
  return residency.map((period) => (period.to ? period : { ...period, to: on, ...(transferId ? { transferId } : {}) }));
}

/** Age on a given date, used for display only. */
export function ageOn(person: Person, iso: string): number {
  const birth = new Date(parseDateOnly(person.birthDate));
  const at = new Date(iso);
  let age = at.getFullYear() - birth.getFullYear();
  const monthDelta = at.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && at.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function fullName(person: Person): string {
  return [person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(" ");
}

/** Normalises a name for comparison: case, punctuation and spacing folded. */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type MatchSignal = { label: string; weight: number };

/**
 * Scores how similar a candidate is to an existing person.
 *
 * This ranks a suggestion for a human to review. It is never an identity
 * decision, so the signals are returned alongside the score and a caller must
 * show them rather than the number alone.
 */
export function matchSignals(
  candidate: { firstName: string; lastName: string; birthDate: string; middleName?: string },
  person: Person,
): { score: number; signals: MatchSignal[] } {
  const signals: MatchSignal[] = [];

  if (candidate.birthDate && candidate.birthDate === person.birthDate) {
    signals.push({ label: "Same date of birth", weight: 0.4 });
  }
  const candidateFirst = normalizeName(candidate.firstName);
  const personFirst = normalizeName(person.firstName);
  if (candidateFirst && candidateFirst === personFirst) {
    signals.push({ label: "Same first name", weight: 0.2 });
  }
  const candidateLast = normalizeName(candidate.lastName);
  const personLast = normalizeName(person.lastName);
  if (candidateLast && candidateLast === personLast) {
    signals.push({ label: "Same surname", weight: 0.25 });
  } else if (
    candidateLast &&
    personLast &&
    (personLast.startsWith(`${candidateLast} `) || candidateLast.startsWith(`${personLast} `))
  ) {
    // A married name usually extends the maiden surname rather than replacing it.
    signals.push({ label: "Surname differs by a married-name suffix", weight: 0.2 });
  }
  const candidateMiddle = normalizeName(candidate.middleName ?? "");
  const personMiddle = normalizeName(person.middleName ?? "");
  if (candidateMiddle && candidateMiddle === personMiddle) {
    signals.push({ label: "Same middle name", weight: 0.15 });
  }
  const aliasHit = person.aliases.some(
    (alias) => normalizeName(alias) === normalizeName(`${candidate.firstName} ${candidate.lastName}`),
  );
  if (aliasHit) signals.push({ label: "Matches a recorded alias", weight: 0.2 });

  const score = Math.min(
    1,
    signals.reduce((total, signal) => total + signal.weight, 0),
  );
  return { score, signals };
}

/** Completed steps of a survey assignment. */
export function completedSections(assignment: { sections: readonly { complete: boolean }[] }): number {
  return assignment.sections.filter((section) => section.complete).length;
}

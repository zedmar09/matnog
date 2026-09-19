import type { DuplicateCandidate, TransferRequest } from "../types/registry";

/** Score bands, so a reviewer can work the strong matches first. */
export const SCORE_BANDS = [
  { value: "high", label: "Strong (80% and above)", test: (score: number) => score >= 0.8 },
  { value: "medium", label: "Possible (60–79%)", test: (score: number) => score >= 0.6 && score < 0.8 },
  { value: "low", label: "Weak (below 60%)", test: (score: number) => score < 0.6 },
];

export const DUPLICATE_OUTCOMES = [
  { value: "open", label: "Awaiting a decision" },
  { value: "merged", label: "Merged" },
  { value: "distinct", label: "Recorded as distinct" },
  { value: "reversed", label: "Merge reversed" },
];

export const TRANSFER_STATES = ["requested", "released", "accepted", "rejected", "disputed", "completed"] as const;

/** Where a candidate stands, from the decision recorded on it. */
export function duplicateOutcome(candidate: DuplicateCandidate): string {
  if (candidate.reversedFrom) return "reversed";
  if (candidate.decision) return candidate.decision.outcome;
  return "open";
}

export type DuplicateFilters = { search?: string; band?: string; outcome?: string };
export type TransferFilters = { search?: string; state?: string; from?: string; to?: string };

/**
 * Queue filtering is presentation only: it narrows what is listed and never
 * changes a record or a decision. Searching matches the person's name as well
 * as their ID, because a reviewer knows the name, not the reference.
 */
export function filterDuplicates(
  rows: readonly DuplicateCandidate[],
  filters: DuplicateFilters,
  nameOf: (personId: string) => string,
): DuplicateCandidate[] {
  const query = (filters.search ?? "").trim().toLocaleLowerCase();
  return rows.filter((row) => {
    const haystack = [row.envelope.id, ...row.personIds, ...row.personIds.map(nameOf)].join(" ").toLocaleLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (filters.band && !SCORE_BANDS.find((band) => band.value === filters.band)?.test(row.score)) return false;
    if (filters.outcome && duplicateOutcome(row) !== filters.outcome) return false;
    return true;
  });
}

export function filterTransfers(
  rows: readonly TransferRequest[],
  filters: TransferFilters,
  nameOf: (personId: string) => string,
): TransferRequest[] {
  const query = (filters.search ?? "").trim().toLocaleLowerCase();
  return rows.filter((row) => {
    const haystack = [row.envelope.id, row.personId, nameOf(row.personId), row.from.label, row.to.label]
      .join(" ")
      .toLocaleLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (filters.state && row.state !== filters.state) return false;
    if (filters.from && row.from.id !== filters.from) return false;
    if (filters.to && row.to.id !== filters.to) return false;
    return true;
  });
}

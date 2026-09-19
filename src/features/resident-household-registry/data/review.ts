import { createEnvelope } from "@/shared/data/record-envelope";

import type { DuplicateCandidate, TransferRequest } from "../types/registry";
import { BARANGAY_A, BARANGAY_B, BARANGAY_C } from "./barangays";

const OFFICE = { kind: "office", id: "DEMO-OFF-MPDO", label: "Municipal data stewardship" } as const;

function duplicate(input: {
  id: string;
  status: string;
  createdAt: string;
  personIds: [string, string];
  score: number;
  signals: string[];
  decision?: DuplicateCandidate["decision"];
  reversedFrom?: DuplicateCandidate["reversedFrom"];
}): DuplicateCandidate {
  const { id, status, createdAt, decision, reversedFrom, ...rest } = input;
  return {
    envelope: createEnvelope({ id, status, scope: OFFICE, createdAt, updatedAt: createdAt }),
    ...rest,
    ...(decision ? { decision } : {}),
    ...(reversedFrom ? { reversedFrom } : {}),
  };
}

/**
 * Suggestions for human review. Nothing here is a decided identity: a high
 * score is a reason to look, never a reason to merge. The set deliberately
 * spans strong matches, weak ones that should end as separate people, and
 * decisions already recorded, including a reversed merge.
 */
export const DUPLICATE_CANDIDATES: DuplicateCandidate[] = [
  duplicate({
    id: "DEMO-DUP-001",
    status: "Awaiting review",
    createdAt: "2026-09-01T09:00:00+08:00",
    personIds: ["DEMO-PER-001", "DEMO-PER-003"],
    score: 0.86,
    signals: [
      "Same date of birth",
      "Same mother's maiden name on both records",
      "Surname differs by a married-name suffix",
      "Different barangay of residence",
    ],
  }),
  duplicate({
    id: "DEMO-DUP-002",
    status: "Awaiting review",
    createdAt: "2026-09-03T10:30:00+08:00",
    personIds: ["DEMO-PER-011", "DEMO-PER-012"],
    score: 0.94,
    signals: [
      "Same date of birth",
      "Same middle name",
      "Surname differs by a married-name suffix",
      "Second record captured at a different counter",
      "Same declared occupation",
    ],
  }),
  duplicate({
    id: "DEMO-DUP-003",
    status: "Awaiting review",
    createdAt: "2026-09-05T08:15:00+08:00",
    personIds: ["DEMO-PER-005", "DEMO-PER-007"],
    score: 0.79,
    signals: [
      "Same date of birth",
      "Surname differs by one letter",
      "Same barangay of residence",
      "One record has no household membership",
    ],
  }),
  duplicate({
    id: "DEMO-DUP-004",
    status: "Awaiting review",
    createdAt: "2026-09-08T13:45:00+08:00",
    personIds: ["DEMO-PER-006", "DEMO-PER-008"],
    score: 0.61,
    // A name match with an eleven-year age gap: the queue must be able to end
    // in "separate people" rather than treating the score as a verdict.
    signals: [
      "Identical first and last name",
      "Birth dates differ by eleven years",
      "Different barangay of residence",
      "No shared household history",
    ],
  }),
  duplicate({
    id: "DEMO-DUP-005",
    status: "Awaiting review",
    createdAt: "2026-09-11T11:00:00+08:00",
    personIds: ["DEMO-PER-009", "DEMO-PER-010"],
    score: 0.44,
    // Same surname and address only. Weak, and kept in the queue to show that a
    // low score is still surfaced rather than silently dropped.
    signals: ["Same surname", "Same household", "Birth dates differ by thirty-two years", "Different sex recorded"],
  }),
  duplicate({
    id: "DEMO-DUP-006",
    status: "Recorded as distinct",
    createdAt: "2026-08-14T09:20:00+08:00",
    personIds: ["DEMO-PER-002", "DEMO-PER-004"],
    score: 0.58,
    signals: ["Same surname", "Same household", "Different date of birth", "Different sex recorded"],
    decision: {
      outcome: "distinct",
      actor: "Municipal data steward",
      reason: "Confirmed as parent and child at the same address, not one person recorded twice.",
      at: "2026-08-14T15:10:00+08:00",
    },
  }),
  duplicate({
    id: "DEMO-DUP-007",
    status: "Merge reversed",
    createdAt: "2026-07-22T08:40:00+08:00",
    personIds: ["DEMO-PER-004", "DEMO-PER-006"],
    score: 0.66,
    signals: ["Similar first name", "Same barangay of residence", "Different date of birth"],
    // A merge that was undone: the original decision stays inspectable.
    reversedFrom: {
      outcome: "merged",
      actor: "Municipal data steward",
      reason: "Merged on a same-address assumption that later proved wrong.",
      at: "2026-07-23T10:05:00+08:00",
    },
  }),
];

function transfer(input: {
  id: string;
  status: string;
  personId: string;
  personLabel: string;
  from: typeof BARANGAY_A;
  to: typeof BARANGAY_A;
  destinationHouseholdId: string;
  state: TransferRequest["state"];
  requestedAt: string;
  reason: string;
}): TransferRequest {
  const { id, status, personLabel, requestedAt, ...rest } = input;
  return {
    envelope: createEnvelope({
      id,
      status,
      scope: { kind: "person", id: input.personId, label: personLabel },
      createdAt: `${requestedAt}T09:00:00+08:00`,
      updatedAt: `${requestedAt}T09:00:00+08:00`,
    }),
    ...rest,
    requestedAt,
  };
}

/**
 * Barangay transfers at every stage. A transfer moves a residency period; it
 * never reissues a person ID or discards the barangay history behind it.
 */
export const TRANSFER_REQUESTS: TransferRequest[] = [
  transfer({
    id: "DEMO-TRF-001",
    status: "Requested",
    personId: "DEMO-PER-001",
    personLabel: "Mara Dela Cruz",
    from: BARANGAY_A,
    to: BARANGAY_B,
    destinationHouseholdId: "DEMO-HH-002",
    state: "requested",
    requestedAt: "2026-09-12",
    reason: "Moving to join the destination household.",
  }),
  transfer({
    id: "DEMO-TRF-002",
    status: "Released by origin",
    personId: "DEMO-PER-011",
    personLabel: "Cristina Obias",
    from: BARANGAY_A,
    to: BARANGAY_B,
    destinationHouseholdId: "DEMO-HH-002",
    state: "released",
    requestedAt: "2026-09-08",
    reason: "Moving closer to the market after marriage.",
  }),
  transfer({
    id: "DEMO-TRF-003",
    status: "Accepted by destination",
    personId: "DEMO-PER-010",
    personLabel: "Reynaldo Alcantara",
    from: BARANGAY_C,
    to: BARANGAY_A,
    destinationHouseholdId: "DEMO-HH-003",
    state: "accepted",
    requestedAt: "2026-09-04",
    reason: "Boarding nearer to school for the new term.",
  }),
  transfer({
    id: "DEMO-TRF-004",
    status: "Completed",
    personId: "DEMO-PER-009",
    personLabel: "Josefa Alcantara",
    from: BARANGAY_B,
    to: BARANGAY_C,
    destinationHouseholdId: "DEMO-HH-004",
    state: "completed",
    requestedAt: "2026-07-15",
    reason: "Moved in with family after a bereavement.",
  }),
  transfer({
    id: "DEMO-TRF-005",
    status: "Rejected",
    personId: "DEMO-PER-005",
    personLabel: "Ariel Mendoza",
    from: BARANGAY_A,
    to: BARANGAY_B,
    destinationHouseholdId: "DEMO-HH-002",
    state: "rejected",
    requestedAt: "2026-08-19",
    reason: "The destination household did not confirm the arrangement.",
  }),
  transfer({
    id: "DEMO-TRF-006",
    status: "Disputed",
    personId: "DEMO-PER-006",
    personLabel: "Liza Bermudo",
    from: BARANGAY_A,
    to: BARANGAY_B,
    destinationHouseholdId: "DEMO-HH-002",
    state: "disputed",
    requestedAt: "2026-08-27",
    // Both barangays claim the current residency: the queue must hold the
    // dispute rather than silently picking a side.
    reason: "Both barangays recorded an open residency for the same period.",
  }),
  transfer({
    id: "DEMO-TRF-007",
    status: "Requested",
    personId: "DEMO-PER-012",
    personLabel: "Cristina Obias-Rada",
    from: BARANGAY_A,
    to: BARANGAY_B,
    destinationHouseholdId: "DEMO-HH-002",
    state: "requested",
    requestedAt: "2026-09-16",
    reason: "Requested at the destination counter during registration.",
  }),
  transfer({
    id: "DEMO-TRF-009",
    status: "Requested",
    personId: "DEMO-PER-008",
    personLabel: "Liza Bermudo",
    from: BARANGAY_B,
    to: BARANGAY_C,
    destinationHouseholdId: "DEMO-HH-004",
    state: "requested",
    requestedAt: "2026-09-10",
    reason: "Moving to take up a teaching post.",
  }),
  transfer({
    id: "DEMO-TRF-008",
    status: "Released by origin",
    personId: "DEMO-PER-002",
    personLabel: "Nico Dela Cruz",
    from: BARANGAY_B,
    to: BARANGAY_A,
    destinationHouseholdId: "DEMO-HH-001",
    state: "released",
    requestedAt: "2026-09-14",
    reason: "Returning to the family household after seasonal work.",
  }),
];

import { createEnvelope } from "@/shared/data/record-envelope";

import type { ImportRow, SurveyAssignment, SurveySection } from "../types/survey";

/** The capture steps, matching the Flutter survey screens. */
const SECTIONS: readonly Omit<SurveySection, "complete">[] = [
  { id: "members", title: "Household members", description: "Confirm who currently lives here." },
  { id: "dwelling", title: "Dwelling", description: "Construction, tenure and utilities." },
  { id: "services", title: "Water, power and waste", description: "Basic services available to the household." },
  { id: "livelihood", title: "Livelihood", description: "Income bracket and sources of income." },
  { id: "vulnerability", title: "Vulnerability", description: "Record unknown separately from no." },
];

/** Marks the first `done` sections complete, matching a partly captured survey. */
const sectionsWith = (done: number): SurveySection[] =>
  SECTIONS.map((section, index) => ({ ...section, complete: index < done }));

export const SURVEY_ASSIGNMENTS: SurveyAssignment[] = [
  {
    envelope: createEnvelope({
      id: "DEMO-SVY-001",
      status: "Assigned",
      scope: { kind: "household", id: "DEMO-HH-003", label: "Bermudo household" },
      createdAt: "2026-09-08T08:00:00+08:00",
      updatedAt: "2026-09-08T08:00:00+08:00",
    }),
    householdId: "DEMO-HH-003",
    enumerator: "Field Surveyor",
    dueOn: "2026-09-12",
    state: "assigned",
    sections: sectionsWith(0),
    draft: {},
    baseVersion: 1,
    conflicts: [],
  },
  {
    envelope: createEnvelope({
      id: "DEMO-SVY-002",
      status: "In progress",
      scope: { kind: "household", id: "DEMO-HH-001", label: "Dela Cruz household" },
      createdAt: "2026-09-14T08:00:00+08:00",
      updatedAt: "2026-09-14T15:30:00+08:00",
    }),
    householdId: "DEMO-HH-001",
    enumerator: "Field Surveyor",
    dueOn: "2026-09-25",
    state: "in-progress",
    sections: sectionsWith(3),
    draft: {
      "dwelling.constructionMaterial": "Mixed concrete and wood",
      "dwelling.tenure": "Owned",
      "dwelling.waterSource": "Piped supply",
      "dwelling.toiletFacility": "Water-sealed",
      "dwelling.powerSource": "Grid connection",
      "dwelling.wasteDisposal": "Collected",
      "dwelling.internet": "yes",
    },
    baseVersion: 5,
    conflicts: [],
  },
  {
    // Stale-version fixture: the household changed while this draft was offline.
    envelope: createEnvelope({
      id: "DEMO-SVY-003",
      status: "Conflict",
      scope: { kind: "household", id: "DEMO-HH-002", label: "Dela Cruz-Santos household" },
      createdAt: "2026-09-10T08:00:00+08:00",
      updatedAt: "2026-09-14T09:00:00+08:00",
    }),
    householdId: "DEMO-HH-002",
    enumerator: "Field Surveyor",
    dueOn: "2026-09-18",
    state: "conflict",
    sections: sectionsWith(5),
    draft: {
      "dwelling.constructionMaterial": "Concrete",
      "dwelling.tenure": "Owned",
      "dwelling.waterSource": "Deep well",
      "dwelling.toiletFacility": "Water-sealed",
      "dwelling.powerSource": "Grid connection",
      "dwelling.wasteDisposal": "Collected",
      "dwelling.internet": "no",
      "socioeconomic.incomeBracket": "PHP 10,000 – 19,999 monthly",
      "socioeconomic.livelihood": "Fishing",
      "socioeconomic.foodSecurity": "unknown",
    },
    baseVersion: 1,
    conflicts: [
      {
        field: "waterSource",
        label: "Water source",
        base: "Shared standpipe",
        local: "Piped supply",
        current: "Deep well",
      },
      {
        field: "internet",
        label: "Internet at home",
        base: "Unknown",
        local: "Yes",
        current: "Unknown",
      },
    ],
  },
  {
    envelope: createEnvelope({
      id: "DEMO-SVY-004",
      status: "Accepted",
      scope: { kind: "household", id: "DEMO-HH-002", label: "Dela Cruz-Santos household" },
      createdAt: "2026-08-28T08:00:00+08:00",
      updatedAt: "2026-09-02T09:10:00+08:00",
    }),
    householdId: "DEMO-HH-002",
    enumerator: "Field Surveyor",
    dueOn: "2026-09-01",
    state: "accepted",
    sections: sectionsWith(5),
    draft: {},
    baseVersion: 2,
    conflicts: [],
  },
];

/**
 * A sample bulk import. Invalid rows and possible duplicates are shown before
 * any apply action, so nothing is written on the strength of a file alone.
 */
export const IMPORT_PREVIEW: ImportRow[] = [
  {
    line: 2,
    name: "Teodoro Villanueva",
    birthDate: "1969-02-11",
    householdId: "DEMO-HH-001",
    issue: "ok",
    note: "No existing record looks like this person.",
  },
  {
    line: 3,
    name: "Mara Dela Cruz",
    birthDate: "1998-04-12",
    householdId: "DEMO-HH-001",
    issue: "possible-duplicate",
    note: "Matches DEMO-PER-001 on name and date of birth. Needs a human decision.",
  },
  {
    line: 4,
    name: "Liza Bermudo",
    birthDate: "2027-07-19",
    householdId: "DEMO-HH-003",
    issue: "invalid",
    note: "The date of birth is in the future.",
  },
  {
    line: 5,
    name: "",
    birthDate: "1991-03-04",
    householdId: "DEMO-HH-002",
    issue: "invalid",
    note: "The name is missing.",
  },
];

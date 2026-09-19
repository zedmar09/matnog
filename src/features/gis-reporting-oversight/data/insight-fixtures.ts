export type InsightMetric = {
  id: string;
  label: string;
  value: string;
  priorValue: string;
  barangayAValue: string;
  barangayBValue: string;
  comparison: string;
  source: string;
  definition: string;
  coverage: string;
  owningRoute: string;
};

export const INSIGHT_SNAPSHOTS = [
  {
    id: "current",
    label: "15 Sep 2026 reviewed snapshot",
    asOf: "2026-09-15 17:00 PHT",
    coverage: "14 of 16 sample sources",
  },
  {
    id: "prior",
    label: "31 Aug 2026 retained snapshot",
    asOf: "2026-08-31 17:00 PHT",
    coverage: "12 of 16 sample sources",
  },
] as const;

export const INSIGHT_METRICS: readonly InsightMetric[] = [
  {
    id: "registry",
    label: "Registry completeness",
    value: "87%",
    priorValue: "83%",
    barangayAValue: "92%",
    barangayBValue: "Unavailable — missing denominator",
    comparison: "+4 points from retained snapshot",
    source: "M01 resident and household projection",
    definition: "Households with reviewed composition and current barangay divided by in-scope households.",
    coverage: "Demo Barangays A and B; one missing denominator flagged",
    owningRoute: "/ops/households",
  },
  {
    id: "bpls",
    label: "BPLS applications within sample target",
    value: "3 of 4",
    priorValue: "2 of 4",
    barangayAValue: "2 of 2",
    barangayBValue: "1 of 2",
    comparison: "One correction loop remains open",
    source: "M03 application projection",
    definition:
      "Unique applications completed within the illustrative target boundary; visits alone never count as completed.",
    coverage: "Four mapped application paths",
    owningRoute: "/ops/bpls/applications",
  },
  {
    id: "collections",
    label: "Confirmed sample collections",
    value: "PHP 5,075.00",
    priorValue: "PHP 4,825.00",
    barangayAValue: "PHP 3,200.00",
    barangayBValue: "PHP 1,875.00",
    comparison: "Settlement exception excluded",
    source: "M06 collection events",
    definition: "Sum of unique confirmed collections by collection ID; attempts and acknowledgments are excluded.",
    coverage: "Eight assessment scenarios; one unmatched settlement",
    owningRoute: "/ops/treasury/collections",
  },
  {
    id: "assistance",
    label: "Unique assistance recipients",
    value: "42",
    priorValue: "39",
    barangayAValue: "25",
    barangayBValue: "17 · partial coverage",
    comparison: "Repeated program rows deduplicated",
    source: "M08 safe benefit projection",
    definition: "Distinct person-period-program keys after removing repeated release rows.",
    coverage: "Partial sector coverage",
    owningRoute: "/ops",
  },
  {
    id: "projects",
    label: "Projects ready for public summary",
    value: "2",
    priorValue: "1",
    barangayAValue: "1",
    barangayBValue: "0 known projects",
    comparison: "One project has stale field evidence",
    source: "M13/M14 readiness projection",
    definition: "Unique projects with approved progress, funding reference and disclosure-safe summary.",
    coverage: "Three projects",
    owningRoute: "/ops",
  },
  {
    id: "restricted",
    label: "Restricted protection aggregate",
    value: "Suppressed",
    priorValue: "Suppressed",
    barangayAValue: "Suppressed",
    barangayBValue: "Suppressed",
    comparison: "Small-cell threshold applied",
    source: "M10 sanitized aggregate only",
    definition: "Approved aggregate from M10 with no case IDs, narratives, persons or locations.",
    coverage: "Below disclosure threshold of five",
    owningRoute: "/ops",
  },
];

export const MAP_LAYERS = [
  {
    id: "businesses",
    label: "Businesses",
    count: "3",
    source: "M03 establishments",
    privacy: "Approximate public office area only",
  },
  { id: "projects", label: "Projects", count: "3", source: "M13 projects", privacy: "Approved site summaries" },
  {
    id: "hazards",
    label: "Hazards and centers",
    count: "4",
    source: "M09 preparedness",
    privacy: "No household coordinates",
  },
  {
    id: "households",
    label: "Household coverage",
    count: "Partial",
    source: "M01 aggregate",
    privacy: "Barangay aggregate only",
  },
] as const;

export const BARANGAY_SCORECARDS = [
  {
    id: "DEMO-BRGY-A",
    name: "Demo Barangay A",
    completeness: "92%",
    freshness: "2 days",
    turnaround: "4.1 days",
    readiness: "On track",
    planSubmission: "Submitted · 12 Jul 2026",
    capacityGap: "Two stale household surveys",
    followUp: "Review two stale household surveys",
  },
  {
    id: "DEMO-BRGY-B",
    name: "Demo Barangay B",
    completeness: "71%",
    freshness: "18 days",
    turnaround: "Unavailable",
    readiness: "Needs coverage",
    planSubmission: "For correction",
    capacityGap: "Missing denominator and delayed survey review",
    followUp: "Confirm missing denominator before comparison",
  },
] as const;

export const REPORT_DEFINITION = {
  id: "DEMO-RPT-001",
  title: "Municipal service and coverage snapshot",
  description: "Controlled summary across registry, licensing, collections, assistance and project readiness.",
  allowedFields: ["Metric", "Value", "Coverage", "Source date", "Barangay scope"],
  allowedGroupings: ["No grouping", "Module source", "Barangay scope", "Coverage state"],
  blockedFields: ["Resident name", "Household coordinates", "Case narrative", "Passenger list", "Internal attachment"],
  schedule: "Sample monthly schedule · paused · no delivery service",
  rows: INSIGHT_METRICS,
} as const;

export const DATA_QUALITY_ISSUES = [
  {
    id: "DEMO-DQ-001",
    severity: "warning",
    source: "M01",
    title: "Missing household denominator",
    detail: "Demo Barangay B completeness cannot be treated as zero or compared until coverage is reviewed.",
  },
  {
    id: "DEMO-DQ-002",
    severity: "info",
    source: "M08",
    title: "Repeated assistance release",
    detail: "The report uses a unique person-period-program key and shows one recipient.",
  },
  {
    id: "DEMO-DQ-003",
    severity: "warning",
    source: "M13",
    title: "Stale progress evidence",
    detail: "Project progress remains dated 28 August 2026 and is marked stale.",
  },
] as const;

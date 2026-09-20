export type PlanningStatus =
  | "draft"
  | "for-correction"
  | "under-review"
  | "prioritized"
  | "deferred"
  | "approved-unfunded"
  | "project-linked"
  | "archived";

export type EvidenceCoverage = {
  snapshotId: string;
  source: string;
  collectedAt: string;
  reportedAt: string;
  coverage: string;
  beneficiaries: number;
  denominator: number | null;
  caveat?: string;
};

export type PlanningProposal = {
  id: string;
  sourceReference: string;
  sourceOffice: string;
  barangay: string;
  problem: string;
  location: string;
  outcome: string;
  estimateMinor: number;
  beneficiaries: number;
  tags: string[];
  attributions?: { tag: string; percent: number }[];
  status: PlanningStatus;
  evidence: EvidenceCoverage;
  overlapWith?: string;
  score: number;
  scoreBreakdown?: { criterion: string; weight: number; value: number; weightedScore: number }[];
  criteriaVersion: string;
  rationale: string;
  correction?: string;
  planReference?: string;
  appropriationReference?: string;
  projectReference?: string;
  version: number;
};

export type BarangayPlan = {
  id: string;
  title: string;
  barangay: string;
  councilMinutesReference: string | null;
  councilComposition: string[];
  priorities: string[];
  status: string;
  submittedAt?: string;
};

export type MunicipalPlan = {
  id: string;
  level: "CDP" | "LDIP" | "AIP";
  title: string;
  fiscalYears: string;
  version: string;
  previousVersion?: string;
  changeSummary?: string;
  approvalStatus: string;
  decisionFeedback?: string;
  parentReference?: string;
  itemReferences: string[];
};

export type PlanningScenario =
  | "normal"
  | "missing-evidence"
  | "criteria-changed"
  | "tie"
  | "missing-minutes"
  | "stale-version";

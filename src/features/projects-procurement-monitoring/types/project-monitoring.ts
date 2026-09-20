export type ProjectStage =
  | "readiness"
  | "procurement"
  | "execution"
  | "suspended"
  | "completion"
  | "accepted"
  | "archived";
export type GateState = "complete" | "missing" | "expired" | "not-applicable";
export type ProjectGate = {
  id: string;
  label: string;
  owner: string;
  mandatory: boolean;
  state: GateState;
  evidenceReference?: string;
};
export type ProjectInspection = {
  id: string;
  capturedAt: string;
  reportedAt: string;
  coordinates: string;
  photoReference: string;
  materialResult: string;
  finding: string;
  syncState: string;
  reviewStatus?: string;
};
export type ProjectIssue = {
  id: string;
  description: string;
  assignee: string;
  dueAt: string;
  status: "open" | "resolved" | "overdue";
  closureEvidence?: string;
};
export type ProjectBilling = {
  id: string;
  verifiedInspectionReference?: string;
  grossMinor: number;
  retentionMinor: number;
  netMinor: number;
  status: string;
  financeReference?: string;
};
export type ProjectRecord = {
  id: string;
  title: string;
  scope: string;
  barangay: string;
  office: string;
  year: number;
  type: string;
  tags: string[];
  stage: ProjectStage;
  sourceProposal: string;
  sourcePlan: string;
  appropriationReference?: string;
  fundSources: { label: string; amountMinor: number }[];
  contractReference?: string;
  contractor?: string;
  procurementMode: string;
  postingReference?: string;
  securityExpiry?: string;
  originalCostMinor: number;
  currentCostMinor: number;
  physicalProgress: number;
  financialProgress: number;
  elapsedProgress: number;
  originalEnd: string;
  currentEnd: string;
  readiness: ProjectGate[];
  inspections: ProjectInspection[];
  issues: ProjectIssue[];
  billings: ProjectBilling[];
  variation?: { reference: string; costImpactMinor: number; dayImpact: number; reason: string; status: string };
  emergencyAuthority?: string;
  turnoverReference?: string;
  asBuiltReference?: string;
  receivingCustodian?: string;
  warrantyUntil?: string;
  auditObservation?: string;
  history: string[];
  version: number;
};
export type ProjectScenario =
  | "normal"
  | "missing-gate"
  | "expired-security"
  | "rebid"
  | "offline-conflict"
  | "stale-baseline"
  | "overdue-audit";

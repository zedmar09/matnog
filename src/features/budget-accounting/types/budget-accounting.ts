export type FinanceStatus =
  | "draft"
  | "for-correction"
  | "approved"
  | "authorized"
  | "released"
  | "posting-pending"
  | "posted"
  | "rejected";
export type Appropriation = {
  id: string;
  fiscalPeriod: string;
  fund: string;
  department: string;
  projectReference?: string;
  appropriatedMinor: number;
  obligatedMinor: number;
  disbursedMinor: number;
  source: string;
};
export type Obligation = {
  id: string;
  appropriationReference: string;
  payeeProjection: string;
  purpose: string;
  requestedMinor: number;
  status: FinanceStatus;
  evidenceReferences: string[];
  requester: string;
  reviewer?: string;
  reason?: string;
  history: string[];
  version: number;
};
export type Disbursement = {
  id: string;
  obligationReference: string;
  projectBillingReference?: string;
  assistanceReference?: string;
  grossMinor: number;
  retentionMinor: number;
  netMinor: number;
  status: FinanceStatus;
  approvalChain: string[];
  releaseReference?: string;
  postingReference?: string;
  history: string[];
};
export type BudgetChange = {
  id: string;
  type: "realignment" | "supplemental" | "adjustment";
  fromReference: string;
  toReference: string;
  amountMinor: number;
  beforeMinor: number;
  afterMinor: number;
  requester: string;
  reviewer: string;
  reason: string;
  status: string;
  history: string[];
};
export type RevenueProjection = {
  id: string;
  collectionReference: string;
  settlementReference: string;
  amountMinor: number;
  mappedAccount: string;
  postingBatch?: string;
  status: string;
  differenceMinor: number;
};
export type FiscalPeriod = {
  id: string;
  label: string;
  status: "open" | "closing" | "closed";
  checklist: { label: string; complete: boolean }[];
  closedAt?: string;
  reopenReason?: string;
  history: string[];
};
export type InterfaceBatch = {
  id: string;
  createdAt: string;
  recordCount: number;
  amountMinor: number;
  status: "accepted" | "rejected" | "pending";
  error?: string;
  history: string[];
};
export type FinanceScenario =
  | "normal"
  | "insufficient"
  | "ineligible-fund"
  | "missing-evidence"
  | "partial-release"
  | "duplicate-posting"
  | "stale-balance";

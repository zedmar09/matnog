export type CaseClass = "Barangay justice" | "VAWC referral" | "Child protection" | "Blotter record";
export type CaseStatus = "New" | "Under review" | "Scheduled" | "Referred" | "Resolved" | "Closed";
export type CasePriority = "Routine" | "Priority" | "Urgent";

export type CaseTimelineEntry = {
  id: string;
  at: string;
  action: string;
  officer: string;
  note: string;
};

export type CaseRecord = {
  id: string;
  /** Protected M01 references; these never enter a general resident projection. */
  participantPersonIds?: string[];
  caseClass: CaseClass;
  discreetLabel: string;
  scope: string;
  assignedDesk: string;
  assignedOfficer: string;
  procedureVersion: string;
  priority: CasePriority;
  status: CaseStatus;
  openedAt: string;
  updatedAt: string;
  schedule: string;
  administrativeSummary: string;
  evidence: readonly string[];
  referral: string;
  certificateEligibility: "Eligible" | "Not eligible" | "Pending review";
  timeline: CaseTimelineEntry[];
};

export type AccessStatus = "Active" | "Revoked" | "Expired";
export type CaseAccessAssignment = {
  id: string;
  staffName: string;
  staffRole: string;
  caseClass: CaseClass;
  scope: string;
  purpose: string;
  grantedAt: string;
  expiresAt: string;
  status: AccessStatus;
};

export type DisclosureDecision = {
  id: string;
  caseId: string;
  purpose: string;
  requestedFields: readonly string[];
  actor: string;
  at: string;
  outcome: "Approved" | "Denied";
};

export type CaseReportRow = {
  label: string;
  count: number | "Suppressed";
  period: string;
  scope: string;
};

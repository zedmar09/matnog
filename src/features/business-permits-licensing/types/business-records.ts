import type { BusinessApplicationPathId } from "./business-journey";

export type BusinessRequirementStatus = "valid" | "missing" | "expired" | "returned";
export type BusinessReviewStatus = "not-started" | "in-review" | "approved" | "for-correction" | "not-applicable";
export type BusinessApplicationStatus =
  | "draft"
  | "submitted"
  | "for-correction"
  | "under-review"
  | "ready-to-issue"
  | "issued"
  | "closed";

export type BusinessRegistryStatus = "Active" | "Expiring soon" | "Expired" | "Closed";
export type BusinessOrganizationType = "Sole proprietorship" | "Partnership" | "Corporation" | "Cooperative";

export type BusinessRegistryRecord = {
  id: string;
  registeredName: string;
  tradeName: string;
  organizationType: BusinessOrganizationType;
  ownerName: string;
  contactNumber: string;
  email: string;
  tin: string;
  activity: string;
  address: string;
  barangay: string;
  employeeCount: number;
  status: BusinessRegistryStatus;
  permitNumber: string;
  permitValidUntil: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessRequirement = {
  id: string;
  label: string;
  status: BusinessRequirementStatus;
  reusable: boolean;
  expiresAt?: string;
  revision: number;
};

export type BusinessReviewTrack = {
  id: string;
  office: string;
  assignee: string;
  status: BusinessReviewStatus;
  reason?: string;
  inspection?: { scheduledAt: string; outcome: "pending" | "passed" | "reschedule"; evidence: string[] };
};

export type BusinessAssessment = {
  id: string;
  ruleVersion: string;
  items: readonly { label: string; amount: number; exempt?: boolean }[];
  total: number;
  paymentStatus: "not-created" | "pending" | "paid" | "reversed";
};

export type BusinessPermitSnapshot = {
  serial: string;
  version: number;
  status: "active" | "superseded" | "closed";
  issuedAt: string;
  watermark?: string;
};

export type BusinessApplicationRecord = {
  id: string;
  businessId: string;
  businessName: string;
  establishmentId: string;
  establishmentName: string;
  representativeId: string;
  representativeLabel: string;
  representationStatus: "active" | "expired";
  path: BusinessApplicationPathId;
  fiscalPeriod: string;
  status: BusinessApplicationStatus;
  filedAt: string;
  targetRelease: string;
  assignedOfficer: string;
  revision: number;
  activity: string;
  location: string;
  declaredChange?: string;
  requirements: BusinessRequirement[];
  reviews: BusinessReviewTrack[];
  barangayClearance: { requestId: string; status: "valid" | "pending" | "blocked" };
  assessment: BusinessAssessment | null;
  permits: BusinessPermitSnapshot[];
  documentRoute: { recordId: string; status: "not-routed" | "in-transit" | "received" };
  timeline: { id: string; label: string; at: string; actor: string }[];
};

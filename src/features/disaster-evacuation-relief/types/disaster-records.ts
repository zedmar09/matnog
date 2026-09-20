export type ActivityStatus = "Monitoring" | "Active response" | "Contained" | "Closed";
export type ActivityPriority = "Low" | "Moderate" | "High" | "Critical";
export type ActivityType =
  | "Typhoon"
  | "Flood"
  | "Storm surge"
  | "Tsunami"
  | "Landslide"
  | "Fire"
  | "Earthquake"
  | "Volcanic activity"
  | "Maritime incident";

export type DisasterActivity = {
  id: string;
  name: string;
  type: ActivityType;
  status: ActivityStatus;
  priority: ActivityPriority;
  leadOffice: string;
  incidentCommander: string;
  startedAt: string;
  updatedAt: string;
  affectedBarangays: readonly string[];
  summary: string;
  advisoryReference: string;
};

export type CenterStatus = "Open" | "Standby" | "Closed";
export type EvacuationCenter = {
  id: string;
  activityId: string;
  name: string;
  barangay: string;
  address: string;
  capacity: number;
  acceptedOccupants: number;
  pendingOccupants: number;
  status: CenterStatus;
  manager: string;
  contactNumber: string;
  version: number;
  facilities: readonly string[];
};

export type EvacuationHousehold = {
  householdId: string;
  householdName: string;
  barangay: string;
  assignedCenterId: string;
  members: readonly { id: string; label: string; status: "Checked in" | "At home" | "Missing follow-up" }[];
  transport: string;
  need: string;
  exposureStatus: "Potential" | "Validated" | "Not affected";
};

export type DistributionStatus = "Released" | "Pending confirmation" | "Duplicate review" | "Cancelled";
export type ReliefDistribution = {
  id: string;
  activityId: string;
  round: string;
  recipientId: string;
  recipientName: string;
  barangay: string;
  items: string;
  distributionSite: string;
  releasedAt: string;
  acknowledgment: string;
  status: DistributionStatus;
};

export type AssessmentStatus = "Draft" | "For verification" | "Verified" | "Referred";
export type DamageAssessment = {
  id: string;
  activityId: string;
  householdId: string;
  residentName: string;
  barangay: string;
  structureId: string;
  category: string;
  observation: string;
  evidence: readonly string[];
  assessedAt: string;
  assessor: string;
  status: AssessmentStatus;
  referral: string;
  referralPrepared?: boolean;
};

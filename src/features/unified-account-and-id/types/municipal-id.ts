export type ResidentLinkReviewStatus = "pending" | "approved" | "rejected";
export type IdentityApplicationKind = "new" | "replacement";
export type IdentityApplicationStatus = "submitted" | "correction" | "approved" | "rejected";
export type CredentialStatus = "active" | "superseded" | "revoked";

export type IdentityHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  at: string;
};

export type IdentityEvidence = {
  id: string;
  label: string;
  filename: string;
  state: "accepted" | "submitted" | "correction";
};

export type IdentityApplication = {
  id: string;
  personId: "DEMO-PER-001";
  accountId: "DEMO-VIS-001";
  kind: IdentityApplicationKind;
  status: IdentityApplicationStatus;
  submittedAt: string;
  displayName: "Mara Reyes Dela Cruz";
  photoRef: "sample://mara-id-photo";
  evidence: readonly IdentityEvidence[];
  predecessorCredentialId?: string;
  correctionReason?: string;
  decisionReason?: string;
  history: readonly IdentityHistoryEntry[];
};

export type MunicipalCredential = {
  id: string;
  token: string;
  personId: "DEMO-PER-001";
  holderName: "Mara Reyes Dela Cruz";
  type: "Municipal Resident ID";
  status: CredentialStatus;
  issuedAt: string;
  validUntil: string;
  predecessorId?: string;
  invalidReason?: string;
};

export type ResidentLinkReview = {
  id: "DEMO-LINK-001";
  personId: "DEMO-PER-001";
  accountId: "DEMO-VIS-001";
  status: ResidentLinkReviewStatus;
  requestedAt: string;
  decisionReason?: string;
};

export type IdentityDemoState = {
  residentLink: ResidentLinkReview;
  application: IdentityApplication;
  credentials: readonly MunicipalCredential[];
};

/** Public projection: deliberately excludes holder/person, address, household and evidence. */
export type PublicCredentialResult = {
  credentialReference: string;
  credentialType: "Municipal Resident ID";
  validity: "valid" | "invalid";
  statusLabel: "Valid sample credential" | "Invalid sample credential";
  issuedAt: string;
  validUntil: string;
  message: string;
};

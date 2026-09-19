export type CertificateAudience = "resident" | "business";

export type CertificateCatalogItem = {
  id: string;
  title: string;
  audience: CertificateAudience;
  purposeGuidance: string;
  requirements: readonly string[];
  feeGuidance: string;
  residentLinkRequired: boolean;
};

export type CertificateJourneyStage = {
  id: string;
  title: string;
  owner: string;
  detail: string;
  result: string;
};

export type CertificateRecordLayer = {
  id: "request" | "review" | "assessment" | "issuance" | "verification";
  title: string;
  identityExample: string;
  owns: string;
  mustNotImply: string;
};

export type CertificateJourneyExample = {
  requestId: string;
  typeId: string;
  typeLabel: string;
  subjectLabel: string;
  subjectId: string;
  barangay: string;
  purpose: string;
  claimMethod: string;
  currentStage: string;
  paymentAssessmentId: string;
  routedDocumentId: string;
  sampleSerial: string;
  verificationToken: string;
};

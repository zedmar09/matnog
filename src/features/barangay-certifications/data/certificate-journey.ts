import type {
  CertificateCatalogItem,
  CertificateJourneyExample,
  CertificateJourneyStage,
  CertificateRecordLayer,
} from "../types/certificate-journey";

export const CERTIFICATE_CATALOG: readonly CertificateCatalogItem[] = [
  {
    id: "residency",
    title: "Certificate of residency",
    audience: "resident",
    purposeGuidance: "For a stated local purpose that requires confirmation of current barangay residency.",
    requirements: ["Verified resident link", "Current barangay record", "Specific intended purpose"],
    feeGuidance: "Illustrative fee or exemption is confirmed during barangay review.",
    residentLinkRequired: true,
  },
  {
    id: "clearance",
    title: "Barangay clearance",
    audience: "resident",
    purposeGuidance: "For a named transaction after the barangay confirms its applicable review rules.",
    requirements: ["Verified resident link", "Purpose and requesting office", "Barangay checklist review"],
    feeGuidance: "No fee is assumed until the reviewed rule version is selected.",
    residentLinkRequired: true,
  },
  {
    id: "indigency",
    title: "Certificate of indigency",
    audience: "resident",
    purposeGuidance: "For a declared assistance purpose subject to an authorized eligibility review.",
    requirements: ["Verified resident link", "Declared assistance purpose", "Eligibility evidence if requested"],
    feeGuidance: "A fee-exempt result requires a recorded exemption basis.",
    residentLinkRequired: true,
  },
  {
    id: "business-clearance",
    title: "Barangay business clearance",
    audience: "business",
    purposeGuidance: "For a named represented business and the application path that will consume the result.",
    requirements: ["Authorized business representation", "Business and site details", "Applicable barangay review"],
    feeGuidance: "The business assessment remains separate from the later M03 permit assessment.",
    residentLinkRequired: false,
  },
];

export const APPLICANT_JOURNEY: readonly CertificateJourneyStage[] = [
  {
    id: "catalog",
    title: "Choose a document",
    owner: "You",
    detail: "Pick the certificate or clearance you need and check what to prepare.",
    result: "One document type",
  },
  {
    id: "verify",
    title: "Enter your mobile number",
    owner: "You",
    detail: "We send a code to confirm the number. No account is needed.",
    result: "Verified mobile number",
  },
  {
    id: "details",
    title: "Give the details",
    owner: "You",
    detail: "Tell us the purpose and add any supporting document the type requires.",
    result: "Completed request",
  },
  {
    id: "control",
    title: "Get your control number",
    owner: "Barangay",
    detail: "Use it to track the request and to claim at the counter.",
    result: "Control number for tracking",
  },
  {
    id: "claim",
    title: "Claim your document",
    owner: "You",
    detail: "Collect it at the barangay or download it once it is released.",
    result: "Released document",
  },
];

export const BARANGAY_JOURNEY: readonly CertificateJourneyStage[] = [
  {
    id: "queue",
    title: "Open the scoped request queue",
    owner: "Barangay clerk",
    detail: "See only requests assigned to the active barangay role and classification.",
    result: "Assigned request selected for review",
  },
  {
    id: "checklist",
    title: "Review eligibility and evidence",
    owner: "Barangay clerk",
    detail: "Confirm type-specific items, purpose, subject and the correct submitted revision.",
    result: "Return for correction or reviewed request",
  },
  {
    id: "fee",
    title: "Select fee or exemption basis",
    owner: "Authorized barangay staff",
    detail: "Create an M06 handoff only after review; never infer a zero fee from missing configuration.",
    result: "Assessment link or documented exemption",
  },
  {
    id: "sign",
    title: "Approve the exact snapshot",
    owner: "Authorized signatory",
    detail: "Confirm template version, signatory role and source snapshot before consuming a serial.",
    result: "One immutable issuance record and sample serial",
  },
  {
    id: "lifecycle",
    title: "Release, reprint or revoke",
    owner: "Barangay clerk / signatory",
    detail: "Reprint keeps the serial. Revocation changes validity without erasing the issued snapshot.",
    result: "Claim event and minimal public validity state",
  },
];

export const CERTIFICATE_RECORD_LAYERS: readonly CertificateRecordLayer[] = [
  {
    id: "request",
    title: "Request",
    identityExample: "DEMO-CERT-001",
    owns: "Subject, purpose, evidence, claim choice and submitted revisions",
    mustNotImply: "Eligibility, payment or issuance",
  },
  {
    id: "review",
    title: "Barangay review",
    identityExample: "DEMO-CERT-REV-001",
    owns: "Checklist, assigned barangay, correction reasons and decision history",
    mustNotImply: "That a fee is paid or a document is signed",
  },
  {
    id: "assessment",
    title: "Fee or exemption",
    identityExample: "DEMO-ASM-004",
    owns: "Reviewed amount, payee, payment gate or recorded exemption basis",
    mustNotImply: "Approval or certificate release",
  },
  {
    id: "issuance",
    title: "Issuance snapshot",
    identityExample: "SAMPLE-CERT-2026-0001",
    owns: "Approved source snapshot, template version, serial and signatory role",
    mustNotImply: "That the sample has production legal validity",
  },
  {
    id: "verification",
    title: "Verification projection",
    identityExample: "DEMO-CERT-TOKEN-001",
    owns: "Minimal type, issuer, issued date and current validity",
    mustNotImply: "Public access to resident, purpose, evidence or case details",
  },
];

export const CERTIFICATE_JOURNEY_EXAMPLE: CertificateJourneyExample = {
  requestId: "DEMO-CERT-001",
  typeId: "residency",
  typeLabel: "Certificate of residency",
  subjectLabel: "Mara Dela Cruz",
  subjectId: "DEMO-PER-001",
  barangay: "Demo Barangay A",
  purpose: "School enrollment requirement",
  claimMethod: "Barangay counter claim",
  currentStage: "Barangay review",
  paymentAssessmentId: "DEMO-ASM-004",
  routedDocumentId: "DEMO-DOC-002",
  sampleSerial: "SAMPLE-CERT-2026-0001",
  verificationToken: "DEMO-CERT-TOKEN-001",
};

export const RESTRICTED_CASE_ENTRY = {
  title: "Certificate to File Action",
  entry: "Eligible M10 case decision only",
  publicResult: "Unavailable through the ordinary certificate catalog",
  safeProjection: "M07 receives only eligibility, authorized subject reference and permitted template code.",
} as const;

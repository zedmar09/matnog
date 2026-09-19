import type { DemoRepresentation, RequesterContext } from "../types/representation";

export const SELF_REQUESTER_CONTEXT: RequesterContext = {
  id: "self",
  kind: "self",
  subjectId: "DEMO-VIS-001",
  subjectLabel: "Mara Dela Cruz",
  authorityLabel: "Own account",
  scopes: ["View account profile", "Start services available to this account"],
};

/**
 * Authority records for the UI demo. They grant no real access and
 * deliberately keep each subject and scope separate.
 */
export const DEMO_REPRESENTATIONS: readonly DemoRepresentation[] = [
  {
    id: "DEMO-REP-001",
    subjectId: "DEMO-PER-002",
    subjectKind: "person",
    subjectLabel: "Nico Dela Cruz",
    authorityLabel: "Authorized family representative",
    scopes: ["View resident service eligibility", "Start barangay certificate requests"],
    validFrom: "2026-08-01",
    validUntil: "2026-09-30",
  },
  {
    id: "DEMO-REP-002",
    subjectId: "DEMO-BIZ-001",
    subjectKind: "business",
    subjectLabel: "Demo Bay Tours",
    authorityLabel: "Authorized business representative",
    scopes: [
      "View business service status",
      "Start and track permit requests",
      "Start barangay business clearance requests",
    ],
    validFrom: "2026-07-01",
    validUntil: "2026-12-31",
  },
  {
    id: "DEMO-REP-003",
    subjectId: "DEMO-HH-001",
    subjectKind: "household",
    subjectLabel: "Dela Cruz household",
    authorityLabel: "Household representative",
    scopes: ["View household service eligibility"],
    validFrom: "2026-01-01",
    validUntil: "2026-08-31",
  },
];

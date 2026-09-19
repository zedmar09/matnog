import type { IdentityDemoState, IdentityEvidence } from "../types/municipal-id";

export const IDENTITY_EVIDENCE: readonly IdentityEvidence[] = [
  {
    id: "DEMO-ID-EVD-001",
    label: "Barangay certification",
    filename: "sample-barangay-certification.pdf",
    state: "accepted",
  },
  {
    id: "DEMO-ID-EVD-002",
    label: "Enrollment photo",
    filename: "sample-enrollment-photo.jpg",
    state: "submitted",
  },
];

export function createIdentityDemoSeed(): IdentityDemoState {
  return {
    residentLink: {
      id: "DEMO-LINK-001",
      personId: "DEMO-PER-001",
      accountId: "DEMO-VIS-001",
      status: "pending",
      requestedAt: "2026-09-15T10:30:00+08:00",
    },
    application: {
      id: "DEMO-IDAPP-001",
      personId: "DEMO-PER-001",
      accountId: "DEMO-VIS-001",
      kind: "new",
      status: "submitted",
      submittedAt: "2026-09-15T11:00:00+08:00",
      displayName: "Mara Reyes Dela Cruz",
      photoRef: "sample://mara-id-photo",
      evidence: IDENTITY_EVIDENCE,
      history: [
        {
          id: "DEMO-ID-HIS-001",
          title: "Enrollment submitted",
          detail: "Assisted enrollment received for review.",
          at: "2026-09-15T11:00:00+08:00",
        },
      ],
    },
    credentials: [],
  };
}

import { createEnvelope } from "@/shared/data/record-envelope";

import type { PublicRequest } from "../types/request";

// Public projection deliberately omits applicant names, addresses, and document contents.
export const PUBLIC_REQUESTS: PublicRequest[] = [
  {
    envelope: createEnvelope({
      id: "DEMO-CERT-001",
      status: "Under review",
      scope: { kind: "barangay", id: "DEMO-BRGY-A", label: "Demo Barangay A" },
      createdAt: "2026-09-14T09:10:00+08:00",
      updatedAt: "2026-09-15T09:30:00+08:00",
    }),
    title: "Barangay residency certificate",
    office: "Demo Barangay A",
    steps: [
      { title: "Request received", detail: "14 September · Sample submission recorded", complete: true },
      { title: "Barangay review", detail: "15 September · Information is being checked", complete: true },
      { title: "Ready for release", detail: "Awaiting review outcome", complete: false },
    ],
  },
  {
    envelope: createEnvelope({
      id: "DEMO-BPL-001",
      status: "For correction",
      scope: { kind: "business", id: "DEMO-BIZ-001", label: "Demo Bay Tours" },
      createdAt: "2026-09-14T11:00:00+08:00",
      updatedAt: "2026-09-15T10:00:00+08:00",
    }),
    title: "Business permit renewal",
    office: "Business Permits and Licensing Office",
    steps: [
      { title: "Application received", detail: "14 September · Sample renewal recorded", complete: true },
      { title: "Correction requested", detail: "15 September · Review the sample document checklist", complete: true },
      { title: "Assessment", detail: "Awaiting corrected application", complete: false },
      { title: "Permit release", detail: "Awaiting approvals and payment confirmation", complete: false },
    ],
  },
];

import type { BarangayRef } from "@/features/resident-household-registry/types/registry";
import type { RequesterContext } from "@/features/unified-account-and-id/types/representation";

import type { CertificateRequestValues } from "../schemas/certificate-request-schema";

export type CertificateSubjectProjection = {
  kind: "person" | "business";
  id: string;
  label: string;
  barangayId: BarangayRef["id"];
  barangayLabel: BarangayRef["label"];
};

export type CertificateRequestEligibility = {
  eligible: boolean;
  requester: RequesterContext;
  subject?: CertificateSubjectProjection;
  reasons: readonly string[];
};

export type CertificateDraftSnapshot = {
  version: 1;
  requesterContextId: string;
  requesterLabel: string;
  values: CertificateRequestValues;
  savedAt: string;
};

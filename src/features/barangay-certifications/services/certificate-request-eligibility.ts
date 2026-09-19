import type { AccountState } from "@/features/unified-account-and-id/types/account-context";
import type { RequesterContext } from "@/features/unified-account-and-id/types/representation";

import type { CertificateRequestValues } from "../schemas/certificate-request-schema";
import type { CertificateRequestEligibility, CertificateSubjectProjection } from "../types/certificate-request";

const BARANGAY_A = { barangayId: "DEMO-BRGY-A", barangayLabel: "Demo Barangay A" } as const;

export function evaluateCertificateRequestEligibility(input: {
  accountState: AccountState;
  requester: RequesterContext;
  residentPersonId?: string;
  certificateTypeId: CertificateRequestValues["certificateTypeId"];
  barangayId: CertificateRequestValues["barangayId"];
}): CertificateRequestEligibility {
  const reasons: string[] = [];
  let subject: CertificateSubjectProjection | undefined;
  const businessDocument = input.certificateTypeId === "business-clearance";

  if (businessDocument) {
    if (input.requester.kind !== "business") {
      reasons.push("Choose the represented business that will receive the barangay business clearance.");
    } else if (!input.requester.scopes.some((scope) => scope.toLowerCase().includes("business clearance"))) {
      reasons.push("The selected business authority does not include barangay-clearance requests.");
    } else {
      subject = { kind: "business", id: input.requester.subjectId, label: input.requester.subjectLabel, ...BARANGAY_A };
    }
  } else if (input.requester.kind === "self") {
    if (input.accountState !== "verified-resident" || !input.residentPersonId) {
      reasons.push("The account needs an approved resident link before requesting a resident certificate.");
    } else {
      subject = { kind: "person", id: input.residentPersonId, label: input.requester.subjectLabel, ...BARANGAY_A };
    }
  } else if (input.requester.kind === "person") {
    const hasCertificateAuthority = input.requester.scopes.some((scope) => scope.toLowerCase().includes("certificate"));
    if (!hasCertificateAuthority) {
      reasons.push("The selected representation does not include certificate-request authority.");
    } else {
      subject = { kind: "person", id: input.requester.subjectId, label: input.requester.subjectLabel, ...BARANGAY_A };
    }
  } else {
    reasons.push("Choose the account owner or an authorized represented person for this certificate type.");
  }

  if (subject && input.barangayId !== subject.barangayId) {
    reasons.push(
      `${subject.label} belongs to ${subject.barangayLabel} in this demo. Choose the matching issuing scope.`,
    );
  }

  return { eligible: reasons.length === 0, requester: input.requester, ...(subject ? { subject } : {}), reasons };
}

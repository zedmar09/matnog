import type { RequesterContext } from "../types/representation";
import type { ServiceDraftIntent, ServiceHandoffDecision, ServiceHandoffRule } from "../types/service-handoff";

const RULES: Readonly<Record<string, ServiceHandoffRule>> = {
  "business-permits": {
    serviceSlug: "business-permits",
    module: "M03",
    draftLabel: "business permit application intent",
    purpose: "Start a new, renewal, amendment, or retirement draft for the named requester.",
    allowedKinds: ["self", "business"],
    selfRequiresResidentLink: false,
    nextStep: "M03 will collect the business and application type before any review begins.",
  },
  "tourism-registration": {
    serviceSlug: "tourism-registration",
    module: "M04",
    draftLabel: "tourism registration intent",
    purpose: "Carry the named traveler, companion, or tourism business into a future trip draft.",
    allowedKinds: ["self", "person", "business"],
    selfRequiresResidentLink: false,
    nextStep: "M04 will collect trip, passenger, document, and partner-review details.",
  },
  "barangay-certificates": {
    serviceSlug: "barangay-certificates",
    module: "M07",
    draftLabel: "barangay certificate request intent",
    purpose: "Prepare a certificate request for the account owner or a specifically represented person.",
    allowedKinds: ["self", "person"],
    selfRequiresResidentLink: true,
    nextStep: "M07 will confirm the certificate type, purpose, barangay, requirements, and any applicable fee.",
  },
  "service-desk": {
    serviceSlug: "service-desk",
    module: "M11",
    draftLabel: "citizen service desk intent",
    purpose: "Carry the selected requester into a future concern, appointment, or feedback draft.",
    allowedKinds: ["self", "person", "household", "business"],
    selfRequiresResidentLink: false,
    nextStep: "M11 will collect the subject, preferred channel, location, supporting details, and assigned office.",
  },
};

export function getServiceHandoffRule(serviceSlug: string): ServiceHandoffRule | undefined {
  return RULES[serviceSlug];
}

export function evaluateServiceHandoff(
  rule: ServiceHandoffRule,
  requester: RequesterContext,
  hasLinkedResident: boolean,
): ServiceHandoffDecision {
  const accountStatus = hasLinkedResident ? "verified resident" : "phone-verified visitor";
  if (!rule.allowedKinds.includes(requester.kind)) {
    return {
      eligible: false,
      accountStatus,
      requester,
      reason: `${requester.subjectLabel} is a ${requester.kind} context, which this service draft does not accept. Choose an eligible requester before continuing.`,
    };
  }
  if (requester.kind === "self" && rule.selfRequiresResidentLink && !hasLinkedResident) {
    return {
      eligible: false,
      accountStatus,
      requester,
      reason:
        "This account has a verified phone contact but no approved resident association. Barangay service eligibility remains unavailable until the separate resident-link review is approved.",
    };
  }
  return {
    eligible: true,
    accountStatus,
    requester,
    reason:
      requester.kind === "self"
        ? "The account owner may prepare this draft under the current account status."
        : `The active ${requester.authorityLabel.toLowerCase()} is valid for this draft preview.`,
  };
}

export function createServiceDraftIntent(
  rule: ServiceHandoffRule,
  decision: ServiceHandoffDecision,
): ServiceDraftIntent | undefined {
  if (!decision.eligible) return undefined;
  return {
    reference: `DEMO-DRAFT-${rule.module}-001`,
    serviceSlug: rule.serviceSlug,
    module: rule.module,
    requesterId: decision.requester.subjectId,
    requesterLabel: decision.requester.subjectLabel,
    accountStatus: decision.accountStatus,
  };
}

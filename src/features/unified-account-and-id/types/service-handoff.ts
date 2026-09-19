import type { RepresentationSubjectKind, RequesterContext } from "./representation";

export type ServiceHandoffKind = "self" | RepresentationSubjectKind;

export type ServiceHandoffRule = {
  serviceSlug: string;
  module: "M03" | "M04" | "M07" | "M11";
  draftLabel: string;
  purpose: string;
  allowedKinds: readonly ServiceHandoffKind[];
  selfRequiresResidentLink: boolean;
  nextStep: string;
};

export type ServiceHandoffDecision = {
  eligible: boolean;
  accountStatus: "phone-verified visitor" | "verified resident";
  requester: RequesterContext;
  reason: string;
};

export type ServiceDraftIntent = {
  reference: string;
  serviceSlug: string;
  module: ServiceHandoffRule["module"];
  requesterId: string;
  requesterLabel: string;
  accountStatus: ServiceHandoffDecision["accountStatus"];
};

export const SECTOR_CATEGORIES = ["Senior", "PWD", "Solo parent", "Youth", "4Ps", "IP", "OSY"] as const;
export type SectorCategory = (typeof SECTOR_CATEGORIES)[number];
export type AssistanceStatus = "Under assessment" | "Duplicate review" | "Ready for release" | "Released" | "Denied";
export type BenefitLedgerStatus = "Released" | "Pending confirmation" | "Cancelled";

export type AssistanceProgram = {
  id: string;
  name: string;
  benefit: string;
  recipientUnit: "person" | "household";
  period: string;
  requirements: readonly string[];
};

export type SectorStatus = "Active" | "Expired" | "Evidence review" | "Deactivated";

/**
 * Why a status stopped applying before its validity ran out. A registry ends a
 * status; it does not erase one, because a released benefit may have rested on
 * it. Expiry is the ordinary end, so it carries no deactivation record.
 */
export type SectorDeactivation = {
  reason: "no-longer-qualified" | "moved-out" | "deceased" | "recorded-in-error";
  note: string;
  actor: string;
  /** Date-only. */
  on: string;
};

export type SectorRecord = {
  id: string;
  personId: string;
  personLabel: string;
  category: SectorCategory;
  authority: string;
  validFrom: string;
  validTo: string;
  status: SectorStatus;
  source: string;
  evidence: readonly string[];
  credential: string;
  /** Present once ended early. */
  deactivation?: SectorDeactivation;
};

export type AssistanceRequest = {
  id: string;
  personId: string;
  householdId: string;
  programId: string;
  programName: string;
  period: string;
  requestedValue: string;
  approvedValue?: string;
  status: AssistanceStatus;
  evidence: readonly string[];
  overlap: { kind: "same-program" | "different-program" | "none"; explanation: string };
  fundingReference?: string;
  documentReference: string;
  decisionReason?: string;
  releaseAcknowledgment?: string;
};

export type BenefitLedgerEntry = {
  id: string;
  requestId: string;
  recipient: string;
  recipientName: string;
  program: string;
  period: string;
  value: string;
  fundSource: string;
  releasedAt: string;
  acknowledgment: string;
  status: BenefitLedgerStatus;
};

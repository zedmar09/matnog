import type { MunicipalRecord, SampleAttachment } from "@/shared/data/record-envelope";

/**
 * M01 owns people, households, residency and structures. Sector status, cases
 * and documents stay with their owning modules; this module only links to them.
 */

export type LifeStatus = "living" | "deceased" | "moved-out";

export type VerificationState = "verified" | "unverified" | "stale";

/** Sample barangay scopes. These are demo scopes, not real Matnog geography. */
export type BarangayRef = { id: string; label: string };

/**
 * A residency period. Barangay is an attribute of a period, never of the
 * person, so a transfer appends a period and never rewrites history.
 */
export type ResidencyPeriod = {
  id: string;
  barangay: BarangayRef;
  structureId: string;
  /** Date-only, inclusive. */
  from: string;
  /**
   * Date-only. Absent means this is the current period. Periods are half-open:
   * a new period may begin on the day an earlier one ended, which is how a
   * same-day transfer is recorded.
   */
  to?: string;
  /** Set when the period was opened or closed by a transfer. */
  transferId?: string;
};

export type HouseholdMembership = {
  id: string;
  householdId: string;
  relationshipToHead: string;
  from: string;
  to?: string;
  /** Present while the member is away but still counted, e.g. OFW or student. */
  temporaryAbsence?: string;
};

export type Person = MunicipalRecord & {
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  aliases: string[];
  /** Date-only. Cannot be in the future on the demo clock. */
  birthDate: string;
  sex: "female" | "male";
  civilStatus: string;
  citizenship: string;
  occupation?: string;
  /** Sample contact only. A phone number is not proof of identity. */
  contactNumber?: string;
  lifeStatus: LifeStatus;
  verification: {
    state: VerificationState;
    source: string;
    /** Date-only. Absent when the record has never been verified. */
    verifiedAt?: string;
  };
  residency: ResidencyPeriod[];
  memberships: HouseholdMembership[];
  evidence: SampleAttachment[];
};

/**
 * Three-valued answer. "Unknown" is not "no": an unasked question must never
 * be recorded as a negative finding.
 */
export type TriState = "yes" | "no" | "unknown";

export type VulnerabilityFlag = {
  id: string;
  label: string;
  value: TriState;
  /** Restricted flags are withheld from household-member projections. */
  restricted: boolean;
};

/**
 * Why a household stopped being a live record. A registry closes a household;
 * it does not erase one, so the record and its membership history survive.
 */
export type HouseholdClosureReason = "dissolved" | "merged" | "moved-away" | "created-in-error";

export type HouseholdClosure = {
  reason: HouseholdClosureReason;
  /** Free text the clerk must supply; a closure without a reason is not a decision. */
  note: string;
  actor: string;
  /** Date-only. */
  on: string;
  /** Required when the reason is "merged": where the members went. */
  mergedIntoId?: string;
};

export type Household = MunicipalRecord & {
  headPersonId: string;
  structureId: string;
  dwelling: {
    constructionMaterial: string;
    tenure: string;
    waterSource: string;
    toiletFacility: string;
    powerSource: string;
    wasteDisposal: string;
    internet: TriState;
  };
  socioeconomic: {
    incomeBracket: string;
    livelihood: string;
    foodSecurity: TriState;
  };
  vulnerabilityFlags: VulnerabilityFlag[];
  /** Date-only. Drives the staleness badge against the demo clock. */
  lastVerifiedAt?: string;
  /** Present once closed. A closed household leaves the active directory. */
  closure?: HouseholdClosure;
};

export type Structure = MunicipalRecord & {
  barangay: BarangayRef;
  sitio: string;
  purok: string;
  street: string;
  houseNumber: string;
  /** Absent when the surveyor could not capture a location. */
  coordinates?: { latitude: number; longitude: number };
  /** A structure can hold more than one household. */
  householdIds: string[];
};

export type DuplicateDecision = {
  outcome: "distinct" | "merged";
  actor: string;
  reason: string;
  at: string;
};

/**
 * A suggestion for human review, never an identity decision. Nothing is merged
 * without a recorded reason, and every merge can be reversed.
 */
export type DuplicateCandidate = MunicipalRecord & {
  personIds: [string, string];
  /** Similarity score for ranking only. It never decides anything. */
  score: number;
  signals: string[];
  decision?: DuplicateDecision;
  /** Set when a merge was reversed, so the history stays inspectable. */
  reversedFrom?: DuplicateDecision;
};

export type TransferState = "requested" | "released" | "accepted" | "rejected" | "disputed" | "completed";

export type TransferRequest = MunicipalRecord & {
  personId: string;
  from: BarangayRef;
  to: BarangayRef;
  destinationHouseholdId: string;
  state: TransferState;
  requestedAt: string;
  reason?: string;
};

export type RegistryPersona = "barangay-staff" | "data-steward" | "enumerator" | "resident";

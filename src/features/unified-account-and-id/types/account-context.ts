export type ResidentAssociation = {
  personId: "DEMO-PER-001";
  status: "pending" | "linked";
  requestId: "DEMO-LINK-001";
  relationship: "self";
  submittedAt: "2026-09-15T10:30:00+08:00";
  reviewStage: "municipal-registry-review";
};

export type DemoSession = {
  version: 2;
  accountId: "DEMO-VIS-001";
  name: "Mara Dela Cruz";
  phone: string;
  phoneVerification: "verified";
  residentAssociation?: ResidentAssociation;
};

export type AccountState = "visitor" | "resident-link-pending" | "verified-resident";
export type AccountSurface = "public" | "account" | "resident" | "staff";

const DEMO_ACCOUNT = {
  version: 2,
  accountId: "DEMO-VIS-001",
  name: "Mara Dela Cruz",
  phone: "0917 000 0000",
  phoneVerification: "verified",
} as const;

/**
 * A phone-verified visitor. Verifying a number proves control of that number
 * and nothing else: the resident link is a separate, reviewed relationship, so
 * a new session must never start out claiming one.
 */
export function createDemoVisitorSession(phone: string = DEMO_ACCOUNT.phone): DemoSession {
  return { ...DEMO_ACCOUNT, phone };
}

export function resolveAccountState(session: DemoSession): AccountState {
  if (session.residentAssociation?.status === "linked") return "verified-resident";
  if (session.residentAssociation?.status === "pending") return "resident-link-pending";
  return "visitor";
}

export function createResidentAssociation(status: ResidentAssociation["status"]): ResidentAssociation {
  return {
    personId: "DEMO-PER-001",
    status,
    requestId: "DEMO-LINK-001",
    relationship: "self",
    submittedAt: "2026-09-15T10:30:00+08:00",
    reviewStage: "municipal-registry-review",
  };
}

export function canAccessAccountSurface(session: DemoSession | null, surface: AccountSurface): boolean {
  if (surface === "public") return true;
  // Staff uses the separately scoped operations session and never inherits
  // access from a citizen phone session.
  if (surface === "staff") return false;
  if (surface === "account") return session !== null;
  return session?.residentAssociation?.status === "linked";
}

/**
 * Reads a persisted resident association.
 *
 * Returns the association when it is one this prototype recognises, `null`
 * when none was stored, and "invalid" when something else was: restoring a
 * session must never invent a link, and must never accept one naming a person
 * this fixture set does not own.
 */
function restoreAssociation(value: unknown): ResidentAssociation | null | "invalid" {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return "invalid";
  const personId = "personId" in value ? value.personId : undefined;
  const status = "status" in value ? value.status : undefined;
  if (personId !== "DEMO-PER-001") return "invalid";
  if (status !== "pending" && status !== "linked") return "invalid";
  return createResidentAssociation(status);
}

/**
 * Restores only the fixed account and migrates the earlier F0 marker.
 *
 * Migration carries the stored link state across unchanged. Restoring a session
 * must not grant more access than the one that was saved, so a pending link
 * stays pending and an absent one stays absent.
 */
export function restoreDemoSession(value: unknown): DemoSession | null {
  if (!value || typeof value !== "object" || !("version" in value) || !("name" in value)) return null;
  if (value.name !== DEMO_ACCOUNT.name) return null;

  const stored = "residentAssociation" in value ? value.residentAssociation : undefined;
  const association = restoreAssociation(stored);
  if (association === "invalid") return null;
  const link = association ? { residentAssociation: association } : {};

  if (value.version === 1) {
    return { ...DEMO_ACCOUNT, ...link };
  }
  if (
    value.version !== 2 ||
    !("accountId" in value) ||
    value.accountId !== DEMO_ACCOUNT.accountId ||
    !("phoneVerification" in value) ||
    value.phoneVerification !== "verified"
  ) {
    return null;
  }
  const phone = "phone" in value && typeof value.phone === "string" ? value.phone : DEMO_ACCOUNT.phone;
  return { ...DEMO_ACCOUNT, phone, ...link };
}

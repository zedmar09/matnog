import type {
  IdentityApplication,
  IdentityDemoState,
  IdentityHistoryEntry,
  MunicipalCredential,
  PublicCredentialResult,
} from "../types/municipal-id";

export type IdentityOperationResult =
  | { ok: true; state: IdentityDemoState; message: string }
  | { ok: false; state: IdentityDemoState; message: string };

function history(id: string, title: string, detail: string, at: string): IdentityHistoryEntry {
  return { id, title, detail, at };
}

function applicationWith(
  application: IdentityApplication,
  next: Partial<IdentityApplication>,
  entry: IdentityHistoryEntry,
): IdentityApplication {
  return { ...application, ...next, history: [...application.history, entry] };
}

function reasonRequired(reason: string): boolean {
  return reason.trim().length < 8;
}

export function reviewResidentLink(
  state: IdentityDemoState,
  decision: "approve" | "reject",
  reason = "",
): IdentityOperationResult {
  if (state.residentLink.status !== "pending") {
    return { ok: false, state, message: "The resident-link review already has a decision." };
  }
  if (decision === "reject" && reasonRequired(reason)) {
    return { ok: false, state, message: "Enter at least eight characters for a rejection reason." };
  }
  return {
    ok: true,
    state: {
      ...state,
      residentLink: {
        ...state.residentLink,
        status: decision === "approve" ? "approved" : "rejected",
        decisionReason: decision === "approve" ? "Minimal registry projection matched." : reason.trim(),
      },
    },
    message:
      decision === "approve"
        ? "Resident association approved in the UI demo."
        : "Resident association rejected in the UI demo.",
  };
}

export function reviewIdentityApplication(
  state: IdentityDemoState,
  decision: "approve" | "correction" | "reject",
  reason = "",
): IdentityOperationResult {
  const application = state.application;
  if (application.status !== "submitted") {
    return { ok: false, state, message: "Only a submitted enrollment can receive a review decision." };
  }
  if (state.residentLink.status !== "approved") {
    return { ok: false, state, message: "Approve the resident association before deciding the enrollment." };
  }
  if (decision !== "approve" && reasonRequired(reason)) {
    return { ok: false, state, message: "Enter at least eight characters for this decision." };
  }

  if (decision === "correction") {
    return {
      ok: true,
      state: {
        ...state,
        application: applicationWith(
          application,
          { status: "correction", correctionReason: reason.trim() },
          history("DEMO-ID-HIS-CORRECTION", "Returned for correction", reason.trim(), "2026-09-15T13:00:00+08:00"),
        ),
      },
      message: "Enrollment returned for correction.",
    };
  }
  if (decision === "reject") {
    return {
      ok: true,
      state: {
        ...state,
        application: applicationWith(
          application,
          { status: "rejected", decisionReason: reason.trim() },
          history("DEMO-ID-HIS-REJECTED", "Enrollment rejected", reason.trim(), "2026-09-15T13:00:00+08:00"),
        ),
      },
      message: "Enrollment rejected in the UI demo.",
    };
  }

  const sequence = state.credentials.length + 1;
  const credentialId = `DEMO-MID-${String(sequence).padStart(3, "0")}`;
  const predecessor = application.predecessorCredentialId;
  const credentials = state.credentials.map((credential) =>
    predecessor && credential.id === predecessor
      ? { ...credential, status: "superseded" as const, invalidReason: `Replaced by ${credentialId}` }
      : credential,
  );
  const credential: MunicipalCredential = {
    id: credentialId,
    token: `DEMO-ID-TOKEN-${String(sequence).padStart(3, "0")}`,
    personId: application.personId,
    holderName: application.displayName,
    type: "Municipal Resident ID",
    status: "active",
    issuedAt: "2026-09-15",
    validUntil: "2029-09-15",
    predecessorId: predecessor,
  };
  return {
    ok: true,
    state: {
      ...state,
      application: applicationWith(
        application,
        { status: "approved", decisionReason: "Sample evidence and resident projection matched." },
        history(
          `DEMO-ID-HIS-APPROVED-${sequence}`,
          application.kind === "replacement" ? "Replacement approved" : "Enrollment approved",
          `${credentialId} issued as a sample credential.`,
          "2026-09-15T13:30:00+08:00",
        ),
      ),
      credentials: [...credentials, credential],
    },
    message:
      application.kind === "replacement"
        ? `Replacement approved. ${predecessor} is now invalid.`
        : "Enrollment approved and sample credential issued.",
  };
}

export function resubmitIdentityApplication(state: IdentityDemoState): IdentityOperationResult {
  if (state.application.status !== "correction") {
    return { ok: false, state, message: "This enrollment is not waiting for a correction." };
  }
  return {
    ok: true,
    state: {
      ...state,
      application: applicationWith(
        state.application,
        { status: "submitted", correctionReason: undefined },
        history(
          "DEMO-ID-HIS-RESUBMITTED",
          "Corrected enrollment resubmitted",
          "The sample photo and evidence were confirmed again.",
          "2026-09-15T13:15:00+08:00",
        ),
      ),
    },
    message: "Corrected sample enrollment resubmitted.",
  };
}

export function requestCredentialReplacement(state: IdentityDemoState, reason: string): IdentityOperationResult {
  const active = state.credentials.find((credential) => credential.status === "active");
  if (!active) return { ok: false, state, message: "There is no active credential to replace." };
  if (reasonRequired(reason)) {
    return { ok: false, state, message: "Enter at least eight characters for the replacement reason." };
  }
  const applicationNumber = state.application.id === "DEMO-IDAPP-001" ? "002" : "003";
  return {
    ok: true,
    state: {
      ...state,
      application: {
        id: `DEMO-IDAPP-${applicationNumber}`,
        personId: active.personId,
        accountId: "DEMO-VIS-001",
        kind: "replacement",
        status: "submitted",
        submittedAt: "2026-09-15T14:00:00+08:00",
        displayName: active.holderName,
        photoRef: "sample://mara-id-photo",
        evidence: state.application.evidence,
        predecessorCredentialId: active.id,
        history: [
          history(
            `DEMO-ID-HIS-REPLACEMENT-${applicationNumber}`,
            "Replacement requested",
            reason.trim(),
            "2026-09-15T14:00:00+08:00",
          ),
        ],
      },
    },
    message: `Replacement review recorded. ${active.id} stays valid until approval.`,
  };
}

export function revokeActiveCredential(state: IdentityDemoState, reason: string): IdentityOperationResult {
  if (reasonRequired(reason)) {
    return { ok: false, state, message: "Enter at least eight characters for the revocation reason." };
  }
  const active = state.credentials.find((credential) => credential.status === "active");
  if (!active) return { ok: false, state, message: "There is no active credential to revoke." };
  return {
    ok: true,
    state: {
      ...state,
      credentials: state.credentials.map((credential) =>
        credential.id === active.id ? { ...credential, status: "revoked", invalidReason: reason.trim() } : credential,
      ),
    },
    message: `${active.id} revoked in the UI demo. Its public token is now invalid.`,
  };
}

export function readPublicCredential(state: IdentityDemoState, token: string): PublicCredentialResult | undefined {
  const credential = state.credentials.find((candidate) => candidate.token === token);
  if (!credential) return undefined;
  const valid = credential.status === "active";
  return {
    credentialReference: credential.id,
    credentialType: credential.type,
    validity: valid ? "valid" : "invalid",
    statusLabel: valid ? "Valid sample credential" : "Invalid sample credential",
    issuedAt: credential.issuedAt,
    validUntil: credential.validUntil,
    message: valid
      ? "This municipal credential is active in the current demo state."
      : `This municipal credential is ${credential.status}.`,
  };
}

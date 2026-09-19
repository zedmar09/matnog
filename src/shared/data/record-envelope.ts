/**
 * The common envelope every mock record carries. Modules add their own fields
 * beside it; generic repository code only ever touches the envelope.
 *
 * Applicable scope is a kind plus a value. A barangay name on its own is not a
 * scope, because the same barangay label can apply to a person, a household and
 * an office record that must not be treated alike.
 */
export type RecordScopeKind = "person" | "household" | "business" | "office" | "barangay" | "partner" | "case";

export type RecordScope = {
  kind: RecordScopeKind;
  /** Stable ID of the scoping entity, for example DEMO-HH-001. */
  id: string;
  label: string;
};

export type RecordEnvelope = {
  /** Stable identity. Never reissued, unchanged by updates. */
  id: string;
  /** Reference shown to people. Usually equal to the ID in this prototype. */
  reference: string;
  status: string;
  /** Incremented by every committed transition. Drives conflict detection. */
  version: number;
  scope: RecordScope;
  /** ISO 8601 with an Asia/Manila offset. */
  createdAt: string;
  updatedAt: string;
  source: "Sample data";
  /** Set when this record replaces an earlier one, for example a reissued credential. */
  supersedes?: string;
};

/** Every record handled by a local repository. */
export type MunicipalRecord = {
  envelope: RecordEnvelope;
};

/** One entry in a record's history. */
export type HistoryEntry = {
  id: string;
  /** Persona that performed the action, not a real account. */
  actor: string;
  action: string;
  at: string;
  /** Version the record reached after this action. */
  version: number;
  reason?: string;
};

export type AttachmentClassification = "public" | "internal" | "restricted";
export type AttachmentState = "draft" | "submitted" | "accepted" | "rejected";

/** Bundled sample attachment metadata. Nothing is ever uploaded. */
export type SampleAttachment = {
  id: string;
  filename: string;
  mediaType: string;
  /** Path to a bundled preview asset, or a local object URL. */
  previewRef: string;
  classification: AttachmentClassification;
  revision: number;
  state: AttachmentState;
  sizeBytes: number;
};

/** Builds an envelope with the fields a fixture should not have to repeat. */
export function createEnvelope(input: {
  id: string;
  status: string;
  scope: RecordScope;
  createdAt: string;
  updatedAt?: string;
  reference?: string;
  version?: number;
  supersedes?: string;
}): RecordEnvelope {
  return {
    id: input.id,
    reference: input.reference ?? input.id,
    status: input.status,
    version: input.version ?? 1,
    scope: input.scope,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
    source: "Sample data",
    ...(input.supersedes ? { supersedes: input.supersedes } : {}),
  };
}

/** Normalises a typed reference for lookup: trimmed, upper case, single spaces. */
export function normalizeReference(reference: string): string {
  return reference.trim().replace(/\s+/g, " ").toUpperCase();
}

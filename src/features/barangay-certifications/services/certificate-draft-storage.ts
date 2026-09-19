import { type CertificateRequestValues, certificateDraftSchema } from "../schemas/certificate-request-schema";
import type { CertificateDraftSnapshot } from "../types/certificate-request";

const KEY = "digital-matnog-m07-certificate-draft-v1";

export function saveCertificateDraft(input: {
  requesterContextId: string;
  requesterLabel: string;
  values: CertificateRequestValues;
}): CertificateDraftSnapshot | undefined {
  const parsed = certificateDraftSchema.safeParse(input.values);
  if (!parsed.success) return undefined;
  const snapshot: CertificateDraftSnapshot = {
    version: 1,
    requesterContextId: input.requesterContextId,
    requesterLabel: input.requesterLabel,
    values: parsed.data,
    savedAt: "2026-09-16T16:30:00+08:00",
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
    return snapshot;
  } catch {
    return undefined;
  }
}

export function restoreCertificateDraft(requesterContextId: string): CertificateDraftSnapshot | undefined {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1) return undefined;
    if (!("requesterContextId" in value) || value.requesterContextId !== requesterContextId) return undefined;
    if (!("requesterLabel" in value) || typeof value.requesterLabel !== "string") return undefined;
    if (!("savedAt" in value) || typeof value.savedAt !== "string") return undefined;
    if (!("values" in value)) return undefined;
    const parsed = certificateDraftSchema.safeParse(value.values);
    if (!parsed.success) return undefined;
    return {
      version: 1,
      requesterContextId,
      requesterLabel: value.requesterLabel,
      values: parsed.data,
      savedAt: value.savedAt,
    };
  } catch {
    return undefined;
  }
}

export function clearCertificateDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* Draft recovery is optional; the in-memory form remains usable. */
  }
}

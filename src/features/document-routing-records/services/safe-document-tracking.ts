import { empty, ok, type RepositoryResult } from "@/shared/data/repository-result";

import { DOCUMENT_ROUTING_FIXTURES } from "../data/document-foundation-fixtures";
import type { SafeDocumentTrackingRecord } from "../types/document-routing";

/**
 * Returns a purpose-built public projection. It never serializes an internal
 * document record, so restricted metadata cannot accidentally cross the view.
 */
export function trackSafeDocument(reference: string): RepositoryResult<SafeDocumentTrackingRecord> {
  const normalized = reference.trim().toUpperCase();
  const record = DOCUMENT_ROUTING_FIXTURES.find((item) => item.document.envelope.reference === normalized);
  if (!record || normalized !== "DOC-2026-0048" || !record.release) {
    return empty("The document reference was not found or is not available in this sample tracker.");
  }
  return ok({
    reference: normalized,
    title: "Released municipal document",
    status: "released",
    releasedAt: record.release.releasedAt,
    sampleOutputReference: record.release.sampleOutputReference,
    steps: [
      {
        title: "Registered",
        detail: "The sample document entered the municipal records workflow.",
        complete: true,
      },
      {
        title: "Office review complete",
        detail: "Required sample routing stages were completed.",
        complete: true,
      },
      {
        title: "Released",
        detail: "A release reference is available below.",
        complete: true,
      },
    ],
  });
}

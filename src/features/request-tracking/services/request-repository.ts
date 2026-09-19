import { InMemoryRepository } from "@/shared/data/in-memory-repository";
import type { OperationContext } from "@/shared/data/local-repository";
import { dataOf } from "@/shared/data/repository-result";

import { PUBLIC_REQUESTS } from "../data/requests";
import type { PublicRequest } from "../types/request";

/**
 * Public request lookup. Every operation goes through the shared local
 * repository, so tracking gains the same envelope, versioning, history and
 * selectable states as the operational modules that follow.
 */
export const publicRequestRepository = new InMemoryRepository<PublicRequest>({
  fixtures: PUBLIC_REQUESTS,
  searchableText: (request) => `${request.title} ${request.office}`,
  latencyMs: 450,
  exportTitle: (request) => request.title,
  exportLines: (request) => [
    `Reference: ${request.envelope.reference}`,
    `Status: ${request.envelope.status}`,
    `Handling office: ${request.office}`,
    `Updated: ${request.envelope.updatedAt}`,
  ],
});

/**
 * Convenience wrapper for the public tracking screen, which only needs "found"
 * or "not found" and must never surface an internal failure shape to a visitor.
 */
export async function findPublicRequest(
  reference: string,
  context: OperationContext = { actor: "Public visitor" },
): Promise<PublicRequest | null> {
  return dataOf(await publicRequestRepository.read(reference, context)) ?? null;
}

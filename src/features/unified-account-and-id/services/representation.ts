import { DEMO_EPOCH_ISO } from "@/shared/data/demo-clock";

import { SELF_REQUESTER_CONTEXT } from "../data/representations";
import type { DemoRepresentation, RepresentationAvailability, RequesterContext } from "../types/representation";

function startOfDay(value: string): number {
  return Date.parse(`${value}T00:00:00+08:00`);
}

function endOfDay(value: string): number {
  return Date.parse(`${value}T23:59:59.999+08:00`);
}

export function getRepresentationAvailability(
  representation: DemoRepresentation,
  nowIso = DEMO_EPOCH_ISO,
): RepresentationAvailability {
  const now = Date.parse(nowIso);
  if (now < startOfDay(representation.validFrom)) return "not-yet-active";
  if (now > endOfDay(representation.validUntil)) return "expired";
  return "active";
}

export function toRequesterContext(representation: DemoRepresentation): RequesterContext {
  return {
    id: representation.id,
    kind: representation.subjectKind,
    subjectId: representation.subjectId,
    subjectLabel: representation.subjectLabel,
    authorityLabel: representation.authorityLabel,
    scopes: representation.scopes,
    validUntil: representation.validUntil,
  };
}

export function listAvailableRequesterContexts(
  representations: readonly DemoRepresentation[],
  locallyExpiredIds: ReadonlySet<string> = new Set(),
  nowIso = DEMO_EPOCH_ISO,
): RequesterContext[] {
  return [
    SELF_REQUESTER_CONTEXT,
    ...representations
      .filter(
        (representation) =>
          !locallyExpiredIds.has(representation.id) &&
          getRepresentationAvailability(representation, nowIso) === "active",
      )
      .map(toRequesterContext),
  ];
}

/** An unavailable or unknown delegated context always falls back to the account owner. */
export function resolveRequesterContext(requestedId: string, available: readonly RequesterContext[]): RequesterContext {
  return available.find((context) => context.id === requestedId) ?? SELF_REQUESTER_CONTEXT;
}

export function canUseRequesterContext(context: RequesterContext, available: readonly RequesterContext[]): boolean {
  return available.some((candidate) => candidate.id === context.id);
}

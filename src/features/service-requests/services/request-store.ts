import { demoClock } from "@/shared/data/demo-clock";

export type SubmittedRequest = {
  controlNumber: string;
  serviceSlug: string;
  serviceTitle: string;
  phone: string;
  submittedAt: string;
  answers: { label: string; value: string }[];
};

/**
 * Submitted requests for this session.
 *
 * One application instance holds these in memory, so a reload starts from an
 * empty list. Nothing here is transmitted anywhere.
 */
const submissions = new Map<string, SubmittedRequest>();
const counters = new Map<string, number>();

/** Control number: prefix, year from the demo clock, then a running sequence. */
export function nextControlNumber(prefix: string): string {
  const year = demoClock.now().getFullYear();
  const key = `${prefix}-${year}`;
  const next = (counters.get(key) ?? 0) + 1;
  counters.set(key, next);
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

export function recordRequest(input: Omit<SubmittedRequest, "submittedAt">): SubmittedRequest {
  const record: SubmittedRequest = { ...input, submittedAt: demoClock.nowIso() };
  submissions.set(record.controlNumber, record);
  return record;
}

export function findRequest(controlNumber: string): SubmittedRequest | undefined {
  return submissions.get(controlNumber.trim().toUpperCase());
}

export function resetRequests(): void {
  submissions.clear();
  counters.clear();
}

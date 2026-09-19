import type { HistoryEntry, MunicipalRecord, RecordScope } from "./record-envelope";
import type { RepositoryResult } from "./repository-result";

/**
 * The operation contract every module's local repository implements. These are
 * callable frontend operations over bundled fixtures. They are not HTTP
 * endpoints, and no implementation may contact a real service.
 */

export type ListQuery = {
  search?: string;
  /** Module-specific filters, for example `{ barangay: "DEMO-BRGY-A" }`. */
  filters?: Record<string, string | undefined>;
  page?: number;
  pageSize?: number;
};

export type ListPage<TRecord> = {
  items: TRecord[];
  total: number;
  page: number;
  pageSize: number;
};

/** Selectable outcome for the current operation. */
export type ScenarioState = "normal" | "empty" | "error" | "denied" | "conflict" | "slow";

/**
 * Who is acting, on what scope, and against which version.
 *
 * `eventId` makes a repeated simulated event idempotent: replaying the same
 * payment confirmation or scan must not produce a second outcome. This is a
 * single-instance guarantee only; no cross-device deduplication is claimed.
 */
export type OperationContext = {
  actor: string;
  scope?: RecordScope;
  expectedVersion?: number;
  reason?: string;
  eventId?: string;
  scenario?: ScenarioState;
};

export type DecisionOutcome = "approved" | "returned" | "rejected" | "cancelled";

export type RecordDecision = {
  outcome: DecisionOutcome;
  status: string;
  reason?: string;
};

export type TimelineInput = {
  action: string;
  reason?: string;
};

/** A generated preview of a record. Always marked as a sample. */
export type SampleExport = {
  recordId: string;
  title: string;
  generatedAt: string;
  /** Rendered as a visible watermark; never omit it. */
  watermark: "SAMPLE — NOT VALID FOR OFFICIAL USE";
  lines: string[];
};

export interface LocalRepository<TRecord extends MunicipalRecord> {
  /**
   * Adds a new record in draft. The caller supplies the whole record including
   * its envelope, because only the owning module knows how to build a stable
   * ID and scope for its own entity.
   */
  create(record: TRecord, context: OperationContext): Promise<RepositoryResult<TRecord>>;

  /** List, search, filter and page in one operation. */
  list(query?: ListQuery, context?: OperationContext): Promise<RepositoryResult<ListPage<TRecord>>>;

  /** Read one record by ID or display reference. */
  read(reference: string, context?: OperationContext): Promise<RepositoryResult<TRecord>>;

  /** Store an in-progress edit without advancing the workflow. */
  saveDraft(
    reference: string,
    changes: Partial<Omit<TRecord, "envelope">>,
    context: OperationContext,
  ): Promise<RepositoryResult<TRecord>>;

  /** Move a draft into review. */
  submit(reference: string, context: OperationContext): Promise<RepositoryResult<TRecord>>;

  /** Send a record back for correction with a reason. */
  requestCorrection(reference: string, context: OperationContext): Promise<RepositoryResult<TRecord>>;

  /** Record an approval, return, rejection or cancellation. */
  recordDecision(
    reference: string,
    decision: RecordDecision,
    context: OperationContext,
  ): Promise<RepositoryResult<TRecord>>;

  /** Append one history entry without otherwise changing the record. */
  appendTimeline(
    reference: string,
    entry: TimelineInput,
    context: OperationContext,
  ): Promise<RepositoryResult<TRecord>>;

  /** Generate a clearly-marked sample preview. */
  exportSampleView(reference: string, context?: OperationContext): Promise<RepositoryResult<SampleExport>>;

  /** Full history of one record, newest last. */
  history(reference: string, context?: OperationContext): Promise<RepositoryResult<HistoryEntry[]>>;

  /** Restore the deterministic fixture state for a scenario replay. */
  reset(): void;
}

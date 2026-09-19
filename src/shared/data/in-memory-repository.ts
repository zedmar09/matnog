import { type DemoClock, demoClock } from "./demo-clock";
import type {
  ListPage,
  ListQuery,
  LocalRepository,
  OperationContext,
  RecordDecision,
  SampleExport,
  ScenarioState,
  TimelineInput,
} from "./local-repository";
import type { HistoryEntry, MunicipalRecord } from "./record-envelope";
import { normalizeReference } from "./record-envelope";
import type { FieldError, RepositoryResult } from "./repository-result";
import { conflict, denied, empty, failure, invalid, ok } from "./repository-result";

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_LATENCY_MS = 350;
const SLOW_LATENCY_MS = 2500;

export type InMemoryRepositoryOptions<TRecord extends MunicipalRecord> = {
  /** Deterministic seed. Cloned on construction and on every reset. */
  fixtures: readonly TRecord[];
  /** Free-text fields searched by `list`. */
  searchableText: (record: TRecord) => string;
  /** Applies a module filter. Return true to keep the record. */
  matchesFilter?: (record: TRecord, filters: Record<string, string | undefined>) => boolean;
  /** Records this actor may not see at all. */
  isVisible?: (record: TRecord, context: OperationContext | undefined) => boolean;
  /** Validates a draft before it is stored. */
  validateDraft?: (changes: Partial<Omit<TRecord, "envelope">>, record: TRecord) => FieldError[];
  /** Lines for the sample export preview. */
  exportLines?: (record: TRecord) => string[];
  exportTitle?: (record: TRecord) => string;
  latencyMs?: number;
  clock?: DemoClock;
};

/** What a transition intends to do, or why it cannot. */
type TransitionPlan<TRecord extends MunicipalRecord> =
  | {
      ok: true;
      patch?: Partial<Omit<TRecord, "envelope">>;
      status?: string;
      action: string;
      reason?: string;
      /** Draft saves and plain timeline notes keep the current version. */
      advanceVersion?: boolean;
    }
  | { ok: false; errors: FieldError[] };

/**
 * Shared in-memory implementation of the local operation contract.
 *
 * A transition is committed atomically: the record, its envelope version and
 * its history entry are written together, or nothing is written. Fixtures are
 * deep-cloned so a mutation in one session cannot leak into the seed.
 */
export class InMemoryRepository<TRecord extends MunicipalRecord> implements LocalRepository<TRecord> {
  #records: TRecord[] = [];
  #history = new Map<string, HistoryEntry[]>();
  #handledEvents = new Set<string>();
  readonly #options: InMemoryRepositoryOptions<TRecord>;
  readonly #clock: DemoClock;

  constructor(options: InMemoryRepositoryOptions<TRecord>) {
    this.#options = options;
    this.#clock = options.clock ?? demoClock;
    this.reset();
  }

  reset(): void {
    this.#records = this.#options.fixtures.map((record) => structuredClone(record) as TRecord);
    this.#history = new Map();
    this.#handledEvents = new Set();
    for (const record of this.#records) {
      this.#history.set(record.envelope.id, [
        {
          id: `${record.envelope.id}-H1`,
          actor: "Sample data",
          action: "Record seeded",
          at: record.envelope.createdAt,
          version: 1,
        },
      ]);
    }
  }

  async create(record: TRecord, context: OperationContext): Promise<RepositoryResult<TRecord>> {
    const gate = await this.#gate<TRecord>(context);
    if (gate) return gate;

    if (this.#find(record.envelope.id)) {
      return invalid([{ id: "id", message: `${record.envelope.id} already exists in this registry.` }]);
    }
    const errors = this.#options.validateDraft?.(record as Partial<Omit<TRecord, "envelope">>, record) ?? [];
    if (errors.length > 0) return invalid(errors);

    const stored = structuredClone(record) as TRecord;
    this.#records.push(stored);
    this.#history.set(stored.envelope.id, [
      {
        id: `${stored.envelope.id}-H1`,
        actor: context.actor,
        action: "Record created",
        at: this.#clock.nowIso(),
        version: stored.envelope.version,
        ...(context.reason ? { reason: context.reason } : {}),
      },
    ]);
    if (context.eventId) this.#handledEvents.add(context.eventId);
    return ok(structuredClone(stored) as TRecord);
  }

  async list(query: ListQuery = {}, context?: OperationContext): Promise<RepositoryResult<ListPage<TRecord>>> {
    const gate = await this.#gate<ListPage<TRecord>>(context);
    if (gate) return gate;

    const search = normalizeReference(query.search ?? "");
    const filters = query.filters ?? {};
    const matched = this.#records
      .filter((record) => this.#visible(record, context))
      .filter((record) => this.#options.matchesFilter?.(record, filters) ?? true)
      .filter((record) => {
        if (!search) return true;
        const haystack = `${record.envelope.id} ${record.envelope.reference} ${this.#options.searchableText(record)}`;
        return normalizeReference(haystack).includes(search);
      });

    if (matched.length === 0) return empty("No records match this view.");

    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const page = query.page ?? 1;
    const start = (page - 1) * pageSize;
    return ok({ items: matched.slice(start, start + pageSize), total: matched.length, page, pageSize });
  }

  async read(reference: string, context?: OperationContext): Promise<RepositoryResult<TRecord>> {
    const gate = await this.#gate<TRecord>(context);
    if (gate) return gate;
    const record = this.#find(reference);
    if (!record) return empty("No sample record matches that reference.");
    if (!this.#visible(record, context)) return denied("This record is outside the selected demo role.");
    return ok(structuredClone(record) as TRecord);
  }

  async saveDraft(
    reference: string,
    changes: Partial<Omit<TRecord, "envelope">>,
    context: OperationContext,
  ): Promise<RepositoryResult<TRecord>> {
    return this.#transition(reference, context, (record) => {
      const errors = this.#options.validateDraft?.(changes, record) ?? [];
      if (errors.length > 0) return { ok: false, errors };
      return { ok: true, patch: changes, action: "Draft saved", advanceVersion: false };
    });
  }

  async submit(reference: string, context: OperationContext): Promise<RepositoryResult<TRecord>> {
    return this.#transition(reference, context, () => ({
      ok: true,
      status: "Submitted",
      action: "Submitted for review",
    }));
  }

  async requestCorrection(reference: string, context: OperationContext): Promise<RepositoryResult<TRecord>> {
    if (!context.reason) {
      return invalid([{ id: "reason", message: "Give a reason so the requester knows what to correct." }]);
    }
    return this.#transition(reference, context, () => ({
      ok: true,
      status: "For correction",
      action: "Returned for correction",
    }));
  }

  async recordDecision(
    reference: string,
    decision: RecordDecision,
    context: OperationContext,
  ): Promise<RepositoryResult<TRecord>> {
    if (decision.outcome !== "approved" && !decision.reason && !context.reason) {
      return invalid([{ id: "reason", message: "Record a reason for this decision." }]);
    }
    return this.#transition(reference, context, () => ({
      ok: true,
      status: decision.status,
      action: `Decision recorded: ${decision.outcome}`,
      reason: decision.reason,
    }));
  }

  async appendTimeline(
    reference: string,
    entry: TimelineInput,
    context: OperationContext,
  ): Promise<RepositoryResult<TRecord>> {
    return this.#transition(reference, context, () => ({
      ok: true,
      action: entry.action,
      reason: entry.reason,
      advanceVersion: false,
    }));
  }

  async exportSampleView(reference: string, context?: OperationContext): Promise<RepositoryResult<SampleExport>> {
    const gate = await this.#gate<SampleExport>(context);
    if (gate) return gate;
    const record = this.#find(reference);
    if (!record) return empty("No sample record matches that reference.");
    if (!this.#visible(record, context)) return denied("This record is outside the selected demo role.");
    return ok({
      recordId: record.envelope.id,
      title: this.#options.exportTitle?.(record) ?? record.envelope.reference,
      generatedAt: this.#clock.nowIso(),
      watermark: "SAMPLE — NOT VALID FOR OFFICIAL USE",
      lines: this.#options.exportLines?.(record) ?? [
        `Reference: ${record.envelope.reference}`,
        `Status: ${record.envelope.status}`,
        `Version: ${record.envelope.version}`,
      ],
    });
  }

  async history(reference: string, context?: OperationContext): Promise<RepositoryResult<HistoryEntry[]>> {
    const gate = await this.#gate<HistoryEntry[]>(context);
    if (gate) return gate;
    const record = this.#find(reference);
    if (!record) return empty("No sample record matches that reference.");
    if (!this.#visible(record, context)) return denied("This record is outside the selected demo role.");
    return ok([...(this.#history.get(record.envelope.id) ?? [])]);
  }

  /** Commits a record change, its version and its history entry together. */
  async #transition(
    reference: string,
    context: OperationContext,
    plan: (record: TRecord) => TransitionPlan<TRecord>,
  ): Promise<RepositoryResult<TRecord>> {
    const gate = await this.#gate<TRecord>(context);
    if (gate) return gate;

    const record = this.#find(reference);
    if (!record) return empty("No sample record matches that reference.");
    if (!this.#visible(record, context)) return denied("This record is outside the selected demo role.");

    // A replayed simulated event must not produce a second outcome.
    if (context.eventId && this.#handledEvents.has(context.eventId)) {
      return ok(structuredClone(record) as TRecord);
    }

    if (context.expectedVersion !== undefined && context.expectedVersion !== record.envelope.version) {
      return conflict(
        "This record changed since you opened it. Reload to see the current version.",
        record.envelope.version,
      );
    }

    const outcome = plan(record);
    if (!outcome.ok) return invalid(outcome.errors);

    const at = this.#clock.nowIso();
    const advance = outcome.advanceVersion ?? true;
    const nextVersion = advance ? record.envelope.version + 1 : record.envelope.version;

    Object.assign(record, outcome.patch ?? {});
    record.envelope = {
      ...record.envelope,
      status: outcome.status ?? record.envelope.status,
      version: nextVersion,
      updatedAt: at,
    };

    const entries = this.#history.get(record.envelope.id) ?? [];
    entries.push({
      id: `${record.envelope.id}-H${entries.length + 1}`,
      actor: context.actor,
      action: outcome.action,
      at,
      version: nextVersion,
      ...((outcome.reason ?? context.reason) ? { reason: outcome.reason ?? context.reason } : {}),
    });
    this.#history.set(record.envelope.id, entries);
    if (context.eventId) this.#handledEvents.add(context.eventId);

    return ok(structuredClone(record) as TRecord);
  }

  /** Applies latency and any selected non-success scenario. */
  async #gate<T>(context?: OperationContext): Promise<RepositoryResult<T> | undefined> {
    const scenario: ScenarioState = context?.scenario ?? "normal";
    const latency = scenario === "slow" ? SLOW_LATENCY_MS : (this.#options.latencyMs ?? DEFAULT_LATENCY_MS);
    if (latency > 0) await new Promise((resolve) => setTimeout(resolve, latency));

    if (scenario === "empty") return empty("This demo scenario has no assigned records.");
    if (scenario === "error") {
      return failure("Simulated connection issue. Retry to return to the normal sample data.");
    }
    if (scenario === "denied") return denied("The selected demo role cannot open this record.");
    if (scenario === "conflict") {
      return conflict("A simulated concurrent change is in effect. Reload to continue.", 0);
    }
    return undefined;
  }

  #find(reference: string): TRecord | undefined {
    const wanted = normalizeReference(reference);
    return this.#records.find(
      (record) =>
        normalizeReference(record.envelope.id) === wanted || normalizeReference(record.envelope.reference) === wanted,
    );
  }

  #visible(record: TRecord, context: OperationContext | undefined): boolean {
    return this.#options.isVisible?.(record, context) ?? true;
  }
}

import type { MunicipalRecord } from "@/shared/data/record-envelope";

export type SurveyState = "assigned" | "in-progress" | "queued" | "conflict" | "accepted";

/** One field whose local value disagrees with the current stored value. */
export type FieldConflict = {
  field: string;
  label: string;
  /** Value the enumerator started from. */
  base: string;
  /** Value captured in the field, offline. */
  local: string;
  /** Value the record holds now, changed by someone else meanwhile. */
  current: string;
};

/** One step of the household survey. Mirrors the Flutter capture screens. */
export type SurveySection = {
  id: string;
  title: string;
  description: string;
  complete: boolean;
};

/** Answers captured so far, keyed by the household field path they update. */
export type SurveyDraft = Record<string, string>;

export type SurveyAssignment = MunicipalRecord & {
  householdId: string;
  enumerator: string;
  /** Date-only. Overdue is judged against the demo clock. */
  dueOn: string;
  state: SurveyState;
  /** The capture steps, in order. Progress is derived from them. */
  sections: SurveySection[];
  /** What the enumerator has answered so far. */
  draft: SurveyDraft;
  /** Version of the household the offline draft was based on. */
  baseVersion: number;
  conflicts: FieldConflict[];
};

export type ImportRowIssue = "invalid" | "possible-duplicate" | "ok";

/** One row of a sample bulk import, judged before anything is applied. */
export type ImportRow = {
  line: number;
  name: string;
  birthDate: string;
  householdId: string;
  issue: ImportRowIssue;
  note: string;
};

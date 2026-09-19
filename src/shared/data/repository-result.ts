/**
 * Every local operation returns one of these. The set matches the selectable
 * outcomes the mock-data plan requires, so a screen can demonstrate each one
 * without inventing its own error vocabulary.
 */
export type FieldError = {
  /** DOM id of the field, so an error summary can link to it. */
  id: string;
  message: string;
};

export type RepositoryResult<T> =
  | { kind: "success"; data: T }
  | { kind: "empty"; reason?: string }
  | { kind: "invalid"; errors: FieldError[] }
  | { kind: "denied"; message: string }
  | { kind: "conflict"; message: string; currentVersion: number }
  | { kind: "failure"; message: string };

export const ok = <T>(data: T): RepositoryResult<T> => ({ kind: "success", data });
export const empty = <T>(reason?: string): RepositoryResult<T> => ({ kind: "empty", reason });
export const invalid = <T>(errors: FieldError[]): RepositoryResult<T> => ({ kind: "invalid", errors });
export const denied = <T>(message: string): RepositoryResult<T> => ({ kind: "denied", message });
export const conflict = <T>(message: string, currentVersion: number): RepositoryResult<T> => ({
  kind: "conflict",
  message,
  currentVersion,
});
export const failure = <T>(message: string): RepositoryResult<T> => ({ kind: "failure", message });

export function isSuccess<T>(result: RepositoryResult<T>): result is { kind: "success"; data: T } {
  return result.kind === "success";
}

/** Data when the operation succeeded, otherwise undefined. */
export function dataOf<T>(result: RepositoryResult<T>): T | undefined {
  return result.kind === "success" ? result.data : undefined;
}

/**
 * Message for the states that carry one. `empty` and `invalid` are excluded
 * because a screen renders those with its own empty state and error summary.
 */
export function messageOf<T>(result: RepositoryResult<T>): string | undefined {
  switch (result.kind) {
    case "denied":
    case "conflict":
    case "failure":
      return result.message;
    default:
      return undefined;
  }
}

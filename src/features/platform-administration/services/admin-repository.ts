import { demoClock } from "@/shared/data/demo-clock";

import {
  ACCESS_REVIEW_TASKS,
  ADMIN_IDENTITIES,
  CONFIG_VERSIONS,
  IMPORT_ROWS,
  INTEGRATIONS,
  OPERATIONS_ITEMS,
  OUTBOX_ITEMS,
  PRIVACY_TASKS,
} from "../data/admin-fixtures";

type IdentityRecord = {
  id: string;
  name: string;
  office: string;
  assignment: string;
  state: string;
  requestedChange: string;
  requester: string;
  reviewer: string;
  history: string[];
};

type AccessRecord = {
  id: string;
  account: string;
  role: string;
  scope: string;
  fields: string;
  purpose: string;
  validUntil: string;
  requester: string;
  reviewer: string;
  state: string;
  history: string[];
};

type ConfigRecord = {
  id: string;
  name: string;
  current: string;
  proposed: string;
  impact: string;
  effectiveDate: string;
  state: string;
  valid: boolean;
  history: string[];
};

type PrivacyRecord = {
  id: string;
  title: string;
  detail: string;
  state: string;
  hold: boolean;
  history: string[];
};

type OutboxRecord = {
  id: string;
  direction: string;
  channel: string;
  recipient: string;
  purpose: string;
  state: string;
  attempts: number;
  correlationId: string;
  cost: string;
  history: string[];
};

type IntegrationRecord = {
  id: string;
  name: string;
  owner: string;
  purpose: string;
  status: string;
  credential: string;
  correlationId: string;
  history: string[];
};

type OperationRecord = {
  id: string;
  name: string;
  detail: string;
  state: string;
  history: string[];
};

type ImportRecord = {
  row: number;
  source: string;
  target: string;
  finding: string;
  decision: string;
};

/** Deeply strips `readonly`, so an `as const` fixture can seed mutable state. */
type Mutable<T> = T extends readonly (infer U)[]
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;

const clone = <T>(value: T): Mutable<T> => structuredClone(value) as Mutable<T>;
const validReason = (reason: string) => reason.trim().length >= 8;

export class AdminRepository {
  private identities: IdentityRecord[] = [];
  private accessReviews: AccessRecord[] = [];
  private configs: ConfigRecord[] = [];
  private privacyTasks: PrivacyRecord[] = [];
  private outbox: OutboxRecord[] = [];
  private integrations: IntegrationRecord[] = [];
  private operations: OperationRecord[] = [];
  private importRows: ImportRecord[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.identities = clone(ADMIN_IDENTITIES);
    this.accessReviews = clone(ACCESS_REVIEW_TASKS);
    this.configs = clone(CONFIG_VERSIONS);
    this.privacyTasks = clone(PRIVACY_TASKS);
    this.outbox = clone(OUTBOX_ITEMS);
    this.integrations = clone(INTEGRATIONS);
    this.operations = clone(OPERATIONS_ITEMS);
    this.importRows = clone(IMPORT_ROWS);
  }

  listIdentities() {
    return clone(this.identities);
  }

  requestAssignment(input: { name: string; office: string; assignment: string; change: string; reason: string }) {
    if (
      input.name.trim().length < 3 ||
      input.office.trim().length < 2 ||
      input.assignment.trim().length < 3 ||
      !validReason(input.reason)
    )
      return undefined;
    const record: IdentityRecord = {
      id: `DEMO-ADMIN-${String(this.identities.length + 1).padStart(3, "0")}`,
      name: input.name.trim(),
      office: input.office.trim(),
      assignment: input.assignment.trim(),
      state: "Pending owner review",
      requestedChange: input.change,
      requester: "DEMO-ADMIN-001",
      reviewer: "DEMO-DPO-001",
      history: [`${input.change} requested: ${input.reason.trim()}`],
    };
    this.identities.unshift(record);
    return clone(record);
  }

  decideIdentity(id: string, decision: "approve" | "reject" | "deactivate", reason: string) {
    const record = this.identities.find((item) => item.id === id);
    if (!record || !validReason(reason) || record.requester === record.reviewer) return undefined;
    if (decision === "approve" && record.state !== "Pending owner review") return undefined;
    if (decision === "deactivate" && !record.state.includes("Active")) return undefined;
    record.state =
      decision === "reject"
        ? "Rejected"
        : decision === "deactivate" || record.requestedChange.includes("Leaver")
          ? "Deactivated"
          : "Active demo assignment";
    record.history.push(`${decision} by ${record.reviewer}: ${reason.trim()}`);
    return clone(record);
  }

  listAccessReviews() {
    return clone(this.accessReviews);
  }

  decideAccess(id: string, decision: "approve" | "reject" | "deactivate", reason: string) {
    const record = this.accessReviews.find((item) => item.id === id);
    if (!record || !validReason(reason)) return undefined;
    if (decision === "approve") {
      if (
        record.state !== "Requested" ||
        record.requester === record.reviewer ||
        Date.parse(`${record.validUntil}T23:59:59+08:00`) < demoClock.now().getTime()
      )
        return undefined;
      record.state = "Active demo capability";
    } else if (decision === "deactivate") {
      if (record.state !== "Active demo capability") return undefined;
      record.state = "Deactivated";
    } else {
      if (!["Requested", "Self-approval conflict", "Expired"].includes(record.state)) return undefined;
      record.state = "Rejected";
    }
    record.history.push(`${decision} by ${record.reviewer}: ${reason.trim()}`);
    return clone(record);
  }

  listConfigs() {
    return clone(this.configs);
  }

  transitionConfig(id: string, decision: "validate" | "approve" | "activate" | "return", reason: string) {
    const record = this.configs.find((item) => item.id === id);
    if (!record || !validReason(reason)) return undefined;
    if (decision === "validate") {
      if (record.state !== "Draft" && record.state !== "Returned") return undefined;
      record.state = record.valid ? "Validated" : "Validation failed";
    }
    if (decision === "approve") {
      if (record.state !== "Validated") return undefined;
      record.state =
        Date.parse(`${record.effectiveDate}T00:00:00+08:00`) > demoClock.now().getTime() ? "Scheduled" : "Approved";
    }
    if (decision === "activate") {
      if (!["Scheduled", "Approved"].includes(record.state)) return undefined;
      if (Date.parse(`${record.effectiveDate}T00:00:00+08:00`) > demoClock.now().getTime()) return undefined;
      record.state = "Active";
      record.current = `${record.proposed} · activated without rewriting prior snapshots`;
    }
    if (decision === "return") {
      if (record.state === "Active") return undefined;
      record.state = "Returned";
    }
    record.history.push(`${decision}: ${reason.trim()}`);
    return clone(record);
  }

  listPrivacyTasks() {
    return clone(this.privacyTasks);
  }

  transitionPrivacy(id: string, decision: "review" | "request-hold-release" | "dispose", reason: string) {
    const record = this.privacyTasks.find((item) => item.id === id);
    if (!record || !validReason(reason)) return undefined;
    if (decision === "request-hold-release") {
      if (!record.hold) return undefined;
      record.state = "Hold release review requested";
    } else if (decision === "review") {
      if (record.hold) return undefined;
      record.state = "Reviewed locally";
    } else {
      if (record.hold || record.state !== "Reviewed locally") return undefined;
      record.state = "Disposition simulated";
    }
    record.history.push(`${decision}: ${reason.trim()}`);
    return clone(record);
  }

  listOutbox() {
    return clone(this.outbox);
  }

  retryMessage(id: string, reason: string) {
    const record = this.outbox.find((item) => item.id === id);
    if (!record || !validReason(reason)) return undefined;
    record.attempts += 1;
    record.state = "Delivered local preview";
    record.history.push(`Local retry ${record.attempts}: ${reason.trim()}; provider not contacted`);
    return clone(record);
  }

  listIntegrations() {
    return clone(this.integrations);
  }

  retryIntegration(id: string, reason: string) {
    const record = this.integrations.find((item) => item.id === id);
    if (!record || !validReason(reason)) return undefined;
    record.status = record.name === "Payment provider" ? "Awaiting M06 confirmation" : "Reconciled locally";
    record.history.push(`Retry/reconciliation: ${reason.trim()}; no external request sent`);
    return clone(record);
  }

  listOperations() {
    return clone(this.operations);
  }

  transitionOperation(id: string, decision: "assign" | "retry-sync" | "restore", reason: string) {
    const record = this.operations.find((item) => item.id === id);
    if (!record || !validReason(reason)) return undefined;
    if (decision === "restore" && id !== "DEMO-OPS-001") return undefined;
    if (decision === "retry-sync" && id !== "DEMO-OPS-002" && id !== "DEMO-OPS-003") return undefined;
    record.state =
      decision === "restore"
        ? "Fixture restored locally"
        : decision === "retry-sync"
          ? "Local retry staged"
          : "Owner acknowledged";
    record.history.push(`${decision}: ${reason.trim()}`);
    return clone(record);
  }

  listImportRows() {
    return clone(this.importRows);
  }

  decideImportRow(row: number, decision: "Include" | "Merge reviewed duplicate" | "Exclude") {
    const record = this.importRows.find((item) => item.row === row);
    if (!record) return undefined;
    if (record.finding.includes("Invalid") && decision !== "Exclude") return undefined;
    record.decision = decision;
    return clone(record);
  }

  applyImport() {
    if (this.importRows.some((row) => row.decision === "Human review")) return undefined;
    return {
      included: this.importRows.filter((row) => row.decision === "Include").length,
      merged: this.importRows.filter((row) => row.decision === "Merge reviewed duplicate").length,
      excluded: this.importRows.filter((row) => row.decision === "Exclude").length,
    };
  }
}

export const adminRepository = new AdminRepository();

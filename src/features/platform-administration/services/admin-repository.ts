import {
  ADMIN_RECORDS,
  ADMIN_SECTION_META,
  type AdminRecord,
  type AdminRecordInput,
  type AdminSection,
} from "../data/admin-fixtures";

export type AdminAction =
  | "activate"
  | "suspend"
  | "deactivate"
  | "approve"
  | "reject"
  | "revoke"
  | "validate"
  | "return"
  | "assign"
  | "hold"
  | "release"
  | "complete"
  | "send"
  | "retry"
  | "cancel"
  | "enable"
  | "disable"
  | "verify"
  | "resolve"
  | "reopen"
  | "apply";

const clone = <T>(value: T): T => structuredClone(value);
const valid = (input: AdminRecordInput) =>
  input.title.trim().length >= 3 &&
  input.subtitle.trim().length >= 3 &&
  input.office.trim().length >= 2 &&
  input.owner.trim().length >= 2 &&
  input.description.trim().length >= 12;

export class AdminRepository {
  private records = clone(ADMIN_RECORDS);

  list(section: AdminSection) {
    return clone(this.records.filter((record) => record.section === section));
  }

  find(section: AdminSection, id: string) {
    return clone(this.records.find((record) => record.section === section && record.id === id.toUpperCase()));
  }

  create(section: AdminSection, input: AdminRecordInput) {
    if (section === "audit" || !valid(input)) return undefined;
    const prefix = ADMIN_SECTION_META[section].prefix;
    const sequence =
      Math.max(
        0,
        ...this.records
          .filter((item) => item.section === section)
          .map((item) => Number(item.id.match(/(\d+)$/)?.[1] ?? 0)),
      ) + 1;
    const record: AdminRecord = {
      ...clone(input),
      id: `${prefix}-2026-${String(sequence).padStart(3, "0")}`,
      section,
      history: [`Record created by ${input.owner}`],
      immutable: false,
    };
    this.records.unshift(record);
    this.appendAudit("Administrative record created", record, "Create record");
    return clone(record);
  }

  update(section: AdminSection, id: string, input: AdminRecordInput) {
    const index = this.records.findIndex((record) => record.section === section && record.id === id.toUpperCase());
    if (index < 0 || section === "audit" || !valid(input)) return undefined;
    const current = this.records[index];
    const record: AdminRecord = {
      ...clone(input),
      id: current.id,
      section,
      history: [...current.history, `Record updated by ${input.owner}`],
      immutable: false,
    };
    this.records[index] = record;
    this.appendAudit("Administrative record updated", record, "Update record");
    return clone(record);
  }

  duplicate(section: AdminSection, id: string) {
    const source = this.records.find((record) => record.section === section && record.id === id.toUpperCase());
    if (!source || section === "audit") return undefined;
    return this.create(section, {
      ...clone(source),
      title: `${source.title} — Copy`,
      status: this.initialStatus(section),
      createdAt: "2026-09-20",
      updatedAt: "2026-09-20",
    });
  }

  transition(section: AdminSection, id: string, action: AdminAction, reason: string) {
    const record = this.records.find((item) => item.section === section && item.id === id.toUpperCase());
    if (!record || record.immutable || reason.trim().length < 8) return undefined;
    const next = this.nextStatus(record, action);
    if (!next) return undefined;
    record.status = next;
    record.updatedAt = "2026-09-20";
    record.history.push(`${this.actionLabel(action)}: ${reason.trim()}`);
    this.appendAudit(`Administrative action: ${this.actionLabel(action)}`, record, reason.trim());
    return clone(record);
  }

  private nextStatus(record: AdminRecord, action: AdminAction) {
    const { section, status } = record;
    if (section === "users") {
      if (action === "activate" && ["Pending activation", "Suspended", "Deactivated"].includes(status)) return "Active";
      if (action === "suspend" && status === "Active") return "Suspended";
      if (action === "deactivate" && status !== "Deactivated") return "Deactivated";
    }
    if (section === "access") {
      if (action === "approve" && status === "Requested") return "Active";
      if (action === "reject" && status === "Requested") return "Rejected";
      if (action === "revoke" && ["Active", "Approved"].includes(status)) return "Revoked";
    }
    if (section === "settings") {
      if (action === "validate" && ["Draft", "Returned", "Validation failed"].includes(status)) return "Validated";
      if (action === "approve" && status === "Validated") return "Approved";
      if (action === "activate" && status === "Approved") return "Active";
      if (action === "return" && status !== "Active") return "Returned";
    }
    if (section === "privacy") {
      if (action === "assign" && ["Received", "Assigned"].includes(status)) return "Assigned";
      if (action === "hold" && status !== "Completed") return "On hold";
      if (action === "release" && status === "On hold") return "In review";
      if (action === "complete" && ["Assigned", "In review"].includes(status)) return "Completed";
    }
    if (section === "messages") {
      if (action === "send" && ["Draft", "Queued"].includes(status)) return "Delivered";
      if (action === "retry" && status === "Delivery failed") return "Delivered";
      if (action === "cancel" && !["Delivered", "Cancelled"].includes(status)) return "Cancelled";
    }
    if (section === "integrations") {
      if (action === "verify" && status !== "Disabled") return "Active";
      if (action === "disable" && status !== "Disabled") return "Disabled";
      if (action === "enable" && status === "Disabled") return "Active";
    }
    if (section === "operations") {
      if (action === "assign" && ["Investigating", "Open"].includes(status)) return "Assigned";
      if (action === "resolve" && !["Resolved", "Healthy"].includes(status)) return "Resolved";
      if (action === "reopen" && status === "Resolved") return "Investigating";
    }
    if (section === "imports") {
      if (action === "validate" && status === "Needs review") return "Validated";
      if (action === "apply" && status === "Validated") return "Applied";
      if (action === "cancel" && status !== "Applied") return "Cancelled";
    }
    return undefined;
  }

  private initialStatus(section: AdminSection) {
    if (section === "users") return "Pending activation";
    if (section === "access") return "Requested";
    if (section === "settings") return "Draft";
    if (section === "privacy") return "Received";
    if (section === "messages") return "Draft";
    if (section === "integrations") return "Disabled";
    if (section === "operations") return "Open";
    if (section === "imports") return "Needs review";
    return "Recorded";
  }

  private actionLabel(action: AdminAction) {
    return action.charAt(0).toUpperCase() + action.slice(1);
  }

  private appendAudit(title: string, record: AdminRecord, purpose: string) {
    const sequence = this.records.filter((item) => item.section === "audit").length + 1;
    this.records.unshift({
      id: `AUD-2026-${String(sequence).padStart(3, "0")}`,
      section: "audit",
      title,
      subtitle: `${record.section} · ${record.id}`,
      office: record.office,
      owner: record.owner,
      status: "Recorded",
      priority: record.priority,
      createdAt: "2026-09-20 10:00",
      updatedAt: "2026-09-20 10:00",
      description: `${title} for ${record.title}.`,
      reference: record.id,
      scope: record.scope,
      channel: "Administration",
      target: record.target,
      tags: ["Administration", record.section],
      history: [`Event recorded with purpose: ${purpose}`],
      immutable: true,
    });
  }
}

const browserRegistry =
  typeof window === "undefined" ? undefined : (window as typeof window & { __matnogAdminRepository?: AdminRepository });

function getAdminRepository() {
  if (!browserRegistry) return new AdminRepository();
  if (!browserRegistry.__matnogAdminRepository) browserRegistry.__matnogAdminRepository = new AdminRepository();
  return browserRegistry.__matnogAdminRepository;
}

export const adminRepository = getAdminRepository();

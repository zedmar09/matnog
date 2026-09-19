import { CASE_ACCESS_ASSIGNMENTS, CASE_RECORDS, DISCLOSURE_DECISIONS } from "../data/restricted-case-fixtures";
import type {
  AccessAssignmentValues,
  CaseRecordValues,
  DisclosureValues,
  TimelineEntryValues,
} from "../schemas/case-schema";
import type {
  CaseAccessAssignment,
  CaseClass,
  CaseRecord,
  CaseReportRow,
  DisclosureDecision,
} from "../types/restricted-case";

const CLASS_PREFIX: Record<CaseClass, string> = {
  "Barangay justice": "CASE-KP-2026",
  "VAWC referral": "CASE-VAWC-2026",
  "Child protection": "CASE-BCPC-2026",
  "Blotter record": "CASE-BLT-2026",
};

function nextId(prefix: string, records: readonly { id: string }[]) {
  const highest = records.reduce((current, item) => {
    if (!item.id.startsWith(prefix)) return current;
    const value = Number(item.id.split("-").at(-1));
    return Number.isFinite(value) ? Math.max(current, value) : current;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

function list(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export class LocalRestrictedCaseRepository {
  readonly cases = structuredClone(CASE_RECORDS) as CaseRecord[];
  readonly assignments = structuredClone(CASE_ACCESS_ASSIGNMENTS) as CaseAccessAssignment[];
  readonly disclosures = structuredClone(DISCLOSURE_DECISIONS) as DisclosureDecision[];

  caseRecord(id: string) {
    return this.cases.find((item) => item.id === id);
  }

  assignment(id: string) {
    return this.assignments.find((item) => item.id === id);
  }

  caseDisclosures(caseId: string) {
    return this.disclosures.filter((item) => item.caseId === caseId);
  }

  createCase(values: CaseRecordValues) {
    const id = nextId(CLASS_PREFIX[values.caseClass], this.cases);
    const record: CaseRecord = {
      ...values,
      id,
      evidence: list(values.evidence),
      timeline: [
        {
          id: `${id}-TL-001`,
          at: values.openedAt,
          action: "Case opened",
          officer: values.assignedOfficer,
          note: "Case reference created and assigned to the responsible desk.",
        },
      ],
    };
    this.cases.unshift(record);
    return record;
  }

  updateCase(id: string, values: CaseRecordValues) {
    const record = this.caseRecord(id);
    if (!record) return undefined;
    Object.assign(record, values, { evidence: list(values.evidence) });
    return record;
  }

  deleteCase(id: string) {
    const index = this.cases.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.cases.splice(index, 1);
    this.disclosures.splice(0, this.disclosures.length, ...this.disclosures.filter((item) => item.caseId !== id));
    return true;
  }

  addTimelineEntry(caseId: string, values: TimelineEntryValues) {
    const record = this.caseRecord(caseId);
    if (!record) return undefined;
    const entry = {
      ...values,
      id: `${caseId}-TL-${String(record.timeline.length + 1).padStart(3, "0")}`,
    };
    record.timeline.unshift(entry);
    record.updatedAt = values.at;
    return entry;
  }

  updateTimelineEntry(caseId: string, entryId: string, values: TimelineEntryValues) {
    const entry = this.caseRecord(caseId)?.timeline.find((item) => item.id === entryId);
    if (!entry) return undefined;
    Object.assign(entry, values);
    return entry;
  }

  deleteTimelineEntry(caseId: string, entryId: string) {
    const record = this.caseRecord(caseId);
    if (!record) return false;
    const index = record.timeline.findIndex((item) => item.id === entryId);
    if (index < 0) return false;
    record.timeline.splice(index, 1);
    return true;
  }

  createAssignment(values: AccessAssignmentValues) {
    const record: CaseAccessAssignment = {
      ...values,
      id: nextId("ACCESS-CASE-2026", this.assignments),
    };
    this.assignments.unshift(record);
    return record;
  }

  updateAssignment(id: string, values: AccessAssignmentValues) {
    const record = this.assignment(id);
    if (!record) return undefined;
    Object.assign(record, values);
    return record;
  }

  revokeAssignment(id: string) {
    const record = this.assignment(id);
    if (!record) return false;
    record.status = "Revoked";
    return true;
  }

  deleteAssignment(id: string) {
    const index = this.assignments.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.assignments.splice(index, 1);
    return true;
  }

  createDisclosure(caseId: string, values: DisclosureValues) {
    if (!this.caseRecord(caseId)) return undefined;
    const record: DisclosureDecision = {
      id: nextId("DISC-CASE-2026", this.disclosures),
      caseId,
      purpose: values.purpose,
      requestedFields: list(values.requestedFields),
      actor: values.actor,
      at: "2026-09-19 15:00",
      outcome: values.outcome,
    };
    this.disclosures.unshift(record);
    return record;
  }

  deleteDisclosure(id: string) {
    const index = this.disclosures.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.disclosures.splice(index, 1);
    return true;
  }

  reportingProjection(scope = "Municipality of Matnog", period = "September 2026"): CaseReportRow[] {
    const rows: CaseReportRow[] = [];
    const classes: CaseClass[] = ["Barangay justice", "Blotter record", "VAWC referral", "Child protection"];
    for (const caseClass of classes) {
      const count = this.cases.filter((item) => item.caseClass === caseClass).length;
      const protectedClass = caseClass === "VAWC referral" || caseClass === "Child protection";
      rows.push({ label: caseClass, count: protectedClass && count < 3 ? "Suppressed" : count, period, scope });
    }
    return rows;
  }
}

export const localRestrictedCaseRepository = new LocalRestrictedCaseRepository();

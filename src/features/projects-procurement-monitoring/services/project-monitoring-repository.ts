import { PROJECT_RECORDS } from "../data/project-monitoring-fixtures";
import type {
  ProjectBilling,
  ProjectInspection,
  ProjectIssue,
  ProjectRecord,
  ProjectStage,
} from "../types/project-monitoring";

export type ProjectInput = {
  sourceProposal: string;
  sourcePlan: string;
  appropriationReference: string;
  office: string;
  title: string;
  scope: string;
  barangay: string;
  year: number;
  type: string;
  tags: string[];
  allocationPesos: number;
  originalEnd: string;
};

export class ProjectMonitoringRepository {
  private records = structuredClone(PROJECT_RECORDS);
  private projectSequence = 3;
  private childSequence = 20;

  private mutable(id: string) {
    return this.records.find((item) => item.id === id || item.id === `DEMO-${id}`);
  }

  list(): ProjectRecord[] {
    return structuredClone(this.records);
  }

  find(id: string): ProjectRecord | undefined {
    const record = this.mutable(id);
    return record ? structuredClone(record) : undefined;
  }

  createProject(input: ProjectInput): ProjectRecord | undefined {
    if (!this.validProject(input)) return undefined;
    this.projectSequence += 1;
    const funded = input.appropriationReference.trim().length >= 4;
    const created: ProjectRecord = {
      id: `PRJ-${input.year}-${String(this.projectSequence).padStart(3, "0")}`,
      title: input.title.trim(),
      scope: input.scope.trim(),
      barangay: input.barangay.trim(),
      office: input.office.trim(),
      year: input.year,
      type: input.type.trim(),
      tags: input.tags.length ? input.tags : ["Local development"],
      stage: "readiness",
      sourceProposal: input.sourceProposal.trim(),
      sourcePlan: input.sourcePlan.trim(),
      appropriationReference: funded ? input.appropriationReference.trim() : undefined,
      fundSources: funded
        ? [{ label: "Local Development Fund", amountMinor: Math.round(input.allocationPesos * 100) }]
        : [],
      procurementMode: "Pending readiness review",
      originalCostMinor: Math.round(input.allocationPesos * 100),
      currentCostMinor: Math.round(input.allocationPesos * 100),
      physicalProgress: 0,
      financialProgress: 0,
      elapsedProgress: 0,
      originalEnd: input.originalEnd,
      currentEnd: input.originalEnd,
      readiness: [
        {
          id: "SCOPE",
          label: "Approved scope and baseline",
          owner: input.office.trim(),
          mandatory: true,
          state: "complete",
          evidenceReference: `SCOPE-${input.year}-${String(this.projectSequence).padStart(3, "0")}`,
        },
        {
          id: "FUND",
          label: "Approved appropriation",
          owner: "Municipal Budget Office",
          mandatory: true,
          state: funded ? "complete" : "missing",
          evidenceReference: funded ? input.appropriationReference.trim() : undefined,
        },
        {
          id: "DESIGN",
          label: "Design and technical package",
          owner: input.office.trim(),
          mandatory: true,
          state: "missing",
        },
      ],
      inspections: [],
      issues: [],
      billings: [],
      history: [`Project record created from ${input.sourceProposal.trim()}`, "Readiness review opened"],
      version: 1,
    };
    this.records.unshift(created);
    return structuredClone(created);
  }

  updateProject(id: string, input: ProjectInput): ProjectRecord | undefined {
    const record = this.mutable(id);
    if (!record || record.stage === "archived" || !this.validProject(input)) return undefined;
    record.title = input.title.trim();
    record.scope = input.scope.trim();
    record.barangay = input.barangay.trim();
    record.office = input.office.trim();
    record.year = input.year;
    record.type = input.type.trim();
    record.tags = input.tags.length ? input.tags : ["Local development"];
    record.sourceProposal = input.sourceProposal.trim();
    record.sourcePlan = input.sourcePlan.trim();
    record.appropriationReference = input.appropriationReference.trim() || undefined;
    record.originalCostMinor = Math.round(input.allocationPesos * 100);
    if (!record.variation) record.currentCostMinor = record.originalCostMinor;
    record.originalEnd = input.originalEnd;
    if (!record.variation) record.currentEnd = input.originalEnd;
    record.history.push("Project profile and baseline details updated");
    record.version += 1;
    return structuredClone(record);
  }

  private validProject(input: ProjectInput) {
    return (
      input.sourceProposal.trim().length >= 4 &&
      input.sourcePlan.trim().length >= 4 &&
      input.office.trim().length >= 4 &&
      input.title.trim().length >= 8 &&
      input.scope.trim().length >= 12 &&
      input.barangay.trim().length >= 3 &&
      input.type.trim().length >= 3 &&
      input.year >= 2024 &&
      input.allocationPesos > 0 &&
      input.originalEnd.trim().length >= 10
    );
  }

  setStage(id: string, stage: ProjectStage, note = "Project lifecycle stage updated"): ProjectRecord | undefined {
    const item = this.mutable(id);
    if (!item) return undefined;
    item.stage = stage;
    item.history.push(note);
    item.version += 1;
    return structuredClone(item);
  }

  archive(id: string): boolean {
    return Boolean(this.setStage(id, "archived", "Project record archived from the active portfolio"));
  }

  updateReadiness(id: string, gateId: string, state: "complete" | "missing", evidenceReference: string) {
    const item = this.mutable(id);
    const gate = item?.readiness.find((entry) => entry.id === gateId);
    if (!item || !gate) return undefined;
    gate.state = state;
    gate.evidenceReference = state === "complete" ? evidenceReference.trim() || undefined : undefined;
    item.history.push(`${gate.label} marked ${state}`);
    item.version += 1;
    return structuredClone(item);
  }

  updateProcurement(
    id: string,
    input: {
      procurementMode: string;
      postingReference: string;
      contractReference: string;
      contractor: string;
      securityExpiry: string;
    },
  ) {
    const item = this.mutable(id);
    if (!item || input.procurementMode.trim().length < 4) return undefined;
    item.procurementMode = input.procurementMode.trim();
    item.postingReference = input.postingReference.trim() || undefined;
    item.contractReference = input.contractReference.trim() || undefined;
    item.contractor = input.contractor.trim() || undefined;
    item.securityExpiry = input.securityExpiry.trim() || undefined;
    if (item.contractReference && item.contractor) item.stage = "execution";
    else if (item.stage === "readiness") item.stage = "procurement";
    item.history.push("Procurement and contract details updated");
    item.version += 1;
    return structuredClone(item);
  }

  startProcurement(id: string): ProjectRecord | undefined {
    const item = this.mutable(id);
    if (!item?.appropriationReference || item.readiness.some((gate) => gate.mandatory && gate.state !== "complete"))
      return undefined;
    item.stage = "procurement";
    item.procurementMode =
      item.procurementMode === "Pending readiness review" ? "Public bidding" : item.procurementMode;
    item.history.push("Readiness requirements completed and procurement opened");
    item.version += 1;
    return structuredClone(item);
  }

  returnToReadiness(id: string, reason: string): ProjectRecord | undefined {
    const item = this.mutable(id);
    if (!item || reason.trim().length < 8 || item.stage === "archived") return undefined;
    item.stage = "readiness";
    item.history.push(`Returned to readiness review: ${reason.trim()}`);
    item.version += 1;
    return structuredClone(item);
  }

  updateProgress(
    id: string,
    input: { physicalProgress: number; financialProgress: number; elapsedProgress: number; currentEnd: string },
  ) {
    const item = this.mutable(id);
    if (
      !item ||
      [input.physicalProgress, input.financialProgress, input.elapsedProgress].some((value) => value < 0 || value > 100)
    )
      return undefined;
    item.physicalProgress = input.physicalProgress;
    item.financialProgress = input.financialProgress;
    item.elapsedProgress = input.elapsedProgress;
    item.currentEnd = input.currentEnd;
    if (input.physicalProgress === 100 && item.stage === "execution") item.stage = "completion";
    item.history.push("Project progress and current schedule updated");
    item.version += 1;
    return structuredClone(item);
  }

  decideVariation(id: string, status: "Approved" | "Rejected", reason: string) {
    const item = this.mutable(id);
    if (!item?.variation || reason.trim().length < 8) return undefined;
    item.variation.status = status;
    item.variation.reason = reason.trim();
    item.currentCostMinor =
      status === "Approved" ? item.originalCostMinor + item.variation.costImpactMinor : item.originalCostMinor;
    if (status === "Rejected") item.currentEnd = item.originalEnd;
    item.history.push(`Variation ${status.toLocaleLowerCase()}: ${reason.trim()}`);
    item.version += 1;
    return structuredClone(item);
  }

  addInspection(projectId: string, input: Omit<ProjectInspection, "id">): ProjectRecord | undefined {
    const item = this.mutable(projectId);
    if (!item || input.finding.trim().length < 8) return undefined;
    this.childSequence += 1;
    item.inspections.unshift({ ...input, id: `INSP-2026-${String(this.childSequence).padStart(3, "0")}` });
    item.history.push("Field inspection recorded");
    item.version += 1;
    return structuredClone(item);
  }

  updateInspection(projectId: string, inspectionId: string, input: Omit<ProjectInspection, "id">) {
    const item = this.mutable(projectId);
    const inspection = item?.inspections.find((entry) => entry.id === inspectionId);
    if (!item || !inspection || input.finding.trim().length < 8) return undefined;
    Object.assign(inspection, input);
    item.history.push(`${inspection.id} inspection record updated`);
    item.version += 1;
    return structuredClone(item);
  }

  deleteInspection(projectId: string, inspectionId: string) {
    const item = this.mutable(projectId);
    if (!item) return false;
    const before = item.inspections.length;
    item.inspections = item.inspections.filter((entry) => entry.id !== inspectionId);
    if (item.inspections.length === before) return false;
    item.history.push("Inspection record removed");
    item.version += 1;
    return true;
  }

  addIssue(projectId: string, input: Omit<ProjectIssue, "id" | "status">): ProjectRecord | undefined {
    const item = this.mutable(projectId);
    if (!item || input.description.trim().length < 8 || input.assignee.trim().length < 3) return undefined;
    this.childSequence += 1;
    item.issues.unshift({ ...input, id: `ISS-2026-${String(this.childSequence).padStart(3, "0")}`, status: "open" });
    item.history.push("Project issue added");
    item.version += 1;
    return structuredClone(item);
  }

  updateIssue(projectId: string, issueId: string, input: Omit<ProjectIssue, "id">) {
    const item = this.mutable(projectId);
    const issue = item?.issues.find((entry) => entry.id === issueId);
    if (!item || !issue || input.description.trim().length < 8 || input.assignee.trim().length < 3) return undefined;
    Object.assign(issue, input);
    item.history.push(`${issue.id} project issue updated`);
    item.version += 1;
    return structuredClone(item);
  }

  resolveIssue(projectId: string, issueId: string, closureEvidence: string): ProjectRecord | undefined {
    const item = this.mutable(projectId);
    const issue = item?.issues.find((record) => record.id === issueId);
    if (!item || !issue || closureEvidence.trim().length < 4) return undefined;
    issue.status = "resolved";
    issue.closureEvidence = closureEvidence.trim();
    item.history.push(`${issue.id} closure evidence recorded`);
    item.version += 1;
    return structuredClone(item);
  }

  deleteIssue(projectId: string, issueId: string) {
    const item = this.mutable(projectId);
    if (!item) return false;
    const before = item.issues.length;
    item.issues = item.issues.filter((entry) => entry.id !== issueId);
    if (item.issues.length === before) return false;
    item.history.push("Project issue removed");
    item.version += 1;
    return true;
  }

  addBilling(projectId: string, input: Omit<ProjectBilling, "id" | "netMinor" | "status">) {
    const item = this.mutable(projectId);
    if (!item || input.grossMinor <= 0 || input.retentionMinor < 0 || input.retentionMinor >= input.grossMinor)
      return undefined;
    this.childSequence += 1;
    item.billings.unshift({
      ...input,
      id: `BILL-2026-${String(this.childSequence).padStart(3, "0")}`,
      netMinor: input.grossMinor - input.retentionMinor,
      status: "For verification",
    });
    item.history.push("Billing record created for verification");
    item.version += 1;
    return structuredClone(item);
  }

  updateBilling(projectId: string, billingId: string, input: Omit<ProjectBilling, "id" | "netMinor" | "status">) {
    const item = this.mutable(projectId);
    const billing = item?.billings.find((entry) => entry.id === billingId);
    if (
      !item ||
      !billing ||
      input.grossMinor <= 0 ||
      input.retentionMinor < 0 ||
      input.retentionMinor >= input.grossMinor
    )
      return undefined;
    billing.verifiedInspectionReference = input.verifiedInspectionReference;
    billing.grossMinor = input.grossMinor;
    billing.retentionMinor = input.retentionMinor;
    billing.netMinor = input.grossMinor - input.retentionMinor;
    billing.financeReference = input.financeReference;
    item.history.push(`${billing.id} billing record updated`);
    item.version += 1;
    return structuredClone(item);
  }

  deleteBilling(projectId: string, billingId: string) {
    const item = this.mutable(projectId);
    if (!item) return false;
    const before = item.billings.length;
    item.billings = item.billings.filter((entry) => entry.id !== billingId);
    if (item.billings.length === before) return false;
    item.history.push("Billing record removed");
    item.version += 1;
    return true;
  }

  sendBilling(projectId: string, billingId: string): ProjectRecord | undefined {
    const item = this.mutable(projectId);
    const billing = item?.billings.find((record) => record.id === billingId);
    if (!item || !billing?.verifiedInspectionReference || billing.netMinor > item.currentCostMinor) return undefined;
    billing.status = "Approved for financial review";
    billing.financeReference ??= `DV-2026-${String(this.childSequence + 1).padStart(3, "0")}`;
    item.history.push(`${billing.id} forwarded for financial review`);
    item.version += 1;
    return structuredClone(item);
  }

  acceptCompletion(id: string): ProjectRecord | undefined {
    const item = this.mutable(id);
    if (
      !item ||
      item.physicalProgress < 100 ||
      item.inspections.length === 0 ||
      item.issues.some((issue) => issue.status !== "resolved")
    )
      return undefined;
    item.stage = "accepted";
    item.asBuiltReference = `ASBUILT-${item.year}-${String(this.projectSequence).padStart(3, "0")}`;
    item.receivingCustodian = "Municipal Engineering Office";
    item.turnoverReference = `TURNOVER-${item.year}-${String(this.projectSequence).padStart(3, "0")}`;
    item.warrantyUntil = "2028-10-04";
    item.history.push("Completion accepted and turnover record prepared");
    item.version += 1;
    return structuredClone(item);
  }
}

export const projectMonitoringRepository = new ProjectMonitoringRepository();

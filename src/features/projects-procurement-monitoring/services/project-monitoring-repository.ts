import { PROJECT_RECORDS } from "../data/project-monitoring-fixtures";
import type { ProjectRecord, ProjectStage } from "../types/project-monitoring";

export class ProjectMonitoringRepository {
  private records = structuredClone(PROJECT_RECORDS);
  private sequence = 3;
  list(): ProjectRecord[] {
    return structuredClone(this.records);
  }
  find(id: string): ProjectRecord | undefined {
    return structuredClone(this.records.find((item) => item.id === id));
  }
  setStage(id: string, stage: ProjectStage): ProjectRecord | undefined {
    const item = this.records.find((record) => record.id === id);
    if (!item) return undefined;
    item.stage = stage;
    item.version += 1;
    return structuredClone(item);
  }
  createProject(input: {
    sourceProposal: string;
    sourcePlan: string;
    appropriationReference: string;
    office: string;
    title: string;
    scope: string;
    allocationPesos: number;
  }): ProjectRecord | undefined {
    if (
      input.sourceProposal.trim().length < 4 ||
      input.sourcePlan.trim().length < 4 ||
      input.office.trim().length < 4 ||
      input.title.trim().length < 8 ||
      input.scope.trim().length < 12 ||
      input.allocationPesos <= 0
    )
      return undefined;
    this.sequence += 1;
    const funded = input.appropriationReference.trim().length >= 4;
    const created: ProjectRecord = {
      id: `DEMO-PRJ-${String(this.sequence).padStart(3, "0")}`,
      title: input.title.trim(),
      barangay: "Demo Barangay A",
      office: input.office.trim(),
      year: 2027,
      type: "Infrastructure",
      tags: ["Climate", "DRRM"],
      stage: "readiness",
      sourceProposal: input.sourceProposal.trim(),
      sourcePlan: input.sourcePlan.trim(),
      appropriationReference: funded ? input.appropriationReference.trim() : undefined,
      fundSources: funded
        ? [{ label: "20% Development Fund sample", amountMinor: Math.round(input.allocationPesos * 100) }]
        : [],
      procurementMode: "Pending readiness",
      originalCostMinor: Math.round(input.allocationPesos * 100),
      currentCostMinor: Math.round(input.allocationPesos * 100),
      physicalProgress: 0,
      financialProgress: 0,
      elapsedProgress: 0,
      originalEnd: "2027-12-31",
      currentEnd: "2027-12-31",
      readiness: [
        {
          id: "SCOPE",
          label: "Approved scope and baseline",
          owner: input.office.trim(),
          mandatory: true,
          state: "complete",
          evidenceReference: "DEMO-SCOPE-LOCAL",
        },
        {
          id: "FUND",
          label: "Approved appropriation",
          owner: "Budget",
          mandatory: true,
          state: funded ? "complete" : "missing",
          evidenceReference: funded ? input.appropriationReference.trim() : undefined,
        },
        {
          id: "DESIGN",
          label: "Design / technical package",
          owner: input.office.trim(),
          mandatory: true,
          state: "missing",
        },
      ],
      inspections: [],
      issues: [],
      billings: [],
      history: [
        `Local project draft created from ${input.sourceProposal.trim()}`,
        `Scope retained: ${input.scope.trim()}`,
      ],
      version: 1,
    };
    this.records.unshift(created);
    return structuredClone(created);
  }

  startProcurement(id: string): ProjectRecord | undefined {
    const item = this.records.find((record) => record.id === id);
    if (!item?.appropriationReference || item.readiness.some((gate) => gate.mandatory && gate.state !== "complete"))
      return undefined;
    item.stage = "procurement";
    item.procurementMode = "Illustrative competitive sequence";
    item.history.push("Readiness gates satisfied; sample procurement stage opened");
    item.version += 1;
    return structuredClone(item);
  }

  decideVariation(id: string, status: "Approved sample revision" | "Rejected sample request", reason: string) {
    const item = this.records.find((record) => record.id === id);
    if (!item?.variation || reason.trim().length < 8) return undefined;
    item.variation.status = status;
    item.variation.reason = reason.trim();
    if (status.startsWith("Approved")) {
      item.currentCostMinor = item.originalCostMinor + item.variation.costImpactMinor;
    } else {
      item.currentCostMinor = item.originalCostMinor;
      item.currentEnd = item.originalEnd;
    }
    item.history.push(`${status}: ${reason.trim()}`);
    item.version += 1;
    return structuredClone(item);
  }

  sendBilling(projectId: string, billingId: string): ProjectRecord | undefined {
    const item = this.records.find((record) => record.id === projectId);
    const billing = item?.billings.find((record) => record.id === billingId);
    if (!item || !billing?.verifiedInspectionReference || billing.netMinor > item.currentCostMinor) return undefined;
    billing.status = "Approved for M14 review — unpaid";
    billing.financeReference ??= `DEMO-DV-${String(this.sequence + 1).padStart(3, "0")}`;
    item.history.push(`${billing.id} sent to M14 review; payment remains separate`);
    item.version += 1;
    return structuredClone(item);
  }

  acceptCompletion(id: string): ProjectRecord | undefined {
    const item = this.records.find((record) => record.id === id);
    if (
      !item ||
      item.physicalProgress < 100 ||
      item.inspections.length === 0 ||
      item.issues.some((issue) => issue.status !== "resolved")
    )
      return undefined;
    item.stage = "accepted";
    item.asBuiltReference = "DEMO-ASBUILT-LOCAL";
    item.receivingCustodian = "Municipal Engineering custodian sample";
    item.turnoverReference = "DEMO-TURNOVER-LOCAL";
    item.warrantyUntil = "2028-10-04";
    item.history.push("Acceptance evidence and asset-turnover summary prepared");
    item.version += 1;
    return structuredClone(item);
  }

  addInspection(projectId: string, finding: string, offline: boolean): ProjectRecord | undefined {
    const item = this.records.find((record) => record.id === projectId);
    if (!item?.contractReference || finding.trim().length < 8) return undefined;
    this.sequence += 1;
    item.inspections.unshift({
      id: `DEMO-INSP-${String(this.sequence).padStart(3, "0")}`,
      capturedAt: "2027-05-15 09:00",
      reportedAt: offline ? "Pending simulated sync" : "2027-05-15 09:05",
      coordinates: "Manual sample GPS 12.589, 124.087",
      photoReference: "DEMO-PHOTO-LOCAL",
      materialResult: "Material-test result pending reviewer selection",
      finding: finding.trim(),
      syncState: offline ? "queued offline" : "synced",
      reviewStatus: "Pending review",
    });
    item.history.push(offline ? "Inspection draft queued offline" : "Inspection submitted for review");
    item.version += 1;
    return structuredClone(item);
  }

  resolveIssue(projectId: string, issueId: string, closureEvidence = "DEMO-CLOSURE-LOCAL"): ProjectRecord | undefined {
    const item = this.records.find((record) => record.id === projectId);
    const issue = item?.issues.find((record) => record.id === issueId);
    if (!item || !issue) return undefined;
    issue.status = "resolved";
    issue.closureEvidence = closureEvidence;
    item.history.push(`${issue.id} closure evidence recorded`);
    item.version += 1;
    return structuredClone(item);
  }
}
export const projectMonitoringRepository = new ProjectMonitoringRepository();

import { BARANGAY_PLANS, MUNICIPAL_PLANS, PLANNING_PROPOSALS } from "../data/development-planning-fixtures";
import type { BarangayPlan, MunicipalPlan, PlanningProposal, PlanningStatus } from "../types/development-planning";

export class DevelopmentPlanningRepository {
  private proposals = structuredClone(PLANNING_PROPOSALS);
  private plans = structuredClone(MUNICIPAL_PLANS);
  private sequence = 4;
  listProposals(): PlanningProposal[] {
    return structuredClone(this.proposals);
  }
  findProposal(id: string): PlanningProposal | undefined {
    return structuredClone(this.proposals.find((item) => item.id === id));
  }
  listBarangayPlans(): BarangayPlan[] {
    return structuredClone(BARANGAY_PLANS);
  }
  findPlan(id: string): MunicipalPlan | undefined {
    return structuredClone(this.plans.find((item) => item.id === id));
  }
  listPlans(): MunicipalPlan[] {
    return structuredClone(this.plans);
  }
  createProposal(input: {
    problem: string;
    location: string;
    outcome: string;
    costPesos: number;
    beneficiaries: number;
    sourceOffice: string;
    barangay: string;
    tags: string[];
    evidenceSnapshotId: string;
  }): PlanningProposal | undefined {
    if (
      input.problem.trim().length < 12 ||
      input.location.trim().length < 4 ||
      input.outcome.trim().length < 8 ||
      input.costPesos <= 0 ||
      input.beneficiaries <= 0 ||
      !input.evidenceSnapshotId.trim()
    )
      return undefined;
    this.sequence += 1;
    const tags = input.tags.length ? input.tags : ["Unclassified"];
    const attribution = Math.floor(100 / tags.length);
    const created: PlanningProposal = {
      id: `DEMO-PROP-${String(this.sequence).padStart(3, "0")}`,
      sourceReference: "DEMO-SVC-001",
      sourceOffice: input.sourceOffice.trim(),
      barangay: input.barangay.trim(),
      problem: input.problem.trim(),
      location: input.location.trim(),
      outcome: input.outcome.trim(),
      estimateMinor: Math.round(input.costPesos * 100),
      beneficiaries: input.beneficiaries,
      tags,
      attributions: tags.map((tag, index) => ({
        tag,
        percent: index === tags.length - 1 ? 100 - attribution * (tags.length - 1) : attribution,
      })),
      status: "under-review",
      evidence: {
        snapshotId: input.evidenceSnapshotId.trim(),
        source: "M11 service concern + M15 aggregate snapshot",
        collectedAt: "2026-06-30",
        reportedAt: "2026-07-10",
        coverage: "78 of 92 target households",
        beneficiaries: input.beneficiaries,
        denominator: 356,
        caveat: "Fourteen households were not reached; coverage remains visible to the reviewer.",
      },
      score: 0,
      criteriaVersion: "MPDO-2026-v2",
      rationale: "Submitted for MPDO review; no prioritization decision yet.",
      version: 1,
    };
    this.proposals.unshift(created);
    return structuredClone(created);
  }
  transition(id: string, status: PlanningStatus, reason: string): PlanningProposal | undefined {
    const record = this.proposals.find((item) => item.id === id);
    if (!record) return undefined;
    record.status = status;
    record.rationale = reason;
    record.version += 1;
    return structuredClone(record);
  }

  transitionPlan(id: string, approvalStatus: string, feedback: string): MunicipalPlan | undefined {
    const plan = this.plans.find((item) => item.id === id);
    if (!plan || feedback.trim().length < 8) return undefined;
    plan.approvalStatus = approvalStatus;
    plan.decisionFeedback = feedback.trim();
    return structuredClone(plan);
  }
}

export const developmentPlanningRepository = new DevelopmentPlanningRepository();

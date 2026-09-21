import { BARANGAY_PLANS, MUNICIPAL_PLANS, PLANNING_PROPOSALS } from "../data/development-planning-fixtures";
import type {
  BarangayPlan,
  EvidenceCoverage,
  MunicipalPlan,
  PlanningProposal,
  PlanningStatus,
} from "../types/development-planning";

export class DevelopmentPlanningRepository {
  private proposals = structuredClone(PLANNING_PROPOSALS);
  private barangayPlans = structuredClone(BARANGAY_PLANS);
  private plans = structuredClone(MUNICIPAL_PLANS);
  private proposalSequence = 6;
  private barangayPlanSequence = 5;
  private municipalPlanSequence = 4;

  listProposals(): PlanningProposal[] {
    return structuredClone(this.proposals);
  }

  findProposal(id: string): PlanningProposal | undefined {
    const record = this.proposals.find((item) => item.id === id || item.id === `DEMO-${id}`);
    return record ? structuredClone(record) : undefined;
  }

  listBarangayPlans(): BarangayPlan[] {
    return structuredClone(this.barangayPlans);
  }

  findBarangayPlan(id: string): BarangayPlan | undefined {
    const record = this.barangayPlans.find((item) => item.id === id || item.id === `DEMO-${id}`);
    return record ? structuredClone(record) : undefined;
  }

  findPlan(id: string): MunicipalPlan | undefined {
    const record = this.plans.find((item) => item.id === id || item.id === `DEMO-${id}`);
    return record ? structuredClone(record) : undefined;
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
    evidenceSnapshot?: EvidenceCoverage;
  }): PlanningProposal | undefined {
    if (
      input.problem.trim().length < 12 ||
      input.location.trim().length < 4 ||
      input.outcome.trim().length < 8 ||
      input.sourceOffice.trim().length < 4 ||
      input.barangay.trim().length < 3 ||
      input.costPesos <= 0 ||
      input.beneficiaries <= 0 ||
      !input.evidenceSnapshotId.trim()
    )
      return undefined;
    this.proposalSequence += 1;
    const tags = input.tags.length ? input.tags : ["General development"];
    const attribution = Math.floor(100 / tags.length);
    const created: PlanningProposal = {
      id: `PROP-2026-${String(this.proposalSequence).padStart(3, "0")}`,
      sourceReference: `BDP-2026-${String(this.proposalSequence).padStart(3, "0")}`,
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
      status: "draft",
      evidence:
        input.evidenceSnapshot?.snapshotId === input.evidenceSnapshotId.trim()
          ? structuredClone(input.evidenceSnapshot)
          : {
              snapshotId: input.evidenceSnapshotId.trim(),
              source: "Barangay and municipal planning evidence",
              collectedAt: "2026-09-15",
              reportedAt: "2026-09-20",
              coverage: `${input.beneficiaries} identified beneficiaries`,
              beneficiaries: input.beneficiaries,
              denominator: input.beneficiaries,
            },
      score: 0,
      criteriaVersion: "MPDO-2026-v2",
      rationale: "Draft proposal prepared for review.",
      version: 1,
    };
    this.proposals.unshift(created);
    return structuredClone(created);
  }

  updateProposal(
    id: string,
    input: {
      problem: string;
      location: string;
      outcome: string;
      costPesos: number;
      beneficiaries: number;
      sourceOffice: string;
      barangay: string;
      tags: string[];
      evidenceSnapshotId: string;
      evidenceSnapshot?: EvidenceCoverage;
    },
  ): PlanningProposal | undefined {
    const record = this.proposals.find((item) => item.id === id);
    if (!record || record.status === "archived") return undefined;
    if (
      input.problem.trim().length < 12 ||
      input.location.trim().length < 4 ||
      input.outcome.trim().length < 8 ||
      input.costPesos <= 0 ||
      input.beneficiaries <= 0
    )
      return undefined;
    record.problem = input.problem.trim();
    record.location = input.location.trim();
    record.outcome = input.outcome.trim();
    record.estimateMinor = Math.round(input.costPesos * 100);
    record.beneficiaries = input.beneficiaries;
    record.sourceOffice = input.sourceOffice.trim();
    record.barangay = input.barangay.trim();
    record.tags = input.tags.length ? input.tags : ["General development"];
    if (input.evidenceSnapshot?.snapshotId === input.evidenceSnapshotId.trim()) {
      record.evidence = structuredClone(input.evidenceSnapshot);
    } else {
      record.evidence.snapshotId = input.evidenceSnapshotId.trim();
      record.evidence.beneficiaries = input.beneficiaries;
    }
    record.version += 1;
    return structuredClone(record);
  }

  transition(id: string, status: PlanningStatus, reason: string): PlanningProposal | undefined {
    const record = this.proposals.find((item) => item.id === id);
    if (!record || reason.trim().length < 8) return undefined;
    record.status = status;
    record.rationale = reason.trim();
    record.version += 1;
    return structuredClone(record);
  }

  archiveProposal(id: string): boolean {
    return Boolean(this.transition(id, "archived", "Archived from the active development proposal directory."));
  }

  createBarangayPlan(input: {
    title: string;
    barangay: string;
    councilMinutesReference: string;
    councilComposition: string[];
    priorities: string[];
    status: string;
  }): BarangayPlan | undefined {
    if (
      input.title.trim().length < 6 ||
      input.barangay.trim().length < 3 ||
      input.councilComposition.length === 0 ||
      input.priorities.length === 0
    )
      return undefined;
    this.barangayPlanSequence += 1;
    const created: BarangayPlan = {
      id: `BDP-2026-${String(this.barangayPlanSequence).padStart(3, "0")}`,
      title: input.title.trim(),
      barangay: input.barangay.trim(),
      councilMinutesReference: input.councilMinutesReference.trim() || null,
      councilComposition: input.councilComposition,
      priorities: input.priorities,
      status: input.status,
      submittedAt: input.status === "Submitted" ? "2026-09-20" : undefined,
    };
    this.barangayPlans.unshift(created);
    return structuredClone(created);
  }

  updateBarangayPlan(
    id: string,
    input: {
      title: string;
      barangay: string;
      councilMinutesReference: string;
      councilComposition: string[];
      priorities: string[];
      status: string;
    },
  ): BarangayPlan | undefined {
    const record = this.barangayPlans.find((item) => item.id === id);
    if (!record || record.status === "Archived") return undefined;
    if (input.title.trim().length < 6 || input.barangay.trim().length < 3 || input.priorities.length === 0)
      return undefined;
    record.title = input.title.trim();
    record.barangay = input.barangay.trim();
    record.councilMinutesReference = input.councilMinutesReference.trim() || null;
    record.councilComposition = input.councilComposition;
    record.priorities = input.priorities;
    record.status = input.status;
    return structuredClone(record);
  }

  transitionBarangayPlan(id: string, status: string): BarangayPlan | undefined {
    const record = this.barangayPlans.find((item) => item.id === id);
    if (!record) return undefined;
    record.status = status;
    if (status === "Submitted") record.submittedAt = "2026-09-20";
    return structuredClone(record);
  }

  archiveBarangayPlan(id: string): boolean {
    return Boolean(this.transitionBarangayPlan(id, "Archived"));
  }

  createPlan(input: {
    level: MunicipalPlan["level"];
    title: string;
    fiscalYears: string;
    version: string;
    parentReference: string;
    changeSummary: string;
    approvalStatus: string;
    itemReferences: string[];
  }): MunicipalPlan | undefined {
    if (
      input.title.trim().length < 6 ||
      input.fiscalYears.trim().length < 4 ||
      input.version.trim().length < 2 ||
      input.itemReferences.length === 0
    )
      return undefined;
    this.municipalPlanSequence += 1;
    const created: MunicipalPlan = {
      id: `${input.level}-2026-${String(this.municipalPlanSequence).padStart(3, "0")}`,
      level: input.level,
      title: input.title.trim(),
      fiscalYears: input.fiscalYears.trim(),
      version: input.version.trim(),
      changeSummary: input.changeSummary.trim(),
      approvalStatus: input.approvalStatus,
      parentReference: input.parentReference.trim() || undefined,
      itemReferences: input.itemReferences,
    };
    this.plans.unshift(created);
    return structuredClone(created);
  }

  updatePlan(
    id: string,
    input: {
      level: MunicipalPlan["level"];
      title: string;
      fiscalYears: string;
      version: string;
      parentReference: string;
      changeSummary: string;
      approvalStatus: string;
      itemReferences: string[];
    },
  ): MunicipalPlan | undefined {
    const record = this.plans.find((item) => item.id === id);
    if (!record || record.approvalStatus === "Archived") return undefined;
    if (input.title.trim().length < 6 || input.fiscalYears.trim().length < 4 || input.itemReferences.length === 0)
      return undefined;
    record.level = input.level;
    record.title = input.title.trim();
    record.fiscalYears = input.fiscalYears.trim();
    record.previousVersion = record.version;
    record.version = input.version.trim();
    record.parentReference = input.parentReference.trim() || undefined;
    record.changeSummary = input.changeSummary.trim();
    record.approvalStatus = input.approvalStatus;
    record.itemReferences = input.itemReferences;
    return structuredClone(record);
  }

  transitionPlan(id: string, approvalStatus: string, feedback: string): MunicipalPlan | undefined {
    const plan = this.plans.find((item) => item.id === id);
    if (!plan || feedback.trim().length < 8) return undefined;
    plan.approvalStatus = approvalStatus;
    plan.decisionFeedback = feedback.trim();
    return structuredClone(plan);
  }

  archivePlan(id: string): boolean {
    return Boolean(this.transitionPlan(id, "Archived", "Archived from the active municipal plan directory."));
  }
}

export const developmentPlanningRepository = new DevelopmentPlanningRepository();

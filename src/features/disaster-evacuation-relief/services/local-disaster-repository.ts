import {
  DAMAGE_ASSESSMENTS,
  DISASTER_ACTIVITIES,
  EVACUATION_CENTERS,
  EVACUATION_HOUSEHOLDS,
  RELIEF_DISTRIBUTIONS,
} from "../data/disaster-fixtures";
import type { ActivityValues, AssessmentValues, CenterValues, DistributionValues } from "../schemas/disaster-schema";
import type {
  DamageAssessment,
  DisasterActivity,
  EvacuationCenter,
  EvacuationHousehold,
  ReliefDistribution,
} from "../types/disaster-records";

function nextId(prefix: string, records: readonly { id: string }[]) {
  const highest = records.reduce((current, item) => {
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

export class LocalDisasterRepository {
  readonly activities = structuredClone(DISASTER_ACTIVITIES) as DisasterActivity[];
  readonly centers = structuredClone(EVACUATION_CENTERS) as EvacuationCenter[];
  readonly households = structuredClone(EVACUATION_HOUSEHOLDS) as EvacuationHousehold[];
  readonly distributions = structuredClone(RELIEF_DISTRIBUTIONS) as ReliefDistribution[];
  readonly assessments = structuredClone(DAMAGE_ASSESSMENTS) as DamageAssessment[];

  activity(id: string) {
    return this.activities.find((item) => item.id === id);
  }

  event(id: string) {
    return this.activity(id);
  }

  center(id: string) {
    return this.centers.find((item) => item.id === id);
  }

  distribution(id: string) {
    return this.distributions.find((item) => item.id === id);
  }

  assessment(id: string) {
    return this.assessments.find((item) => item.id === id);
  }

  activityCenters(activityId: string) {
    return this.centers.filter((item) => item.activityId === activityId);
  }

  activityDistributions(activityId: string) {
    return this.distributions.filter((item) => item.activityId === activityId);
  }

  activityAssessments(activityId: string) {
    return this.assessments.filter((item) => item.activityId === activityId);
  }

  centerHouseholds(centerId: string) {
    return this.households.filter((item) => item.assignedCenterId === centerId);
  }

  createActivity(values: ActivityValues) {
    const record: DisasterActivity = {
      ...values,
      id: nextId("DRRM-ACT-2026", this.activities),
      affectedBarangays: list(values.affectedBarangays),
    };
    this.activities.unshift(record);
    return record;
  }

  updateActivity(id: string, values: ActivityValues) {
    const record = this.activity(id);
    if (!record) return undefined;
    Object.assign(record, values, { affectedBarangays: list(values.affectedBarangays) });
    return record;
  }

  deleteActivity(id: string) {
    const index = this.activities.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.activities.splice(index, 1);
    this.centers.splice(0, this.centers.length, ...this.centers.filter((item) => item.activityId !== id));
    this.distributions.splice(
      0,
      this.distributions.length,
      ...this.distributions.filter((item) => item.activityId !== id),
    );
    this.assessments.splice(0, this.assessments.length, ...this.assessments.filter((item) => item.activityId !== id));
    return true;
  }

  createDistribution(values: DistributionValues) {
    const record: ReliefDistribution = {
      ...values,
      id: nextId("DRRM-DST-2026", this.distributions),
    };
    this.distributions.unshift(record);
    return record;
  }

  updateDistribution(id: string, values: DistributionValues) {
    const record = this.distribution(id);
    if (!record) return undefined;
    Object.assign(record, values);
    return record;
  }

  deleteDistribution(id: string) {
    const index = this.distributions.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.distributions.splice(index, 1);
    return true;
  }

  createCenter(values: CenterValues) {
    const record: EvacuationCenter = {
      ...values,
      id: nextId("DRRM-CTR-2026", this.centers),
      version: 1,
      facilities: list(values.facilities),
    };
    this.centers.unshift(record);
    return record;
  }

  updateCenter(id: string, values: CenterValues) {
    const record = this.center(id);
    if (!record) return undefined;
    Object.assign(record, values, { facilities: list(values.facilities), version: record.version + 1 });
    return record;
  }

  deleteCenter(id: string) {
    const index = this.centers.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.centers.splice(index, 1);
    return true;
  }

  createAssessment(values: AssessmentValues) {
    const record: DamageAssessment = {
      ...values,
      id: nextId("DRRM-ASM-2026", this.assessments),
      evidence: list(values.evidence),
      referralPrepared: values.status === "Referred",
    };
    this.assessments.unshift(record);
    return record;
  }

  updateAssessment(id: string, values: AssessmentValues) {
    const record = this.assessment(id);
    if (!record) return undefined;
    Object.assign(record, values, {
      evidence: list(values.evidence),
      referralPrepared: values.status === "Referred",
    });
    return record;
  }

  deleteAssessment(id: string) {
    const index = this.assessments.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.assessments.splice(index, 1);
    return true;
  }

  validateExposure(householdId: string) {
    const household = this.households.find((item) => item.householdId === householdId);
    if (!household) return false;
    household.exposureStatus = "Validated";
    return true;
  }

  setOccupant(centerId: string, householdId: string, personId: string, action: "check-in" | "check-out") {
    const center = this.center(centerId);
    const household = this.households.find((item) => item.householdId === householdId);
    const member = household?.members.find((item) => item.id === personId);
    if (!center || !member) return "missing";
    if (action === "check-in") {
      if (member.status === "Checked in") return "replayed";
      if (center.acceptedOccupants >= center.capacity) return "full";
      member.status = "Checked in";
      center.acceptedOccupants += 1;
    } else {
      if (member.status !== "Checked in") return "not-checked-in";
      member.status = "At home";
      center.acceptedOccupants = Math.max(0, center.acceptedOccupants - 1);
    }
    center.version += 1;
    return "updated";
  }

  publicAdvisory(id: string) {
    const activity = this.activity(id);
    return (
      activity && {
        id: activity.id,
        name: activity.name,
        source: activity.leadOffice,
        issuedAt: activity.updatedAt,
        scopes: activity.affectedBarangays,
        summary: activity.summary,
        reference: activity.advisoryReference,
      }
    );
  }
}

export const localDisasterRepository = new LocalDisasterRepository();

import { BUSINESS_RECORD_FIXTURES, BUSINESS_REGISTRY_FIXTURES } from "../data/business-fixtures";
import type { BusinessApplicationPathId } from "../types/business-journey";
import type {
  BusinessApplicationRecord,
  BusinessRegistryRecord,
  BusinessRequirementStatus,
  BusinessReviewStatus,
} from "../types/business-records";

export type BusinessRegistryInput = Omit<BusinessRegistryRecord, "id" | "createdAt" | "updatedAt">;
export type BusinessApplicationInput = Pick<
  BusinessApplicationRecord,
  | "businessId"
  | "path"
  | "fiscalPeriod"
  | "status"
  | "filedAt"
  | "targetRelease"
  | "assignedOfficer"
  | "representativeLabel"
  | "activity"
  | "location"
  | "declaredChange"
>;

let businesses = structuredClone(BUSINESS_REGISTRY_FIXTURES) as BusinessRegistryRecord[];
let applications = structuredClone(BUSINESS_RECORD_FIXTURES) as BusinessApplicationRecord[];
let businessSequence = businesses.length + 1;
let applicationSequence = 149;
let permitSequence = 300;
const now = () => "2026-09-19 10:30";

function businessId() {
  return `BIZ-2026-${String(businessSequence++).padStart(4, "0")}`;
}

function applicationId() {
  return `APP-2026-${String(applicationSequence++).padStart(4, "0")}`;
}

export const businessRepository = {
  list: () => applications,
  read: (id: string) => applications.find((record) => record.id === id),
  listBusinesses: () => businesses,
  readBusiness: (id: string) => businesses.find((record) => record.id === id),
  applicationsForBusiness: (id: string) => applications.filter((record) => record.businessId === id),

  createBusiness(input: BusinessRegistryInput) {
    const created: BusinessRegistryRecord = { ...input, id: businessId(), createdAt: now(), updatedAt: now() };
    businesses = [created, ...businesses];
    return created;
  },
  updateBusiness(id: string, input: BusinessRegistryInput) {
    const current = this.readBusiness(id);
    if (!current) return undefined;
    Object.assign(current, input, { updatedAt: now() });
    applications
      .filter((application) => application.businessId === id)
      .forEach((application) => {
        application.businessName = input.registeredName;
        application.establishmentName = input.tradeName;
        application.activity = input.activity;
        application.location = input.address;
      });
    return current;
  },
  deleteBusiness(id: string) {
    const exists = businesses.some((record) => record.id === id);
    if (!exists) return false;
    businesses = businesses.filter((record) => record.id !== id);
    applications = applications.filter((record) => record.businessId !== id);
    return true;
  },

  createApplication(input: BusinessApplicationInput) {
    const business = this.readBusiness(input.businessId);
    if (!business) return undefined;
    const id = applicationId();
    const suffix = id.split("-").at(-1) ?? "NEW";
    const created: BusinessApplicationRecord = {
      id,
      businessId: business.id,
      businessName: business.registeredName,
      establishmentId: `EST-${business.id.slice(4)}`,
      establishmentName: business.tradeName,
      representativeId: `ACC-${business.id.slice(4)}`,
      representativeLabel: input.representativeLabel,
      representationStatus: "active",
      path: input.path,
      fiscalPeriod: input.fiscalPeriod,
      status: input.status,
      filedAt: input.filedAt,
      targetRelease: input.targetRelease,
      assignedOfficer: input.assignedOfficer,
      revision: 1,
      activity: input.activity,
      location: input.location,
      declaredChange: input.declaredChange,
      requirements: [
        {
          id: `REQ-DTI-${suffix}`,
          label: "DTI, SEC, or CDA registration",
          status: "valid",
          reusable: true,
          revision: 1,
        },
        {
          id: `REQ-BRGY-${suffix}`,
          label: "Barangay business clearance",
          status: "valid",
          reusable: false,
          revision: 1,
        },
        {
          id: `REQ-FIRE-${suffix}`,
          label: "Fire safety inspection certificate",
          status: "missing",
          reusable: false,
          revision: 1,
        },
      ],
      reviews: [
        {
          id: `REV-BPLO-${suffix}`,
          office: "Business Permits and Licensing Office",
          assignee: input.assignedOfficer,
          status: "not-started",
        },
        {
          id: `REV-FIRE-${suffix}`,
          office: "Bureau of Fire Protection",
          assignee: "Unassigned",
          status: "not-started",
        },
      ],
      barangayClearance: { requestId: `BCLR-2026-${suffix}`, status: "pending" },
      assessment: null,
      permits: [],
      documentRoute: { recordId: `DOC-2026-${suffix}`, status: "not-routed" },
      timeline: [{ id: "T1", label: "Application created", at: now(), actor: "Receiving Officer" }],
    };
    applications = [created, ...applications];
    return created;
  },
  updateApplication(id: string, input: BusinessApplicationInput) {
    const current = this.read(id);
    const business = this.readBusiness(input.businessId);
    if (!current || !business) return undefined;
    Object.assign(current, input, {
      businessName: business.registeredName,
      establishmentName: business.tradeName,
      revision: current.revision + 1,
    });
    current.timeline.push({
      id: `T${current.timeline.length + 1}`,
      label: "Application details updated",
      at: now(),
      actor: "BPLO Staff",
    });
    return current;
  },
  deleteApplication(id: string) {
    const exists = applications.some((record) => record.id === id);
    if (!exists) return false;
    applications = applications.filter((record) => record.id !== id);
    return true;
  },
  updateRequirement(id: string, requirementId: string, status: BusinessRequirementStatus) {
    const record = this.read(id);
    const requirement = record?.requirements.find((item) => item.id === requirementId);
    if (!record || !requirement) return undefined;
    requirement.status = status;
    requirement.revision += 1;
    record.revision += 1;
    record.timeline.push({
      id: `T${record.timeline.length + 1}`,
      label: `${requirement.label}: ${status}`,
      at: now(),
      actor: "BPLO Staff",
    });
    return record;
  },
  decideReview(id: string, reviewId: string, decision: BusinessReviewStatus, reason?: string) {
    const record = this.read(id);
    const review = record?.reviews.find((item) => item.id === reviewId);
    if (!record || !review) return undefined;
    review.status = decision;
    review.reason = reason?.trim() || undefined;
    if (decision === "for-correction") record.status = "for-correction";
    record.timeline.push({
      id: `T${record.timeline.length + 1}`,
      label: `${review.office}: ${decision}`,
      at: now(),
      actor: review.assignee,
    });
    return record;
  },
  confirmPayment(id: string) {
    const record = this.read(id);
    if (!record?.assessment) return undefined;
    record.assessment.paymentStatus = "paid";
    record.timeline.push({
      id: `T${record.timeline.length + 1}`,
      label: "Payment confirmed",
      at: now(),
      actor: "Municipal Treasurer's Office",
    });
    return record;
  },
  issue(id: string) {
    const record = this.read(id);
    if (
      !record ||
      record.reviews.some((review) => !["approved", "not-applicable"].includes(review.status)) ||
      record.barangayClearance.status !== "valid" ||
      (record.assessment && record.assessment.paymentStatus !== "paid")
    )
      return undefined;
    record.status = record.path === "closure" ? "closed" : "issued";
    if (record.path !== "closure")
      record.permits.push({
        serial: `BP-2026-${String(permitSequence++).padStart(5, "0")}`,
        version: record.permits.length + 1,
        status: "active",
        issuedAt: now(),
      });
    record.timeline.push({
      id: `T${record.timeline.length + 1}`,
      label: record.path === "closure" ? "Closure approved" : "Business permit issued",
      at: now(),
      actor: "BPLO Signatory",
    });
    return record;
  },

  // Retained for the public application flow until its form is migrated to the staff record model.
  saveDraft(input: { path: BusinessApplicationPathId; activity: string; location: string }) {
    const business = businesses[0];
    const created = this.createApplication({
      businessId: business.id,
      path: input.path,
      fiscalPeriod: "2026",
      status: "draft",
      filedAt: now(),
      targetRelease: "2026-09-30",
      assignedOfficer: "Unassigned",
      representativeLabel: `${business.ownerName} — owner`,
      activity: input.activity,
      location: input.location,
      declaredChange: "",
    });
    if (!created) throw new Error("Unable to create application");
    return created;
  },
  submit(id: string) {
    const record = this.read(id);
    if (!record || record.requirements.some((item) => ["missing", "expired"].includes(item.status))) return record;
    record.status = "submitted";
    record.timeline.push({
      id: `T${record.timeline.length + 1}`,
      label: "Application submitted",
      at: now(),
      actor: "Applicant",
    });
    return record;
  },
  correctRequirement(id: string, requirementId: string) {
    return this.updateRequirement(id, requirementId, "valid");
  },
};

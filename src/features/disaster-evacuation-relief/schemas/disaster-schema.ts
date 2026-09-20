import { z } from "zod";

const requiredText = (label: string) => z.string().trim().min(2, `${label} is required.`);
const dateTime = z.string().trim().min(10, "Enter a valid date and time.");

export const activitySchema = z.object({
  name: requiredText("Activity name"),
  type: z.enum([
    "Typhoon",
    "Flood",
    "Storm surge",
    "Tsunami",
    "Landslide",
    "Fire",
    "Earthquake",
    "Volcanic activity",
    "Maritime incident",
  ]),
  status: z.enum(["Monitoring", "Active response", "Contained", "Closed"]),
  priority: z.enum(["Low", "Moderate", "High", "Critical"]),
  leadOffice: requiredText("Lead office"),
  incidentCommander: requiredText("Incident commander"),
  startedAt: dateTime,
  updatedAt: dateTime,
  affectedBarangays: z.string().trim().min(2, "Enter at least one affected barangay."),
  summary: z.string().trim().min(12, "Describe the operational situation in at least 12 characters."),
  advisoryReference: requiredText("Advisory reference"),
});
export type ActivityValues = z.infer<typeof activitySchema>;

export const distributionSchema = z.object({
  activityId: requiredText("Activity reference"),
  round: requiredText("Distribution round"),
  recipientId: requiredText("Recipient reference"),
  recipientName: requiredText("Recipient name"),
  barangay: requiredText("Barangay"),
  items: z.string().trim().min(5, "List the released relief items."),
  distributionSite: requiredText("Distribution site"),
  releasedAt: dateTime,
  acknowledgment: requiredText("Acknowledgment reference"),
  status: z.enum(["Released", "Pending confirmation", "Duplicate review", "Cancelled"]),
});
export type DistributionValues = z.infer<typeof distributionSchema>;

export const centerSchema = z
  .object({
    activityId: requiredText("Activity reference"),
    name: requiredText("Center name"),
    barangay: requiredText("Barangay"),
    address: z.string().trim().min(8, "Enter the complete center address."),
    capacity: z.coerce.number().int().min(1, "Capacity must be at least one."),
    acceptedOccupants: z.coerce.number().int().min(0, "Accepted occupants cannot be negative."),
    pendingOccupants: z.coerce.number().int().min(0, "Pending occupants cannot be negative."),
    status: z.enum(["Open", "Standby", "Closed"]),
    manager: requiredText("Center manager"),
    contactNumber: z.string().trim().min(7, "Enter the center contact number."),
    facilities: z.string().trim().min(2, "Enter at least one facility."),
  })
  .refine((values) => values.acceptedOccupants <= values.capacity, {
    path: ["acceptedOccupants"],
    message: "Accepted occupants cannot exceed the center capacity.",
  });
export type CenterValues = z.infer<typeof centerSchema>;

export const assessmentSchema = z.object({
  activityId: requiredText("Activity reference"),
  householdId: requiredText("Household reference"),
  residentName: requiredText("Household name"),
  barangay: requiredText("Barangay"),
  structureId: requiredText("Structure reference"),
  category: requiredText("Damage category"),
  observation: z.string().trim().min(8, "Describe the assessment in at least eight characters."),
  evidence: z.string().trim().min(2, "Enter at least one evidence reference."),
  assessedAt: dateTime,
  assessor: requiredText("Assessor"),
  status: z.enum(["Draft", "For verification", "Verified", "Referred"]),
  referral: requiredText("Referral or next action"),
});
export type AssessmentValues = z.infer<typeof assessmentSchema>;

import { z } from "zod";

const requiredText = (label: string) => z.string().trim().min(2, `${label} is required.`);

export const caseRecordSchema = z.object({
  caseClass: z.enum(["Barangay justice", "VAWC referral", "Child protection", "Blotter record"]),
  participantPersonIds: z.array(z.string().trim().min(1)).default([]),
  discreetLabel: requiredText("Case label"),
  scope: requiredText("Barangay or scope"),
  assignedDesk: requiredText("Assigned desk"),
  assignedOfficer: requiredText("Assigned officer"),
  procedureVersion: requiredText("Procedure"),
  priority: z.enum(["Routine", "Priority", "Urgent"]),
  status: z.enum(["New", "Under review", "Scheduled", "Referred", "Resolved", "Closed"]),
  openedAt: requiredText("Opened date"),
  updatedAt: requiredText("Updated date"),
  schedule: requiredText("Schedule or next action"),
  administrativeSummary: z.string().trim().min(8, "Enter an administrative summary of at least eight characters."),
  evidence: requiredText("Evidence reference"),
  referral: requiredText("Referral or disposition"),
  certificateEligibility: z.enum(["Eligible", "Not eligible", "Pending review"]),
});
export type CaseRecordValues = z.infer<typeof caseRecordSchema>;

export const accessAssignmentSchema = z.object({
  staffName: requiredText("Staff name"),
  staffRole: requiredText("Staff role"),
  caseClass: z.enum(["Barangay justice", "VAWC referral", "Child protection", "Blotter record"]),
  scope: requiredText("Barangay or scope"),
  purpose: z.string().trim().min(8, "Enter a specific access purpose."),
  grantedAt: requiredText("Granted date"),
  expiresAt: requiredText("Expiry date"),
  status: z.enum(["Active", "Revoked", "Expired"]),
});
export type AccessAssignmentValues = z.infer<typeof accessAssignmentSchema>;

export const timelineEntrySchema = z.object({
  at: requiredText("Date and time"),
  action: requiredText("Activity"),
  officer: requiredText("Officer"),
  note: z.string().trim().min(5, "Enter a brief activity note."),
});
export type TimelineEntryValues = z.infer<typeof timelineEntrySchema>;

export const disclosureSchema = z.object({
  purpose: z.string().trim().min(8, "Enter the disclosure purpose."),
  requestedFields: z.string().trim().min(2, "List the requested fields."),
  actor: requiredText("Reviewing officer"),
  outcome: z.enum(["Approved", "Denied"]),
});
export type DisclosureValues = z.infer<typeof disclosureSchema>;

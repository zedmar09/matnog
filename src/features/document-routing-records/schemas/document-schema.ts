import { z } from "zod";

export const documentRegistrationSchema = z.object({
  direction: z.enum(["incoming", "outgoing"]),
  documentType: z.string().trim().min(3, "Enter a document type of at least three characters."),
  sourceModule: z.string().regex(/^M(?:0[1-9]|1[0-7])$/, "Select a source module from M01 to M17."),
  sourceRecordId: z.string().trim().min(5, "Enter the source record reference."),
  subject: z.string().trim().min(8, "Enter a subject of at least eight characters."),
  classification: z.enum(["public", "internal", "restricted"]),
  filename: z.string().regex(/\.pdf$/i, "Choose a PDF document."),
  attachmentNote: z.string().trim().min(8, "Describe the attachment in at least eight characters."),
  routeOfficeId: z.string().min(1, "Select the initial receiving office."),
});

export type DocumentRegistrationValues = z.infer<typeof documentRegistrationSchema>;

export const documentMetadataSchema = documentRegistrationSchema.omit({ filename: true, attachmentNote: true });

export type DocumentMetadataValues = z.infer<typeof documentMetadataSchema>;

export const fileReplacementSchema = z.object({
  filename: z.string().regex(/\.pdf$/i, "Choose a PDF document."),
  note: z.string().trim().min(8, "Explain the replacement in at least eight characters."),
});

export type FileReplacementValues = z.infer<typeof fileReplacementSchema>;

export const routeStageAssignmentSchema = z.object({
  title: z.string().trim().min(8, "Describe the stage in at least eight characters."),
  officeId: z.string().min(1, "Select the receiving office."),
  assigneePersona: z.string().trim().min(3, "Enter the assigned persona."),
  dueAt: z.string().min(1, "Choose a due date and time."),
  acknowledgmentRequired: z.enum(["yes", "no"]),
  placement: z.enum(["next-sequential", "current-parallel"]),
  assignmentNote: z.string().trim().min(8, "Explain the assignment in at least eight characters."),
});

export type RouteStageAssignmentValues = z.infer<typeof routeStageAssignmentSchema>;

export const routeDecisionSchema = z.object({
  note: z.string().trim().min(8, "Record a review note of at least eight characters."),
});

export type RouteDecisionValues = z.infer<typeof routeDecisionSchema>;

export const custodyAcceptanceSchema = z.object({
  trackingReference: z.string().trim().min(5, "Enter the tracking reference."),
  receiverOfficeId: z.string().min(1, "Select the receiving office."),
});

export type CustodyAcceptanceValues = z.infer<typeof custodyAcceptanceSchema>;

export const custodyDisputeSchema = z.object({
  reason: z.string().trim().min(8, "Explain the custody dispute in at least eight characters."),
});

export type CustodyDisputeValues = z.infer<typeof custodyDisputeSchema>;

export const documentReleaseSchema = z.object({
  versionId: z.string().min(1, "Select an approved revision."),
  note: z.string().trim().min(8, "Record a release note of at least eight characters."),
});

export type DocumentReleaseValues = z.infer<typeof documentReleaseSchema>;

export const archiveHoldSchema = z.object({
  reason: z.string().trim().min(8, "Record a hold reason of at least eight characters."),
});

export type ArchiveHoldValues = z.infer<typeof archiveHoldSchema>;

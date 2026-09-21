import { z } from "zod";

export const certificateTypeIds = ["residency", "clearance", "indigency", "business-clearance"] as const;
export const certificateEvidenceIds = [
  "resident-registry-projection",
  "purpose-letter",
  "assistance-letter",
  "business-site-declaration",
] as const;

export const certificateEvidenceOptions = [
  { id: "resident-registry-projection", label: "Barangay residency record (on file)" },
  { id: "purpose-letter", label: "Purpose or request letter" },
  { id: "assistance-letter", label: "Assistance referral letter" },
  { id: "business-site-declaration", label: "Business and site declaration" },
] as const;

const expectedEvidence: Record<(typeof certificateTypeIds)[number], (typeof certificateEvidenceOptions)[number]["id"]> =
  {
    residency: "resident-registry-projection",
    clearance: "purpose-letter",
    indigency: "assistance-letter",
    "business-clearance": "business-site-declaration",
  };

export const certificateRequestSchema = z
  .object({
    certificateTypeId: z.enum(certificateTypeIds),
    purpose: z
      .string()
      .trim()
      .min(12, "Describe the specific purpose in at least 12 characters.")
      .max(240, "Keep the purpose to 240 characters or fewer."),
    requestingOffice: z
      .string()
      .trim()
      .min(3, "Name the school, office, employer, programme, or transaction requesting the document.")
      .max(120, "Keep the requesting office to 120 characters or fewer."),
    barangayId: z.enum(["DEMO-BRGY-A", "DEMO-BRGY-B", "DEMO-BRGY-C"]),
    claimMethod: z.enum(["barangay-counter", "digital-copy"]),
    evidenceRef: z.enum(certificateEvidenceIds),
  })
  .superRefine((values, context) => {
    if (values.evidenceRef !== expectedEvidence[values.certificateTypeId]) {
      context.addIssue({
        code: "custom",
        path: ["evidenceRef"],
        message: "Choose the supporting document that matches the selected type.",
      });
    }
  });

export type CertificateRequestValues = z.infer<typeof certificateRequestSchema>;

export const certificateDraftSchema = z.object({
  certificateTypeId: z.enum(certificateTypeIds),
  purpose: z.string(),
  requestingOffice: z.string(),
  barangayId: z.enum(["DEMO-BRGY-A", "DEMO-BRGY-B", "DEMO-BRGY-C"]),
  claimMethod: z.enum(["barangay-counter", "digital-copy"]),
  evidenceRef: z.enum(certificateEvidenceIds),
});

export const certificateCorrectionSchema = z.object({
  purpose: z
    .string()
    .trim()
    .min(12, "Describe the corrected purpose in at least 12 characters.")
    .max(240, "Keep the purpose to 240 characters or fewer."),
  requestingOffice: z
    .string()
    .trim()
    .min(3, "Name the requesting school, office, employer, programme, or transaction."),
  evidenceRef: z.string().min(1, "Choose the corrected supporting document."),
  correctionNote: z.string().trim().min(8, "Explain the correction in at least eight characters."),
});

export type CertificateCorrectionValues = z.infer<typeof certificateCorrectionSchema>;

export function defaultEvidenceFor(typeId: CertificateRequestValues["certificateTypeId"]) {
  return expectedEvidence[typeId];
}

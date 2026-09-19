import { z } from "zod";

export const certificateReturnSchema = z.object({
  reason: z.string().trim().min(8, "Explain the required correction in at least eight characters."),
});

export type CertificateReturnValues = z.infer<typeof certificateReturnSchema>;

export const certificateFeeSchema = z
  .object({
    kind: z.enum(["assessment", "exempt"]),
    ruleLabel: z.string().trim().max(120, "Keep the sample rule label to 120 characters or fewer."),
    exemptionBasis: z.string().trim().max(240, "Keep the exemption basis to 240 characters or fewer."),
  })
  .superRefine((values, context) => {
    if (values.kind === "assessment" && values.ruleLabel.length < 5) {
      context.addIssue({ code: "custom", path: ["ruleLabel"], message: "Name the sample fee rule." });
    }
    if (values.kind === "exempt" && values.exemptionBasis.length < 8) {
      context.addIssue({
        code: "custom",
        path: ["exemptionBasis"],
        message: "Record the exemption basis in at least eight characters.",
      });
    }
  });

export type CertificateFeeValues = z.infer<typeof certificateFeeSchema>;

export const certificateSignoffSchema = z.object({
  templateVersionId: z.string().min(1, "Select the active template version."),
  snapshotConfirmed: z.boolean().refine(Boolean, "Confirm the exact request and template snapshot."),
});

export type CertificateSignoffValues = z.infer<typeof certificateSignoffSchema>;

export const certificateReprintSchema = z.object({
  reason: z.string().trim().min(8, "Explain why another sample copy is needed."),
});

export type CertificateReprintValues = z.infer<typeof certificateReprintSchema>;

export const certificateRevocationSchema = z.object({
  reason: z.string().trim().min(8, "Record the revocation reason in at least eight characters."),
});

export type CertificateRevocationValues = z.infer<typeof certificateRevocationSchema>;

/** A template version's own configuration and printable layout. */
export const certificateTemplateSchema = z.object({
  certificateTypeId: z.string().trim().min(1, "Choose the certificate type."),
  certificateTypeLabel: z.string().trim().min(3, "Name the certificate as it should print."),
  status: z.enum(["active", "retired", "restricted"]),
  signatoryRole: z.string().trim().min(3, "Name the signatory role."),
  serialPrefix: z
    .string()
    .trim()
    .min(3, "Give a serial prefix of at least three characters.")
    .regex(/^[A-Z0-9-]+$/, "Use capital letters, numbers and hyphens only."),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format."),
  body: z.string().trim().min(20, "The printable layout cannot be empty."),
});

export type CertificateTemplateValues = z.infer<typeof certificateTemplateSchema>;

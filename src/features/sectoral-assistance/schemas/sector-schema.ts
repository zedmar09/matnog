import { z } from "zod";

import { SECTOR_CATEGORIES } from "../types/sectoral-assistance";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A sector registration. Validity is a dated period on every record, so a
 * status can never be recorded as a permanent flag.
 */
export const sectorRecordSchema = z
  .object({
    personId: z.string().trim().min(1, "Choose the resident."),
    personLabel: z.string().trim().min(1, "Choose the resident."),
    category: z.enum(SECTOR_CATEGORIES),
    authority: z.string().trim().min(3, "Name the issuing office."),
    status: z.enum(["Active", "Expired", "Evidence review", "Deactivated"]),
    validFrom: z.string().trim().min(1, "Give a start date."),
    validTo: z.string().trim().min(1, "Give an end date."),
    source: z.string().trim().min(3, "Record where this status came from."),
    evidence: z.string().trim().min(3, "List at least one piece of evidence."),
    credential: z.string().trim().min(1, "Name the credential, or say none is issued."),
  })
  .refine(
    // A record still under review has no decided period yet, so the date rule
    // applies only once both ends are real dates.
    (value) => !DATE_ONLY.test(value.validFrom) || !DATE_ONLY.test(value.validTo) || value.validTo >= value.validFrom,
    { message: "The end date cannot be before the start date.", path: ["validTo"] },
  )
  .refine((value) => value.status !== "Active" || (DATE_ONLY.test(value.validFrom) && DATE_ONLY.test(value.validTo)), {
    message: "An active status needs a decided validity period in YYYY-MM-DD.",
    path: ["validFrom"],
  });

export type SectorRecordValues = z.infer<typeof sectorRecordSchema>;

export const sectorDeactivationSchema = z.object({
  reason: z.enum(["no-longer-qualified", "moved-out", "deceased", "recorded-in-error"]),
  note: z.string().trim().min(8, "Record a reason of at least eight characters."),
  on: z.string().regex(DATE_ONLY, "Use the YYYY-MM-DD format."),
});

export type SectorDeactivationValues = z.infer<typeof sectorDeactivationSchema>;

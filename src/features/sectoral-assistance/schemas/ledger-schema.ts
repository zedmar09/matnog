import { z } from "zod";

export const ledgerEntrySchema = z.object({
  requestId: z.string().trim().min(3, "Enter the assistance request reference."),
  recipient: z.string().trim().min(3, "Enter the resident or household reference."),
  recipientName: z.string().trim().min(3, "Enter the recipient name."),
  program: z.string().trim().min(3, "Enter the assistance program."),
  period: z.string().trim().min(3, "Enter the benefit period."),
  value: z.string().trim().min(2, "Enter the released benefit or value."),
  fundSource: z.string().trim().min(3, "Enter the fund source."),
  releasedAt: z.string().trim().min(10, "Enter the release date and time."),
  acknowledgment: z.string().trim().min(3, "Enter the acknowledgment reference."),
  status: z.enum(["Released", "Pending confirmation", "Cancelled"]),
});

export type LedgerEntryValues = z.infer<typeof ledgerEntrySchema>;

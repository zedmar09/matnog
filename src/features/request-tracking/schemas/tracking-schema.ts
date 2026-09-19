import { z } from "zod";
export const trackingSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1, "Enter your reference number.")
    .max(40, "Reference numbers must be 40 characters or fewer.")
    .regex(/^[a-zA-Z0-9-]+$/, "Use letters, numbers, and hyphens only."),
});
export type TrackingValues = z.infer<typeof trackingSchema>;

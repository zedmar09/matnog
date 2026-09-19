import { z } from "zod";

export const routingTemplateStageSchema = z.object({
  title: z.string().trim().min(8, "Describe the stage in at least eight characters."),
  officeId: z.string().min(1, "Select a receiving office."),
  assigneePersona: z.string().trim().min(3, "Enter the assigned persona."),
  dueDays: z.number().int().min(1, "Allow at least one day.").max(30, "Use 30 days or fewer."),
  acknowledgmentRequired: z.boolean(),
});

export type RoutingTemplateStageValues = z.infer<typeof routingTemplateStageSchema>;

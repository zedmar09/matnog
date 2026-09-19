import { z } from "zod";

export const businessRegistrySchema = z.object({
  registeredName: z.string().trim().min(2, "Enter the registered business name."),
  tradeName: z.string().trim().min(2, "Enter the trade or establishment name."),
  organizationType: z.enum(["Sole proprietorship", "Partnership", "Corporation", "Cooperative"]),
  ownerName: z.string().trim().min(2, "Enter the owner or authorized organization."),
  contactNumber: z.string().trim().min(7, "Enter a valid contact number."),
  email: z.email("Enter a valid email address."),
  tin: z.string().trim().min(9, "Enter the taxpayer identification number."),
  activity: z.string().trim().min(5, "Describe the primary business activity."),
  address: z.string().trim().min(5, "Enter the establishment address."),
  barangay: z.string().trim().min(2, "Enter the barangay."),
  employeeCount: z.coerce.number().int().min(0, "Employee count cannot be negative."),
  status: z.enum(["Active", "Expiring soon", "Expired", "Closed"]),
  permitNumber: z.string().trim().min(3, "Enter the current permit number or N/A."),
  permitValidUntil: z.string().min(1, "Enter the permit validity date."),
});

export type BusinessRegistryValues = z.infer<typeof businessRegistrySchema>;

export const businessApplicationSchema = z.object({
  businessId: z.string().min(1, "Select a business."),
  path: z.enum(["new", "renewal", "amendment", "closure"]),
  fiscalPeriod: z.string().trim().min(4, "Enter the fiscal period."),
  status: z.enum(["draft", "submitted", "for-correction", "under-review", "ready-to-issue", "issued", "closed"]),
  filedAt: z.string().min(1, "Enter the filing date and time."),
  targetRelease: z.string().min(1, "Enter the target release date."),
  assignedOfficer: z.string().trim().min(2, "Enter the assigned officer or Unassigned."),
  representativeLabel: z.string().trim().min(2, "Enter the applicant or representative."),
  activity: z.string().trim().min(5, "Describe the business activity."),
  location: z.string().trim().min(5, "Enter the establishment location."),
  declaredChange: z.string(),
});

export type BusinessApplicationValues = z.infer<typeof businessApplicationSchema>;

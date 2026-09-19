import { z } from "zod";
export const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^(09\d{9}|\+639\d{9})$/, "Enter an 11-digit Philippine mobile number starting with 09, or use +639."),
});
export const otpSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Enter the six-digit demo code.") });

export const recoverySchema = z
  .object({
    currentPhone: phoneSchema.shape.phone,
    newPhone: phoneSchema.shape.phone,
    reason: z.string().trim().min(10, "Explain briefly why the sample number needs to change."),
  })
  .refine((values) => values.currentPhone !== values.newPhone, {
    path: ["newPhone"],
    message: "Enter a different sample mobile number.",
  });

export const staffSignInSchema = z.object({
  username: z.string().trim().min(1, "Enter the demo staff username."),
  passcode: z.string().min(1, "Enter the demo staff passcode."),
});

export const staffMfaSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Enter the six-digit demo staff code.") });
export type PhoneValues = z.infer<typeof phoneSchema>;
export type OtpValues = z.infer<typeof otpSchema>;
export type RecoveryValues = z.infer<typeof recoverySchema>;
export type StaffSignInValues = z.infer<typeof staffSignInSchema>;
export type StaffMfaValues = z.infer<typeof staffMfaSchema>;

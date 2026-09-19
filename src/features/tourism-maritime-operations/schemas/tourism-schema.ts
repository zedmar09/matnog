import { z } from "zod";

export const tripSchema = z.object({
  bookingId: z.string().trim().min(3, "Enter the booking reference."),
  visitorId: z.string().trim().min(3, "Enter the visitor reference."),
  destinationId: z.string().min(1, "Select a destination."),
  operatorId: z.string().min(1, "Select an operator."),
  vesselId: z.string().min(1, "Select a vessel."),
  scheduledDeparture: z.string().min(1, "Enter the scheduled departure."),
  expectedReturn: z.string().min(1, "Enter the expected return."),
  status: z.enum(["draft", "packet-review", "ready", "held", "departed", "overdue", "returned", "canceled"]),
});
export type TripValues = z.infer<typeof tripSchema>;

export const operatorSchema = z.object({
  name: z.string().trim().min(3, "Enter the operator name."),
  businessPermit: z.string().trim().min(3, "Enter the business permit number."),
  status: z.enum(["eligible", "attention"]),
  contactPerson: z.string().trim().min(2, "Enter the contact person."),
  contactNumber: z.string().trim().min(7, "Enter a valid contact number."),
  email: z.email("Enter a valid email address."),
  address: z.string().trim().min(5, "Enter the operator address."),
  accreditationNumber: z.string().trim().min(3, "Enter the accreditation number."),
  accreditationValidUntil: z.string().min(1, "Enter the accreditation validity date."),
});
export type OperatorValues = z.infer<typeof operatorSchema>;

export const advisorySchema = z.object({
  title: z.string().trim().min(5, "Enter the advisory title."),
  advisoryType: z.enum(["Weather", "Sea condition", "Port operation", "Destination", "Safety"]),
  severity: z.enum(["Information", "Caution", "Restricted", "Closed"]),
  status: z.enum(["Draft", "Active", "Resolved", "Cancelled"]),
  issuingAuthority: z.string().trim().min(3, "Enter the issuing authority."),
  effectiveFrom: z.string().min(1, "Enter the start of the advisory."),
  effectiveUntil: z.string().min(1, "Enter the end of the advisory."),
  affectedDestinations: z.string().trim().min(2, "Enter at least one affected destination."),
  affectedOperators: z.string(),
  details: z.string().trim().min(10, "Describe the condition or restriction."),
  instructions: z.string().trim().min(10, "Enter the required action or public guidance."),
});
export type AdvisoryValues = z.infer<typeof advisorySchema>;

export const passengerSchema = z.object({
  name: z.string().trim().min(2, "Enter the passenger name."),
  nationality: z.string().trim().min(2, "Enter the nationality."),
  age: z.coerce.number().int().min(0).max(120),
  guardianId: z.string(),
  boardingStatus: z.enum(["expected", "boarded", "absent", "substituted"]),
});
export type PassengerValues = z.infer<typeof passengerSchema>;

export const vesselSchema = z.object({
  name: z.string().trim().min(2, "Enter the vessel name."),
  registrationNumber: z.string().trim().min(3, "Enter the registration number."),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least one."),
  documentValidUntil: z.string().min(1, "Enter the document validity date."),
  documentStatus: z.enum(["valid", "expiring", "expired"]),
});
export type VesselValues = z.infer<typeof vesselSchema>;

export const crewSchema = z.object({
  name: z.string().trim().min(2, "Enter the crew member name."),
  role: z.string().trim().min(2, "Enter the crew role."),
  licenseNumber: z.string().trim().min(3, "Enter the license or credential number."),
  credentialValidUntil: z.string().min(1, "Enter the credential validity date."),
  credentialStatus: z.enum(["valid", "expiring", "expired"]),
});
export type CrewValues = z.infer<typeof crewSchema>;

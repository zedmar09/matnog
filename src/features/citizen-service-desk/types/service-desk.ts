export type CitizenRequestStatus =
  | "Submitted"
  | "Assigned"
  | "Restricted referral"
  | "Resolved pending feedback"
  | "Reopened";
export type ServiceDeskRequest = {
  id: string;
  serviceId: string;
  serviceName: string;
  category: string;
  requesterContext: string;
  description: string;
  location: string;
  status: CitizenRequestStatus;
  owner: string;
  due: string;
  publicResponse?: string;
  internalProjection: string;
  documentReference?: string;
  history: string[];
  feedback?: string;
};
export type AppointmentSlot = {
  id: string;
  service: string;
  date: string;
  time: string;
  remaining: number;
  version: number;
};
export type Appointment = {
  id: string;
  slotId: string;
  service: string;
  schedule: string;
  status: "Booked" | "Rescheduled" | "Cancelled";
  ticket: string;
};
export type QueueTicket = {
  id: string;
  number: string;
  counter: string;
  service: string;
  status: "Waiting" | "Called" | "Missed" | "Served";
};

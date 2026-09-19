import type { Appointment, AppointmentSlot, QueueTicket, ServiceDeskRequest } from "../types/service-desk";

export const SERVICE_DESK_REQUESTS: readonly ServiceDeskRequest[] = [
  {
    id: "DEMO-SVC-001",
    serviceId: "community-concern",
    serviceName: "Community concern",
    category: "Drainage",
    requesterContext: "DEMO-ACC-001",
    description: "Drainage obstruction near a public walkway.",
    location: "Manual landmark: beside the demo multipurpose hall",
    status: "Assigned",
    owner: "Municipal Engineering service desk",
    due: "2026-09-18",
    internalProjection: "Assigned inspection task; requester cannot see internal reassignment notes",
    documentReference: "DEMO-DOC-SVC-001",
    history: ["Submitted", "Assigned to Municipal Engineering service desk"],
  },
  {
    id: "DEMO-SVC-002",
    serviceId: "protected-concern",
    serviceName: "Protected concern",
    category: "Restricted",
    requesterContext: "Assisted confidential intake",
    description: "Removed from ordinary inbox after classification.",
    location: "Withheld from ordinary queue",
    status: "Restricted referral",
    owner: "M10 designated desk",
    due: "Restricted",
    internalProjection: "General queue retains only referral state",
    history: ["Protected category selected", "Safe referral created for M10"],
  },
  {
    id: "DEMO-SVC-003",
    serviceId: "community-concern",
    serviceName: "Community concern",
    category: "Public space",
    requesterContext: "DEMO-ACC-001",
    description: "Recurring maintenance request.",
    location: "Demo Barangay A",
    status: "Reopened",
    owner: "Supervisor review",
    due: "Overdue by 1 sample day",
    publicResponse: "Initial cleanup was recorded; requester disputed completion.",
    internalProjection: "Recurring-need projection available to M12 without requester details",
    history: ["Initial response proposed", "Requester disputed closure", "Supervisor task opened"],
  },
];
export const APPOINTMENT_SLOTS: readonly AppointmentSlot[] = [
  {
    id: "DEMO-SLOT-001",
    service: "Business assistance desk",
    date: "2026-09-17",
    time: "09:30",
    remaining: 1,
    version: 3,
  },
  {
    id: "DEMO-SLOT-002",
    service: "Business assistance desk",
    date: "2026-09-17",
    time: "10:00",
    remaining: 4,
    version: 1,
  },
];
export const APPOINTMENTS: readonly Appointment[] = [
  {
    id: "DEMO-APT-001",
    slotId: "DEMO-SLOT-001",
    service: "Business assistance desk",
    schedule: "2026-09-17 09:30",
    status: "Booked",
    ticket: "A-014",
  },
];
export const QUEUE_TICKETS: readonly QueueTicket[] = [
  { id: "DEMO-Q-001", number: "A-014", counter: "Counter 2", service: "Business assistance", status: "Waiting" },
  { id: "DEMO-Q-002", number: "C-007", counter: "Counter 1", service: "Document receiving", status: "Called" },
  { id: "DEMO-Q-003", number: "B-011", counter: "Counter 3", service: "Community concern", status: "Missed" },
];

import { APPOINTMENT_SLOTS, APPOINTMENTS, QUEUE_TICKETS, SERVICE_DESK_REQUESTS } from "../data/service-desk-fixtures";
import type { Appointment, AppointmentSlot, QueueTicket, ServiceDeskRequest } from "../types/service-desk";

export class LocalServiceDeskRepository {
  readonly requests = structuredClone(SERVICE_DESK_REQUESTS) as ServiceDeskRequest[];
  readonly slots = structuredClone(APPOINTMENT_SLOTS) as AppointmentSlot[];
  readonly appointments = structuredClone(APPOINTMENTS) as Appointment[];
  readonly tickets = structuredClone(QUEUE_TICKETS) as QueueTicket[];
  private sequence = 10;

  request(id: string) {
    return this.requests.find((item) => item.id === id);
  }

  protectedReferral(id: string) {
    const item = this.request(id);
    return item?.status === "Restricted referral"
      ? { sourceReference: item.id, target: "M10 designated desk", safeStatus: item.status }
      : undefined;
  }

  recurringNeedProjection(id: string) {
    const item = this.request(id);
    return item?.status === "Reopened"
      ? { sourceReference: item.id, category: item.category, scope: item.location, target: "M12 proposal intake" }
      : undefined;
  }

  createRequest(input: {
    category: "ordinary" | "information" | "protected";
    description: string;
    location: string;
    requester?: string;
    priority?: ServiceDeskRequest["priority"];
    owner?: string;
    due?: string;
  }) {
    if (input.description.trim().length < 12 || input.location.trim().length < 4) return undefined;
    this.sequence += 1;
    const restricted = input.category === "protected";
    const created: ServiceDeskRequest = {
      id: `DEMO-SVC-${this.sequence}`,
      serviceId: restricted
        ? "protected-concern"
        : input.category === "information"
          ? "public-information"
          : "community-concern",
      serviceName: restricted
        ? "Protected concern"
        : input.category === "information"
          ? "Public information request"
          : "Community concern",
      category: restricted ? "Restricted" : input.category === "information" ? "Information" : "General",
      priority: input.priority ?? "Normal",
      requesterContext: input.requester?.trim() || "Maria Lourdes Dela Cruz",
      description: input.description.trim(),
      location: input.location.trim(),
      status: restricted ? "Restricted referral" : "Submitted",
      owner: restricted ? "Protected Cases Unit" : input.owner?.trim() || "Unassigned",
      due: restricted ? "Restricted" : input.due?.trim() || "Assignment pending",
      createdAt: "2026-09-19T09:00:00+08:00",
      internalProjection: restricted
        ? "Restricted details excluded; M10 owns the protected record"
        : "Awaiting category triage",
      history: restricted ? ["Protected category selected", "Safe referral created for M10"] : ["Request submitted"],
    };
    this.requests.unshift(created);
    return created;
  }

  updateRequest(
    id: string,
    input: {
      serviceName: string;
      category: string;
      priority: ServiceDeskRequest["priority"];
      requesterContext: string;
      description: string;
      location: string;
      owner: string;
      due: string;
    },
  ) {
    const item = this.request(id);
    if (!item || item.status === "Restricted referral" || item.status === "Archived") return false;
    if (
      input.serviceName.trim().length < 4 ||
      input.requesterContext.trim().length < 3 ||
      input.description.trim().length < 12 ||
      input.location.trim().length < 4
    )
      return false;
    item.serviceName = input.serviceName.trim();
    item.category = input.category.trim();
    item.priority = input.priority;
    item.requesterContext = input.requesterContext.trim();
    item.description = input.description.trim();
    item.location = input.location.trim();
    item.owner = input.owner.trim() || "Unassigned";
    item.due = input.due.trim() || "Assignment pending";
    item.history.push("Request information updated");
    return true;
  }

  archiveRequest(id: string) {
    const item = this.request(id);
    if (!item || item.status === "Restricted referral" || item.status === "Archived") return false;
    item.status = "Archived";
    item.history.push("Request archived");
    return true;
  }

  feedback(id: string, text: string) {
    const item = this.request(id);
    if (!item || text.trim().length < 5 || item.status === "Restricted referral") return false;
    item.feedback = text.trim();
    item.history.push(`Feedback: ${text.trim()}`);
    return true;
  }

  reopen(id: string, reason: string) {
    const item = this.request(id);
    if (!item || reason.trim().length < 8 || item.status === "Restricted referral") return false;
    item.status = "Reopened";
    item.history.push(`Reopened: ${reason.trim()}`);
    return true;
  }

  book(slotId: string, expectedVersion: number) {
    const slot = this.slots.find((item) => item.id === slotId);
    if (!slot || slot.remaining < 1 || slot.version !== expectedVersion) return undefined;
    slot.remaining -= 1;
    slot.version += 1;
    this.sequence += 1;
    const appointment: Appointment = {
      id: `DEMO-APT-${this.sequence}`,
      slotId: slot.id,
      service: slot.service,
      schedule: `${slot.date} ${slot.time}`,
      status: "Booked",
      ticket: `A-${String(this.sequence).padStart(3, "0")}`,
      requester: "Walk-in requester",
      contact: "Contact recorded at intake",
      createdAt: "2026-09-19T09:00:00+08:00",
    };
    this.appointments.unshift(appointment);
    return appointment;
  }

  updateAppointment(id: string, action: "reschedule" | "cancel") {
    const item = this.appointments.find((appointment) => appointment.id === id);
    if (!item) return false;
    item.status = action === "cancel" ? "Cancelled" : "Rescheduled";
    return true;
  }

  respond(id: string, response: string, internalNote: string, close: boolean) {
    const item = this.request(id);
    if (!item || item.status === "Restricted referral" || response.trim().length < 8) return false;
    item.publicResponse = response.trim();
    if (internalNote.trim().length >= 4) item.internalProjection = internalNote.trim();
    if (close) item.status = "Resolved pending feedback";
    else if (item.status === "Submitted") item.status = "Assigned";
    item.history.push(
      close
        ? "Closure proposed for requester feedback; internal note retained separately"
        : "Public response updated; internal note retained separately",
    );
    return true;
  }

  assign(id: string, owner: string) {
    const item = this.request(id);
    if (!item || item.status === "Restricted referral" || owner.trim().length < 4) return false;
    item.owner = owner.trim();
    item.status = "Assigned";
    item.due = "2026-09-19 · sample due date";
    item.history.push(`Assigned to ${owner.trim()}`);
    return true;
  }

  transitionTicket(id: string, status: QueueTicket["status"]) {
    const ticket = this.tickets.find((item) => item.id === id);
    if (!ticket) return false;
    ticket.status = status;
    return true;
  }

  transferTicket(id: string, counter: string) {
    const ticket = this.tickets.find((item) => item.id === id);
    if (!ticket || counter.trim().length < 3) return false;
    ticket.counter = counter.trim();
    return true;
  }

  createTicket(input: { prefix: string; counter: string; service: string }) {
    if (input.prefix.trim().length !== 1 || input.counter.trim().length < 3 || input.service.trim().length < 4)
      return undefined;
    this.sequence += 1;
    const ticket: QueueTicket = {
      id: `DEMO-Q-${String(this.sequence).padStart(3, "0")}`,
      number: `${input.prefix.trim().toUpperCase()}-${String(this.sequence).padStart(3, "0")}`,
      counter: input.counter.trim(),
      service: input.service.trim(),
      status: "Waiting",
    };
    this.tickets.push(ticket);
    return ticket;
  }
}
export const localServiceDeskRepository = new LocalServiceDeskRepository();

import { TOURISM_DESTINATIONS, TOURISM_TRIP_FIXTURES } from "../data/tourism-fixtures";
import type { TourismTrip } from "../types/tourism-records";

let trips = structuredClone(TOURISM_TRIP_FIXTURES) as TourismTrip[];
let bookingSequence = 10;
export const tourismRepository = {
  list: () => trips,
  readTrip: (id: string) => trips.find((trip) => trip.id === id || trip.bookingId === id),
  createBooking(input: {
    destinationId: string;
    date: string;
    organizer: string;
    partySize: number;
    nationality: string;
    birthDate: string;
    dependentName?: string;
  }) {
    const template = structuredClone(trips[0]);
    bookingSequence += 1;
    template.id = `DEMO-TRIP-${bookingSequence}`;
    template.bookingId = `DEMO-BOOK-${bookingSequence}`;
    const destination = TOURISM_DESTINATIONS.find((item) => item.id === input.destinationId);
    template.destinationId = input.destinationId;
    template.destination = destination?.name ?? "Selected sample destination";
    template.scheduledDeparture = `${input.date} 07:00`;
    template.status = "draft";
    template.passengers = Array.from({ length: input.partySize }, (_, index) => ({
      id: `PAX-${bookingSequence}-${index + 1}`,
      name:
        index === 0
          ? input.organizer
          : index === 1 && input.dependentName
            ? input.dependentName
            : `Party member ${index + 1}`,
      nationality: input.nationality,
      age: index === 0 ? Math.max(0, 2026 - Number(input.birthDate.slice(0, 4))) : index === 1 ? 12 : 0,
      guardianId: index === 1 ? `PAX-${bookingSequence}-1` : undefined,
      boardingStatus: "expected" as const,
    }));
    template.documents = [];
    template.charges = template.charges.map((charge) => ({ ...charge, status: "pending" as const }));
    template.timeline = [{ label: "Booking draft saved locally", at: "16 Sep 16:30", actor: input.organizer }];
    trips = [template, ...trips];
    return template;
  },
  requestCorrection(id: string, documentId: string, reason: string) {
    const trip = this.readTrip(id);
    const document = trip?.documents.find((item) => item.id === documentId);
    if (!trip || !document || !reason.trim()) return trip;
    document.status = "for-correction";
    document.reason = reason;
    trip.status = "packet-review";
    trip.timeline.push({
      label: `${document.kind.toUpperCase()} returned: ${reason}`,
      at: "16 Sep 16:35",
      actor: "Assigned partner reviewer",
    });
    return trip;
  },
  acknowledge(id: string, documentId: string) {
    const trip = this.readTrip(id);
    const document = trip?.documents.find((item) => item.id === documentId);
    if (document) document.status = "acknowledged";
    return trip;
  },
  changeManifest(id: string) {
    const trip = this.readTrip(id);
    if (!trip) return trip;
    trip.documents
      .filter((item) => item.kind === "manifest" && item.status !== "superseded")
      .forEach((item) => {
        item.status = "superseded";
      });
    trip.manifestVersion += 1;
    trip.documents.push({
      id: `DOC-MAN-${trip.id}-${trip.manifestVersion}`,
      kind: "manifest",
      version: trip.manifestVersion,
      status: "submitted",
    });
    trip.status = "packet-review";
    trip.timeline.push({
      label: `Manifest changed to version ${trip.manifestVersion}; capacity and reviews reopened`,
      at: "16 Sep 16:40",
      actor: "Operator",
    });
    return trip;
  },
  board(id: string, passengerId: string) {
    const trip = this.readTrip(id);
    const passenger = trip?.passengers.find((item) => item.id === passengerId);
    if (passenger) passenger.boardingStatus = passenger.boardingStatus === "boarded" ? "expected" : "boarded";
    return trip;
  },
  setBoardingStatus(id: string, passengerId: string, status: TourismTrip["passengers"][number]["boardingStatus"]) {
    const trip = this.readTrip(id);
    const passenger = trip?.passengers.find((item) => item.id === passengerId);
    if (passenger) passenger.boardingStatus = status;
    return trip;
  },
  depart(id: string) {
    const trip = this.readTrip(id);
    if (
      !trip ||
      trip.hold?.active ||
      trip.documents.some((item) => item.status === "for-correction" || item.status === "draft") ||
      trip.charges.some((item) => item.status === "pending")
    )
      return trip;
    trip.status = "departed";
    trip.actualDeparture = "2026-09-16 16:45";
    trip.timeline.push({
      label: "Departure recorded after reconciliation",
      at: "16 Sep 16:45",
      actor: "Checkpoint staff",
    });
    return trip;
  },
  recordReturn(id: string) {
    const trip = this.readTrip(id);
    if (!trip || !["departed", "overdue"].includes(trip.status)) return trip;
    trip.status = "returned";
    trip.actualReturn = "2026-09-16 17:10";
    trip.timeline.push({ label: "Return reconciled", at: "16 Sep 17:10", actor: "Tourism Duty A" });
    return trip;
  },
  requestRebook(id: string) {
    const trip = this.readTrip(id);
    if (!trip) return trip;
    trip.status = "canceled";
    trip.charges
      .filter((item) => item.status === "paid")
      .forEach((item) => {
        item.status = "refund-requested";
      });
    trip.notifications.push("Rebooking and refund request queued locally; no funds moved");
    return trip;
  },
};

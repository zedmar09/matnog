import {
  TOURISM_ADVISORY_FIXTURES,
  TOURISM_DESTINATIONS,
  TOURISM_OPERATORS,
  TOURISM_TRIP_FIXTURES,
} from "../data/tourism-fixtures";
import type {
  TourismAdvisory,
  TourismCrewMember,
  TourismOperator,
  TourismPassenger,
  TourismTrip,
  TourismVessel,
} from "../types/tourism-records";

export type TourismTripInput = Pick<
  TourismTrip,
  | "bookingId"
  | "visitorId"
  | "destinationId"
  | "operatorId"
  | "vesselId"
  | "scheduledDeparture"
  | "expectedReturn"
  | "status"
>;
export type TourismOperatorInput = Omit<TourismOperator, "id" | "updatedAt" | "crew" | "vessels">;
export type TourismAdvisoryInput = Omit<TourismAdvisory, "id" | "updatedAt">;
export type TourismPassengerInput = Omit<TourismPassenger, "id">;
export type TourismVesselInput = Omit<TourismVessel, "id">;
export type TourismCrewInput = Omit<TourismCrewMember, "id">;

let trips = structuredClone(TOURISM_TRIP_FIXTURES) as TourismTrip[];
let operators = structuredClone(TOURISM_OPERATORS) as TourismOperator[];
let advisories = structuredClone(TOURISM_ADVISORY_FIXTURES) as TourismAdvisory[];
let tripSequence = 5;
let operatorSequence = 4;
let advisorySequence = 4;
let childSequence = 20;
const now = () => "2026-09-19 16:30";

export const tourismRepository = {
  destinations: () => TOURISM_DESTINATIONS,
  list: () => trips,
  readTrip: (id: string) => trips.find((trip) => trip.id === id || trip.bookingId === id),
  listOperators: () => operators,
  readOperator: (id: string) => operators.find((operator) => operator.id === id),
  listAdvisories: () => advisories,
  readAdvisory: (id: string) => advisories.find((advisory) => advisory.id === id),

  createTrip(input: TourismTripInput) {
    const destination = TOURISM_DESTINATIONS.find((item) => item.id === input.destinationId);
    const operator = this.readOperator(input.operatorId);
    const vessel = operator?.vessels.find((item) => item.id === input.vesselId);
    if (!destination || !operator || !vessel) return undefined;
    const id = `TRIP-2026-${String(tripSequence++).padStart(4, "0")}`;
    const created: TourismTrip = {
      ...input,
      id,
      destination: destination.name,
      operator: operator.name,
      vessel: vessel.name,
      capacity: vessel.capacity,
      passengers: [],
      manifestVersion: 1,
      documents: [],
      charges: [],
      routePacketId: `DOC-ROUTE-${id}`,
      notifications: [],
      timeline: [{ label: "Trip created", at: now(), actor: "Tourism Front Desk" }],
    };
    trips = [created, ...trips];
    return created;
  },
  updateTrip(id: string, input: TourismTripInput) {
    const trip = this.readTrip(id);
    const destination = TOURISM_DESTINATIONS.find((item) => item.id === input.destinationId);
    const operator = this.readOperator(input.operatorId);
    const vessel = operator?.vessels.find((item) => item.id === input.vesselId);
    if (!trip || !destination || !operator || !vessel) return undefined;
    Object.assign(trip, input, {
      destination: destination.name,
      operator: operator.name,
      vessel: vessel.name,
      capacity: vessel.capacity,
    });
    trip.timeline.push({ label: "Trip details updated", at: now(), actor: "Tourism Operations Officer" });
    return trip;
  },
  deleteTrip(id: string) {
    const exists = trips.some((trip) => trip.id === id);
    if (!exists) return false;
    trips = trips.filter((trip) => trip.id !== id);
    return true;
  },
  addPassenger(tripId: string, input: TourismPassengerInput) {
    const trip = this.readTrip(tripId);
    if (!trip) return undefined;
    const passenger: TourismPassenger = { ...input, id: `PAX-${String(childSequence++).padStart(4, "0")}` };
    trip.passengers.push(passenger);
    this.changeManifest(trip.id);
    return passenger;
  },
  updatePassenger(tripId: string, passengerId: string, input: TourismPassengerInput) {
    const trip = this.readTrip(tripId);
    const passenger = trip?.passengers.find((item) => item.id === passengerId);
    if (!trip || !passenger) return undefined;
    Object.assign(passenger, input);
    this.changeManifest(trip.id);
    return passenger;
  },
  deletePassenger(tripId: string, passengerId: string) {
    const trip = this.readTrip(tripId);
    if (!trip?.passengers.some((item) => item.id === passengerId)) return false;
    trip.passengers = trip.passengers.filter((item) => item.id !== passengerId);
    this.changeManifest(trip.id);
    return true;
  },

  createOperator(input: TourismOperatorInput) {
    const created: TourismOperator = {
      ...input,
      id: `OPR-2026-${String(operatorSequence++).padStart(3, "0")}`,
      updatedAt: now(),
      crew: [],
      vessels: [],
    };
    operators = [created, ...operators];
    return created;
  },
  updateOperator(id: string, input: TourismOperatorInput) {
    const operator = this.readOperator(id);
    if (!operator) return undefined;
    Object.assign(operator, input, { updatedAt: now() });
    trips
      .filter((trip) => trip.operatorId === id)
      .forEach((trip) => {
        trip.operator = input.name;
      });
    return operator;
  },
  deleteOperator(id: string) {
    if (!operators.some((operator) => operator.id === id)) return false;
    operators = operators.filter((operator) => operator.id !== id);
    trips = trips.filter((trip) => trip.operatorId !== id);
    return true;
  },
  addVessel(operatorId: string, input: TourismVesselInput) {
    const operator = this.readOperator(operatorId);
    if (!operator) return undefined;
    const vessel: TourismVessel = { ...input, id: `VSL-2026-${String(childSequence++).padStart(3, "0")}` };
    operator.vessels.push(vessel);
    operator.updatedAt = now();
    return vessel;
  },
  updateVessel(operatorId: string, vesselId: string, input: TourismVesselInput) {
    const operator = this.readOperator(operatorId);
    const vessel = operator?.vessels.find((item) => item.id === vesselId);
    if (!operator || !vessel) return undefined;
    Object.assign(vessel, input);
    operator.updatedAt = now();
    trips
      .filter((trip) => trip.vesselId === vesselId)
      .forEach((trip) => {
        trip.vessel = input.name;
        trip.capacity = input.capacity;
      });
    return vessel;
  },
  deleteVessel(operatorId: string, vesselId: string) {
    const operator = this.readOperator(operatorId);
    if (!operator?.vessels.some((item) => item.id === vesselId)) return false;
    operator.vessels = operator.vessels.filter((item) => item.id !== vesselId);
    operator.updatedAt = now();
    return true;
  },
  addCrew(operatorId: string, input: TourismCrewInput) {
    const operator = this.readOperator(operatorId);
    if (!operator) return undefined;
    const member: TourismCrewMember = { ...input, id: `CRW-${String(childSequence++).padStart(3, "0")}` };
    operator.crew.push(member);
    operator.updatedAt = now();
    return member;
  },
  updateCrew(operatorId: string, crewId: string, input: TourismCrewInput) {
    const operator = this.readOperator(operatorId);
    const member = operator?.crew.find((item) => item.id === crewId);
    if (!operator || !member) return undefined;
    Object.assign(member, input);
    operator.updatedAt = now();
    return member;
  },
  deleteCrew(operatorId: string, crewId: string) {
    const operator = this.readOperator(operatorId);
    if (!operator?.crew.some((item) => item.id === crewId)) return false;
    operator.crew = operator.crew.filter((item) => item.id !== crewId);
    operator.updatedAt = now();
    return true;
  },

  createAdvisory(input: TourismAdvisoryInput) {
    const created: TourismAdvisory = {
      ...input,
      id: `ADV-2026-${String(advisorySequence++).padStart(3, "0")}`,
      updatedAt: now(),
    };
    advisories = [created, ...advisories];
    return created;
  },
  updateAdvisory(id: string, input: TourismAdvisoryInput) {
    const advisory = this.readAdvisory(id);
    if (!advisory) return undefined;
    Object.assign(advisory, input, { updatedAt: now() });
    return advisory;
  },
  deleteAdvisory(id: string) {
    if (!advisories.some((advisory) => advisory.id === id)) return false;
    advisories = advisories.filter((advisory) => advisory.id !== id);
    return true;
  },
  setAdvisoryStatus(id: string, status: TourismAdvisory["status"]) {
    const advisory = this.readAdvisory(id);
    if (!advisory) return undefined;
    advisory.status = status;
    advisory.updatedAt = now();
    return advisory;
  },

  createBooking(input: {
    destinationId: string;
    date: string;
    organizer: string;
    partySize: number;
    nationality: string;
    birthDate: string;
    dependentName?: string;
  }) {
    const operator = operators.find(
      (item) => item.status === "eligible" && item.vessels.some((vessel) => vessel.documentStatus === "valid"),
    );
    const vessel = operator?.vessels.find((item) => item.documentStatus === "valid");
    if (!operator || !vessel) throw new Error("No eligible operator is available");
    const created = this.createTrip({
      bookingId: `BOOK-2026-${1900 + tripSequence}`,
      visitorId: `VIS-2026-${1000 + tripSequence}`,
      destinationId: input.destinationId,
      operatorId: operator.id,
      vesselId: vessel.id,
      scheduledDeparture: `${input.date} 07:00`,
      expectedReturn: `${input.date} 16:00`,
      status: "draft",
    });
    if (!created) throw new Error("Unable to create booking");
    created.passengers = Array.from({ length: input.partySize }, (_, index) => ({
      id: `PAX-${created.id}-${index + 1}`,
      name:
        index === 0
          ? input.organizer
          : index === 1 && input.dependentName
            ? input.dependentName
            : `Party member ${index + 1}`,
      nationality: input.nationality,
      age: index === 0 ? Math.max(0, 2026 - Number(input.birthDate.slice(0, 4))) : index === 1 ? 12 : 0,
      guardianId: index === 1 ? `PAX-${created.id}-1` : undefined,
      boardingStatus: "expected",
    }));
    return created;
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
      at: now(),
      actor: "Assigned reviewer",
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
      id: `DOC-MAN-${trip.id}-V${trip.manifestVersion}`,
      kind: "manifest",
      version: trip.manifestVersion,
      status: "submitted",
    });
    trip.status = "packet-review";
    trip.timeline.push({
      label: `Manifest updated to version ${trip.manifestVersion}`,
      at: now(),
      actor: "Tourism Operations Officer",
    });
    return trip;
  },
  setBoardingStatus(id: string, passengerId: string, status: TourismPassenger["boardingStatus"]) {
    const passenger = this.readTrip(id)?.passengers.find((item) => item.id === passengerId);
    if (passenger) passenger.boardingStatus = status;
    return this.readTrip(id);
  },
  board(id: string, passengerId: string) {
    const passenger = this.readTrip(id)?.passengers.find((item) => item.id === passengerId);
    if (passenger) passenger.boardingStatus = passenger.boardingStatus === "boarded" ? "expected" : "boarded";
    return this.readTrip(id);
  },
  depart(id: string) {
    const trip = this.readTrip(id);
    if (
      !trip ||
      trip.hold?.active ||
      trip.documents.some((item) => ["for-correction", "draft"].includes(item.status)) ||
      trip.charges.some((item) => item.status === "pending")
    )
      return trip;
    trip.status = "departed";
    trip.actualDeparture = now();
    trip.timeline.push({ label: "Departure recorded after reconciliation", at: now(), actor: "Port Checkpoint" });
    return trip;
  },
  recordReturn(id: string) {
    const trip = this.readTrip(id);
    if (!trip || !["departed", "overdue"].includes(trip.status)) return trip;
    trip.status = "returned";
    trip.actualReturn = now();
    trip.timeline.push({ label: "Return reconciled", at: now(), actor: "Tourism Duty Officer" });
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
    trip.notifications.push("Rebooking and refund request recorded");
    return trip;
  },
};

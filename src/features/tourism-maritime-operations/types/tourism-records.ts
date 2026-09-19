export type TourismDocumentKind = "manifest" | "odso" | "coi" | "acknowledgment";
export type TourismTripStatus =
  | "draft"
  | "packet-review"
  | "ready"
  | "held"
  | "departed"
  | "overdue"
  | "returned"
  | "canceled";
export type TourismPassenger = {
  id: string;
  name: string;
  nationality: string;
  age: number;
  guardianId?: string;
  boardingStatus: "expected" | "boarded" | "absent" | "substituted";
};
export type TourismDocument = {
  id: string;
  kind: TourismDocumentKind;
  version: number;
  status: "draft" | "submitted" | "for-correction" | "acknowledged" | "superseded";
  reason?: string;
};
export type TourismCharge = {
  id: string;
  payee: string;
  kind: "government" | "private";
  label: string;
  amount: number;
  status: "pending" | "paid" | "refund-requested" | "refunded";
};
export type TourismTrip = {
  id: string;
  bookingId: string;
  destinationId: string;
  destination: string;
  visitorId: string;
  operatorId: string;
  operator: string;
  vesselId: string;
  vessel: string;
  capacity: number;
  scheduledDeparture: string;
  expectedReturn: string;
  actualDeparture?: string;
  actualReturn?: string;
  status: TourismTripStatus;
  hold?: { id: string; reason: string; active: boolean };
  passengers: TourismPassenger[];
  manifestVersion: number;
  documents: TourismDocument[];
  charges: TourismCharge[];
  routePacketId: string;
  notifications: string[];
  timeline: { label: string; at: string; actor: string }[];
};
export type TourismDestination = {
  id: string;
  name: string;
  category: string;
  summary: string;
  accessibility: string;
  availability: string;
  advisory?: string;
  /** Photo used on the public discovery page. */
  image?: string;
};
export type TourismOperator = {
  id: string;
  name: string;
  businessPermit: string;
  status: "eligible" | "attention";
  crew: { name: string; role: string; credentialStatus: "valid" | "expiring" }[];
  vessels: { id: string; name: string; capacity: number; documentStatus: "valid" | "expired" }[];
};
export type TourismPreview =
  | "normal"
  | "no-capacity"
  | "expired-vessel"
  | "camera-denied"
  | "offline-stale"
  | "changed-passenger"
  | "official-hold"
  | "overdue-return";

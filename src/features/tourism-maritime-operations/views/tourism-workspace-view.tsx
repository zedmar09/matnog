"use client";

import { type ReactNode, useState } from "react";

import Link from "next/link";

import { Anchor, CalendarDays, MapPin, QrCode, Ship, Users } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import type { WorkspaceRole, WorkspaceScenario } from "@/shared/providers/workspace-session-provider";
import { useOptionalWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { TOURISM_DESTINATIONS, TOURISM_OPERATORS } from "../data/tourism-fixtures";
import { tourismRepository } from "../services/tourism-repository";
import type { TourismPreview } from "../types/tourism-records";

/** Public routes have no scenario switch; selecting one is a no-op there. */
function noopScenarioChange() {
  return undefined;
}

export type TourismViewMode =
  | "discovery"
  | "destination"
  | "booking"
  | "visitor-booking"
  | "trip-board"
  | "trip-detail"
  | "operators"
  | "partner"
  | "advisories";
const previewCopy: Record<TourismPreview, string> = {
  normal: "Current saved local state.",
  "no-capacity": "The selected allocation has no remaining sample seats.",
  "expired-vessel": "The vessel has expired sample evidence and cannot be allocated.",
  "camera-denied": "Camera permission is denied; manual reference entry remains available.",
  "offline-stale": "This cached packet may be stale and cannot establish current clearance.",
  "changed-passenger": "Passenger changes create a new manifest and reopen capacity and review gates.",
  "official-hold": "An active official hold blocks departure.",
  "overdue-return": "The controlled demo clock opened a named return follow-up task.",
};

export function TourismWorkspaceView({ mode, recordId }: { mode: TourismViewMode; recordId?: string }) {
  return <TourismWorkspaceContent mode={mode} recordId={recordId} />;
}

export function TourismOperationsWorkspaceView({ mode, recordId }: { mode: TourismViewMode; recordId?: string }) {
  // Reachable from a public route as well as the operations shell. Outside
  // the workspace there is no persona and no scenario switch, so the public
  // surface reads as a non-staff role in the normal state.
  const workspace = useOptionalWorkspaceSession();
  const role = workspace?.role ?? "partner";
  const scenario = workspace?.scenario ?? "normal";
  const setScenario = workspace?.setScenario ?? noopScenarioChange;
  return (
    <TourismWorkspaceContent
      mode={mode}
      recordId={recordId}
      workspaceRole={role}
      workspaceScenario={scenario}
      resetWorkspaceScenario={() => setScenario("normal")}
    />
  );
}

function TourismWorkspaceContent({
  mode,
  recordId,
  workspaceRole,
  workspaceScenario,
  resetWorkspaceScenario,
}: {
  mode: TourismViewMode;
  recordId?: string;
  workspaceRole?: WorkspaceRole;
  workspaceScenario?: WorkspaceScenario;
  resetWorkspaceScenario?: () => void;
}) {
  const [, refresh] = useState(0);
  const [preview, setPreview] = useState<TourismPreview>("normal");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [reason, setReason] = useState("");
  const [destinationId, setDestinationId] = useState(recordId ?? TOURISM_DESTINATIONS[0].id);
  const [date, setDate] = useState("2026-09-18");
  const [organizer, setOrganizer] = useState("Mara Dela Cruz");
  const [birthDate, setBirthDate] = useState("1992-05-12");
  const [nationality, setNationality] = useState("Filipino");
  const [visitorContact, setVisitorContact] = useState("+63 917 000 0101");
  const [visitorAddress, setVisitorAddress] = useState("Sample visitor address");
  const [dependentName, setDependentName] = useState("Noah Dela Cruz");
  const [partySize, setPartySize] = useState(2);
  const [createdId, setCreatedId] = useState<string>();
  const [formError, setFormError] = useState("");
  const trip = recordId ? tourismRepository.readTrip(recordId) : tourismRepository.list()[0];
  const destination = TOURISM_DESTINATIONS.find((item) => item.id === (recordId ?? destinationId));
  const isOps = mode === "trip-board" || mode === "trip-detail" || mode === "operators" || mode === "advisories";
  if (isOps && workspaceRole !== "municipal")
    return (
      <PermissionState
        title="Tourism operations unavailable"
        description="Choose the Municipal staff role to inspect scoped trip operations."
      />
    );
  if (mode === "partner" && workspaceRole !== "partner" && workspaceRole !== "municipal")
    return (
      <PermissionState
        title="Assigned partner packet unavailable"
        description="Choose the Tourism partner role. Unrelated trips and passengers remain hidden."
      />
    );
  const shell = (title: string, description: string, children: ReactNode, ops = false) =>
    ops ? (
      <>
        <div className="ops-topline">
          <div>
            <span className="eyebrow">M04 · Tourism operations</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
        {children}
      </>
    ) : (
      <div className="site-container page-content">
        <PageHeader parent="Visit Matnog" parentHref="/visit" title={title} description={description} />
        {children}
      </div>
    );
  if (workspaceScenario === "denied") {
    return (
      <PermissionState
        title="Tourism workspace unavailable"
        description="The selected demo role cannot open this scoped tourism record."
      />
    );
  }
  if (workspaceScenario === "empty") {
    return shell(
      "No tourism records",
      "The selected local scenario contains no scoped tourism work.",
      <EmptyState
        icon={Ship}
        title="No assigned tourism work"
        description="Choose the normal sample-data scenario to restore trips."
      />,
      isOps,
    );
  }
  if (workspaceScenario === "error") {
    return shell(
      "Tourism preview unavailable",
      "A recoverable local repository failure is selected.",
      <ErrorState onRetry={() => resetWorkspaceScenario?.()} />,
      isOps,
    );
  }
  if (workspaceScenario === "slow") {
    return shell(
      "Loading tourism workspace",
      "The slow local repository preview is active.",
      <LoadingState message="Loading the delayed trip packet…" />,
      isOps,
    );
  }
  const scenario = (
    <div className="mb-6 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_auto] md:items-end">
      <label className="grid gap-2 font-medium text-sm">
        Scenario preview
        <NativeSelect value={preview} onChange={(event) => setPreview(event.target.value as TourismPreview)}>
          {Object.keys(previewCopy).map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("-", " ")}
            </option>
          ))}
        </NativeSelect>
      </label>
      <Button variant="outline" onClick={() => setPreview("normal")}>
        Reset preview
      </Button>
      <p className="muted text-sm md:col-span-2">{previewCopy[preview]}</p>
    </div>
  );

  if (mode === "discovery") {
    const records = TOURISM_DESTINATIONS.filter(
      (item) =>
        (category === "all" || item.category === category) &&
        `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()),
    );
    return shell(
      "Discover Matnog",
      "Browse destination cards, accessibility notes, availability and local advisories.",
      <>
        <NoticePanel className="mb-6">
          Browse without signing in. Schedules, availability and advisories are sample presentation content.
        </NoticePanel>
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_16rem]">
          <Input
            aria-label="Search destinations"
            placeholder="Search destination or category"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <NativeSelect
            aria-label="Filter destination category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {[...new Set(TOURISM_DESTINATIONS.map((item) => item.category))].map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </NativeSelect>
        </div>
        {records.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No destination matches"
            description="Clear the local search to see the sample catalog."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {records.map((item) => (
              <ContentPanel key={item.id}>
                <div className="rounded-xl bg-gradient-to-br from-primary/25 via-primary/10 to-sky-100 p-8">
                  <MapPin className="size-9 text-primary" />
                </div>
                <span className="eyebrow mt-5 block">{item.category}</span>
                <h2 className="mt-1">{item.name}</h2>
                <p className="muted mt-2">{item.summary}</p>
                <p className="mt-4 text-sm">
                  <strong>Availability:</strong> {item.availability}
                </p>
                {item.advisory && (
                  <p className="mt-2 text-sm text-warning">
                    <strong>Advisory:</strong> {item.advisory}
                  </p>
                )}
                <Button asChild className="mt-5">
                  <Link href={`/visit/destinations/${item.id}`}>View destination</Link>
                </Button>
              </ContentPanel>
            ))}
          </div>
        )}
      </>,
    );
  }
  if (mode === "destination") {
    if (!destination)
      return shell(
        "Destination unavailable",
        "The destination was not found.",
        <EmptyState
          icon={MapPin}
          title="Destination unavailable"
          description="Return to the sample destination catalog."
        />,
      );
    return shell(
      destination.name,
      destination.summary,
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <ContentPanel>
          <div className="rounded-xl bg-gradient-to-br from-primary/30 to-cyan-100 p-12">
            <Anchor className="size-12 text-primary" />
          </div>
          <h2 className="mt-5">Trip preparation</h2>
          <dl className="registry-facts mt-4">
            <div>
              <dt>Accessibility</dt>
              <dd>{destination.accessibility}</dd>
            </div>
            <div>
              <dt>Sample availability</dt>
              <dd>{destination.availability}</dd>
            </div>
            <div>
              <dt>Advisory</dt>
              <dd>{destination.advisory ?? "No active sample advisory"}</dd>
            </div>
          </dl>
        </ContentPanel>
        <ContentPanel>
          <CalendarDays className="text-primary" />
          <h2 className="mt-3">Request a trip</h2>
          <p className="muted mt-2">
            Contact-number OTP happens through M02. Municipal residency is never required for a visitor booking.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link href={`/visit/book?destination=${destination.id}`}>Prepare booking</Link>
          </Button>
        </ContentPanel>
      </div>,
    );
  }
  if (mode === "booking")
    return shell(
      "Prepare a visitor booking",
      "Contact, party, allocation and separate payee charges remain visible through review.",
      <>
        <NoticePanel className="mb-6">
          Demo OTP establishes a visitor contact only. International and assisted group details remain supported in the
          form.
        </NoticePanel>
        <Button asChild variant="outline" className="mb-6">
          <Link href="/auth/phone?service=tourism-registration">Verify demo contact through M02</Link>
        </Button>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <ContentPanel>
            <div className="grid gap-4">
              <label className="grid gap-2 font-medium text-sm">
                Destination
                <NativeSelect value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>
                  {TOURISM_DESTINATIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className="grid gap-2 font-medium text-sm">
                Trip date
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
              <label className="grid gap-2 font-medium text-sm">
                Organizer
                <Input value={organizer} onChange={(event) => setOrganizer(event.target.value)} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 font-medium text-sm">
                  Organizer birth date
                  <Input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
                </label>
                <label className="grid gap-2 font-medium text-sm">
                  Nationality
                  <Input value={nationality} onChange={(event) => setNationality(event.target.value)} />
                </label>
              </div>
              <label className="grid gap-2 font-medium text-sm">
                Required contact
                <Input value={visitorContact} onChange={(event) => setVisitorContact(event.target.value)} />
              </label>
              <label className="grid gap-2 font-medium text-sm">
                Visitor address
                <Input value={visitorAddress} onChange={(event) => setVisitorAddress(event.target.value)} />
              </label>
              <label className="grid gap-2 font-medium text-sm">
                Party size
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={partySize}
                  onChange={(event) => setPartySize(Number(event.target.value))}
                />
              </label>
              {partySize > 1 && (
                <div className="rounded-lg border p-4">
                  <span className="eyebrow">Dependent passenger card</span>
                  <label className="mt-3 grid gap-2 font-medium text-sm">
                    Passenger 2 name
                    <Input value={dependentName} onChange={(event) => setDependentName(event.target.value)} />
                  </label>
                  <p className="muted mt-2 text-xs">
                    Guardian link: {organizer || "Organizer required"}. Additional members use the same configurable
                    passenger fields.
                  </p>
                </div>
              )}
            </div>
            {formError && <p className="mt-3 text-destructive text-sm">{formError}</p>}
            <Button
              className="mt-5"
              onClick={() => {
                if (
                  !organizer.trim() ||
                  !birthDate ||
                  !nationality.trim() ||
                  !visitorContact.trim() ||
                  !visitorAddress.trim() ||
                  (partySize > 1 && !dependentName.trim()) ||
                  partySize < 1 ||
                  partySize > 12
                ) {
                  setFormError("Complete the contact and required passenger fields for a party of 1 to 12.");
                  return;
                }
                const created = tourismRepository.createBooking({
                  destinationId,
                  date,
                  organizer,
                  partySize,
                  nationality,
                  birthDate,
                  dependentName,
                });
                setCreatedId(created.bookingId);
                setFormError("");
              }}
            >
              Save provisional allocation
            </Button>
            {createdId && (
              <Button asChild variant="outline" className="mt-3 ml-2">
                <Link href={`/visit/bookings/${createdId}`}>Open {createdId}</Link>
              </Button>
            )}
          </ContentPanel>
          <ContentPanel>
            <h2>Charge review</h2>
            <p className="muted mt-2">Government and private operator payees remain separate.</p>
            <dl className="registry-facts mt-4">
              <div>
                <dt>Municipal Tourism Office</dt>
                <dd>₱100 illustrative visitor charge</dd>
              </div>
              <div>
                <dt>Demo Bay Tours</dt>
                <dd>₱1,200 sample private allocation</dd>
              </div>
            </dl>
            <PanelDivider />
            <p className="text-sm">Payment confirms collection only. It cannot authorize departure.</p>
          </ContentPanel>
        </div>
      </>,
    );
  if (!trip && ["visitor-booking", "trip-detail", "partner"].includes(mode))
    return shell(
      "Trip unavailable",
      "The reference is unavailable in this role scope.",
      <EmptyState icon={Ship} title="Trip unavailable" description="Use a seeded sample reference." />,
      isOps,
    );
  if (mode === "visitor-booking" && trip)
    return shell(
      `Booking ${trip.bookingId}`,
      `${trip.destination} · ${trip.scheduledDeparture}`,
      <>
        {scenario}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <ContentPanel>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="eyebrow">Visitor-safe status</span>
                <h2 className="mt-1">{trip.status}</h2>
              </div>
              <StatusBadge tone={trip.status === "returned" ? "success" : "pending"}>{trip.status}</StatusBadge>
            </div>
            <dl className="registry-facts mt-5">
              <div>
                <dt>Operator / vessel</dt>
                <dd>
                  {trip.operator} · {trip.vessel}
                </dd>
              </div>
              <div>
                <dt>Party</dt>
                <dd>{trip.passengers.length} travelers; names stay private</dd>
              </div>
              <div>
                <dt>Packet</dt>
                <dd>{trip.routePacketId}</dd>
              </div>
              <div>
                <dt>Expected return</dt>
                <dd>{trip.expectedReturn}</dd>
              </div>
            </dl>
            {trip.hold?.active && <NoticePanel className="mt-5">Departure blocked: {trip.hold.reason}</NoticePanel>}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  tourismRepository.requestRebook(trip.id);
                  refresh((value) => value + 1);
                }}
              >
                Request rebook/refund
              </Button>
              {trip.charges.find((item) => item.kind === "government" && item.status === "pending") && (
                <Button asChild>
                  <Link href={`/payments/assessments/${trip.charges.find((item) => item.kind === "government")?.id}`}>
                    Open M06 payment
                  </Link>
                </Button>
              )}
            </div>
          </ContentPanel>
          <ContentPanel>
            <QrCode className="text-primary" />
            <h2 className="mt-3">Sample booking wallet</h2>
            <p className="muted mt-2">{trip.bookingId}</p>
            <div className="mt-5 rounded-lg border border-dashed p-8 text-center font-mono">
              SAMPLE QR
              <br />
              PUBLIC LOOKUP ONLY
            </div>
            <p className="muted mt-4 text-sm">
              The public reference never reveals the passenger manifest or authority notes.
            </p>
          </ContentPanel>
        </div>
      </>,
    );
  if (mode === "trip-board") {
    const trips = tourismRepository
      .list()
      .filter((item) => `${item.id} ${item.operator} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
    return shell(
      "Trip board",
      "Date, operator, headcount, hold, departure and return state.",
      <>
        {scenario}
        <Input
          className="mb-5"
          placeholder="Search trip, operator or state"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="grid gap-4">
          {trips.map((item) => (
            <ContentPanel key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">{item.id}</span>
                  <h2 className="mt-1">{item.destination}</h2>
                  <p className="muted mt-1">
                    {item.scheduledDeparture} · {item.operator} · {item.passengers.length}/{item.capacity}
                  </p>
                </div>
                <StatusBadge tone={item.status === "held" || item.status === "overdue" ? "warning" : "pending"}>
                  {item.status}
                </StatusBadge>
              </div>
              <Button asChild className="mt-4" variant="outline">
                <Link href={`/ops/tourism/trips/${item.id}`}>Open operations record</Link>
              </Button>
            </ContentPanel>
          ))}
        </div>
      </>,
      true,
    );
  }
  if (mode === "operators")
    return shell(
      "Operators and vessels",
      "Business eligibility, vessel capacity, crew context and expiring evidence.",
      <>
        {scenario}
        {TOURISM_OPERATORS.map((operator) => (
          <ContentPanel key={operator.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="eyebrow">{operator.id}</span>
                <h2 className="mt-1">{operator.name}</h2>
                <p className="muted mt-1">M03 permit {operator.businessPermit}</p>
              </div>
              <StatusBadge tone="success">{operator.status}</StatusBadge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {operator.vessels.map((vessel) => (
                <article className="rounded-lg border p-4" key={vessel.id}>
                  <strong>{vessel.name}</strong>
                  <p className="muted text-sm">
                    {vessel.id} · capacity {vessel.capacity}
                  </p>
                  <StatusBadge className="mt-3" tone={vessel.documentStatus === "valid" ? "success" : "warning"}>
                    {vessel.documentStatus} documents
                  </StatusBadge>
                </article>
              ))}
            </div>
            <PanelDivider />
            <h3 className="text-base">Assigned sample crew</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {operator.crew.map((member) => (
                <p className="rounded-lg border p-3 text-sm" key={`${member.name}-${member.role}`}>
                  <strong>{member.name}</strong>
                  <br />
                  <span className="muted">
                    {member.role} · {member.credentialStatus} credential
                  </span>
                </p>
              ))}
            </div>
          </ContentPanel>
        ))}
      </>,
      true,
    );
  if (mode === "advisories") {
    const affected = tourismRepository.list().filter((item) => item.hold?.active);
    return shell(
      "Advisories and holds",
      "Draft/active notices and affected-trip notification preview.",
      <>
        {scenario}
        <ContentPanel>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <span className="eyebrow">DEMO-HOLD-001</span>
              <h2 className="mt-1">Official safety hold</h2>
            </div>
            <StatusBadge tone="warning">active preview</StatusBadge>
          </div>
          <p className="muted mt-3">
            Departure decisions stay with the authorized authority role. Local notifications expose booking-safe facts
            only.
          </p>
          <PanelDivider />
          {affected.map((item) => (
            <div className="flex flex-wrap justify-between gap-3" key={item.id}>
              <span>
                {item.id} · {item.destination}
              </span>
              <span>{item.notifications.at(-1)}</span>
            </div>
          ))}
        </ContentPanel>
      </>,
      true,
    );
  }
  if ((mode === "trip-detail" || mode === "partner") && trip) {
    const acknowledged = trip.documents.every((item) => item.status === "acknowledged" || item.status === "superseded");
    const paid = trip.charges.every((item) => item.status !== "pending");
    const headcountReconciled = trip.passengers.every((item) => item.boardingStatus !== "expected");
    const capacitySatisfied = trip.passengers.length <= trip.capacity;
    const canDepart =
      acknowledged && paid && headcountReconciled && capacitySatisfied && !trip.hold?.active && preview === "normal";
    return shell(
      mode === "partner" ? `Assigned packet ${trip.id}` : `Trip ${trip.id}`,
      `${trip.operator} · ${trip.vessel} · manifest version ${trip.manifestVersion}`,
      <>
        {scenario}
        <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <div className="grid gap-6">
            <ContentPanel>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <span className="eyebrow">Passenger snapshot v{trip.manifestVersion}</span>
                  <h2 className="mt-1">
                    Capacity {trip.passengers.length}/{trip.capacity}
                  </h2>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    tourismRepository.changeManifest(trip.id);
                    refresh((value) => value + 1);
                  }}
                >
                  Simulate passenger change
                </Button>
              </div>
              <div className="mt-4 grid gap-3">
                {trip.passengers.map((passenger) => (
                  <article
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                    key={passenger.id}
                  >
                    <div>
                      <strong>{passenger.name}</strong>
                      <p className="muted text-sm">
                        {passenger.id} · {passenger.nationality}
                        {passenger.guardianId ? ` · guardian ${passenger.guardianId}` : ""}
                      </p>
                    </div>
                    <NativeSelect
                      aria-label={`Boarding status for ${passenger.name}`}
                      value={passenger.boardingStatus}
                      onChange={(event) => {
                        tourismRepository.setBoardingStatus(
                          trip.id,
                          passenger.id,
                          event.target.value as (typeof passenger)["boardingStatus"],
                        );
                        refresh((value) => value + 1);
                      }}
                    >
                      <option value="expected">Expected</option>
                      <option value="boarded">Boarded</option>
                      <option value="absent">No-show</option>
                      <option value="substituted">Substitution reviewed</option>
                    </NativeSelect>
                  </article>
                ))}
              </div>
            </ContentPanel>
            <ContentPanel>
              <span className="eyebrow">M05 packet {trip.routePacketId}</span>
              <h2 className="mt-1">Document revisions</h2>
              <div className="mt-4 grid gap-3">
                {trip.documents.map((document) => (
                  <article className="rounded-lg border p-4" key={document.id}>
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <strong>
                          {document.kind.toUpperCase()} · version {document.version}
                        </strong>
                        <p className="muted text-sm">
                          {document.id}
                          {document.reason ? ` · ${document.reason}` : ""}
                        </p>
                      </div>
                      <StatusBadge
                        tone={
                          document.status === "acknowledged"
                            ? "success"
                            : document.status === "for-correction"
                              ? "warning"
                              : "pending"
                        }
                      >
                        {document.status}
                      </StatusBadge>
                    </div>
                    <div className="mt-3 rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
                      <strong>Printable sample preview</strong>
                      <p className="muted mt-1">
                        {document.kind === "manifest"
                          ? `${trip.passengers.length} passenger records from snapshot version ${document.version}.`
                          : document.kind === "odso"
                            ? "Declarant: Captain Sample · operator attestation fields complete in this packet."
                            : document.kind === "coi"
                              ? "Inspection evidence: sample checklist and two photos; this is not sailing clearance."
                              : "Assigned authority acknowledgment record; no signature is fabricated."}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.print()}>
                        Print sample preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          tourismRepository.acknowledge(trip.id, document.id);
                          refresh((value) => value + 1);
                        }}
                      >
                        Acknowledge sample
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!reason.trim()}
                        onClick={() => {
                          tourismRepository.requestCorrection(trip.id, document.id, reason);
                          refresh((value) => value + 1);
                        }}
                      >
                        Request correction
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <label className="mt-4 grid gap-2 font-medium text-sm">
                Correction reason
                <Input value={reason} onChange={(event) => setReason(event.target.value)} />
              </label>
            </ContentPanel>
          </div>
          <aside className="grid content-start gap-6">
            <ContentPanel>
              <Ship className="text-primary" />
              <h2 className="mt-3">Departure gates</h2>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  Payment: <strong>{paid ? "satisfied" : "pending"}</strong>
                </li>
                <li>
                  Documents/decisions: <strong>{acknowledged ? "acknowledged" : "pending"}</strong>
                </li>
                <li>
                  Active hold: <strong>{trip.hold?.active ? "yes" : "none"}</strong>
                </li>
                <li>
                  Headcount:{" "}
                  <strong>
                    {trip.passengers.filter((item) => item.boardingStatus === "boarded").length}/
                    {trip.passengers.length} boarded
                  </strong>
                </li>
                <li>
                  Reconciliation: <strong>{headcountReconciled ? "complete" : "expected travelers remain"}</strong>
                </li>
                <li>
                  Capacity: <strong>{capacitySatisfied ? "within limit" : "denied"}</strong>
                </li>
              </ul>
              <Button
                className="mt-5 w-full"
                disabled={!canDepart}
                onClick={() => {
                  tourismRepository.depart(trip.id);
                  refresh((value) => value + 1);
                }}
              >
                Record departure
              </Button>
              {["departed", "overdue"].includes(trip.status) && (
                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  onClick={() => {
                    tourismRepository.recordReturn(trip.id);
                    refresh((value) => value + 1);
                  }}
                >
                  Record reconciled return
                </Button>
              )}
            </ContentPanel>
            <ContentPanel>
              <Users className="text-primary" />
              <h2 className="mt-3">Timeline and outbox</h2>
              {trip.timeline.map((item) => (
                <p className="mt-3 border-primary/30 border-l-2 pl-3 text-sm" key={`${item.at}-${item.label}`}>
                  <strong>{item.label}</strong>
                  <br />
                  <span className="muted">
                    {item.at} · {item.actor}
                  </span>
                </p>
              ))}
              <PanelDivider />
              {trip.notifications.map((item) => (
                <p className="mt-2 text-sm" key={item}>
                  • {item}
                </p>
              ))}
            </ContentPanel>
          </aside>
        </div>
      </>,
      mode === "trip-detail",
    );
  }
  return null;
}

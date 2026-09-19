"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, CheckCircle2, Clock3, FileText, Pencil, Plus, Ship, Trash2, Users } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type PassengerValues, passengerSchema } from "../schemas/tourism-schema";
import { tourismRepository as repository } from "../services/tourism-repository";
import type { TourismPassenger, TourismTripStatus } from "../types/tourism-records";

const TONES: Record<TourismTripStatus, StatusTone> = {
  draft: "neutral",
  "packet-review": "pending",
  ready: "success",
  held: "warning",
  departed: "pending",
  overdue: "destructive",
  returned: "success",
  canceled: "neutral",
};
const label = (value: string) => value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
const BLANK: PassengerValues = {
  name: "",
  nationality: "Filipino",
  age: 18,
  guardianId: "",
  boardingStatus: "expected",
};

export function TripDetailView({ tripId }: { tripId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [passengerDelete, setPassengerDelete] = useState<TourismPassenger>();
  const [editingPassenger, setEditingPassenger] = useState<string>();
  const [passenger, setPassenger] = useState<PassengerValues>(BLANK);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();
  const trip = repository.readTrip(tripId);
  if (role !== "municipal")
    return (
      <PermissionState
        title="Tourism operations are not assigned to this role"
        description="Choose the municipal staff role."
      />
    );
  if (!trip)
    return (
      <PermissionState
        title="Trip unavailable"
        description="The requested trip was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/tourism/trips">Back to trips</Link>
          </Button>
        }
      />
    );
  const resolvedTripId = trip.id;
  const documentsReady =
    trip.documents.length > 0 && trip.documents.every((item) => ["acknowledged", "superseded"].includes(item.status));
  const chargesReady = trip.charges.every((item) => item.status !== "pending");
  const headcountReady =
    trip.passengers.length > 0 && trip.passengers.every((item) => item.boardingStatus !== "expected");
  const canDepart =
    documentsReady && chargesReady && headcountReady && !trip.hold?.active && trip.passengers.length <= trip.capacity;
  function editPassenger(item: TourismPassenger) {
    setEditingPassenger(item.id);
    setPassenger({
      name: item.name,
      nationality: item.nationality,
      age: item.age,
      guardianId: item.guardianId ?? "",
      boardingStatus: item.boardingStatus,
    });
    setErrors([]);
  }
  function resetPassenger() {
    setEditingPassenger(undefined);
    setPassenger(BLANK);
    setErrors([]);
  }
  function savePassenger() {
    const parsed = passengerSchema.safeParse(passenger);
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "passenger"), message: issue.message })),
      );
    const input = { ...parsed.data, guardianId: parsed.data.guardianId || undefined };
    const result = editingPassenger
      ? repository.updatePassenger(resolvedTripId, editingPassenger, input)
      : repository.addPassenger(resolvedTripId, input);
    if (!result) return setErrors([{ id: "passenger", message: "The passenger could not be saved." }]);
    setNotice(
      editingPassenger
        ? "Passenger updated and manifest revision created."
        : "Passenger added and manifest revision created.",
    );
    resetPassenger();
    refresh((value) => value + 1);
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">{trip.bookingId}</span>
          <h1>{trip.id}</h1>
          <p>
            {trip.destination} · {trip.operator}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/tourism/trips">
              <ArrowLeft />
              Back to trips
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/tourism/trips/${trip.id}/edit`}>
              <Pencil />
              Edit trip
            </Link>
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This trip record could not be changed" />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Ship className="text-primary" />
              <h2 className="mt-3">Trip information</h2>
            </div>
            <StatusBadge tone={TONES[trip.status]}>{label(trip.status)}</StatusBadge>
          </div>
          <dl className="registry-facts mt-6">
            <Fact label="Destination" value={trip.destination} />
            <Fact label="Operator" value={trip.operator} />
            <Fact label="Vessel" value={trip.vessel} />
            <Fact label="Capacity" value={`${trip.passengers.length}/${trip.capacity}`} />
            <Fact label="Scheduled departure" value={trip.scheduledDeparture} />
            <Fact label="Expected return" value={trip.expectedReturn} />
            <Fact label="Actual departure" value={trip.actualDeparture ?? "Not recorded"} />
            <Fact label="Actual return" value={trip.actualReturn ?? "Not recorded"} />
            <Fact label="Visitor reference" value={trip.visitorId} />
            <Fact label="Route packet" value={trip.routePacketId} />
          </dl>
        </ContentPanel>
        <ContentPanel as="aside">
          <CheckCircle2 className="text-primary" />
          <h2 className="mt-3">Departure clearance</h2>
          <dl className="registry-facts mt-6">
            <Fact label="Documents" value={documentsReady ? "Complete" : "Pending review"} />
            <Fact label="Payments" value={chargesReady ? "Complete" : "Pending"} />
            <Fact label="Headcount" value={headcountReady ? "Reconciled" : "Expected passengers remain"} />
            <Fact label="Safety hold" value={trip.hold?.active ? trip.hold.reason : "None"} />
          </dl>
          <PanelDivider />
          <Button
            className="w-full"
            disabled={!canDepart || ["departed", "overdue", "returned"].includes(trip.status)}
            onClick={() => {
              repository.depart(trip.id);
              setNotice("Departure recorded.");
              refresh((value) => value + 1);
            }}
          >
            <Ship />
            Record departure
          </Button>
          {["departed", "overdue"].includes(trip.status) && (
            <Button
              className="mt-3 w-full"
              variant="outline"
              onClick={() => {
                repository.recordReturn(trip.id);
                setNotice("Return recorded and reconciled.");
                refresh((value) => value + 1);
              }}
            >
              Record return
            </Button>
          )}
          {trip.hold?.active && (
            <Button
              className="mt-3 w-full"
              variant="outline"
              onClick={() => {
                repository.requestRebook(trip.id);
                setNotice("Trip cancelled and refund requests recorded.");
                refresh((value) => value + 1);
              }}
            >
              Cancel and rebook
            </Button>
          )}
        </ContentPanel>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <Users className="text-primary" />
          <h2 className="mt-3">Passenger manifest · version {trip.manifestVersion}</h2>
          <div className="mt-5 grid gap-3">
            {trip.passengers.map((item) => (
              <div className="rounded-xl border p-4" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <strong>{item.name}</strong>
                    <p className="muted mt-1 text-sm">
                      {item.id} · {item.nationality} · age {item.age}
                      {item.guardianId ? ` · guardian ${item.guardianId}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <NativeSelect
                      aria-label={`Boarding status for ${item.name}`}
                      value={item.boardingStatus}
                      onChange={(event) => {
                        repository.setBoardingStatus(
                          trip.id,
                          item.id,
                          event.target.value as TourismPassenger["boardingStatus"],
                        );
                        refresh((value) => value + 1);
                      }}
                    >
                      {["expected", "boarded", "absent", "substituted"].map((status) => (
                        <option key={status} value={status}>
                          {label(status)}
                        </option>
                      ))}
                    </NativeSelect>
                    <Button size="sm" variant="outline" onClick={() => editPassenger(item)}>
                      <Pencil />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setPassengerDelete(item)}
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ContentPanel>
        <ContentPanel as="section">
          <Plus className="text-primary" />
          <h2 className="mt-3">{editingPassenger ? "Edit passenger" : "Add passenger"}</h2>
          <div className="mt-5 grid gap-4">
            <FormField id="passenger-name" label="Full name" required>
              {(field) => (
                <Input
                  {...field}
                  value={passenger.name}
                  onChange={(event) => setPassenger((current) => ({ ...current, name: event.target.value }))}
                />
              )}
            </FormField>
            <FormField id="passenger-nationality" label="Nationality" required>
              {(field) => (
                <Input
                  {...field}
                  value={passenger.nationality}
                  onChange={(event) => setPassenger((current) => ({ ...current, nationality: event.target.value }))}
                />
              )}
            </FormField>
            <FormField id="passenger-age" label="Age" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min="0"
                  max="120"
                  value={passenger.age}
                  onChange={(event) => setPassenger((current) => ({ ...current, age: Number(event.target.value) }))}
                />
              )}
            </FormField>
            <FormField id="passenger-guardian" label="Guardian passenger ID">
              {(field) => (
                <Input
                  {...field}
                  value={passenger.guardianId}
                  onChange={(event) => setPassenger((current) => ({ ...current, guardianId: event.target.value }))}
                />
              )}
            </FormField>
          </div>
          <div className="mt-5 flex gap-3">
            <Button onClick={savePassenger}>{editingPassenger ? "Save passenger" : "Add passenger"}</Button>
            {editingPassenger && (
              <Button variant="outline" onClick={resetPassenger}>
                Cancel edit
              </Button>
            )}
          </div>
        </ContentPanel>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ContentPanel as="section">
          <FileText className="text-primary" />
          <h2 className="mt-3">Trip documents</h2>
          <div className="mt-5 grid gap-3">
            {trip.documents.length ? (
              trip.documents.map((document) => (
                <div className="rounded-xl border p-4" key={document.id}>
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <strong>
                        {document.kind.toUpperCase()} · version {document.version}
                      </strong>
                      <p className="muted mt-1 text-sm">
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
                      {label(document.status)}
                    </StatusBadge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        repository.acknowledge(trip.id, document.id);
                        setNotice(`${document.kind.toUpperCase()} acknowledged.`);
                        refresh((value) => value + 1);
                      }}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!reason.trim()}
                      onClick={() => {
                        repository.requestCorrection(trip.id, document.id, reason);
                        setNotice(`${document.kind.toUpperCase()} returned for correction.`);
                        refresh((value) => value + 1);
                      }}
                    >
                      Request correction
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No documents are attached to this trip.</p>
            )}
          </div>
          <FormField id="correction-reason" label="Correction reason" className="mt-5">
            {(field) => <Input {...field} value={reason} onChange={(event) => setReason(event.target.value)} />}
          </FormField>
        </ContentPanel>
        <ContentPanel as="section">
          <Clock3 className="text-primary" />
          <h2 className="mt-3">Charges and timeline</h2>
          {trip.charges.length ? (
            <div className="mt-5 grid gap-3">
              {trip.charges.map((charge) => (
                <div className="flex justify-between gap-4 rounded-xl border p-4 text-sm" key={charge.id}>
                  <span>
                    <strong>{charge.label}</strong>
                    <br />
                    <span className="muted">
                      {charge.payee} · {label(charge.status)}
                    </span>
                  </span>
                  <strong>₱{charge.amount.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted mt-4">No charges are recorded.</p>
          )}
          <PanelDivider />
          <div className="grid gap-3">
            {trip.timeline.map((item) => (
              <div className="border-primary/30 border-l-2 pl-3 text-sm" key={`${item.at}-${item.label}`}>
                <strong>{item.label}</strong>
                <p className="muted">
                  {item.at} · {item.actor}
                </p>
              </div>
            ))}
          </div>
        </ContentPanel>
      </div>
      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${trip.id}`}
        description="This removes the trip, manifest, documents, charges, and operational history from the current workspace."
        confirmLabel="Delete trip"
        destructive
        onConfirm={() => {
          repository.deleteTrip(trip.id);
          router.replace("/ops/tourism/trips");
        }}
      />
      <ConfirmationDialog
        open={passengerDelete !== undefined}
        onOpenChange={(next) => !next && setPassengerDelete(undefined)}
        title={`Remove ${passengerDelete?.name ?? "passenger"}`}
        description="This removes the passenger and creates a new manifest revision."
        confirmLabel="Remove passenger"
        destructive
        onConfirm={() => {
          if (passengerDelete) repository.deletePassenger(trip.id, passengerDelete.id);
          setPassengerDelete(undefined);
          setNotice("Passenger removed and manifest revision created.");
          refresh((value) => value + 1);
        }}
      />
    </>
  );
}
function Fact({ label: factLabel, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="muted font-semibold text-xs uppercase tracking-wide">{factLabel}</dt>
      <dd className="mt-1 font-medium text-sm">{value}</dd>
    </div>
  );
}

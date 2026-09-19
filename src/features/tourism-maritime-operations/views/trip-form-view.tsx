"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { LoadingState } from "@/shared/components/loading-state";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type TripValues, tripSchema } from "../schemas/tourism-schema";
import { tourismRepository as repository } from "../services/tourism-repository";
import type { TourismTripStatus } from "../types/tourism-records";

const STATUSES: TourismTripStatus[] = [
  "draft",
  "packet-review",
  "ready",
  "held",
  "departed",
  "overdue",
  "returned",
  "canceled",
];
const label = (value: string) => value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());

export function TripFormView({ tripId }: { tripId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const operators = repository.listOperators();
  const firstOperator = operators[0];
  const [values, setValues] = useState<TripValues | null>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!tripId)
      return setValues({
        bookingId: `BOOK-2026-${1900 + repository.list().length}`,
        visitorId: "VIS-2026-",
        destinationId: repository.destinations()[0]?.id ?? "",
        operatorId: firstOperator?.id ?? "",
        vesselId: firstOperator?.vessels[0]?.id ?? "",
        scheduledDeparture: "2026-09-20T07:00",
        expectedReturn: "2026-09-20T16:00",
        status: "draft",
      });
    const trip = repository.readTrip(tripId);
    setValues(
      trip
        ? {
            bookingId: trip.bookingId,
            visitorId: trip.visitorId,
            destinationId: trip.destinationId,
            operatorId: trip.operatorId,
            vesselId: trip.vesselId,
            scheduledDeparture: trip.scheduledDeparture.replace(" ", "T"),
            expectedReturn: trip.expectedReturn.replace(" ", "T"),
            status: trip.status,
          }
        : null,
    );
  }, [tripId, firstOperator]);
  if (role !== "municipal")
    return (
      <PermissionState
        title="Tourism operations are not assigned to this role"
        description="Choose the municipal staff role."
      />
    );
  if (values === undefined) return <LoadingState label="Loading trip" message="Opening the trip record…" />;
  if (values === null)
    return (
      <PermissionState
        title="Trip unavailable"
        description="The requested trip was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/tourism/trips">Back to trips</Link>
          </Button>
        }
      />
    );
  const selectedOperator = repository.readOperator(values.operatorId);
  function set<K extends keyof TripValues>(key: K, value: TripValues[K]) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }
  function selectOperator(id: string) {
    const operator = repository.readOperator(id);
    setValues((current) =>
      current ? { ...current, operatorId: id, vesselId: operator?.vessels[0]?.id ?? "" } : current,
    );
  }
  function save() {
    if (!values || saving) return;
    const parsed = tripSchema.safeParse({
      ...values,
      scheduledDeparture: values.scheduledDeparture.replace("T", " "),
      expectedReturn: values.expectedReturn.replace("T", " "),
    });
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })),
      );
    setSaving(true);
    const result = tripId ? repository.updateTrip(tripId, parsed.data) : repository.createTrip(parsed.data);
    setSaving(false);
    if (!result)
      return setErrors([
        {
          id: "form",
          message: "The trip could not be saved. Confirm that the selected vessel belongs to the operator.",
        },
      ]);
    router.push(`/ops/tourism/trips/${result.id}`);
  }
  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <h1>{tripId ? "Edit trip" : "New trip"}</h1>
        <p>
          {tripId
            ? `Update ${tripId} while preserving its manifest and operational history.`
            : "Create a scheduled tourism trip and assign its destination, operator, and vessel."}
        </p>
      </div>
      <ErrorSummary errors={errors} title="This trip could not be saved" />
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Trip assignment"
          description="Connect the booking and visitor references to the destination and accredited transport assignment."
        />
        <div className="mt-6">
          <FormSection title="References and assignment">
            <FormField id="bookingId" label="Booking reference" required>
              {(field) => (
                <Input {...field} value={values.bookingId} onChange={(event) => set("bookingId", event.target.value)} />
              )}
            </FormField>
            <FormField id="visitorId" label="Visitor reference" required>
              {(field) => (
                <Input {...field} value={values.visitorId} onChange={(event) => set("visitorId", event.target.value)} />
              )}
            </FormField>
            <FormField id="destinationId" label="Destination" required>
              {(field) => (
                <Select value={values.destinationId} onValueChange={(next) => set("destinationId", next)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {repository.destinations().map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="operatorId" label="Operator" required>
              {(field) => (
                <Select value={values.operatorId} onValueChange={selectOperator}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="vesselId" label="Vessel" required>
              {(field) => (
                <Select value={values.vesselId} onValueChange={(next) => set("vesselId", next)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOperator?.vessels.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} · capacity {item.capacity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="status" label="Status" required>
              {(field) => (
                <Select value={values.status} onValueChange={(next) => set("status", next as TourismTripStatus)}>
                  <SelectTrigger id={field.id} className="form-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {label(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>
      <ContentPanel className="mb-6">
        <SectionHeading
          title="Schedule"
          description="Set the planned departure and expected return used by port monitoring."
        />
        <div className="mt-6">
          <FormSection title="Departure and return">
            <FormField id="scheduledDeparture" label="Scheduled departure" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.scheduledDeparture}
                  onChange={(event) => set("scheduledDeparture", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="expectedReturn" label="Expected return" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={values.expectedReturn}
                  onChange={(event) => set("expectedReturn", event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
        </div>
      </ContentPanel>
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving}>
          <Save />
          {saving ? "Saving…" : tripId ? "Save changes" : "Create trip"}
        </Button>
        <Button asChild variant="outline">
          <Link href={tripId ? `/ops/tourism/trips/${tripId}` : "/ops/tourism/trips"}>
            <ArrowLeft />
            Cancel
          </Link>
        </Button>
      </div>
    </div>
  );
}

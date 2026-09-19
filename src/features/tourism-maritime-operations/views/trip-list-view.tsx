"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Plus, SearchX, Ship } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { TripTable } from "../components/trip-table";
import { tourismRepository as repository } from "../services/tourism-repository";
import type { TourismTrip, TourismTripStatus } from "../types/tourism-records";

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

export function TripListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<TourismTrip[]>([]);
  const [search, setSearch] = useState("");
  const [destination, setDestination] = useState("");
  const [operator, setOperator] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState<TourismTrip>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  useEffect(() => setRecords([...repository.list()]), []);
  if (role !== "municipal")
    return (
      <PermissionState
        title="Tourism operations are not assigned to this role"
        description="Choose the municipal staff role."
      />
    );

  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const haystack =
      `${row.id} ${row.bookingId} ${row.destination} ${row.operator} ${row.vessel} ${row.visitorId}`.toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!destination || row.destinationId === destination) &&
      (!operator || row.operatorId === operator) &&
      (!status || row.status === status)
    );
  });
  const filtering = Boolean(search || destination || operator || status);
  const reset = () => {
    setSearch("");
    setDestination("");
    setOperator("");
    setStatus("");
  };
  function remove() {
    if (!deleting) return;
    if (!repository.deleteTrip(deleting.id)) setErrors([{ id: "form", message: "That trip could not be deleted." }]);
    else {
      setRecords((current) => current.filter((item) => item.id !== deleting.id));
      setNotice(`${deleting.id} was deleted.`);
      setErrors([]);
    }
    setDeleting(undefined);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Trips</h1>
          <p>Manage trip schedules, manifests, document review, boarding, departure, and return.</p>
        </div>
        <Button asChild>
          <Link href="/ops/tourism/trips/new">
            <Plus />
            New trip
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This trip could not be changed" />
      <div className="ops-controls">
        <OpsSearch
          value={search}
          onChange={setSearch}
          placeholder="Trip, booking, destination, operator, vessel, or visitor…"
        />
        <OpsFilter
          label="Destination"
          value={destination}
          onChange={setDestination}
          anyLabel="Any destination"
          width={220}
          options={repository.destinations().map((item) => ({ value: item.id, label: item.name }))}
        />
        <OpsFilter
          label="Operator"
          value={operator}
          onChange={setOperator}
          anyLabel="Any operator"
          width={230}
          options={repository.listOperators().map((item) => ({ value: item.id, label: item.name }))}
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={STATUSES.map((value) => ({ value, label: label(value) }))}
        />
      </div>
      {rows.length ? (
        <TripTable records={rows} onDelete={setDeleting} />
      ) : (
        <EmptyState
          icon={filtering ? SearchX : Ship}
          title={filtering ? "No trips match your filters." : "No tourism trips in scope."}
          description={filtering ? "Adjust the search or clear the filters." : "Create the first trip record."}
          action={
            filtering ? (
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/ops/tourism/trips/new">New trip</Link>
              </Button>
            )
          }
        />
      )}
      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title={`Delete ${deleting?.id ?? "trip"}`}
        description="This removes the trip, passenger manifest, documents, charges, and operational history from the current workspace."
        confirmLabel="Delete trip"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

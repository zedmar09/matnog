"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, CalendarClock, CheckCircle2, MapPin, Pencil, ShieldAlert, Trash2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { tourismRepository as repository } from "../services/tourism-repository";
import type { TourismAdvisorySeverity, TourismAdvisoryStatus } from "../types/tourism-records";

const STATUS_TONE: Record<TourismAdvisoryStatus, StatusTone> = {
  Draft: "neutral",
  Active: "warning",
  Resolved: "success",
  Cancelled: "neutral",
};

const SEVERITY_TONE: Record<TourismAdvisorySeverity, StatusTone> = {
  Information: "pending",
  Caution: "warning",
  Restricted: "destructive",
  Closed: "destructive",
};

export function AdvisoryDetailView({ advisoryId }: { advisoryId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<string>();
  const advisory = repository.readAdvisory(advisoryId);

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Tourism advisories are not assigned to this role"
        description="Choose the municipal staff role."
      />
    );
  }

  if (!advisory) {
    return (
      <PermissionState
        title="Advisory unavailable"
        description="The requested advisory was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/tourism/advisories">Back to advisories</Link>
          </Button>
        }
      />
    );
  }

  const resolvedAdvisoryId = advisory.id;
  const impactedTrips = repository.list().filter((trip) => {
    const destinationMatches = advisory.affectedDestinations.includes(trip.destination);
    const operatorMatches = advisory.affectedOperators.includes(trip.operator);
    return destinationMatches || operatorMatches || trip.hold?.id === advisory.id;
  });

  function changeStatus(status: TourismAdvisoryStatus) {
    repository.setAdvisoryStatus(resolvedAdvisoryId, status);
    setNotice(`Advisory marked ${status.toLocaleLowerCase()}.`);
    refresh((value) => value + 1);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">{advisory.id}</span>
          <h1>{advisory.title}</h1>
          <p>{advisory.issuingAuthority}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/tourism/advisories">
              <ArrowLeft />
              Back to advisories
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/tourism/advisories/${advisory.id}/edit`}>
              <Pencil />
              Edit advisory
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

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <ShieldAlert className="text-primary" />
              <h2 className="mt-3">Advisory information</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={SEVERITY_TONE[advisory.severity]}>{advisory.severity}</StatusBadge>
              <StatusBadge tone={STATUS_TONE[advisory.status]}>{advisory.status}</StatusBadge>
            </div>
          </div>
          <dl className="registry-facts mt-6">
            <Fact label="Type" value={advisory.advisoryType} />
            <Fact label="Issuing authority" value={advisory.issuingAuthority} />
            <Fact label="Effective from" value={advisory.effectiveFrom} />
            <Fact label="Effective until" value={advisory.effectiveUntil} />
            <Fact label="Last updated" value={advisory.updatedAt} />
            <Fact label="Impacted trips" value={String(impactedTrips.length)} />
          </dl>
        </ContentPanel>

        <ContentPanel as="aside">
          <CalendarClock className="text-primary" />
          <h2 className="mt-3">Publication status</h2>
          <p className="muted mt-3 text-sm">
            Update the notice as conditions change and the issuing authority provides clearance.
          </p>
          <PanelDivider />
          <div className="grid gap-3">
            {advisory.status !== "Active" && (
              <Button onClick={() => changeStatus("Active")}>
                <ShieldAlert />
                Activate advisory
              </Button>
            )}
            {advisory.status !== "Resolved" && (
              <Button variant="outline" onClick={() => changeStatus("Resolved")}>
                <CheckCircle2 />
                Mark resolved
              </Button>
            )}
            {advisory.status !== "Cancelled" && (
              <Button variant="outline" onClick={() => changeStatus("Cancelled")}>
                Cancel advisory
              </Button>
            )}
          </div>
        </ContentPanel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ContentPanel as="section">
          <MapPin className="text-primary" />
          <h2 className="mt-3">Operational scope</h2>
          <div className="mt-5 grid gap-5">
            <ScopeList
              title="Affected destinations"
              values={advisory.affectedDestinations}
              emptyLabel="No destination restriction recorded"
            />
            <ScopeList
              title="Affected operators"
              values={advisory.affectedOperators}
              emptyLabel="No operator restriction recorded"
            />
          </div>
        </ContentPanel>
        <ContentPanel as="section">
          <ShieldAlert className="text-primary" />
          <h2 className="mt-3">Condition and required action</h2>
          <div className="mt-5 grid gap-5 text-sm leading-6">
            <div>
              <h3 className="font-semibold">Condition or restriction</h3>
              <p className="muted mt-2">{advisory.details}</p>
            </div>
            <div>
              <h3 className="font-semibold">Required action and public guidance</h3>
              <p className="muted mt-2">{advisory.instructions}</p>
            </div>
          </div>
        </ContentPanel>
      </div>

      <ContentPanel as="section" className="mt-6">
        <h2>Impacted trips</h2>
        <p className="muted mt-2">Trips matched through the advisory destination, operator, or recorded safety hold.</p>
        <div className="mt-5 grid gap-3">
          {impactedTrips.length ? (
            impactedTrips.map((trip) => (
              <Link
                key={trip.id}
                href={`/ops/tourism/trips/${trip.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span>
                  <strong>{trip.id}</strong>
                  <span className="muted mt-1 block text-sm">
                    {trip.destination} · {trip.operator} · {trip.scheduledDeparture}
                  </span>
                </span>
                <StatusBadge
                  tone={
                    trip.status === "held" || trip.status === "overdue"
                      ? "destructive"
                      : trip.status === "returned"
                        ? "success"
                        : "pending"
                  }
                >
                  {trip.status.replaceAll("-", " ")}
                </StatusBadge>
              </Link>
            ))
          ) : (
            <p className="muted text-sm">No current trips match this advisory.</p>
          )}
        </div>
      </ContentPanel>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${advisory.id}`}
        description="This removes the advisory and its affected-route record from the current workspace."
        confirmLabel="Delete advisory"
        destructive
        onConfirm={() => {
          repository.deleteAdvisory(advisory.id);
          router.replace("/ops/tourism/advisories");
        }}
      />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="muted font-semibold text-xs uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 font-medium text-sm">{value}</dd>
    </div>
  );
}

function ScopeList({ title, values, emptyLabel }: { title: string; values: string[]; emptyLabel: string }) {
  return (
    <div>
      <h3 className="font-semibold text-sm">{title}</h3>
      {values.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <StatusBadge key={value} tone="neutral">
              {value}
            </StatusBadge>
          ))}
        </div>
      ) : (
        <p className="muted mt-2 text-sm">{emptyLabel}</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Building2, Pencil, Trash2, Users } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localDisasterRepository as repository } from "../services/local-disaster-repository";
import type { CenterStatus } from "../types/disaster-records";

const TONE: Record<CenterStatus, StatusTone> = { Open: "success", Standby: "pending", Closed: "neutral" };

export function CenterDetailView({ centerId }: { centerId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<string>();
  const center = repository.center(centerId);
  const households = center ? repository.centerHouseholds(center.id) : [];
  const firstHousehold = households[0];
  const [selection, setSelection] = useState(
    firstHousehold ? `${firstHousehold.householdId}|${firstHousehold.members[0]?.id}` : "",
  );

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Evacuation center management is not assigned to this role"
        description="Choose the municipal or barangay role."
      />
    );
  if (!center)
    return (
      <PermissionState
        title="Evacuation center unavailable"
        description="The requested center record was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/disaster/events">Back to activities</Link>
          </Button>
        }
      />
    );

  function changeOccupancy(action: "check-in" | "check-out") {
    if (!center) return;
    const [householdId, personId] = selection.split("|");
    const result = repository.setOccupant(center.id, householdId, personId, action);
    setNotice(
      result === "updated"
        ? `Occupancy updated for ${personId}.`
        : result === "full"
          ? "The center has reached its accepted capacity."
          : result === "replayed"
            ? "The selected resident is already checked in."
            : result === "not-checked-in"
              ? "The selected resident is not currently checked in."
              : "The selected resident record was not found.",
    );
    refresh((value) => value + 1);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">Evacuation center</span>
          <h1>{center.name}</h1>
          <p>
            {center.id} · {center.barangay}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/ops/disaster/events/${center.activityId}`}>
              <ArrowLeft />
              Back to activity
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/disaster/centers/${center.id}/edit`}>
              <Pencil />
              Edit center
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
      <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Building2 className="text-primary" />
            <StatusBadge tone={TONE[center.status]}>{center.status}</StatusBadge>
          </div>
          <h2 className="mt-3">Center record</h2>
          <dl className="registry-facts mt-6">
            <Fact label="Accepted occupancy" value={`${center.acceptedOccupants} of ${center.capacity}`} />
            <Fact label="Pending arrivals" value={String(center.pendingOccupants)} />
            <Fact label="Address" value={center.address} />
            <Fact label="Manager" value={center.manager} />
            <Fact label="Contact number" value={center.contactNumber} />
            <Fact label="Record version" value={String(center.version)} />
          </dl>
          <PanelDivider />
          <h3>Available facilities</h3>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {center.facilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentPanel>
        <ContentPanel as="section">
          <Users className="text-primary" />
          <h2 className="mt-3">Household member manifest</h2>
          <p className="muted">Record actual check-in and check-out status for each assigned resident.</p>
          <div className="mt-5 grid gap-3">
            {households.flatMap((household) =>
              household.members.map((member) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                  key={member.id}
                >
                  <div>
                    <strong>{member.label}</strong>
                    <p className="muted text-sm">
                      {household.householdName} · {member.id}
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      member.status === "Checked in"
                        ? "success"
                        : member.status === "Missing follow-up"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {member.status}
                  </StatusBadge>
                </div>
              )),
            )}
          </div>
          {households.length ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <NativeSelect
                aria-label="Select resident"
                value={selection}
                onChange={(event) => setSelection(event.target.value)}
              >
                {households.flatMap((household) =>
                  household.members.map((member) => (
                    <option key={member.id} value={`${household.householdId}|${member.id}`}>
                      {member.label} · {member.status}
                    </option>
                  )),
                )}
              </NativeSelect>
              <Button
                disabled={!selection || center.status !== "Open" || center.acceptedOccupants >= center.capacity}
                onClick={() => changeOccupancy("check-in")}
              >
                Check in
              </Button>
              <Button variant="outline" disabled={!selection} onClick={() => changeOccupancy("check-out")}>
                Check out
              </Button>
            </div>
          ) : (
            <p className="muted mt-5 text-sm">No households are currently assigned to this center.</p>
          )}
        </ContentPanel>
      </div>
      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${center.id}`}
        description="This removes the evacuation center from the current activity."
        confirmLabel="Delete center"
        destructive
        onConfirm={() => {
          repository.deleteCenter(center.id);
          router.replace(`/ops/disaster/events/${center.activityId}`);
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

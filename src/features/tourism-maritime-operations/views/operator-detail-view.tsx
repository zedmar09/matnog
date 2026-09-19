"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Mail, Pencil, Phone, Plus, Ship, Trash2, Users } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type CrewValues, crewSchema, type VesselValues, vesselSchema } from "../schemas/tourism-schema";
import { tourismRepository as repository } from "../services/tourism-repository";
import type { TourismCrewMember, TourismVessel } from "../types/tourism-records";

const BLANK_VESSEL: VesselValues = {
  name: "",
  registrationNumber: "",
  capacity: 1,
  documentValidUntil: "2026-12-31",
  documentStatus: "valid",
};
const BLANK_CREW: CrewValues = {
  name: "",
  role: "",
  licenseNumber: "",
  credentialValidUntil: "2026-12-31",
  credentialStatus: "valid",
};

export function OperatorDetailView({ operatorId }: { operatorId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [vesselDelete, setVesselDelete] = useState<TourismVessel>();
  const [crewDelete, setCrewDelete] = useState<TourismCrewMember>();
  const [editingVessel, setEditingVessel] = useState<string>();
  const [editingCrew, setEditingCrew] = useState<string>();
  const [vessel, setVessel] = useState<VesselValues>(BLANK_VESSEL);
  const [crew, setCrew] = useState<CrewValues>(BLANK_CREW);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();
  const operator = repository.readOperator(operatorId);
  if (role !== "municipal")
    return (
      <PermissionState
        title="Tourism operators are not assigned to this role"
        description="Choose the municipal staff role."
      />
    );
  if (!operator)
    return (
      <PermissionState
        title="Operator unavailable"
        description="The requested operator was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/tourism/operators">Back to operators</Link>
          </Button>
        }
      />
    );
  const resolvedOperatorId = operator.id;
  function editVessel(item: TourismVessel) {
    setEditingVessel(item.id);
    setVessel({ ...item });
    setErrors([]);
  }
  function editCrew(item: TourismCrewMember) {
    setEditingCrew(item.id);
    setCrew({ ...item });
    setErrors([]);
  }
  function saveVessel() {
    const parsed = vesselSchema.safeParse(vessel);
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "vessel"), message: issue.message })),
      );
    const result = editingVessel
      ? repository.updateVessel(resolvedOperatorId, editingVessel, parsed.data)
      : repository.addVessel(resolvedOperatorId, parsed.data);
    if (!result) return setErrors([{ id: "vessel", message: "The vessel could not be saved." }]);
    setNotice(editingVessel ? "Vessel updated." : "Vessel added.");
    setEditingVessel(undefined);
    setVessel(BLANK_VESSEL);
    setErrors([]);
    refresh((value) => value + 1);
  }
  function saveCrew() {
    const parsed = crewSchema.safeParse(crew);
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "crew"), message: issue.message })),
      );
    const result = editingCrew
      ? repository.updateCrew(resolvedOperatorId, editingCrew, parsed.data)
      : repository.addCrew(resolvedOperatorId, parsed.data);
    if (!result) return setErrors([{ id: "crew", message: "The crew member could not be saved." }]);
    setNotice(editingCrew ? "Crew member updated." : "Crew member added.");
    setEditingCrew(undefined);
    setCrew(BLANK_CREW);
    setErrors([]);
    refresh((value) => value + 1);
  }
  const trips = repository.list().filter((trip) => trip.operatorId === operator.id);
  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">{operator.id}</span>
          <h1>{operator.name}</h1>
          <p>
            {operator.accreditationNumber} · valid until {operator.accreditationValidUntil}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/tourism/operators">
              <ArrowLeft />
              Back to operators
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/tourism/operators/${operator.id}/edit`}>
              <Pencil />
              Edit operator
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
      <ErrorSummary errors={errors} title="This operator record could not be changed" />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Users className="text-primary" />
              <h2 className="mt-3">Operator information</h2>
            </div>
            <StatusBadge tone={operator.status === "eligible" ? "success" : "warning"}>
              {operator.status === "eligible" ? "Eligible" : "Needs attention"}
            </StatusBadge>
          </div>
          <dl className="registry-facts mt-6">
            <Fact label="Business permit" value={operator.businessPermit} />
            <Fact label="Accreditation" value={operator.accreditationNumber} />
            <Fact label="Contact person" value={operator.contactPerson} />
            <Fact label="Address" value={operator.address} />
            <Fact label="Last updated" value={operator.updatedAt} />
          </dl>
        </ContentPanel>
        <ContentPanel as="aside">
          <Phone className="text-primary" />
          <h2 className="mt-3">Contact and assignments</h2>
          <div className="mt-5 grid gap-3 text-sm">
            <p className="flex items-center gap-2">
              <Phone size={15} />
              {operator.contactNumber}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={15} />
              {operator.email}
            </p>
          </div>
          <PanelDivider />
          <dl className="registry-facts">
            <Fact label="Vessels" value={String(operator.vessels.length)} />
            <Fact label="Crew" value={String(operator.crew.length)} />
            <Fact label="Related trips" value={String(trips.length)} />
          </dl>
        </ContentPanel>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <Ship className="text-primary" />
          <h2 className="mt-3">Vessels</h2>
          <div className="mt-5 grid gap-3">
            {operator.vessels.map((item) => (
              <div className="rounded-xl border p-4" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong>{item.name}</strong>
                    <p className="muted mt-1 text-sm">
                      {item.id} · {item.registrationNumber} · capacity {item.capacity}
                    </p>
                    <p className="muted mt-1 text-sm">Documents valid until {item.documentValidUntil}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge
                      tone={
                        item.documentStatus === "valid"
                          ? "success"
                          : item.documentStatus === "expired"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {item.documentStatus}
                    </StatusBadge>
                    <Button size="sm" variant="outline" onClick={() => editVessel(item)}>
                      <Pencil />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setVesselDelete(item)}
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
          <h2 className="mt-3">{editingVessel ? "Edit vessel" : "Add vessel"}</h2>
          <div className="mt-5 grid gap-4">
            <FormField id="vessel-name" label="Vessel name" required>
              {(field) => (
                <Input
                  {...field}
                  value={vessel.name}
                  onChange={(event) => setVessel((current) => ({ ...current, name: event.target.value }))}
                />
              )}
            </FormField>
            <FormField id="vessel-registration" label="Registration number" required>
              {(field) => (
                <Input
                  {...field}
                  value={vessel.registrationNumber}
                  onChange={(event) => setVessel((current) => ({ ...current, registrationNumber: event.target.value }))}
                />
              )}
            </FormField>
            <FormField id="vessel-capacity" label="Passenger capacity" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min="1"
                  value={vessel.capacity}
                  onChange={(event) => setVessel((current) => ({ ...current, capacity: Number(event.target.value) }))}
                />
              )}
            </FormField>
            <FormField id="vessel-validity" label="Documents valid until" required>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  value={vessel.documentValidUntil}
                  onChange={(event) => setVessel((current) => ({ ...current, documentValidUntil: event.target.value }))}
                />
              )}
            </FormField>
            <FormField id="vessel-status" label="Document status" required>
              {(field) => (
                <NativeSelect
                  {...field}
                  value={vessel.documentStatus}
                  onChange={(event) =>
                    setVessel((current) => ({
                      ...current,
                      documentStatus: event.target.value as VesselValues["documentStatus"],
                    }))
                  }
                >
                  <option value="valid">Valid</option>
                  <option value="expiring">Expiring</option>
                  <option value="expired">Expired</option>
                </NativeSelect>
              )}
            </FormField>
          </div>
          <div className="mt-5 flex gap-3">
            <Button onClick={saveVessel}>{editingVessel ? "Save vessel" : "Add vessel"}</Button>
            {editingVessel && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingVessel(undefined);
                  setVessel(BLANK_VESSEL);
                }}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </ContentPanel>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <Users className="text-primary" />
          <h2 className="mt-3">Crew</h2>
          <div className="mt-5 grid gap-3">
            {operator.crew.map((item) => (
              <div className="rounded-xl border p-4" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong>{item.name}</strong>
                    <p className="muted mt-1 text-sm">
                      {item.role} · {item.licenseNumber}
                    </p>
                    <p className="muted mt-1 text-sm">Credential valid until {item.credentialValidUntil}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge
                      tone={
                        item.credentialStatus === "valid"
                          ? "success"
                          : item.credentialStatus === "expired"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {item.credentialStatus}
                    </StatusBadge>
                    <Button size="sm" variant="outline" onClick={() => editCrew(item)}>
                      <Pencil />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setCrewDelete(item)}
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
          <h2 className="mt-3">{editingCrew ? "Edit crew member" : "Add crew member"}</h2>
          <div className="mt-5 grid gap-4">
            <FormField id="crew-name" label="Full name" required>
              {(field) => (
                <Input
                  {...field}
                  value={crew.name}
                  onChange={(event) => setCrew((current) => ({ ...current, name: event.target.value }))}
                />
              )}
            </FormField>
            <FormField id="crew-role" label="Role" required>
              {(field) => (
                <Input
                  {...field}
                  value={crew.role}
                  onChange={(event) => setCrew((current) => ({ ...current, role: event.target.value }))}
                />
              )}
            </FormField>
            <FormField id="crew-license" label="License or credential number" required>
              {(field) => (
                <Input
                  {...field}
                  value={crew.licenseNumber}
                  onChange={(event) => setCrew((current) => ({ ...current, licenseNumber: event.target.value }))}
                />
              )}
            </FormField>
            <FormField id="crew-validity" label="Credential valid until" required>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  value={crew.credentialValidUntil}
                  onChange={(event) => setCrew((current) => ({ ...current, credentialValidUntil: event.target.value }))}
                />
              )}
            </FormField>
            <FormField id="crew-status" label="Credential status" required>
              {(field) => (
                <NativeSelect
                  {...field}
                  value={crew.credentialStatus}
                  onChange={(event) =>
                    setCrew((current) => ({
                      ...current,
                      credentialStatus: event.target.value as CrewValues["credentialStatus"],
                    }))
                  }
                >
                  <option value="valid">Valid</option>
                  <option value="expiring">Expiring</option>
                  <option value="expired">Expired</option>
                </NativeSelect>
              )}
            </FormField>
          </div>
          <div className="mt-5 flex gap-3">
            <Button onClick={saveCrew}>{editingCrew ? "Save crew member" : "Add crew member"}</Button>
            {editingCrew && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingCrew(undefined);
                  setCrew(BLANK_CREW);
                }}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </ContentPanel>
      </div>
      <ContentPanel as="section" className="mt-6">
        <h2>Related trips</h2>
        <p className="muted mt-2">Current and completed trips assigned to this operator.</p>
        <div className="mt-5 grid gap-3">
          {trips.length ? (
            trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/ops/tourism/trips/${trip.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span>
                  <strong>{trip.id}</strong>
                  <span className="muted mt-1 block text-sm">
                    {trip.destination} · {trip.vessel} · {trip.scheduledDeparture}
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
            <p className="muted text-sm">No trips are assigned to this operator.</p>
          )}
        </div>
      </ContentPanel>
      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${operator.name}`}
        description="This removes the operator, vessels, crew, and related trips from the current workspace."
        confirmLabel="Delete operator"
        destructive
        onConfirm={() => {
          repository.deleteOperator(operator.id);
          router.replace("/ops/tourism/operators");
        }}
      />
      <ConfirmationDialog
        open={vesselDelete !== undefined}
        onOpenChange={(next) => !next && setVesselDelete(undefined)}
        title={`Delete ${vesselDelete?.name ?? "vessel"}`}
        description="This removes the vessel from the operator record."
        confirmLabel="Delete vessel"
        destructive
        onConfirm={() => {
          if (vesselDelete) repository.deleteVessel(operator.id, vesselDelete.id);
          setVesselDelete(undefined);
          setNotice("Vessel deleted.");
          refresh((value) => value + 1);
        }}
      />
      <ConfirmationDialog
        open={crewDelete !== undefined}
        onOpenChange={(next) => !next && setCrewDelete(undefined)}
        title={`Delete ${crewDelete?.name ?? "crew member"}`}
        description="This removes the crew member from the operator record."
        confirmLabel="Delete crew member"
        destructive
        onConfirm={() => {
          if (crewDelete) repository.deleteCrew(operator.id, crewDelete.id);
          setCrewDelete(undefined);
          setNotice("Crew member deleted.");
          refresh((value) => value + 1);
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

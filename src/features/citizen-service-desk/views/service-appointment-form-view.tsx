"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, CalendarPlus } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localServiceDeskRepository as repository } from "../services/local-service-desk-repository";

export function ServiceAppointmentFormView() {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const available = repository.slots.filter((slot) => slot.remaining > 0);
  const [slotId, setSlotId] = useState(available.at(0)?.id ?? "");
  const [requester, setRequester] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  if (role !== "municipal")
    return (
      <PermissionState
        title="Appointment booking requires municipal access"
        description="Only authorized municipal staff can record appointments."
      />
    );

  function submit(event: FormEvent) {
    event.preventDefault();
    if (requester.trim().length < 3 || contact.trim().length < 7) {
      setError("Enter the requester name and contact number.");
      return;
    }
    const slot = repository.slots.find((item) => item.id === slotId);
    if (!slot) {
      setError("Choose an available appointment slot.");
      return;
    }
    const appointment = repository.book(slot.id, slot.version);
    if (!appointment) {
      setError("The selected slot is no longer available. Choose another slot.");
      return;
    }
    appointment.requester = requester.trim();
    appointment.contact = contact.trim();
    router.push("/ops/service-desk/appointments");
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/service-desk/appointments">
            <ArrowLeft size={15} /> Appointments
          </Link>
          <h1>New appointment</h1>
          <p>Choose a service slot and record the requester’s contact information.</p>
        </div>
      </div>
      {available.length ? (
        <ContentPanel as="section">
          <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
            <FormField id="appointment-requester" label="Requester name">
              {(props) => <Input {...props} value={requester} onChange={(event) => setRequester(event.target.value)} />}
            </FormField>
            <FormField id="appointment-contact" label="Contact number">
              {(props) => <Input {...props} value={contact} onChange={(event) => setContact(event.target.value)} />}
            </FormField>
            <label className="form-field sm:col-span-2">
              <span className="form-label">Available slot</span>
              <select
                className="h-10 rounded-lg border bg-background px-3"
                value={slotId}
                onChange={(event) => setSlotId(event.target.value)}
              >
                {available.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.service} · {slot.date} at {slot.time} · {slot.remaining} available
                  </option>
                ))}
              </select>
            </label>
            {error && (
              <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm sm:col-span-2" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
              <Button asChild type="button" variant="outline">
                <Link href="/ops/service-desk/appointments">Cancel</Link>
              </Button>
              <Button type="submit">
                <CalendarPlus /> Book appointment
              </Button>
            </div>
          </form>
        </ContentPanel>
      ) : (
        <EmptyState
          icon={CalendarPlus}
          title="No appointment slots available"
          description="Add or reopen a service slot before booking an appointment."
        />
      )}
    </>
  );
}

"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, TicketPlus } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localServiceDeskRepository as repository } from "../services/local-service-desk-repository";

export function ServiceQueueFormView() {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [prefix, setPrefix] = useState("A");
  const [counter, setCounter] = useState("Counter 1");
  const [service, setService] = useState("General assistance");
  const [error, setError] = useState("");
  if (role !== "municipal")
    return (
      <PermissionState
        title="Queue intake requires municipal access"
        description="Only authorized municipal staff can add counter tickets."
      />
    );
  function submit(event: FormEvent) {
    event.preventDefault();
    const ticket = repository.createTicket({ prefix, counter, service });
    if (!ticket) {
      setError("Enter a one-letter prefix, counter, and service.");
      return;
    }
    router.push("/ops/service-desk/queue");
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/service-desk/queue">
            <ArrowLeft size={15} /> Queue
          </Link>
          <h1>Add walk-in</h1>
          <p>Create a counter ticket for a requester who arrived without an appointment.</p>
        </div>
      </div>
      <ContentPanel as="section">
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <FormField id="queue-prefix" label="Ticket prefix">
            {(props) => (
              <Input {...props} maxLength={1} value={prefix} onChange={(event) => setPrefix(event.target.value)} />
            )}
          </FormField>
          <FormField id="queue-counter" label="Counter">
            {(props) => <Input {...props} value={counter} onChange={(event) => setCounter(event.target.value)} />}
          </FormField>
          <FormField id="queue-service" label="Service">
            {(props) => <Input {...props} value={service} onChange={(event) => setService(event.target.value)} />}
          </FormField>
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
            <Button asChild type="button" variant="outline">
              <Link href="/ops/service-desk/queue">Cancel</Link>
            </Button>
            <Button type="submit">
              <TicketPlus /> Create ticket
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}

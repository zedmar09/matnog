"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Plus, Save } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localServiceDeskRepository as repository } from "../services/local-service-desk-repository";
import type { ServiceDeskRequest } from "../types/service-desk";

export function ServiceRequestFormView({ requestId }: { requestId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const record = requestId ? repository.request(requestId) : undefined;
  const editing = Boolean(requestId);
  const [serviceName, setServiceName] = useState(record?.serviceName ?? "Community concern");
  const [category, setCategory] = useState(record?.category ?? "General");
  const [priority, setPriority] = useState<ServiceDeskRequest["priority"]>(record?.priority ?? "Normal");
  const [requester, setRequester] = useState(record?.requesterContext ?? "");
  const [description, setDescription] = useState(record?.description ?? "");
  const [location, setLocation] = useState(record?.location ?? "");
  const [owner, setOwner] = useState(record?.owner ?? "Unassigned");
  const [due, setDue] = useState(record?.due ?? "2026-09-23");
  const [error, setError] = useState("");

  if (role !== "municipal")
    return (
      <PermissionState
        title="Request maintenance requires municipal access"
        description="Only authorized municipal staff can create or edit citizen requests."
      />
    );
  if (editing && !record)
    return (
      <EmptyState
        icon={Plus}
        headingLevel="h1"
        title="Request unavailable"
        description="The request reference was not found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/service-desk/requests">Back to requests</Link>
          </Button>
        }
      />
    );

  function submit(event: FormEvent) {
    event.preventDefault();
    if (record) {
      const saved = repository.updateRequest(record.id, {
        serviceName,
        category,
        priority,
        requesterContext: requester,
        description,
        location,
        owner,
        due,
      });
      if (!saved) {
        setError("Complete the requester, concern, description, and location before saving.");
        return;
      }
      router.push(`/ops/service-desk/requests/${record.id}`);
      return;
    }
    const categoryType =
      category === "Restricted" ? "protected" : category === "Information" ? "information" : "ordinary";
    const created = repository.createRequest({
      category: categoryType,
      description,
      location,
      requester,
      priority,
      owner,
      due,
    });
    if (!created) {
      setError("Complete the requester, description, and location before creating the request.");
      return;
    }
    created.serviceName = serviceName.trim() || created.serviceName;
    created.category = category;
    router.push(`/ops/service-desk/requests/${created.id}`);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/service-desk/requests">
            <ArrowLeft size={15} /> Requests
          </Link>
          <h1>{record ? "Edit request" : "New request"}</h1>
          <p>Record the requester, concern, location, priority, assignment, and target date.</p>
        </div>
      </div>
      <ContentPanel as="section">
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <FormField id="support-service-name" label="Concern title">
            {(props) => (
              <Input {...props} value={serviceName} onChange={(event) => setServiceName(event.target.value)} />
            )}
          </FormField>
          <FormField id="support-requester" label="Requester name">
            {(props) => <Input {...props} value={requester} onChange={(event) => setRequester(event.target.value)} />}
          </FormField>
          <label className="form-field">
            <span className="form-label">Category</span>
            <select
              className="h-10 rounded-lg border bg-background px-3"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>General</option>
              <option>Information</option>
              <option>Roads</option>
              <option>Drainage</option>
              <option>Utilities</option>
              <option>Sanitation</option>
              <option>Public space</option>
              <option>Restricted</option>
            </select>
          </label>
          <label className="form-field">
            <span className="form-label">Priority</span>
            <select
              className="h-10 rounded-lg border bg-background px-3"
              value={priority}
              onChange={(event) => setPriority(event.target.value as ServiceDeskRequest["priority"])}
            >
              <option>Low</option>
              <option>Normal</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </label>
          <label className="form-field sm:col-span-2">
            <span className="form-label">Description</span>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <FormField id="support-location" label="Location or landmark">
            {(props) => <Input {...props} value={location} onChange={(event) => setLocation(event.target.value)} />}
          </FormField>
          <FormField id="support-owner" label="Assigned office">
            {(props) => <Input {...props} value={owner} onChange={(event) => setOwner(event.target.value)} />}
          </FormField>
          <FormField id="support-due" label="Target date">
            {(props) => <Input {...props} value={due} onChange={(event) => setDue(event.target.value)} />}
          </FormField>
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
            <Button asChild type="button" variant="outline">
              <Link href="/ops/service-desk/requests">Cancel</Link>
            </Button>
            <Button type="submit">
              {record ? <Save /> : <Plus />}
              {record ? "Save changes" : "Create request"}
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}

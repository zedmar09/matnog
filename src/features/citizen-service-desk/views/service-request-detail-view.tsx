"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowLeft, MessagesSquare, Pencil } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Timeline } from "@/shared/components/timeline";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localServiceDeskRepository as repository } from "../services/local-service-desk-repository";

function displayReference(id: string) {
  return id.replace(/^DEMO-/, "");
}

export function ServiceRequestDetailView({ requestId }: { requestId: string }) {
  const { role } = useWorkspaceSession();
  const [, refresh] = useState(0);
  const [notice, setNotice] = useState("");
  const record = repository.request(requestId);
  const [owner, setOwner] = useState(record?.owner ?? "");
  const [publicResponse, setPublicResponse] = useState(record?.publicResponse ?? "");
  const [internalNote, setInternalNote] = useState(record?.internalProjection ?? "");

  if (role !== "municipal")
    return (
      <PermissionState
        title="Citizen support requires municipal access"
        description="Request details are available to authorized municipal staff."
      />
    );
  if (!record)
    return (
      <EmptyState
        icon={MessagesSquare}
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
  const restricted = record.status === "Restricted referral";

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/service-desk/requests">
            <ArrowLeft size={15} /> Requests
          </Link>
          <h1>{displayReference(record.id)}</h1>
          <p>{restricted ? "Protected referral" : `${record.requesterContext} · ${record.serviceName}`}</p>
        </div>
        {!restricted && record.status !== "Archived" && (
          <Button asChild variant="outline">
            <Link href={`/ops/service-desk/requests/${record.id}/edit`}>
              <Pencil /> Edit request
            </Link>
          </Button>
        )}
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,.65fr)]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Request information</span>
              <h2>{restricted ? "Protected concern" : record.serviceName}</h2>
            </div>
            <StatusBadge
              tone={
                restricted
                  ? "destructive"
                  : record.status === "Resolved pending feedback"
                    ? "success"
                    : record.status === "Reopened"
                      ? "warning"
                      : "pending"
              }
            >
              {record.status}
            </StatusBadge>
          </div>
          {restricted ? (
            <p className="mt-5 rounded-xl bg-muted p-4 text-sm">
              The protected record is handled by the designated cases unit. This workspace retains only the referral
              status and source reference.
            </p>
          ) : (
            <dl className="document-facts mt-6">
              <div>
                <dt>Requester</dt>
                <dd>{record.requesterContext}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{record.category}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{record.priority}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{formatDemoDateTime(record.createdAt)}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{record.location}</dd>
              </div>
              <div>
                <dt>Target date</dt>
                <dd>{record.due}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt>Description</dt>
                <dd>{record.description}</dd>
              </div>
            </dl>
          )}
        </ContentPanel>
        <ContentPanel as="aside">
          <span className="eyebrow">Activity</span>
          <h2>Request history</h2>
          <div className="mt-5">
            <Timeline
              steps={record.history.map((item) => ({
                title: item,
                detail: "Recorded in request history",
                complete: true,
              }))}
            />
          </div>
        </ContentPanel>
      </div>
      {!restricted && record.status !== "Archived" && (
        <ContentPanel as="section" className="mt-6">
          <span className="eyebrow">Assignment and response</span>
          <h2>Manage the request</h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border p-5">
              <label className="form-field">
                <span className="form-label">Assigned office</span>
                <Input value={owner} onChange={(event) => setOwner(event.target.value)} />
              </label>
              <Button
                variant="outline"
                onClick={() => {
                  const saved = repository.assign(record.id, owner);
                  setNotice(saved ? "Assignment updated." : "Enter an assigned office before saving.");
                  refresh((value) => value + 1);
                }}
              >
                Update assignment
              </Button>
            </div>
            <div className="space-y-4 rounded-xl border p-5">
              <label className="form-field">
                <span className="form-label">Public response</span>
                <Textarea value={publicResponse} onChange={(event) => setPublicResponse(event.target.value)} />
              </label>
              <label className="form-field">
                <span className="form-label">Internal note</span>
                <Textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={publicResponse.trim().length < 8}
                  onClick={() => {
                    repository.respond(record.id, publicResponse, internalNote, false);
                    setNotice("Response saved.");
                    refresh((value) => value + 1);
                  }}
                >
                  Save response
                </Button>
                <Button
                  variant="outline"
                  disabled={publicResponse.trim().length < 8}
                  onClick={() => {
                    repository.respond(record.id, publicResponse, internalNote, true);
                    setNotice("Resolution recorded for requester feedback.");
                    refresh((value) => value + 1);
                  }}
                >
                  Resolve request
                </Button>
              </div>
            </div>
          </div>
        </ContentPanel>
      )}
    </>
  );
}

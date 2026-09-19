"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, CheckCircle2, PackageCheck, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { NoticePanel } from "@/shared/components/notice-panel";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import type { RepositoryResult } from "@/shared/data/repository-result";
import type { WorkspaceRole } from "@/shared/providers/workspace-session-provider";

import {
  type CustodyAcceptanceValues,
  type CustodyDisputeValues,
  custodyAcceptanceSchema,
  custodyDisputeSchema,
  type DocumentReleaseValues,
  documentReleaseSchema,
} from "../schemas/document-schema";
import { documentRoutingRepository } from "../services/document-foundation";
import type { DocumentWorkspaceRecord } from "../types/document-routing";

function errorsOf(
  result: RepositoryResult<DocumentWorkspaceRecord>,
  fallback: string,
  fallbackId: string,
): FieldError[] {
  if (result.kind === "invalid") return result.errors;
  if (result.kind === "denied" || result.kind === "conflict" || result.kind === "failure") {
    return [{ id: fallbackId, message: result.message }];
  }
  return [{ id: fallbackId, message: result.kind === "empty" ? (result.reason ?? fallback) : fallback }];
}

function CustodyPanel({
  record,
  role,
  onUpdate,
}: {
  record: DocumentWorkspaceRecord;
  role: WorkspaceRole;
  onUpdate: (record: DocumentWorkspaceRecord) => void;
}) {
  const [acceptErrors, setAcceptErrors] = useState<FieldError[]>([]);
  const [disputeErrors, setDisputeErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState("");
  const acceptance = useForm<CustodyAcceptanceValues>({
    resolver: zodResolver(custodyAcceptanceSchema),
    defaultValues: { trackingReference: "", receiverOfficeId: "" },
  });
  const dispute = useForm<CustodyDisputeValues>({
    resolver: zodResolver(custodyDisputeSchema),
    defaultValues: { reason: "" },
  });
  const custody = record.custody;
  const physical = custody.mode === "physical";
  const canAct = role === "municipal";

  const accept = (values: CustodyAcceptanceValues) => {
    setAcceptErrors([]);
    setNotice("");
    const result = documentRoutingRepository.acceptHandover(
      role,
      record.document.envelope.id,
      values.receiverOfficeId,
      "Receiving Clerk",
      values.trackingReference,
    );
    if (result.kind !== "success") {
      setAcceptErrors(errorsOf(result, "The handover could not be accepted.", "tracking-reference"));
      return;
    }
    setNotice("Receiver acceptance recorded. Physical custody now names the receiving office.");
    acceptance.reset();
    onUpdate(result.data);
  };

  const reportDispute = (values: CustodyDisputeValues) => {
    setDisputeErrors([]);
    setNotice("");
    const result = documentRoutingRepository.disputeHandover(
      role,
      record.document.envelope.id,
      values.reason,
      "Municipal Records Supervisor",
    );
    if (result.kind !== "success") {
      setDisputeErrors(errorsOf(result, "The custody dispute could not be recorded.", "custody-dispute-reason"));
      return;
    }
    setNotice("Custody is marked disputed. The recorded holder remains unchanged while staff investigate.");
    dispute.reset();
    onUpdate(result.data);
  };

  return (
    <ContentPanel as="section" className="document-custody-workspace">
      <div className="document-workspace-section-heading">
        <SectionHeading
          eyebrow={physical ? "Physical possession" : "Digital-only record"}
          title="Custody handover"
          description="Route acknowledgment and physical possession remain separate records."
        />
        <StatusBadge tone={custody.state === "disputed" ? "destructive" : physical ? "warning" : "success"}>
          {custody.state.replaceAll("-", " ")}
        </StatusBadge>
      </div>

      {notice && <NoticePanel className="mt-4">{notice}</NoticePanel>}
      {!physical ? (
        <NoticePanel className="mt-4">
          This record has no physical label, receiver acceptance, or custody transfer.
        </NoticePanel>
      ) : (
        <>
          <div className="document-custody-label">
            <span>PHYSICAL DOCUMENT ROUTING</span>
            <strong>{custody.trackingReference}</strong>
            <div>
              <small>From</small>
              <b>{custody.currentHolder?.label ?? "Holder unavailable"}</b>
            </div>
            <div>
              <small>Deliver to</small>
              <b>{custody.intendedReceiver?.label ?? "Receiver unavailable"}</b>
            </div>
            <code aria-hidden="true">▮ ▮▮ ▮ ▮▮▮ ▮▮ ▮</code>
          </div>

          <dl className="registry-facts document-facts">
            <div>
              <dt>Current holder</dt>
              <dd>{custody.currentHolder?.label ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>Sent by</dt>
              <dd>{custody.sentBy ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt>Sent</dt>
              <dd>{custody.sentAt ? formatDemoDateTime(custody.sentAt) : "Not sent"}</dd>
            </div>
            <div>
              <dt>Accepted</dt>
              <dd>{custody.acceptedAt ? formatDemoDateTime(custody.acceptedAt) : "Awaiting receiver"}</dd>
            </div>
          </dl>

          {custody.state === "disputed" && (
            <NoticePanel className="mt-4" icon={<ShieldAlert />}>
              {custody.disputeReason} · {custody.disputedBy}
              {custody.disputedAt ? ` · ${formatDemoDateTime(custody.disputedAt)}` : ""}
            </NoticePanel>
          )}

          {canAct && custody.state === "handover-pending" && (
            <form className="document-custody-action" onSubmit={acceptance.handleSubmit(accept)} noValidate>
              <h3>Receiver acceptance</h3>
              <p>Enter the label reference and select the intended receiving office.</p>
              <ErrorSummary errors={acceptErrors} title="Acceptance needs attention" />
              <FormField
                id="tracking-reference"
                label="Tracking reference"
                error={acceptance.formState.errors.trackingReference?.message}
              >
                {(field) => <Input {...field} {...acceptance.register("trackingReference")} />}
              </FormField>
              <FormField
                id="receiver-office"
                label="Receiving office"
                error={acceptance.formState.errors.receiverOfficeId?.message}
              >
                {(field) => (
                  <NativeSelect {...field} {...acceptance.register("receiverOfficeId")}>
                    <option value="">Select receiving office</option>
                    {custody.currentHolder && (
                      <option value={custody.currentHolder.id}>{custody.currentHolder.label}</option>
                    )}
                    {custody.intendedReceiver && (
                      <option value={custody.intendedReceiver.id}>{custody.intendedReceiver.label}</option>
                    )}
                  </NativeSelect>
                )}
              </FormField>
              <Button type="submit">
                <PackageCheck /> Accept physical handover
              </Button>
            </form>
          )}

          {canAct && ["handover-pending", "accepted"].includes(custody.state) && (
            <form className="document-custody-action" onSubmit={dispute.handleSubmit(reportDispute)} noValidate>
              <h3>Report custody dispute</h3>
              <p>The current holder remains recorded until the exception is resolved.</p>
              <ErrorSummary errors={disputeErrors} title="Dispute needs attention" />
              <FormField
                id="custody-dispute-reason"
                label="Dispute reason"
                error={dispute.formState.errors.reason?.message}
              >
                {(field) => <Textarea {...field} {...dispute.register("reason")} />}
              </FormField>
              <Button type="submit" variant="destructive">
                <ShieldAlert /> Mark custody disputed
              </Button>
            </form>
          )}
        </>
      )}
    </ContentPanel>
  );
}

function ReleasePanel({
  record,
  role,
  onUpdate,
}: {
  record: DocumentWorkspaceRecord;
  role: WorkspaceRole;
  onUpdate: (record: DocumentWorkspaceRecord) => void;
}) {
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState("");
  const approvedVersions = record.versions.filter((version) => version.state === "approved");
  const form = useForm<DocumentReleaseValues>({
    resolver: zodResolver(documentReleaseSchema),
    defaultValues: { versionId: approvedVersions[0]?.id ?? "", note: "" },
  });
  useEffect(() => {
    if (!form.getValues("versionId") && approvedVersions[0]) form.setValue("versionId", approvedVersions[0].id);
  }, [approvedVersions, form]);

  const release = (values: DocumentReleaseValues) => {
    setErrors([]);
    setNotice("");
    const result = documentRoutingRepository.releaseDocument(
      role,
      record.document.envelope.id,
      values.versionId,
      values.note,
      "Authorized Municipal Signatory",
    );
    if (result.kind !== "success") {
      setErrors(errorsOf(result, "The release could not be recorded.", "release-version"));
      return;
    }
    setNotice("The approved revision was released and is now eligible for archiving.");
    onUpdate(result.data);
  };

  const releasedVersion = record.release
    ? record.versions.find((version) => version.id === record.release?.versionId)
    : undefined;
  const routeComplete = record.route.envelope.status === "complete";

  return (
    <ContentPanel as="section" className="document-release-workspace">
      <div className="document-workspace-section-heading">
        <SectionHeading
          eyebrow="Explicit revision control"
          title="Release and archive"
          description="Only a named approved revision can produce a release receipt."
        />
        <StatusBadge tone={record.release ? "success" : routeComplete ? "pending" : "neutral"}>
          {record.release ? "released" : routeComplete ? "ready for release" : "route incomplete"}
        </StatusBadge>
      </div>

      {notice && <NoticePanel className="mt-4">{notice}</NoticePanel>}
      {record.release ? (
        <div className="document-release-receipt">
          <span>DOCUMENT RELEASE RECEIPT</span>
          <Archive />
          <h3>{record.release.sampleOutputReference}</h3>
          <p>
            Revision {releasedVersion?.revision} · {releasedVersion?.filename}
          </p>
          <dl>
            <div>
              <dt>Released by</dt>
              <dd>{record.release.releasedBy}</dd>
            </div>
            <div>
              <dt>Released</dt>
              <dd>{formatDemoDateTime(record.release.releasedAt)}</dd>
            </div>
            <div>
              <dt>Release note</dt>
              <dd>{record.release.note}</dd>
            </div>
          </dl>
          <Button asChild variant="outline">
            <Link href="/ops/documents/archive">Open records archive</Link>
          </Button>
        </div>
      ) : role === "municipal" ? (
        <form className="document-release-form" onSubmit={form.handleSubmit(release)} noValidate>
          {!routeComplete && (
            <NoticePanel className="mt-4">
              Complete every required route task before choosing a release revision.
            </NoticePanel>
          )}
          {routeComplete && approvedVersions.length === 0 && (
            <NoticePanel className="mt-4">No approved revision is available for release.</NoticePanel>
          )}
          <ErrorSummary errors={errors} title="Release needs attention" />
          <FormField id="release-version" label="Approved revision" error={form.formState.errors.versionId?.message}>
            {(field) => (
              <NativeSelect {...field} {...form.register("versionId")} disabled={!routeComplete}>
                <option value="">Select approved revision</option>
                {approvedVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    Revision {version.revision} · {version.filename}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="release-note" label="Release note" error={form.formState.errors.note?.message}>
            {(field) => <Textarea {...field} {...form.register("note")} disabled={!routeComplete} />}
          </FormField>
          <Button type="submit" disabled={!routeComplete || approvedVersions.length === 0}>
            <CheckCircle2 /> Release approved revision
          </Button>
        </form>
      ) : (
        <NoticePanel className="mt-4">This role can inspect release status but cannot release a file.</NoticePanel>
      )}
    </ContentPanel>
  );
}

export function CustodyReleaseWorkspace({
  record,
  role,
  onUpdate,
}: {
  record: DocumentWorkspaceRecord;
  role: WorkspaceRole;
  onUpdate: (record: DocumentWorkspaceRecord) => void;
}) {
  return (
    <div className="document-custody-release-grid">
      <CustodyPanel record={record} role={role} onUpdate={onUpdate} />
      <ReleasePanel record={record} role={role} onUpdate={onUpdate} />
    </div>
  );
}

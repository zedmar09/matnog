"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { BadgeCheck, FileQuestion } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary } from "@/shared/components/error-summary";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { formatStatusLabel } from "@/shared/lib/utils";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { CertificateLifecycleWorkspace } from "../components/certificate-lifecycle-workspace";
import { useCertificateLifecycle } from "../hooks/use-certificate-lifecycle";
import { certificateRepository, isReviewOpen } from "../services/certificate-repository";
import type { CertificateWorkspaceRecord } from "../types/certificate-records";

const CHECKLIST_TONE = { met: "success", "not-met": "destructive" } as const;

export function CertificateReviewWireframeView({ requestId }: { requestId: string }) {
  const { role } = useWorkspaceSession();
  const [updatedRecord, setUpdatedRecord] = useState<CertificateWorkspaceRecord>();
  useEffect(() => setUpdatedRecord(undefined), []);
  const lifecycle = useCertificateLifecycle({ role, onUpdated: setUpdatedRecord });

  if (role !== "barangay" && role !== "municipal")
    return (
      <PermissionState
        title="Certificate review requires an assigned barangay role"
        description="This route exposes no request details to the active role."
      />
    );

  const result =
    updatedRecord?.request.envelope.id === requestId.toUpperCase()
      ? ({ kind: "success", data: updatedRecord } as const)
      : certificateRepository.readForStaff(requestId, role);
  if (result.kind !== "success") {
    return (
      <EmptyState
        icon={FileQuestion}
        headingLevel="h1"
        title="Certificate request unavailable"
        description="The request reference was not found in your assigned scope."
        action={
          <Button asChild>
            <Link href="/ops/certificates/requests">Return to request queue</Link>
          </Button>
        }
      />
    );
  }

  const { request, issuance } = result.data;
  const businessProjection =
    request.subjectKind === "business" ? certificateRepository.businessClearanceProjection(request.subjectId) : null;
  const reviewOpen = isReviewOpen(result.data);

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>{request.certificateTypeLabel}</h1>
          <p>
            {request.envelope.id} · {request.subjectLabel} · {request.requestingOffice}
          </p>
        </div>
        <div className="ops-topline-actions">
          <StatusBadge
            tone={request.status === "issued" ? "success" : request.status === "revoked" ? "destructive" : "pending"}
          >
            {formatStatusLabel(request.status)}
          </StatusBadge>
          {reviewOpen && lifecycle.canAct && (
            <Button
              onClick={() =>
                lifecycle.apply(
                  certificateRepository.approveReview(request.envelope.id, role),
                  "Requirements approved for the current submitted revision.",
                )
              }
            >
              <BadgeCheck /> Approve review
            </Button>
          )}
        </div>
      </div>

      {!lifecycle.canAct && (
        <NoticePanel className="mb-6">
          Municipal staff can inspect the complete record. Only the assigned barangay office performs review, fee,
          sign-off, reprint and revocation actions.
        </NoticePanel>
      )}
      {lifecycle.notice && (
        <div className="registry-save-notice mb-6" role="status">
          {lifecycle.notice}
        </div>
      )}
      <ErrorSummary errors={lifecycle.actionErrors} title="This action needs attention" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,.85fr)]">
        <div className="grid gap-6">
          <ContentPanel as="section" id="review-checklist">
            <h2>Eligibility and submitted revision</h2>
            <ul className="mt-5 grid gap-3">
              {request.review.checklist.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <span>{item.label}</span>
                  <StatusBadge tone={CHECKLIST_TONE[item.result as keyof typeof CHECKLIST_TONE] ?? "neutral"}>
                    {formatStatusLabel(item.result)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
            {request.review.decisionReason && (
              <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
                <strong>Recorded reason:</strong> {request.review.decisionReason}
              </p>
            )}
          </ContentPanel>

          <div id="lifecycle" className="grid gap-6">
            <CertificateLifecycleWorkspace record={result.data} role={role} lifecycle={lifecycle} />
          </div>

          {businessProjection?.kind === "success" && (
            <ContentPanel as="section">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2>Business clearance result</h2>
                  <p className="muted mt-2">{businessProjection.data.guidance}</p>
                </div>
                <StatusBadge tone={businessProjection.data.state === "valid" ? "success" : "pending"}>
                  {formatStatusLabel(businessProjection.data.stateLabel)}
                </StatusBadge>
              </div>
              <dl className="registry-facts mt-5">
                <div>
                  <dt>Certificate request</dt>
                  <dd>{businessProjection.data.requestId ?? "Not created"}</dd>
                </div>
                <div>
                  <dt>Fee assessment</dt>
                  <dd>{businessProjection.data.assessmentId ?? "Not required yet"}</dd>
                </div>
                <div>
                  <dt>Issued serial</dt>
                  <dd>{businessProjection.data.issuanceSerial ?? "Not issued"}</dd>
                </div>
                <div>
                  <dt>Business record</dt>
                  <dd>{businessProjection.data.businessId}</dd>
                </div>
              </dl>
            </ContentPanel>
          )}
        </div>

        <aside>
          <ContentPanel className="service-aside">
            <h2>Record summary</h2>
            <dl className="registry-facts mt-4">
              <div>
                <dt>Current revision</dt>
                <dd>{request.currentRevisionId}</dd>
              </div>
              <div>
                <dt>Fee path</dt>
                <dd>
                  {request.feeDecision.kind === "assessment"
                    ? `${request.feeDecision.assessmentId} · ${formatStatusLabel(request.feeDecision.status)}`
                    : request.feeDecision.kind === "exempt"
                      ? `${request.feeDecision.exemptionId} · Exempt`
                      : "Not selected"}
                </dd>
              </div>
              <div>
                <dt>Route</dt>
                <dd>{request.routedDocumentId ?? "Not created"}</dd>
              </div>
              <div>
                <dt>Issuance</dt>
                <dd>{issuance ? `${issuance.serial} · ${formatStatusLabel(issuance.status)}` : "Not issued"}</dd>
              </div>
            </dl>
            <PanelDivider />
            <h3 className="text-base">Lifecycle history</h3>
            <ol className="mt-3 grid gap-3 text-sm">
              {request.review.history.map((event) => (
                <li key={event.id} className="rounded-lg border p-3">
                  <strong>{formatStatusLabel(event.action)}</strong>
                  <p className="muted mt-1">
                    {event.actor} · {formatDemoDateTime(event.at)}
                  </p>
                  <p className="muted mt-1">Revision {event.revisionId}</p>
                  {event.reason && <p className="mt-2">{event.reason}</p>}
                </li>
              ))}
            </ol>
          </ContentPanel>
        </aside>
      </div>
    </>
  );
}

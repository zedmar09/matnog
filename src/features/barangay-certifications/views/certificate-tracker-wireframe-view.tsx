"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { FileQuestion } from "lucide-react";

import { useDemoRequester } from "@/features/unified-account-and-id/providers/demo-requester-provider";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { Timeline } from "@/shared/components/timeline";
import { Button } from "@/shared/components/ui/button";
import { useDemoSession } from "@/shared/providers/demo-session-provider";

import { CertificateCorrectionForm } from "../components/certificate-correction-form";
import { certificateRepository } from "../services/certificate-repository";
import type { CertificateWorkspaceRecord } from "../types/certificate-records";

export function CertificateTrackerWireframeView({ requestId }: { requestId: string }) {
  const { session, ready } = useDemoSession();
  const { active } = useDemoRequester();
  const [updatedRecord, setUpdatedRecord] = useState<CertificateWorkspaceRecord>();
  useEffect(() => setUpdatedRecord(undefined), []);
  if (!ready)
    return (
      <div className="site-container page-loading" role="status">
        Preparing certificate tracker…
      </div>
    );

  const subjectId = session?.residentAssociation?.personId ?? active.subjectId;
  const result = session
    ? updatedRecord?.request.envelope.id === requestId.toUpperCase()
      ? ({ kind: "success", data: updatedRecord } as const)
      : certificateRepository.readForRequester(requestId, subjectId, active.subjectId)
    : null;
  if (!session || result?.kind !== "success") {
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={FileQuestion}
          headingLevel="h1"
          title="Certificate request unavailable"
          description="Sign in with the matching account and use a request assigned to that requester. Unknown and inaccessible references share this result."
          action={
            <Button asChild>
              <Link href="/services/certificates">Return to certificate catalog</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { request, issuance } = result.data;
  const feeLabel =
    request.feeDecision.kind === "assessment"
      ? `${request.feeDecision.assessmentId} · ${request.feeDecision.status}`
      : request.feeDecision.kind === "exempt"
        ? `${request.feeDecision.exemptionId} · exempt`
        : request.feeDecision.guidance;
  const reviewComplete = ["reviewed", "blocked"].includes(request.review.status);
  const feeComplete =
    request.feeDecision.kind === "exempt" ||
    (request.feeDecision.kind === "assessment" && request.feeDecision.status === "paid");

  return (
    <div className="site-container page-content">
      <PageHeader
        parent="Barangay certificates"
        parentHref="/services/certificates"
        title={request.certificateTypeLabel}
        description="Keep your control number. Use it to follow this request and to claim at the barangay."
      />
      <div className="control-number" role="status">
        <span>Control number</span>
        <strong>{request.envelope.id}</strong>
        <small>We also sent it to your mobile number.</small>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Current stage</span>
              <h2 className="mt-1">{request.status.replaceAll("-", " ")}</h2>
            </div>
            <StatusBadge
              tone={
                request.status === "issued"
                  ? "success"
                  : request.status === "revoked" || request.status === "blocked"
                    ? "destructive"
                    : "pending"
              }
            >
              {request.status.replaceAll("-", " ")}
            </StatusBadge>
          </div>
          <dl className="registry-facts mt-6">
            <div>
              <dt>Subject</dt>
              <dd>
                {request.subjectLabel} · {request.subjectId}
              </dd>
            </div>
            <div>
              <dt>Barangay</dt>
              <dd>{request.barangayLabel}</dd>
            </div>
            <div>
              <dt>Purpose</dt>
              <dd>{request.purpose}</dd>
            </div>
            <div>
              <dt>Requesting office</dt>
              <dd>{request.requestingOffice}</dd>
            </div>
            <div>
              <dt>Claim method</dt>
              <dd>{request.claimMethod.replaceAll("-", " ")}</dd>
            </div>
            <div>
              <dt>Current revision</dt>
              <dd>{request.currentRevisionId}</dd>
            </div>
          </dl>
        </ContentPanel>
        <ContentPanel as="section">
          <span className="eyebrow">Applicant-safe progress</span>
          <h2 className="mt-1">Request to claim</h2>
          <div className="mt-6">
            <Timeline
              steps={[
                {
                  title: `Request ${request.envelope.id}`,
                  detail: `${request.revisions.length} immutable revision${request.revisions.length === 1 ? "" : "s"} retained.`,
                  complete: true,
                },
                {
                  title: "Barangay review",
                  detail: request.review.decisionReason ?? `Assigned to ${request.review.assignedBarangayLabel}.`,
                  complete: reviewComplete,
                },
                {
                  title: `Fee or exemption · ${feeLabel}`,
                  detail: "The M06 handoff begins only after review.",
                  complete: feeComplete,
                },
                {
                  title: `Routed output · ${request.routedDocumentId ?? "Not created"}`,
                  detail: "M05 tracks the exact approved document snapshot.",
                  complete: Boolean(request.routedDocumentId),
                },
                {
                  title: `Issuance · ${issuance?.serial ?? "No serial assigned"}`,
                  detail: issuance
                    ? `${issuance.status} sample issued from ${issuance.templateVersionId}.`
                    : "Serial and verification token are assigned only at authorized sign-off.",
                  complete: Boolean(issuance),
                },
              ]}
            />
          </div>
        </ContentPanel>
      </div>
      {issuance && (
        <ContentPanel as="section" className="mt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Released certificate</span>
              <h2 className="mt-1">{issuance.serial}</h2>
              <p className="muted mt-2">Preview copy · not valid for official use</p>
            </div>
            <StatusBadge tone={issuance.status === "valid" ? "success" : "destructive"}>{issuance.status}</StatusBadge>
          </div>
          <dl className="registry-facts mt-6">
            <div>
              <dt>Approved revision</dt>
              <dd>{issuance.approvedRevisionId}</dd>
            </div>
            <div>
              <dt>Template version</dt>
              <dd>{issuance.templateVersionId}</dd>
            </div>
            <div>
              <dt>Issued and released</dt>
              <dd>
                {issuance.issuedAt} · {issuance.release.method.replaceAll("-", " ")}
              </dd>
            </div>
            <div>
              <dt>Purpose snapshot</dt>
              <dd>{issuance.snapshot.purpose}</dd>
            </div>
            <div>
              <dt>Requesting office snapshot</dt>
              <dd>{issuance.snapshot.requestingOffice}</dd>
            </div>
            <div>
              <dt>Recorded reprints</dt>
              <dd>{issuance.reprints.length}</dd>
            </div>
          </dl>
          {issuance.revocationReason && (
            <NoticePanel className="mt-5">
              Revoked {issuance.revokedAt}: {issuance.revocationReason}. The issued snapshot and reprint history remain
              visible for traceability.
            </NoticePanel>
          )}
          <Button asChild className="mt-5" variant="outline">
            <Link href={`/verify/documents/${issuance.verificationToken}`}>Open public validity result</Link>
          </Button>
        </ContentPanel>
      )}
      <ContentPanel as="section" className="mt-6">
        <span className="eyebrow">Retained history</span>
        <h2 className="mt-1">Request revisions</h2>
        <ol className="mt-5 grid gap-3">
          {request.revisions.map((revision) => (
            <li key={revision.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong>Revision {revision.revision}</strong>
                  <p className="muted mt-1 text-sm">{revision.id}</p>
                </div>
                <StatusBadge
                  tone={
                    revision.state === "submitted" || revision.state === "approved-snapshot" ? "success" : "neutral"
                  }
                >
                  {revision.state.replaceAll("-", " ")}
                </StatusBadge>
              </div>
              <p className="mt-3 text-sm">{revision.note}</p>
            </li>
          ))}
        </ol>
      </ContentPanel>
      {request.status === "returned" && (
        <CertificateCorrectionForm
          record={result.data}
          subjectId={subjectId}
          requesterId={active.subjectId}
          onUpdated={setUpdatedRecord}
        />
      )}
    </div>
  );
}

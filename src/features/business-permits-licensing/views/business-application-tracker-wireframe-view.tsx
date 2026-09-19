"use client";

import { useState } from "react";

import Link from "next/link";

import { FileQuestion } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";

import { BusinessApplicantBoundary } from "../components/business-applicant-boundary";
import { BusinessPathSummary } from "../components/business-journey-map";
import { businessRepository } from "../services/business-repository";

export function BusinessApplicationTrackerWireframeView({ applicationId }: { applicationId: string }) {
  const [, refresh] = useState(0);
  const application = businessRepository.read(applicationId.toUpperCase());
  if (!application)
    return (
      <BusinessApplicantBoundary>
        <div className="site-container page-content">
          <EmptyState
            icon={FileQuestion}
            headingLevel="h1"
            title="Business application unavailable"
            description="The reference is not available to this requester."
            action={
              <Button asChild>
                <Link href="/businesses">Return to businesses</Link>
              </Button>
            }
          />
        </div>
      </BusinessApplicantBoundary>
    );
  const correction = application.requirements.find((item) => item.status === "returned" || item.status === "expired");
  return (
    <BusinessApplicantBoundary>
      <div className="site-container page-content">
        <PageHeader
          parent={application.businessName}
          parentHref={`/businesses/${application.businessId}`}
          title={application.id}
          description={`${application.path} · ${application.establishmentName} · revision ${application.revision}`}
        />
        <NoticePanel className="mb-6">
          Applicant-safe projection: internal notes and unrelated office data are excluded. All permits, amounts, QR
          references and decisions are.
        </NoticePanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
          <div className="grid gap-6">
            <ContentPanel>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">Current stage</span>
                  <h2 className="mt-1">{application.status.replaceAll("-", " ")}</h2>
                </div>
                <StatusBadge
                  tone={application.status === "issued" || application.status === "closed" ? "success" : "pending"}
                >
                  {application.status}
                </StatusBadge>
              </div>
              <dl className="registry-facts mt-5">
                <div>
                  <dt>Representative</dt>
                  <dd>{application.representativeLabel}</dd>
                </div>
                <div>
                  <dt>M07 clearance</dt>
                  <dd>
                    {application.barangayClearance.status} · {application.barangayClearance.requestId}
                  </dd>
                </div>
                <div>
                  <dt>M06 assessment</dt>
                  <dd>
                    {application.assessment
                      ? `${application.assessment.id} · ${application.assessment.paymentStatus}`
                      : "Not created"}
                  </dd>
                </div>
                <div>
                  <dt>M05 packet</dt>
                  <dd>
                    {application.documentRoute.recordId} · {application.documentRoute.status}
                  </dd>
                </div>
              </dl>
              {correction && (
                <div className="mt-5 rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <strong>Correction required:</strong> Replace {correction.label.toLowerCase()}. Unaffected approvals
                  remain retained.
                  <div className="mt-3">
                    <Button
                      onClick={() => {
                        businessRepository.correctRequirement(application.id, correction.id);
                        refresh((value) => value + 1);
                      }}
                    >
                      Attach replacement and resubmit
                    </Button>
                  </div>
                </div>
              )}
              {application.assessment?.paymentStatus === "pending" && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link
                      href={`/payments/assessments/${application.assessment.id}?returnTo=/business/applications/${application.id}`}
                    >
                      Continue to sample M06 payment
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      businessRepository.confirmPayment(application.id);
                      refresh((value) => value + 1);
                    }}
                  >
                    Preview paid return
                  </Button>
                </div>
              )}
            </ContentPanel>
            <ContentPanel>
              <span className="eyebrow">Requirement checklist</span>
              <h2 className="mt-1">Evidence and revisions</h2>
              <div className="mt-4 grid gap-3">
                {application.requirements.map((item) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                    key={item.id}
                  >
                    <div>
                      <strong>{item.label}</strong>
                      <p className="muted text-sm">
                        Revision {item.revision}
                        {item.reusable ? " · reusable" : ""}
                        {item.expiresAt ? ` · expires ${item.expiresAt}` : ""}
                      </p>
                    </div>
                    <StatusBadge tone={item.status === "valid" ? "success" : "warning"}>{item.status}</StatusBadge>
                  </div>
                ))}
              </div>
            </ContentPanel>
            <ContentPanel>
              <span className="eyebrow">History</span>
              <h2 className="mt-1">Application timeline</h2>
              <ol className="mt-4 space-y-3">
                {application.timeline.map((item) => (
                  <li className="border-primary/30 border-l-2 pl-4" key={item.id}>
                    <strong>{item.label}</strong>
                    <p className="muted text-sm">
                      {item.at} · {item.actor}
                    </p>
                  </li>
                ))}
              </ol>
            </ContentPanel>
          </div>
          <aside className="grid content-start gap-6">
            <BusinessPathSummary pathId={application.path} />
            <ContentPanel>
              <span className="eyebrow">Sample output</span>
              <h2 className="mt-1">Permit snapshots</h2>
              {application.permits.length === 0 ? (
                <p className="muted mt-3">No permit snapshot yet.</p>
              ) : (
                application.permits.map((permit) => (
                  <article
                    className="mt-4 rounded-lg border border-dashed p-4"
                    key={`${permit.serial}-${permit.version}`}
                  >
                    <strong>{permit.serial}</strong>
                    <p className="muted mt-1 text-sm">
                      Version {permit.version} · {permit.status} · {permit.issuedAt}
                    </p>
                    <p className="mt-3 font-semibold text-destructive text-xs">{permit.watermark}</p>
                    <div className="mt-4 grid grid-cols-[4rem_1fr] items-center gap-3 border-t pt-4">
                      <div className="grid size-16 place-items-center rounded border border-dashed font-bold text-[10px]">
                        SAMPLE QR
                      </div>
                      <div className="text-sm">
                        <strong>Sample municipal signatory</strong>
                        <p className="muted mt-1">Verification resolves only to this snapshot.</p>
                      </div>
                    </div>
                  </article>
                ))
              )}
              <PanelDivider />
              {application.assessment && (
                <div className="mb-4 text-sm">
                  <strong>Illustrative assessment · {application.assessment.ruleVersion}</strong>
                  {application.assessment.items.map((item) => (
                    <p className="mt-1 flex justify-between gap-3" key={item.label}>
                      <span>
                        {item.label}
                        {item.exempt ? " · exempt" : ""}
                      </span>
                      <span>₱{item.amount.toLocaleString()}</span>
                    </p>
                  ))}
                  <p className="mt-2 flex justify-between gap-3 border-t pt-2 font-semibold">
                    <span>Sample total</span>
                    <span>₱{application.assessment.total.toLocaleString()}</span>
                  </p>
                </div>
              )}
              <p className="text-sm">
                Issuance remains unavailable until every applicable review and the payment gate are satisfied.
              </p>
              <p className="muted mt-3 text-sm">Renewal or closure reminder: 30 days before the sample permit date.</p>
            </ContentPanel>
          </aside>
        </div>
      </div>
    </BusinessApplicantBoundary>
  );
}

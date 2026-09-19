"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { businessRepository as repository } from "../services/business-repository";
import type {
  BusinessApplicationStatus,
  BusinessRequirementStatus,
  BusinessReviewStatus,
} from "../types/business-records";

const STATUS_TONE: Record<BusinessApplicationStatus, StatusTone> = {
  draft: "neutral",
  submitted: "pending",
  "for-correction": "warning",
  "under-review": "pending",
  "ready-to-issue": "success",
  issued: "success",
  closed: "neutral",
};
const REQUIREMENT_TONE: Record<BusinessRequirementStatus, StatusTone> = {
  valid: "success",
  missing: "destructive",
  expired: "warning",
  returned: "warning",
};
const REVIEW_TONE: Record<BusinessReviewStatus, StatusTone> = {
  "not-started": "neutral",
  "in-review": "pending",
  approved: "success",
  "for-correction": "warning",
  "not-applicable": "neutral",
};
const REQUIREMENT_STATUSES: BusinessRequirementStatus[] = ["valid", "missing", "expired", "returned"];
const REVIEW_STATUSES: BusinessReviewStatus[] = [
  "not-started",
  "in-review",
  "approved",
  "for-correction",
  "not-applicable",
];
const label = (value: string) => value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());

export function BplsApplicationReviewWireframeView({ applicationId }: { applicationId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<string>();
  const application = repository.read(applicationId);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Business permit applications are not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );
  if (!application)
    return (
      <PermissionState
        title="Application unavailable"
        description="The requested permit application was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/bpls/applications">Back to applications</Link>
          </Button>
        }
      />
    );
  const business = repository.readBusiness(application.businessId);
  const reviewsComplete = application.reviews.every((review) => ["approved", "not-applicable"].includes(review.status));
  const requirementsComplete = application.requirements.every((requirement) => requirement.status === "valid");
  const paymentComplete = !application.assessment || application.assessment.paymentStatus === "paid";
  const canIssue =
    reviewsComplete && requirementsComplete && paymentComplete && application.barangayClearance.status === "valid";

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">
            {label(application.path)} · {application.fiscalPeriod}
          </span>
          <h1>{application.id}</h1>
          <p>
            {application.businessName} · {application.establishmentName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/bpls/applications">
              <ArrowLeft />
              Back to applications
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/bpls/applications/${application.id}/edit`}>
              <Pencil />
              Edit application
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
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <FileText className="text-primary" />
              <h2 className="mt-3">Application information</h2>
            </div>
            <StatusBadge tone={STATUS_TONE[application.status]}>{label(application.status)}</StatusBadge>
          </div>
          <dl className="registry-facts mt-6">
            <Fact label="Business" value={application.businessName} />
            <Fact label="Establishment" value={application.establishmentName} />
            <Fact label="Applicant / representative" value={application.representativeLabel} />
            <Fact label="Assigned officer" value={application.assignedOfficer} />
            <Fact label="Filed at" value={application.filedAt} />
            <Fact label="Target release" value={application.targetRelease} />
            <Fact label="Business activity" value={application.activity} />
            <Fact label="Location" value={application.location} />
            {application.declaredChange && (
              <Fact
                label={application.path === "closure" ? "Closure details" : "Declared change"}
                value={application.declaredChange}
              />
            )}
          </dl>
          {business && (
            <Button asChild variant="outline" className="mt-6">
              <Link href={`/ops/bpls/businesses/${business.id}`}>Open business record</Link>
            </Button>
          )}
        </ContentPanel>
        <ContentPanel as="aside">
          <ShieldCheck className="text-primary" />
          <h2 className="mt-3">Processing gates</h2>
          <dl className="registry-facts mt-6">
            <Fact
              label="Barangay clearance"
              value={`${application.barangayClearance.requestId} · ${label(application.barangayClearance.status)}`}
            />
            <Fact label="Assessment" value={application.assessment ? application.assessment.id : "Not prepared"} />
            <Fact
              label="Payment"
              value={application.assessment ? label(application.assessment.paymentStatus) : "Not required"}
            />
            <Fact
              label="Document route"
              value={`${application.documentRoute.recordId} · ${label(application.documentRoute.status)}`}
            />
            <Fact label="Revision" value={String(application.revision)} />
          </dl>
          <PanelDivider />
          <div className="grid gap-3">
            {application.assessment?.paymentStatus === "pending" && (
              <Button
                variant="outline"
                onClick={() => {
                  repository.confirmPayment(application.id);
                  setNotice("Payment marked as confirmed.");
                  refresh((value) => value + 1);
                }}
              >
                <Banknote />
                Confirm payment
              </Button>
            )}
            {!application.assessment && (
              <p className="muted text-sm">Assessment has not been prepared for this application.</p>
            )}
            <Button
              disabled={!canIssue || application.status === "issued" || application.status === "closed"}
              onClick={() => {
                const result = repository.issue(application.id);
                if (result) {
                  setNotice(application.path === "closure" ? "Business closure approved." : "Business permit issued.");
                  refresh((value) => value + 1);
                }
              }}
            >
              <CheckCircle2 />
              {application.path === "closure" ? "Approve closure" : "Issue permit"}
            </Button>
            {!canIssue && (
              <p className="muted text-sm">
                Complete all requirements, office reviews, clearance, and payment before final approval.
              </p>
            )}
          </div>
        </ContentPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ContentPanel as="section">
          <ClipboardCheck className="text-primary" />
          <h2 className="mt-3">Requirements</h2>
          <div className="mt-5 grid gap-3">
            {application.requirements.map((requirement) => (
              <div className="rounded-xl border p-4" key={requirement.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong>{requirement.label}</strong>
                    <p className="muted mt-1 text-sm">
                      Revision {requirement.revision}
                      {requirement.expiresAt ? ` · Expires ${requirement.expiresAt}` : ""}
                    </p>
                  </div>
                  <StatusBadge tone={REQUIREMENT_TONE[requirement.status]}>{label(requirement.status)}</StatusBadge>
                </div>
                <label className="mt-4 grid gap-2 font-medium text-sm">
                  Update status
                  <NativeSelect
                    value={requirement.status}
                    onChange={(event) => {
                      repository.updateRequirement(
                        application.id,
                        requirement.id,
                        event.target.value as BusinessRequirementStatus,
                      );
                      setNotice(`${requirement.label} updated.`);
                      refresh((value) => value + 1);
                    }}
                  >
                    {REQUIREMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {label(status)}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              </div>
            ))}
          </div>
        </ContentPanel>
        <ContentPanel as="section">
          <ShieldCheck className="text-primary" />
          <h2 className="mt-3">Office reviews</h2>
          <div className="mt-5 grid gap-3">
            {application.reviews.map((review) => (
              <div className="rounded-xl border p-4" key={review.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong>{review.office}</strong>
                    <p className="muted mt-1 text-sm">{review.assignee}</p>
                  </div>
                  <StatusBadge tone={REVIEW_TONE[review.status]}>{label(review.status)}</StatusBadge>
                </div>
                {review.reason && <p className="mt-3 text-sm">{review.reason}</p>}
                {review.inspection && (
                  <p className="muted mt-3 text-sm">
                    Inspection {review.inspection.scheduledAt} · {label(review.inspection.outcome)}
                  </p>
                )}
                <label className="mt-4 grid gap-2 font-medium text-sm">
                  Update decision
                  <NativeSelect
                    value={review.status}
                    onChange={(event) => {
                      repository.decideReview(application.id, review.id, event.target.value as BusinessReviewStatus);
                      setNotice(`${review.office} review updated.`);
                      refresh((value) => value + 1);
                    }}
                  >
                    {REVIEW_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {label(status)}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              </div>
            ))}
          </div>
        </ContentPanel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <Clock3 className="text-primary" />
          <h2 className="mt-3">Application timeline</h2>
          <div className="mt-5 grid gap-3">
            {application.timeline.map((entry) => (
              <div className="rounded-xl border p-4" key={entry.id}>
                <strong>{entry.label}</strong>
                <p className="muted mt-1 text-sm">
                  {entry.actor} · {entry.at}
                </p>
              </div>
            ))}
          </div>
        </ContentPanel>
        <ContentPanel as="aside">
          <Banknote className="text-primary" />
          <h2 className="mt-3">Assessment and permits</h2>
          {application.assessment ? (
            <div className="mt-5">
              <div className="grid gap-3">
                {application.assessment.items.map((item) => (
                  <div className="flex justify-between gap-4 text-sm" key={item.label}>
                    <span>{item.label}</span>
                    <strong>₱{item.amount.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
              <PanelDivider />
              <div className="flex justify-between gap-4">
                <strong>Total</strong>
                <strong>₱{application.assessment.total.toLocaleString()}</strong>
              </div>
            </div>
          ) : (
            <p className="muted mt-4">No assessment has been prepared.</p>
          )}
          <PanelDivider />
          <h3>Permit history</h3>
          {application.permits.length ? (
            <div className="mt-4 grid gap-3">
              {application.permits.map((permit) => (
                <div className="rounded-xl border p-4" key={`${permit.serial}-${permit.version}`}>
                  <strong>{permit.serial}</strong>
                  <p className="muted mt-1 text-sm">
                    Version {permit.version} · {label(permit.status)} · {permit.issuedAt}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted mt-3">No permit has been issued for this application.</p>
          )}
        </ContentPanel>
      </div>
      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${application.id}`}
        description="This removes the application, its requirements, reviews, assessment, permits, and timeline from the current workspace."
        confirmLabel="Delete application"
        destructive
        onConfirm={() => {
          repository.deleteApplication(application.id);
          router.replace("/ops/bpls/applications");
        }}
      />
    </>
  );
}

function Fact({ label: factLabel, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="muted font-semibold text-xs uppercase tracking-wide">{factLabel}</dt>
      <dd className="mt-1 font-medium text-sm">{value}</dd>
    </div>
  );
}

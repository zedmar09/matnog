"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, ClipboardCheck, FileText, Pencil, Trash2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localDisasterRepository as repository } from "../services/local-disaster-repository";
import type { AssessmentStatus } from "../types/disaster-records";

const TONE: Record<AssessmentStatus, StatusTone> = {
  Draft: "neutral",
  "For verification": "pending",
  Verified: "success",
  Referred: "warning",
};

export function AssessmentDetailView({ assessmentId }: { assessmentId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const item = repository.assessment(assessmentId);
  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Damage assessment is not assigned to this role"
        description="Choose the municipal or barangay role."
      />
    );
  if (!item)
    return (
      <PermissionState
        title="Assessment unavailable"
        description="The requested damage assessment was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/disaster/events">Back to activities</Link>
          </Button>
        }
      />
    );
  const activity = repository.activity(item.activityId);

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">Damage assessment</span>
          <h1>{item.id}</h1>
          <p>
            {item.residentName} · {item.category}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/ops/disaster/events/${item.activityId}`}>
              <ArrowLeft />
              Back to activity
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/disaster/assessments/${item.id}/edit`}>
              <Pencil />
              Edit assessment
            </Link>
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Assessment findings</span>
              <h2 className="mt-1">{item.category}</h2>
            </div>
            <StatusBadge tone={TONE[item.status]}>{item.status}</StatusBadge>
          </div>
          <p className="mt-5">{item.observation}</p>
          <dl className="registry-facts mt-6">
            <Fact label="Household" value={`${item.residentName} · ${item.householdId}`} />
            <Fact label="Barangay" value={item.barangay} />
            <Fact label="Structure" value={item.structureId} />
            <Fact label="Assessed at" value={item.assessedAt} />
            <Fact label="Assessor" value={item.assessor} />
            <Fact label="Activity" value={activity?.name ?? item.activityId} />
          </dl>
          {item.householdId.startsWith("DEMO-HH-") && (
            <Link className="mt-4 inline-block text-link" href={`/ops/households/${item.householdId}`}>
              Open municipal household record
            </Link>
          )}
        </ContentPanel>
        <ContentPanel as="aside">
          <ClipboardCheck className="text-primary" />
          <h2 className="mt-3">Evidence and referral</h2>
          <p className="muted">Evidence references remain linked to the assessment record.</p>
          <PanelDivider />
          <dl className="grid gap-5">
            <Fact label="Evidence" value={item.evidence.join(" · ")} />
            <Fact label="Referral or next action" value={item.referral} />
            <Fact label="Activity reference" value={item.activityId} />
          </dl>
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
            <FileText size={17} className="text-primary" />
            {item.referralPrepared ? "Referral recorded" : "Referral pending"}
          </div>
        </ContentPanel>
      </div>
      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${item.id}`}
        description="This removes the damage assessment from the current activity."
        confirmLabel="Delete assessment"
        destructive
        onConfirm={() => {
          repository.deleteAssessment(item.id);
          router.replace(`/ops/disaster/events/${item.activityId}`);
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

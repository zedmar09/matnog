"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Archive, ArrowLeft, ClipboardList, Pencil } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { developmentPlanningRepository as repository } from "../services/development-planning-repository";
import { displayPlanningReference, planningStatusTone } from "../services/planning-presentation";

export function MunicipalPlanDetailView({ planId }: { planId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [notice, setNotice] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const record = repository.findPlan(planId);
  if (role !== "municipal")
    return (
      <PermissionState
        title="Municipal planning access required"
        description="Authorized municipal planning staff can view these plans."
      />
    );
  if (!record)
    return (
      <EmptyState
        icon={ClipboardList}
        headingLevel="h1"
        title="Municipal plan unavailable"
        description="The requested plan could not be found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/planning/plans">Back to municipal plans</Link>
          </Button>
        }
      />
    );
  const resolvedPlanId = record.id;
  function decide(status: string) {
    const note =
      feedback.trim() ||
      (status === "Approved"
        ? "Approved for the stated municipal planning period."
        : "Deferred for revision in the next planning review.");
    const saved = repository.transitionPlan(resolvedPlanId, status, note);
    if (!saved) {
      setNotice("Enter a decision note with at least eight characters.");
      return;
    }
    setNotice(`Plan marked ${status.toLocaleLowerCase()}.`);
    setFeedback("");
    refresh((value) => value + 1);
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/planning/plans">
            <ArrowLeft size={15} /> Municipal Plans
          </Link>
          <h1>{record.title}</h1>
          <p>
            {displayPlanningReference(record.id)} · {record.level} · {record.fiscalYears}
          </p>
        </div>
        {record.approvalStatus !== "Archived" && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/ops/planning/plans/${displayPlanningReference(record.id)}/edit`}>
                <Pencil /> Edit plan
              </Link>
            </Button>
            <Button variant="outline" className="text-destructive" onClick={() => setArchiveOpen(true)}>
              <Archive /> Archive
            </Button>
          </div>
        )}
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Plan record</span>
              <h2>Plan information</h2>
            </div>
            <StatusBadge tone={planningStatusTone(record.approvalStatus)}>{record.approvalStatus}</StatusBadge>
          </div>
          <dl className="document-facts mt-6">
            <div>
              <dt>Reference</dt>
              <dd>{displayPlanningReference(record.id)}</dd>
            </div>
            <div>
              <dt>Plan level</dt>
              <dd>{record.level}</dd>
            </div>
            <div>
              <dt>Fiscal period</dt>
              <dd>{record.fiscalYears}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{record.version}</dd>
            </div>
            <div>
              <dt>Previous version</dt>
              <dd>{record.previousVersion ?? "Initial version"}</dd>
            </div>
            <div>
              <dt>Parent plan</dt>
              <dd>{displayPlanningReference(record.parentReference)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt>Change summary</dt>
              <dd>{record.changeSummary?.trim() ? record.changeSummary : "No version changes recorded."}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt>Decision feedback</dt>
              <dd>{record.decisionFeedback?.trim() ? record.decisionFeedback : "No decision recorded."}</dd>
            </div>
          </dl>
        </ContentPanel>
        <ContentPanel as="aside">
          <span className="eyebrow">Program coverage</span>
          <h2>Linked proposals</h2>
          <div className="mt-5 grid gap-3">
            {record.itemReferences.map((reference) => (
              <Link
                className="rounded-xl border p-4 font-semibold transition-colors hover:border-primary hover:text-primary"
                href={`/ops/planning/proposals/${displayPlanningReference(reference)}`}
                key={reference}
              >
                {displayPlanningReference(reference)}
              </Link>
            ))}
          </div>
        </ContentPanel>
      </div>
      {record.approvalStatus !== "Archived" && (
        <ContentPanel as="section" className="mt-6">
          <span className="eyebrow">Decision</span>
          <h2>Review municipal plan</h2>
          <label className="form-field mt-5">
            <span className="form-label">Decision note</span>
            <Textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Record the basis for approval or deferral"
            />
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => decide("Approved")}>Approve plan</Button>
            <Button variant="outline" onClick={() => decide("Deferred")}>
              Defer plan
            </Button>
          </div>
        </ContentPanel>
      )}
      <ConfirmationDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive municipal plan?"
        description="The plan will leave active planning views and remain available as an archived record."
        confirmLabel="Archive plan"
        destructive
        onConfirm={() => {
          repository.archivePlan(record.id);
          setArchiveOpen(false);
          router.push("/ops/planning/plans");
        }}
      />
    </>
  );
}

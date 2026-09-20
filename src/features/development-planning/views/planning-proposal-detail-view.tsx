"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Archive, ArrowLeft, ClipboardCheck, Pencil } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { developmentPlanningRepository as repository } from "../services/development-planning-repository";
import {
  displayPlanningReference,
  formatPlanningCurrency,
  proposalStatusLabel,
  proposalStatusTone,
} from "../services/planning-presentation";
import type { PlanningStatus } from "../types/development-planning";

export function PlanningProposalDetailView({ proposalId }: { proposalId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const record = repository.findProposal(proposalId);
  if (!role || !["municipal", "barangay"].includes(role))
    return (
      <PermissionState title="Planning access required" description="Authorized planning staff can view proposals." />
    );
  if (!record)
    return (
      <EmptyState
        icon={ClipboardCheck}
        headingLevel="h1"
        title="Proposal unavailable"
        description="The requested proposal could not be found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/planning/proposals">Back to proposals</Link>
          </Button>
        }
      />
    );
  const resolvedProposalId = record.id;
  function decide(status: PlanningStatus) {
    const defaultMessages: Partial<Record<PlanningStatus, string>> = {
      prioritized: "Prioritized through the municipal development review.",
      deferred: "Deferred for a later planning and funding cycle.",
      "for-correction": "Returned to the source office for required corrections.",
    };
    const message = reason.trim() || (defaultMessages[status] ?? "Planning status updated by the authorized reviewer.");
    const saved = repository.transition(resolvedProposalId, status, message);
    if (!saved) {
      setNotice("Enter a decision note with at least eight characters.");
      return;
    }
    setNotice(`Proposal marked ${proposalStatusLabel(status).toLocaleLowerCase()}.`);
    setReason("");
    refresh((value) => value + 1);
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/planning/proposals">
            <ArrowLeft size={15} /> Proposals
          </Link>
          <h1>{displayPlanningReference(record.id)}</h1>
          <p>{record.problem}</p>
        </div>
        {record.status !== "archived" && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/ops/planning/proposals/${displayPlanningReference(record.id)}/edit`}>
                <Pencil /> Edit proposal
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
              <span className="eyebrow">Proposal record</span>
              <h2>Development need</h2>
            </div>
            <StatusBadge tone={proposalStatusTone(record.status)}>{proposalStatusLabel(record.status)}</StatusBadge>
          </div>
          <p className="mt-5 text-base">{record.problem}</p>
          <dl className="document-facts mt-6">
            <div>
              <dt>Location</dt>
              <dd>{record.location}</dd>
            </div>
            <div>
              <dt>Barangay</dt>
              <dd>{record.barangay}</dd>
            </div>
            <div>
              <dt>Source office</dt>
              <dd>{record.sourceOffice}</dd>
            </div>
            <div>
              <dt>Source reference</dt>
              <dd>{displayPlanningReference(record.sourceReference)}</dd>
            </div>
            <div>
              <dt>Estimated cost</dt>
              <dd>{formatPlanningCurrency(record.estimateMinor)}</dd>
            </div>
            <div>
              <dt>Beneficiaries</dt>
              <dd>{record.beneficiaries.toLocaleString()}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt>Intended outcome</dt>
              <dd>{record.outcome}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt>Development tags</dt>
              <dd>{record.tags.join(" · ")}</dd>
            </div>
          </dl>
        </ContentPanel>
        <ContentPanel as="aside">
          <span className="eyebrow">Evidence</span>
          <h2>Coverage and source</h2>
          <dl className="document-facts mt-6">
            <div>
              <dt>Evidence reference</dt>
              <dd>{displayPlanningReference(record.evidence.snapshotId)}</dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>{record.evidence.coverage}</dd>
            </div>
            <div>
              <dt>Collected</dt>
              <dd>{record.evidence.collectedAt}</dd>
            </div>
            <div>
              <dt>Reported</dt>
              <dd>{record.evidence.reportedAt}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt>Source</dt>
              <dd>{record.evidence.source}</dd>
            </div>
            {record.evidence.caveat && (
              <div className="sm:col-span-2">
                <dt>Coverage note</dt>
                <dd>{record.evidence.caveat}</dd>
              </div>
            )}
          </dl>
        </ContentPanel>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <span className="eyebrow">Assessment</span>
          <h2>Prioritization score</h2>
          <div className="mt-4 flex items-end gap-3">
            <strong className="text-4xl text-primary">{record.score || "—"}</strong>
            <span className="muted">under {record.criteriaVersion}</span>
          </div>
          {record.scoreBreakdown?.length ? (
            <dl className="document-facts mt-6">
              {record.scoreBreakdown.map((item) => (
                <div key={item.criterion}>
                  <dt>
                    {item.criterion} · {item.weight}%
                  </dt>
                  <dd>
                    {item.value} → {item.weightedScore.toFixed(1)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted mt-5">A scored breakdown will appear after technical review.</p>
          )}
          <p className="mt-5">{record.rationale}</p>
        </ContentPanel>
        <ContentPanel as="aside">
          <span className="eyebrow">Planning links</span>
          <h2>Program references</h2>
          <dl className="document-facts mt-6">
            <div>
              <dt>Plan</dt>
              <dd>{displayPlanningReference(record.planReference)}</dd>
            </div>
            <div>
              <dt>Appropriation</dt>
              <dd>{displayPlanningReference(record.appropriationReference)}</dd>
            </div>
            <div>
              <dt>Project</dt>
              <dd>{displayPlanningReference(record.projectReference)}</dd>
            </div>
            <div>
              <dt>Record version</dt>
              <dd>{record.version}</dd>
            </div>
          </dl>
        </ContentPanel>
      </div>
      {role === "municipal" && record.status !== "archived" && (
        <ContentPanel as="section" className="mt-6">
          <span className="eyebrow">Decision</span>
          <h2>Review proposal</h2>
          <label className="form-field mt-5">
            <span className="form-label">Decision note</span>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Record the basis for the decision"
            />
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => decide("prioritized")}>Prioritize</Button>
            <Button variant="outline" onClick={() => decide("deferred")}>
              Defer
            </Button>
            <Button variant="outline" onClick={() => decide("for-correction")}>
              Return for correction
            </Button>
          </div>
        </ContentPanel>
      )}
      <ConfirmationDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive proposal?"
        description="The proposal will leave the active planning workflow and remain available as an archived record."
        confirmLabel="Archive proposal"
        destructive
        onConfirm={() => {
          repository.archiveProposal(record.id);
          setArchiveOpen(false);
          router.push("/ops/planning/proposals");
        }}
      />
    </>
  );
}

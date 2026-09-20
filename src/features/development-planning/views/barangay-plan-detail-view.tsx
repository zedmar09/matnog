"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Archive, ArrowLeft, ClipboardList, Pencil, Send } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { developmentPlanningRepository as repository } from "../services/development-planning-repository";
import { displayPlanningReference, planningStatusTone } from "../services/planning-presentation";

export function BarangayPlanDetailView({ planId }: { planId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const record = repository.findBarangayPlan(planId);

  if (!role || !["municipal", "barangay"].includes(role))
    return (
      <PermissionState
        title="Planning access required"
        description="Authorized planning staff can view barangay plans."
      />
    );
  if (!record)
    return (
      <EmptyState
        icon={ClipboardList}
        headingLevel="h1"
        title="Barangay plan unavailable"
        description="The requested plan could not be found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/planning/barangay-plans">Back to barangay plans</Link>
          </Button>
        }
      />
    );
  const resolvedPlanId = record.id;

  function updateStatus(status: string, message: string) {
    repository.transitionBarangayPlan(resolvedPlanId, status);
    setNotice(message);
    refresh((value) => value + 1);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/planning/barangay-plans">
            <ArrowLeft size={15} /> Barangay Plans
          </Link>
          <h1>{record.title}</h1>
          <p>
            {displayPlanningReference(record.id)} · {record.barangay}
          </p>
        </div>
        {record.status !== "Archived" && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/ops/planning/barangay-plans/${displayPlanningReference(record.id)}/edit`}>
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
            <StatusBadge tone={planningStatusTone(record.status)}>{record.status}</StatusBadge>
          </div>
          <dl className="document-facts mt-6">
            <div>
              <dt>Reference</dt>
              <dd>{displayPlanningReference(record.id)}</dd>
            </div>
            <div>
              <dt>Barangay</dt>
              <dd>{record.barangay}</dd>
            </div>
            <div>
              <dt>BDC minutes</dt>
              <dd>{displayPlanningReference(record.councilMinutesReference ?? undefined)}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{record.submittedAt ?? "Not yet submitted"}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <h3>Development priorities</h3>
            <ol className="mt-3 grid gap-2">
              {record.priorities.map((item, index) => (
                <li className="rounded-xl border p-4" key={item}>
                  <strong>{index + 1}.</strong> {item}
                </li>
              ))}
            </ol>
          </div>
        </ContentPanel>
        <ContentPanel as="aside">
          <span className="eyebrow">Council authority</span>
          <h2>BDC composition</h2>
          <ul className="mt-5 grid gap-3">
            {record.councilComposition.map((item) => (
              <li className="rounded-xl border p-4" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </ContentPanel>
      </div>
      {record.status !== "Archived" && (
        <ContentPanel as="section" className="mt-6">
          <span className="eyebrow">Workflow</span>
          <h2>Plan actions</h2>
          <p className="muted mt-2">Move the barangay plan through submission and municipal review.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {record.status === "Draft" && (
              <Button onClick={() => updateStatus("Submitted", "The plan was submitted for municipal review.")}>
                <Send /> Submit for review
              </Button>
            )}
            {role === "municipal" && record.status === "Submitted" && (
              <>
                <Button onClick={() => updateStatus("Reviewed", "The municipal review was completed.")}>
                  Mark reviewed
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateStatus("For correction", "The plan was returned for correction.")}
                >
                  Return for correction
                </Button>
              </>
            )}
            {record.status === "For correction" && (
              <Button onClick={() => updateStatus("Submitted", "The corrected plan was resubmitted.")}>
                <Send /> Resubmit plan
              </Button>
            )}
          </div>
        </ContentPanel>
      )}
      <ConfirmationDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive barangay plan?"
        description="The plan will leave the active workflow and remain available as an archived record."
        confirmLabel="Archive plan"
        destructive
        onConfirm={() => {
          repository.archiveBarangayPlan(record.id);
          setArchiveOpen(false);
          router.push("/ops/planning/barangay-plans");
        }}
      />
    </>
  );
}

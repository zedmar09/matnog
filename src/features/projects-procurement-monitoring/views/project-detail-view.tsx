"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Archive,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  EllipsisVertical,
  Landmark,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { Progress } from "@/shared/components/ui/progress";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { ProjectRecordNav, type ProjectSection } from "../components/project-record-nav";
import { projectMonitoringRepository as repository } from "../services/project-monitoring-repository";
import {
  cleanProjectText,
  displayProjectReference,
  formatProjectCurrency,
  projectStageLabel,
  projectStageTone,
} from "../services/project-presentation";

function Metrics({ physical, financial, elapsed }: { physical: number; financial: number; elapsed: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        ["Physical progress", physical],
        ["Financial progress", financial],
        ["Elapsed contract time", elapsed],
      ].map(([label, value]) => (
        <ContentPanel key={String(label)}>
          <p className="muted text-sm">{label}</p>
          <strong className="mt-2 block text-3xl">{value}%</strong>
          <Progress className="mt-3" value={Number(value)} />
        </ContentPanel>
      ))}
    </div>
  );
}

export function ProjectDetailView({ projectId, section }: { projectId: string; section: ProjectSection }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [notice, setNotice] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "inspection" | "issue" | "billing"; id: string }>();
  const [variationReason, setVariationReason] = useState("");
  const [closureEvidence, setClosureEvidence] = useState("");
  const record = repository.find(projectId);
  if (role !== "municipal")
    return (
      <PermissionState
        title="Project delivery requires municipal access"
        description="Authorized municipal staff can manage project delivery records."
      />
    );
  if (!record)
    return (
      <EmptyState
        icon={ClipboardCheck}
        headingLevel="h1"
        title="Project unavailable"
        description="The requested project could not be found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/projects">Back to projects</Link>
          </Button>
        }
      />
    );
  const reference = displayProjectReference(record.id);
  const resolvedProjectId = record.id;
  const canStart =
    Boolean(record.appropriationReference) &&
    record.readiness.filter((gate) => gate.mandatory).every((gate) => gate.state === "complete");
  function rerender(message: string) {
    setNotice(message);
    refresh((value) => value + 1);
  }
  function removeRelated() {
    if (!deleteTarget) return;
    const removed =
      deleteTarget.kind === "inspection"
        ? repository.deleteInspection(resolvedProjectId, deleteTarget.id)
        : deleteTarget.kind === "issue"
          ? repository.deleteIssue(resolvedProjectId, deleteTarget.id)
          : repository.deleteBilling(resolvedProjectId, deleteTarget.id);
    setDeleteTarget(undefined);
    rerender(removed ? "The record was removed." : "The record could not be removed.");
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/projects">
            <ArrowLeft size={15} /> Projects
          </Link>
          <h1>{record.title}</h1>
          <p>
            {reference} · {record.barangay} · {record.office}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/ops/projects/${reference}/edit`}>
              <Pencil /> Edit project
            </Link>
          </Button>
          {record.stage !== "archived" && (
            <Button variant="outline" className="text-destructive" onClick={() => setArchiveOpen(true)}>
              <Archive /> Archive
            </Button>
          )}
        </div>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ProjectRecordNav id={record.id} active={section} />
      {section === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <ContentPanel as="section">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Building2 size={21} />
                  </span>
                  <div>
                    <span className="eyebrow">Project record</span>
                    <h2>Project information</h2>
                  </div>
                </div>
                <StatusBadge tone={projectStageTone(record.stage)}>{projectStageLabel(record.stage)}</StatusBadge>
              </div>
              <div className="mt-5 rounded-xl border bg-muted/35 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Approved scope
                </p>
                <p className="leading-relaxed">{record.scope}</p>
              </div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project type</dt>
                  <dd className="mt-1 font-semibold">{record.type}</dd>
                </div>
                <div className="rounded-xl border p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Implementing office
                  </dt>
                  <dd className="mt-1 font-semibold">{record.office}</dd>
                </div>
                <div className="rounded-xl border p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Original cost</dt>
                  <dd className="mt-1 font-semibold">{formatProjectCurrency(record.originalCostMinor)}</dd>
                </div>
                <div className="rounded-xl border p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current cost</dt>
                  <dd className="mt-1 font-semibold">{formatProjectCurrency(record.currentCostMinor)}</dd>
                </div>
                <div className="rounded-xl border p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Original completion
                  </dt>
                  <dd className="mt-1 font-semibold">{record.originalEnd}</dd>
                </div>
                <div className="rounded-xl border p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Current completion
                  </dt>
                  <dd className="mt-1 font-semibold">{record.currentEnd}</dd>
                </div>
                <div className="rounded-xl border p-4 sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Classification
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {record.year}
                    </span>
                    {record.tags.map((tag) => (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </ContentPanel>
            <ContentPanel as="aside">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Landmark size={21} />
                </span>
                <div>
                  <span className="eyebrow">Origin and funding</span>
                  <h2>Approvals and fund sources</h2>
                </div>
              </div>
              <div className="mt-5 overflow-hidden rounded-xl border">
                {[
                  ["Source proposal", displayProjectReference(record.sourceProposal)],
                  ["Approved plan", displayProjectReference(record.sourcePlan)],
                  ["Appropriation", displayProjectReference(record.appropriationReference) || "Pending"],
                  ["Record version", `Version ${record.version}`],
                ].map(([label, value]) => (
                  <div className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-0" key={label}>
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <strong className="text-right text-sm">{value}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {record.fundSources.map((fund) => (
                  <div className="rounded-xl border border-primary/15 bg-primary/5 p-4" key={fund.label}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Funding source</p>
                    <strong className="mt-1 block">{fund.label}</strong>
                    <p className="mt-2 text-xl font-bold text-foreground">{formatProjectCurrency(fund.amountMinor)}</p>
                  </div>
                ))}
                {!record.fundSources.length && (
                  <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                    No fund source has been recorded.
                  </div>
                )}
              </div>
            </ContentPanel>
          </div>
          <Metrics
            physical={record.physicalProgress}
            financial={record.financialProgress}
            elapsed={record.elapsedProgress}
          />
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <ContentPanel as="section">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck size={21} />
                  </span>
                  <div>
                    <span className="eyebrow">Procurement readiness</span>
                    <h2>Readiness requirements</h2>
                  </div>
                </div>
                <strong className="rounded-full bg-muted px-3 py-1.5 text-sm">
                  {record.readiness.filter((gate) => gate.state === "complete").length} of {record.readiness.length}{" "}
                  complete
                </strong>
              </div>
              <div className="mt-5 grid gap-3">
                {record.readiness.map((gate) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4"
                    key={gate.id}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${gate.state === "complete" ? "bg-primary/12 text-primary" : "bg-amber-100 text-amber-700"}`}
                      >
                        <Check size={16} />
                      </span>
                      <div>
                        <strong>{gate.label}</strong>
                        <p className="muted text-sm">
                          {gate.owner} · {displayProjectReference(gate.evidenceReference) || "Evidence required"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge tone={gate.state === "complete" ? "success" : "warning"}>{gate.state}</StatusBadge>
                  </div>
                ))}
              </div>
              {record.stage === "readiness" && (
                <Button
                  className="mt-5"
                  disabled={!canStart}
                  onClick={() => {
                    const saved = repository.startProcurement(record.id);
                    rerender(
                      saved
                        ? "Procurement was opened."
                        : "Complete all mandatory readiness requirements and funding first.",
                    );
                  }}
                >
                  Start procurement
                </Button>
              )}
            </ContentPanel>
            <ContentPanel as="aside">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Clock3 size={21} />
                </span>
                <div>
                  <span className="eyebrow">Activity log</span>
                  <h2>Project history</h2>
                </div>
              </div>
              <div className="mt-6 grid gap-0">
                {record.history.map((entry, index) => (
                  <div className="relative grid grid-cols-[2rem_1fr] gap-3 pb-5 last:pb-0" key={entry}>
                    {index < record.history.length - 1 && (
                      <span className="absolute bottom-0 left-[.95rem] top-8 w-px bg-border" />
                    )}
                    <span className="relative z-10 grid size-8 place-items-center rounded-full border-4 border-card bg-primary text-xs font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <div className="rounded-xl border bg-muted/20 p-3 text-sm leading-relaxed">
                      {cleanProjectText(entry)}
                    </div>
                  </div>
                ))}
              </div>
            </ContentPanel>
          </div>
        </div>
      )}
      {section === "procurement" && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <ContentPanel as="section">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Procurement</span>
                <h2>Stage requirements</h2>
              </div>
              <Button asChild>
                <Link href={`/ops/projects/${reference}/procurement/edit`}>
                  <Pencil /> Edit procurement
                </Link>
              </Button>
            </div>
            <div className="mt-5 grid gap-3">
              {record.readiness.map((gate) => (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4" key={gate.id}>
                  <div>
                    <strong>{gate.label}</strong>
                    <p className="muted text-sm">
                      {gate.owner} · {displayProjectReference(gate.evidenceReference)}
                    </p>
                  </div>
                  <StatusBadge tone={gate.state === "complete" ? "success" : "warning"}>{gate.state}</StatusBadge>
                </div>
              ))}
            </div>
          </ContentPanel>
          <ContentPanel as="aside">
            <span className="eyebrow">Contract</span>
            <h2>Procurement record</h2>
            <dl className="document-facts mt-6">
              <div>
                <dt>Mode</dt>
                <dd>{record.procurementMode}</dd>
              </div>
              <div>
                <dt>Posting</dt>
                <dd>{displayProjectReference(record.postingReference)}</dd>
              </div>
              <div>
                <dt>Contract</dt>
                <dd>{displayProjectReference(record.contractReference)}</dd>
              </div>
              <div>
                <dt>Contractor</dt>
                <dd>{record.contractor ?? "Not awarded"}</dd>
              </div>
              <div>
                <dt>Security expiry</dt>
                <dd>{record.securityExpiry ?? "Not recorded"}</dd>
              </div>
            </dl>
            {record.emergencyAuthority && (
              <p className="mt-5 rounded-xl bg-muted p-4 text-sm">{cleanProjectText(record.emergencyAuthority)}</p>
            )}
          </ContentPanel>
        </div>
      )}
      {section === "execution" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button asChild>
              <Link href={`/ops/projects/${reference}/progress`}>
                <Pencil /> Update progress
              </Link>
            </Button>
          </div>
          <Metrics
            physical={record.physicalProgress}
            financial={record.financialProgress}
            elapsed={record.elapsedProgress}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <ContentPanel as="section">
              <span className="eyebrow">Baseline</span>
              <h2>Original and current</h2>
              <dl className="document-facts mt-6">
                <div>
                  <dt>Original cost</dt>
                  <dd>{formatProjectCurrency(record.originalCostMinor)}</dd>
                </div>
                <div>
                  <dt>Current cost</dt>
                  <dd>{formatProjectCurrency(record.currentCostMinor)}</dd>
                </div>
                <div>
                  <dt>Original completion</dt>
                  <dd>{record.originalEnd}</dd>
                </div>
                <div>
                  <dt>Current completion</dt>
                  <dd>{record.currentEnd}</dd>
                </div>
              </dl>
            </ContentPanel>
            <ContentPanel as="section">
              <span className="eyebrow">Contract change</span>
              <h2>Variation review</h2>
              {record.variation ? (
                <>
                  <dl className="document-facts mt-6">
                    <div>
                      <dt>Reference</dt>
                      <dd>{displayProjectReference(record.variation.reference)}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{record.variation.status}</dd>
                    </div>
                    <div>
                      <dt>Cost impact</dt>
                      <dd>{formatProjectCurrency(record.variation.costImpactMinor)}</dd>
                    </div>
                    <div>
                      <dt>Time impact</dt>
                      <dd>{record.variation.dayImpact} days</dd>
                    </div>
                  </dl>
                  <label className="form-field mt-5">
                    <span className="form-label">Decision reason</span>
                    <Textarea value={variationReason} onChange={(event) => setVariationReason(event.target.value)} />
                  </label>
                  <div className="mt-4 flex gap-3">
                    <Button
                      onClick={() => {
                        const saved = repository.decideVariation(record.id, "Approved", variationReason);
                        rerender(
                          saved ? "Variation approved." : "Enter a decision reason with at least eight characters.",
                        );
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const saved = repository.decideVariation(record.id, "Rejected", variationReason);
                        rerender(
                          saved ? "Variation rejected." : "Enter a decision reason with at least eight characters.",
                        );
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </>
              ) : (
                <p className="muted mt-5">No variation request is recorded.</p>
              )}
            </ContentPanel>
          </div>
        </div>
      )}
      {section === "inspections" && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <ContentPanel as="section">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Field records</span>
                <h2>Inspections</h2>
              </div>
              <Button asChild>
                <Link href={`/ops/projects/${reference}/inspections/new`}>
                  <Plus /> New inspection
                </Link>
              </Button>
            </div>
            <div className="mt-5 grid gap-3">
              {record.inspections.length ? (
                record.inspections.map((inspection) => (
                  <div className="rounded-xl border p-4" key={inspection.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <strong>{displayProjectReference(inspection.id)}</strong>
                        <p className="muted text-sm">
                          Captured {inspection.capturedAt} · reported {inspection.reportedAt}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge tone={inspection.syncState === "synced" ? "success" : "warning"}>
                          {inspection.reviewStatus ?? inspection.syncState}
                        </StatusBadge>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="ops-row-menu"
                            aria-label={`Actions for ${displayProjectReference(inspection.id)}`}
                          >
                            <EllipsisVertical size={16} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="ops-row-menu-content">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/ops/projects/${reference}/inspections/${displayProjectReference(inspection.id)}/edit`}
                              >
                                <Pencil /> Edit inspection
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeleteTarget({ kind: "inspection", id: inspection.id })}
                            >
                              <Trash2 /> Remove inspection
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <p className="mt-3">{inspection.finding}</p>
                    <dl className="document-facts mt-4">
                      <div>
                        <dt>Coordinates</dt>
                        <dd>{inspection.coordinates}</dd>
                      </div>
                      <div>
                        <dt>Evidence</dt>
                        <dd>{displayProjectReference(inspection.photoReference)}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt>Material result</dt>
                        <dd>{inspection.materialResult}</dd>
                      </div>
                    </dl>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No inspections recorded"
                  description="Add the first inspection for this project."
                />
              )}
            </div>
          </ContentPanel>
          <ContentPanel as="aside">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Corrective work</span>
                <h2>Issues</h2>
              </div>
              <Button asChild size="sm">
                <Link href={`/ops/projects/${reference}/issues/new`}>
                  <Plus /> New issue
                </Link>
              </Button>
            </div>
            <div className="mt-5 grid gap-3">
              {record.issues.map((issue) => (
                <div className="rounded-xl border p-4" key={issue.id}>
                  <div className="flex justify-between gap-3">
                    <StatusBadge tone={issue.status === "resolved" ? "success" : "warning"}>{issue.status}</StatusBadge>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="ops-row-menu"
                        aria-label={`Actions for ${displayProjectReference(issue.id)}`}
                      >
                        <EllipsisVertical size={16} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="ops-row-menu-content">
                        <DropdownMenuItem asChild>
                          <Link href={`/ops/projects/${reference}/issues/${displayProjectReference(issue.id)}/edit`}>
                            <Pencil /> Edit issue
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleteTarget({ kind: "issue", id: issue.id })}
                        >
                          <Trash2 /> Remove issue
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-3 text-sm">{issue.description}</p>
                  <p className="muted mt-1 text-sm">
                    {issue.assignee} · due {issue.dueAt}
                  </p>
                  {issue.status !== "resolved" && (
                    <div className="mt-4 grid gap-2">
                      <Input
                        value={closureEvidence}
                        onChange={(event) => setClosureEvidence(event.target.value)}
                        placeholder="Closure evidence reference"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const saved = repository.resolveIssue(record.id, issue.id, closureEvidence);
                          rerender(
                            saved
                              ? "Issue resolved with closure evidence."
                              : "Enter a valid closure evidence reference.",
                          );
                        }}
                      >
                        Resolve issue
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ContentPanel>
        </div>
      )}
      {section === "billings" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button asChild>
              <Link href={`/ops/projects/${reference}/billings/new`}>
                <Plus /> New billing
              </Link>
            </Button>
          </div>
          <Metrics
            physical={record.physicalProgress}
            financial={record.financialProgress}
            elapsed={record.elapsedProgress}
          />
          {record.billings.length ? (
            record.billings.map((billing) => (
              <ContentPanel as="section" key={billing.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="eyebrow">{displayProjectReference(billing.id)}</span>
                    <h2>{billing.status}</h2>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge tone={billing.verifiedInspectionReference ? "success" : "warning"}>
                      {billing.verifiedInspectionReference ? "Inspection verified" : "Verification required"}
                    </StatusBadge>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="ops-row-menu"
                        aria-label={`Actions for ${displayProjectReference(billing.id)}`}
                      >
                        <EllipsisVertical size={16} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="ops-row-menu-content">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/ops/projects/${reference}/billings/${displayProjectReference(billing.id)}/edit`}
                          >
                            <Pencil /> Edit billing
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!billing.verifiedInspectionReference}
                          onSelect={() =>
                            rerender(
                              repository.sendBilling(record.id, billing.id)
                                ? "Billing forwarded for financial review."
                                : "A verified inspection is required before financial review.",
                            )
                          }
                        >
                          <Send /> Forward for review
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleteTarget({ kind: "billing", id: billing.id })}
                        >
                          <Trash2 /> Remove billing
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <dl className="document-facts mt-6">
                  <div>
                    <dt>Gross</dt>
                    <dd>{formatProjectCurrency(billing.grossMinor)}</dd>
                  </div>
                  <div>
                    <dt>Retention</dt>
                    <dd>{formatProjectCurrency(billing.retentionMinor)}</dd>
                  </div>
                  <div>
                    <dt>Net</dt>
                    <dd>{formatProjectCurrency(billing.netMinor)}</dd>
                  </div>
                  <div>
                    <dt>Inspection</dt>
                    <dd>{displayProjectReference(billing.verifiedInspectionReference)}</dd>
                  </div>
                  <div>
                    <dt>Financial reference</dt>
                    <dd>{displayProjectReference(billing.financeReference)}</dd>
                  </div>
                </dl>
              </ContentPanel>
            ))
          ) : (
            <EmptyState
              icon={CircleDollarSign}
              title="No billings recorded"
              description="Create a billing after verified accomplishment is available."
            />
          )}
        </div>
      )}
      {section === "completion" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ContentPanel as="section">
            <span className="eyebrow">Acceptance</span>
            <h2>Completion requirements</h2>
            <div className="mt-5 grid gap-3">
              {[
                ["Physical progress at 100%", record.physicalProgress === 100],
                ["Final inspection recorded", record.inspections.length > 0],
                ["All project issues resolved", record.issues.every((issue) => issue.status === "resolved")],
                ["As-built record", Boolean(record.asBuiltReference)],
                ["Receiving custodian", Boolean(record.receivingCustodian)],
              ].map(([label, complete]) => (
                <div className="flex items-center justify-between rounded-xl border p-4" key={String(label)}>
                  <span>{String(label)}</span>
                  <StatusBadge tone={complete ? "success" : "pending"}>
                    {complete ? "Complete" : "Required"}
                  </StatusBadge>
                </div>
              ))}
            </div>
            <Button
              className="mt-5 w-full"
              disabled={
                record.physicalProgress < 100 ||
                record.inspections.length === 0 ||
                record.issues.some((issue) => issue.status !== "resolved")
              }
              onClick={() => {
                const saved = repository.acceptCompletion(record.id);
                rerender(
                  saved
                    ? "Completion accepted and turnover prepared."
                    : "Complete the required progress, inspection, and issue records first.",
                );
              }}
            >
              <CheckCircle2 /> Accept completion
            </Button>
          </ContentPanel>
          <ContentPanel as="aside">
            <span className="eyebrow">Turnover</span>
            <h2>Custody and warranty</h2>
            <dl className="document-facts mt-6">
              <div>
                <dt>Turnover reference</dt>
                <dd>{displayProjectReference(record.turnoverReference)}</dd>
              </div>
              <div>
                <dt>As-built reference</dt>
                <dd>{displayProjectReference(record.asBuiltReference)}</dd>
              </div>
              <div>
                <dt>Receiving custodian</dt>
                <dd>{record.receivingCustodian ?? "Not assigned"}</dd>
              </div>
              <div>
                <dt>Warranty until</dt>
                <dd>{record.warrantyUntil ?? "Not recorded"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt>Audit observation</dt>
                <dd>{record.auditObservation ?? "No open observation"}</dd>
              </div>
            </dl>
          </ContentPanel>
        </div>
      )}
      <ConfirmationDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive project?"
        description="The project will leave the active delivery portfolio and remain available as an archived record."
        confirmLabel="Archive project"
        destructive
        onConfirm={() => {
          repository.archive(record.id);
          setArchiveOpen(false);
          router.push("/ops/projects");
        }}
      />
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        title={`Remove ${deleteTarget?.kind ?? "record"}?`}
        description="This local project record will be removed from the current workspace."
        confirmLabel="Remove record"
        destructive
        onConfirm={removeRelated}
      />
    </>
  );
}

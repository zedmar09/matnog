"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { ArrowRight, CircleDollarSign, ClipboardList, MapPinned, Scale, TriangleAlert } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Progress } from "@/shared/components/ui/progress";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { developmentPlanningRepository } from "../services/development-planning-repository";
import type { PlanningProposal, PlanningScenario, PlanningStatus } from "../types/development-planning";

export type PlanningScreen = "barangay-plans" | "proposal-new" | "proposal" | "prioritization" | "plan" | "submissions";

const scenarioOptions: { value: PlanningScenario; label: string }[] = [
  { value: "normal", label: "Normal workflow" },
  { value: "missing-evidence", label: "Missing evidence" },
  { value: "criteria-changed", label: "Criteria changed" },
  { value: "tie", label: "Tied ranking" },
  { value: "missing-minutes", label: "Missing minutes" },
  { value: "stale-version", label: "Concurrent edit" },
];

const money = (minor: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(minor / 100);
const tone = (status: string): "success" | "warning" | "pending" =>
  status.includes("linked") || status.includes("prioritized")
    ? "success"
    : status.includes("correction") || status.includes("deferred") || status.includes("unfunded")
      ? "warning"
      : "pending";

function EvidenceCard({ proposal }: { proposal: PlanningProposal }) {
  const e = proposal.evidence;
  return (
    <ContentPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">Evidence · {e.snapshotId}</span>
          <h3 className="mt-1">{e.source}</h3>
        </div>
        <StatusBadge tone={e.denominator ? "success" : "warning"}>{e.coverage}</StatusBadge>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="muted">Collected</dt>
          <dd>{e.collectedAt}</dd>
        </div>
        <div>
          <dt className="muted">Reported</dt>
          <dd>{e.reportedAt}</dd>
        </div>
        <div>
          <dt className="muted">Count definition</dt>
          <dd>{e.beneficiaries} unique people</dd>
        </div>
      </dl>
      {e.caveat && <NoticePanel className="mt-4">{e.caveat}</NoticePanel>}
    </ContentPanel>
  );
}

function ProposalCard({ item }: { item: PlanningProposal }) {
  return (
    <ContentPanel as="article">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">
            {item.id} · {item.barangay}
          </span>
          <h2 className="mt-1">{item.problem}</h2>
        </div>
        <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
      </div>
      <p className="muted mt-3">{item.outcome}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <StatusBadge key={tag} tone="neutral">
            {tag}
          </StatusBadge>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
        <span>
          {money(item.estimateMinor)} · {item.beneficiaries} unique beneficiaries
        </span>
        <Button asChild size="sm">
          <Link href={`/ops/planning/proposals/${item.id}`}>
            Open proposal <ArrowRight />
          </Link>
        </Button>
      </div>
    </ContentPanel>
  );
}

export function DevelopmentPlanningWorkspace({ screen, recordId }: { screen: PlanningScreen; recordId?: string }) {
  const { role, scenario: globalScenario, setScenario } = useWorkspaceSession();
  const [preview, setPreview] = useState<PlanningScenario>("normal");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string>();
  const [step, setStep] = useState(1);
  const [problem, setProblem] = useState("Recurring service gap recorded in DEMO-SVC-001");
  const [location, setLocation] = useState("Purok 2 riverside corridor");
  const [sourceOffice, setSourceOffice] = useState("Demo Barangay A BDC");
  const [barangay, setBarangay] = useState("Demo Barangay A");
  const [outcome, setOutcome] = useState("Improve safe access during seasonal rain");
  const [cost, setCost] = useState("4200000");
  const [beneficiaries, setBeneficiaries] = useState("312");
  const [tags, setTags] = useState("Climate, DRRM, SDG 11");
  const [decisionReason, setDecisionReason] = useState("Reviewed against the published sample criteria.");
  const [planFeedback, setPlanFeedback] = useState("Reviewed with the source proposal and funding gate visible.");
  const [submittedId, setSubmittedId] = useState<string>();
  const [proposals, setProposals] = useState(() => developmentPlanningRepository.listProposals());
  const effectivePreview = globalScenario === "normal" ? preview : globalScenario;
  const canAccess =
    role === "municipal" ||
    (role === "barangay" && ["barangay-plans", "proposal-new", "proposal", "submissions"].includes(screen));
  const visibleProposals =
    role === "barangay" ? proposals.filter((item) => item.barangay === "Demo Barangay A") : proposals;
  const filtered = useMemo(
    () =>
      visibleProposals.filter((item) =>
        `${item.id} ${item.problem} ${item.barangay} ${item.status}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [visibleProposals, query],
  );
  const proposal = recordId ? visibleProposals.find((item) => item.id === recordId) : undefined;
  const plan = recordId ? developmentPlanningRepository.findPlan(recordId) : undefined;
  const mutate = (status: PlanningStatus, reason: string) => {
    if (!proposal || effectivePreview === "stale-version") return;
    developmentPlanningRepository.transition(proposal.id, status, reason);
    setProposals(developmentPlanningRepository.listProposals());
    setNotice(`Sample transition recorded: ${status}. No backend or official plan changed.`);
  };
  const submitProposal = () => {
    const created = developmentPlanningRepository.createProposal({
      problem,
      location,
      outcome,
      costPesos: Number(cost),
      beneficiaries: Number(beneficiaries),
      sourceOffice,
      barangay,
      tags: tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      evidenceSnapshotId: "DEMO-EVD-001",
    });
    if (!created) {
      setNotice("Complete the problem, location, outcome, positive cost and beneficiary count before submitting.");
      return;
    }
    setProposals(developmentPlanningRepository.listProposals());
    setSubmittedId(created.id);
    setNotice(`${created.id} submitted to the local MPDO queue with version 1. No official plan changed.`);
  };

  if (!canAccess || effectivePreview === "denied")
    return (
      <PermissionState
        title="Planning workspace is unavailable"
        description="Choose Municipal staff, or Barangay staff for its proposal and submission views. Aggregate planning evidence never exposes household names."
      />
    );
  if (effectivePreview === "slow") return <LoadingState label="Loading dated planning snapshots…" />;
  if (effectivePreview === "error")
    return (
      <ErrorState
        title="Planning records could not load"
        description="This selectable demo failure makes retry behavior reviewable. No external planning system was called."
        onRetry={() => setScenario("normal")}
      />
    );

  const title = {
    "barangay-plans": "Barangay plans and BDC records",
    "proposal-new": "Prepare a development proposal",
    proposal: `Proposal ${recordId ?? ""}`,
    prioritization: "Proposal prioritization",
    plan: `Plan ${recordId ?? ""}`,
    submissions: "Planning submissions",
  }[screen];
  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M12 · Development planning · UI demo</span>
          <h1>{title}</h1>
          <p>Trace dated community evidence into proposals, plan versions and explicitly funded project handoffs.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/ops/planning/prioritization">Prioritization</Link>
        </Button>
      </div>
      <NoticePanel className="mb-5">
        Local records only. Plan inclusion, scoring and approval do not authorize appropriation or spending.
      </NoticePanel>
      <ContentPanel className="mb-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
          <label className="font-medium text-sm">
            Exception preview
            <NativeSelect
              value={preview}
              onChange={(e) => setPreview(e.target.value as PlanningScenario)}
              className="mt-2"
            >
              {scenarioOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </NativeSelect>
          </label>
          <div className="text-sm">
            <strong>Cross-module lineage</strong>
            <p className="muted mt-2">
              M11 concern → M15 aggregate evidence → M12 proposal/plan → M14 appropriation → M13 project.
            </p>
          </div>
        </div>
      </ContentPanel>
      {notice && <NoticePanel className="mb-5">{notice}</NoticePanel>}
      {effectivePreview === "empty" ? (
        <EmptyState
          icon={ClipboardList}
          title="No planning records"
          description="The selected sample projection has no records."
        />
      ) : screen === "barangay-plans" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {developmentPlanningRepository
            .listBarangayPlans()
            .filter((item) => role !== "barangay" || item.barangay === "Demo Barangay A")
            .map((item) => (
              <ContentPanel key={item.id}>
                <div className="flex justify-between gap-3">
                  <div>
                    <span className="eyebrow">{item.id}</span>
                    <h2>{item.title}</h2>
                  </div>
                  <StatusBadge tone={item.councilMinutesReference ? "success" : "warning"}>{item.status}</StatusBadge>
                </div>
                <p className="muted mt-3">Minutes: {item.councilMinutesReference ?? "Missing — submission blocked"}</p>
                <p className="mt-4 font-semibold text-sm">BDC composition</p>
                <p className="muted mt-1 text-sm">{item.councilComposition.join(" · ")}</p>
                <p className="mt-4 font-semibold text-sm">Recorded priorities</p>
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
                  {item.priorities.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </ContentPanel>
            ))}
        </div>
      ) : screen === "proposal-new" ? (
        <ContentPanel>
          <div className="flex items-center justify-between gap-3">
            <h2>Proposal step {step} of 4</h2>
            <StatusBadge tone="neutral">Draft stays local</StatusBadge>
          </div>
          <Progress value={step * 25} className="my-4" />
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="font-medium text-sm sm:col-span-2">
                Problem statement
                <Textarea className="mt-2" value={problem} onChange={(e) => setProblem(e.target.value)} />
              </label>
              <label className="font-medium text-sm">
                Planning location
                <Input className="mt-2" value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
              <label className="font-medium text-sm">
                Source office / council
                <Input className="mt-2" value={sourceOffice} onChange={(e) => setSourceOffice(e.target.value)} />
              </label>
              <label className="font-medium text-sm">
                Source barangay
                <Input className="mt-2" value={barangay} onChange={(e) => setBarangay(e.target.value)} />
              </label>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="font-medium text-sm">
                Evidence snapshot
                <Input className="mt-2" value="DEMO-EVD-001" readOnly />
              </label>
              <label className="font-medium text-sm">
                Coverage
                <Input className="mt-2" value="78 of 92 target households" readOnly />
              </label>
              <label className="font-medium text-sm">
                Unique beneficiaries
                <Input
                  className="mt-2"
                  inputMode="numeric"
                  value={beneficiaries}
                  onChange={(e) => setBeneficiaries(e.target.value)}
                />
              </label>
              <NoticePanel>
                Source collected 2026-06-30 and reported 2026-07-10. Fourteen households were not reached.
              </NoticePanel>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="font-medium text-sm">
                Estimate (PHP)
                <Input className="mt-2" value={cost} onChange={(e) => setCost(e.target.value)} />
              </label>
              <label className="font-medium text-sm">
                Outcome
                <Input className="mt-2" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
              </label>
              <label className="font-medium text-sm sm:col-span-2">
                Thematic tags and attribution
                <Input className="mt-2" value={tags} onChange={(e) => setTags(e.target.value)} />
                <span className="muted mt-2 block text-xs">
                  Comma-separated tags receive a controlled 100% attribution split; totals are counted once.
                </span>
              </label>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-3 text-sm">
              <p>
                <strong>Problem:</strong> {problem}
              </p>
              <p>
                <strong>Estimate:</strong> ₱{cost}
              </p>
              <p>
                <strong>Location / beneficiaries:</strong> {location} · {beneficiaries} unique people
              </p>
              <p>
                <strong>Outcome / tags:</strong> {outcome} · {tags}
              </p>
              <NoticePanel>Submission creates only a MPDO task and version timeline.</NoticePanel>
              {submittedId && <StatusBadge tone="success">Submitted as {submittedId}</StatusBadge>}
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep((v) => v - 1)}>
              Back
            </Button>
            <Button
              disabled={
                !problem.trim() ||
                !location.trim() ||
                !outcome.trim() ||
                Number(cost) <= 0 ||
                Number(beneficiaries) <= 0 ||
                (step === 4 && (effectivePreview !== "normal" || Boolean(submittedId)))
              }
              onClick={() => (step < 4 ? setStep((v) => v + 1) : submitProposal())}
            >
              {step < 4 ? "Continue" : "Submit sample"}
            </Button>
          </div>
        </ContentPanel>
      ) : screen === "proposal" ? (
        proposal ? (
          <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
            <div className="space-y-5">
              <ProposalCard item={proposal} />
              <EvidenceCard proposal={proposal} />
              <ContentPanel>
                <h2>Score explanation</h2>
                <div className="mt-4 flex items-end gap-3">
                  <strong className="text-4xl">{proposal.score}</strong>
                  <span className="muted">/ 100 · {proposal.criteriaVersion}</span>
                </div>
                <p className="mt-3">{proposal.rationale}</p>
                {proposal.scoreBreakdown && (
                  <div className="mt-4 grid gap-2">
                    {proposal.scoreBreakdown.map((item) => (
                      <div className="flex justify-between gap-3 rounded-lg border p-3 text-sm" key={item.criterion}>
                        <span>
                          {item.criterion} · {item.weight}% × {item.value}
                        </span>
                        <strong>{item.weightedScore.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                )}
                {proposal.attributions && (
                  <p className="muted mt-4 text-sm">
                    Controlled attribution:{" "}
                    {proposal.attributions.map((item) => `${item.tag} ${item.percent}%`).join(" · ")}. Cost and unique
                    beneficiaries remain counted once.
                  </p>
                )}
                {proposal.overlapWith && (
                  <NoticePanel className="mt-4">
                    Overlap candidate: {proposal.overlapWith}. Consolidation is a reviewer decision.
                  </NoticePanel>
                )}
              </ContentPanel>
            </div>
            <div className="space-y-5">
              <ContentPanel>
                <h2>Decision and feedback</h2>
                <p className="muted mt-2">
                  Version {proposal.version}. A reason remains visible to the source barangay.
                </p>
                <label className="mt-4 grid gap-2 font-medium text-sm">
                  Panel decision reason
                  <Textarea value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} />
                </label>
                <div className="mt-4 grid gap-2">
                  <Button
                    disabled={effectivePreview !== "normal" || decisionReason.trim().length < 8}
                    onClick={() => mutate("prioritized", decisionReason)}
                  >
                    Prioritize sample
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      effectivePreview === "stale-version" ||
                      effectivePreview === "criteria-changed" ||
                      decisionReason.trim().length < 8
                    }
                    onClick={() => mutate("deferred", decisionReason)}
                  >
                    Defer with feedback
                  </Button>
                  <Button
                    variant="outline"
                    disabled={effectivePreview === "stale-version" || decisionReason.trim().length < 8}
                    onClick={() => mutate("for-correction", decisionReason)}
                  >
                    Return for correction
                  </Button>
                </div>
              </ContentPanel>
              <ContentPanel>
                <h2>Funding and project gate</h2>
                <p className="mt-3 text-sm">Plan: {proposal.planReference ?? "Not included"}</p>
                <p className="text-sm">
                  Appropriation: {proposal.appropriationReference ?? "Unfunded — project handoff blocked"}
                </p>
                <p className="text-sm">Project: {proposal.projectReference ?? "No project draft"}</p>
                {proposal.appropriationReference && effectivePreview === "normal" ? (
                  <Button asChild className="mt-4 w-full">
                    <Link
                      href={
                        proposal.projectReference ? `/ops/projects/${proposal.projectReference}` : "/ops/projects/new"
                      }
                    >
                      Open M13 project handoff
                    </Link>
                  </Button>
                ) : (
                  <Button className="mt-4 w-full" disabled>
                    Open M13 project handoff
                  </Button>
                )}
              </ContentPanel>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Proposal unavailable"
            description="The reference does not exist or is outside the current scope."
          />
        )
      ) : screen === "prioritization" ? (
        <div className="space-y-5">
          <ContentPanel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2>MPDO sample criteria</h2>
                <p className="muted">Need 35% · reach 20% · readiness 25% · policy alignment 20%</p>
              </div>
              <StatusBadge tone={effectivePreview === "criteria-changed" ? "warning" : "success"}>
                {effectivePreview === "criteria-changed"
                  ? "New criteria version pending rescore"
                  : "Weights total 100%"}
              </StatusBadge>
            </div>
          </ContentPanel>
          <div className="grid gap-4">
            {[...visibleProposals]
              .sort((a, b) => b.score - a.score)
              .map((p, index) => (
                <ContentPanel key={p.id}>
                  <div className="grid items-center gap-4 sm:grid-cols-[60px_1fr_120px_auto]">
                    <strong className="text-3xl">#{index + 1}</strong>
                    <div>
                      <h3>
                        {p.id} · {p.problem}
                      </h3>
                      <p className="muted text-sm">{p.rationale}</p>
                    </div>
                    <div>
                      <span className="font-bold text-2xl">
                        {effectivePreview === "tie" && index < 2 ? 87 : p.score}
                      </span>
                      <p className="muted text-xs">{p.criteriaVersion}</p>
                    </div>
                    <StatusBadge tone={tone(p.status)}>{p.status}</StatusBadge>
                  </div>
                </ContentPanel>
              ))}
          </div>
        </div>
      ) : screen === "plan" ? (
        plan ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_.75fr]">
            <ContentPanel>
              <span className="eyebrow">
                {plan.level} · {plan.id}
              </span>
              <h2>{plan.title}</h2>
              <p className="muted mt-2">
                {plan.fiscalYears} · {plan.version}
              </p>
              <NoticePanel className="mt-4">
                Version comparison: {plan.previousVersion ?? "No prior sample"} → {plan.version}. {plan.changeSummary}
              </NoticePanel>
              <div className="mt-5 space-y-3">
                {developmentPlanningRepository.listPlans().map((p) => (
                  <div className="rounded-lg border p-4" key={p.id}>
                    <strong>
                      {p.level}: {p.id}
                    </strong>
                    <p className="muted text-sm">
                      {p.version} · parent {p.parentReference ?? "none"}
                    </p>
                  </div>
                ))}
              </div>
            </ContentPanel>
            <ContentPanel>
              <h2>Items and handoff</h2>
              <p className="muted mt-2 text-sm">
                {plan.approvalStatus} · {plan.decisionFeedback ?? "No decision feedback recorded"}
              </p>
              {plan.itemReferences.map((id) => {
                const p = proposals.find((item) => item.id === id);
                return (
                  <div className="mt-4 border-t pt-4" key={id}>
                    <strong>{id}</strong>
                    <p className="muted text-sm">
                      {p?.appropriationReference
                        ? `Funded by ${p.appropriationReference}`
                        : "Approved but unfunded — spending blocked"}
                    </p>
                  </div>
                );
              })}
              <label className="mt-5 grid gap-2 font-medium text-sm">
                Plan decision feedback
                <Textarea value={planFeedback} onChange={(event) => setPlanFeedback(event.target.value)} />
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  ["Approved sample", "Approve"],
                  ["Deferred sample", "Defer"],
                  ["Rejected sample", "Reject"],
                ].map(([status, label]) => (
                  <Button
                    key={status}
                    variant={label === "Approve" ? "default" : "outline"}
                    disabled={effectivePreview === "stale-version" || planFeedback.trim().length < 8}
                    onClick={() => {
                      const updated = developmentPlanningRepository.transitionPlan(plan.id, status, planFeedback);
                      setNotice(
                        updated
                          ? `${updated.id} decision recorded as ${updated.approvalStatus}; this does not authorize spending.`
                          : "Provide decision feedback before saving.",
                      );
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </ContentPanel>
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Plan unavailable"
            description="The requested plan version is not in this dataset."
          />
        )
      ) : (
        <>
          <ContentPanel className="mb-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                aria-label="Search submissions"
                placeholder="Search reference, barangay or status"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button variant="outline" onClick={() => setQuery("")}>
                Reset
              </Button>
            </div>
          </ContentPanel>
          {filtered.length ? (
            <div className="grid gap-4">
              {filtered.map((p) => (
                <ProposalCard key={p.id} item={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No matching submissions"
              description="Clear the local filter to return to all sample submissions."
            />
          )}
        </>
      )}
      {effectivePreview === "missing-evidence" && (
        <NoticePanel className="mt-5">
          <TriangleAlert className="mr-2 inline" size={16} />
          Evidence snapshot is missing. Submission and scoring remain blocked.
        </NoticePanel>
      )}
      {effectivePreview === "missing-minutes" && (
        <NoticePanel className="mt-5">BDC authority minutes are missing. The proposal stays a draft.</NoticePanel>
      )}
      {effectivePreview === "stale-version" && (
        <NoticePanel className="mt-5">
          Another sample reviewer changed this version. Reload before deciding.
        </NoticePanel>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <ContentPanel>
          <MapPinned className="text-primary" />
          <p className="mt-2 text-sm">Locations are planning references, not household disclosure.</p>
        </ContentPanel>
        <ContentPanel>
          <Scale className="text-primary" />
          <p className="mt-2 text-sm">Scores support decisions; panel reasons remain explicit.</p>
        </ContentPanel>
        <ContentPanel>
          <CircleDollarSign className="text-primary" />
          <p className="mt-2 text-sm">Tags never multiply cost or unique beneficiaries.</p>
        </ContentPanel>
      </div>
    </>
  );
}

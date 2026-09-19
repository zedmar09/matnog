"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { ArrowRight, CircleDollarSign, ClipboardCheck, FileWarning, HardHat, ShieldCheck } from "lucide-react";

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

import { projectMonitoringRepository } from "../services/project-monitoring-repository";
import type { ProjectRecord, ProjectScenario } from "../types/project-monitoring";

export type ProjectScreen =
  | "portfolio"
  | "new"
  | "overview"
  | "procurement"
  | "execution"
  | "inspections"
  | "billings"
  | "completion"
  | "oversight";
const money = (minor: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(minor / 100);
const scenarios: { value: ProjectScenario; label: string }[] = [
  { value: "normal", label: "Normal workflow" },
  { value: "missing-gate", label: "Mandatory gate missing" },
  { value: "expired-security", label: "Expired security" },
  { value: "rebid", label: "Returned / rebid" },
  { value: "offline-conflict", label: "Offline inspection conflict" },
  { value: "stale-baseline", label: "Stale baseline" },
  { value: "overdue-audit", label: "Overdue audit response" },
];
const statusTone = (stage: string): "success" | "warning" | "pending" =>
  stage === "accepted" ? "success" : stage === "suspended" || stage === "readiness" ? "warning" : "pending";

function Metrics({ item }: { item: ProjectRecord }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ContentPanel>
        <p className="muted text-sm">Physical accomplishment</p>
        <strong className="text-3xl">{item.physicalProgress}%</strong>
        <Progress className="mt-3" value={item.physicalProgress} />
      </ContentPanel>
      <ContentPanel>
        <p className="muted text-sm">Financial disbursement</p>
        <strong className="text-3xl">{item.financialProgress}%</strong>
        <Progress className="mt-3" value={item.financialProgress} />
      </ContentPanel>
      <ContentPanel>
        <p className="muted text-sm">Elapsed contract time</p>
        <strong className="text-3xl">{item.elapsedProgress}%</strong>
        <Progress className="mt-3" value={item.elapsedProgress} />
      </ContentPanel>
    </div>
  );
}

function ProjectCard({ item }: { item: ProjectRecord }) {
  const funding = item.fundSources.reduce((sum, part) => sum + part.amountMinor, 0);
  return (
    <ContentPanel as="article">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">
            {item.id} · {item.year}
          </span>
          <h2 className="mt-1">{item.title}</h2>
          <p className="muted mt-1">
            {item.barangay} · {item.office}
          </p>
        </div>
        <StatusBadge tone={statusTone(item.stage)}>{item.stage}</StatusBadge>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <span>{item.sourceProposal}</span>
        <span>{funding ? money(funding) : "Unfunded"}</span>
        <span>Physical {item.physicalProgress}%</span>
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-3 border-t pt-4">
        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <StatusBadge tone="neutral" key={tag}>
              {tag}
            </StatusBadge>
          ))}
        </div>
        <Button asChild size="sm">
          <Link href={`/ops/projects/${item.id}`}>
            Open workspace <ArrowRight />
          </Link>
        </Button>
      </div>
    </ContentPanel>
  );
}

function RecordNav({ id }: { id: string }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/ops/projects/${id}`}>Overview</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/ops/projects/${id}/procurement`}>Procurement</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/ops/projects/${id}/execution`}>Execution</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/ops/projects/${id}/inspections`}>Inspections</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/ops/projects/${id}/billings`}>Billings</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/ops/projects/${id}/completion`}>Completion</Link>
      </Button>
    </div>
  );
}

export function ProjectMonitoringWorkspace({ screen, recordId }: { screen: ProjectScreen; recordId?: string }) {
  const { role, scenario: globalScenario, setScenario } = useWorkspaceSession();
  const [preview, setPreview] = useState<ProjectScenario>("normal");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [fundFilter, setFundFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [notice, setNotice] = useState<string>();
  const [step, setStep] = useState(1);
  const [sourceProposal, setSourceProposal] = useState("DEMO-PROP-001");
  const [sourcePlan, setSourcePlan] = useState("DEMO-PLAN-001");
  const [appropriation, setAppropriation] = useState("DEMO-APP-001");
  const [office, setOffice] = useState("Municipal Engineering Office");
  const [projectTitle, setProjectTitle] = useState("Purok 2 climate-resilient drainage extension");
  const [allocation, setAllocation] = useState("4200000");
  const [scope, setScope] = useState("Climate-resilient drainage segment with evidenced readiness gates.");
  const [variationReason, setVariationReason] = useState("Documented drainage outlet redesign after field review.");
  const [createdId, setCreatedId] = useState<string>();
  const [records, setRecords] = useState(() => projectMonitoringRepository.list());
  const visibleRecords =
    role === "barangay" ? records.filter((record) => record.barangay === "Demo Barangay A") : records;
  const item = recordId ? visibleRecords.find((record) => record.id === recordId) : undefined;
  const effective = globalScenario === "normal" ? preview : globalScenario;
  const canAccess =
    role === "municipal" ||
    (role === "barangay" && ["portfolio", "overview", "inspections", "oversight"].includes(screen));
  const filtered = useMemo(
    () =>
      visibleRecords.filter(
        (record) =>
          `${record.id} ${record.title} ${record.barangay} ${record.office} ${record.stage} ${record.tags.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (stageFilter === "all" || record.stage === stageFilter) &&
          (barangayFilter === "all" || record.barangay === barangayFilter) &&
          (yearFilter === "all" || String(record.year) === yearFilter) &&
          (fundFilter === "all" ||
            (fundFilter === "funded" ? Boolean(record.appropriationReference) : !record.appropriationReference)) &&
          (typeFilter === "all" || record.type === typeFilter) &&
          (officeFilter === "all" || record.office === officeFilter) &&
          (tagFilter === "all" || record.tags.includes(tagFilter)),
      ),
    [visibleRecords, query, stageFilter, barangayFilter, yearFilter, fundFilter, typeFilter, officeFilter, tagFilter],
  );
  const allReady = item?.readiness.filter((gate) => gate.mandatory).every((gate) => gate.state === "complete") ?? false;
  const scenarioBlocks = effective !== "normal";
  const recordAction = (message: string) => setNotice(`${message} This updates only the local presentation state.`);
  const createProject = () => {
    const created = projectMonitoringRepository.createProject({
      sourceProposal,
      sourcePlan,
      appropriationReference: appropriation,
      office,
      title: projectTitle,
      scope,
      allocationPesos: Number(allocation),
    });
    if (!created) {
      setNotice("Complete the source links, office, title, scope and positive allocation before creating the draft.");
      return;
    }
    setRecords(projectMonitoringRepository.list());
    setCreatedId(created.id);
    recordAction(`${created.id} project draft created with readiness gates.`);
  };
  if (!canAccess || effective === "denied")
    return (
      <PermissionState
        title="Project workspace is unavailable"
        description="Choose Municipal staff for project operations. Barangay staff receive scoped summaries and inspection context only."
      />
    );
  if (effective === "slow") return <LoadingState label="Loading project evidence pack…" />;
  if (effective === "error")
    return (
      <ErrorState
        title="Project records could not load"
        description="Retry is represented by changing the global preview state. No procurement or field service was called."
        onRetry={() => setScenario("normal")}
      />
    );
  const title = {
    portfolio: "Project portfolio",
    new: "Create linked project",
    overview: item?.title ?? "Project unavailable",
    procurement: "Procurement and contract",
    execution: "Execution and baseline",
    inspections: "Field inspections",
    billings: "Verified billings",
    completion: "Completion and turnover",
    oversight: "Portfolio oversight",
  }[screen];
  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M13 · Projects and procurement · UI demo</span>
          <h1>{title}</h1>
          <p>
            Trace plan lineage, mandatory readiness, contract execution and acceptance without implying a real
            procurement or payment.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/ops/projects/oversight">Open oversight</Link>
        </Button>
      </div>
      <NoticePanel className="mb-5">
        Records and configurable sample gates. No posting, award, contract, inspection proof, bank release or official
        publication occurs.
      </NoticePanel>
      <ContentPanel className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="font-medium text-sm">
            Exception preview
            <NativeSelect
              className="mt-2"
              value={preview}
              onChange={(e) => setPreview(e.target.value as ProjectScenario)}
            >
              {scenarios.map((scenario) => (
                <option key={scenario.value} value={scenario.value}>
                  {scenario.label}
                </option>
              ))}
            </NativeSelect>
          </label>
          <div className="text-sm">
            <strong>Preserved lineage</strong>
            <p className="muted mt-2">
              M12 source plan → M14 fund projection → M13 contract/evidence → M16 approved public summary.
            </p>
          </div>
        </div>
      </ContentPanel>
      {recordId && <RecordNav id={recordId} />} {notice && <NoticePanel className="mb-5">{notice}</NoticePanel>}
      {effective === "empty" ? (
        <EmptyState
          icon={HardHat}
          title="No project records"
          description="The selected projection contains no records."
        />
      ) : screen === "portfolio" ? (
        <>
          <ContentPanel className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Input
                placeholder="Search project, barangay, tag or stage"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <NativeSelect value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
                <option value="all">All stages</option>
                {[...new Set(visibleRecords.map((record) => record.stage))].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={barangayFilter} onChange={(event) => setBarangayFilter(event.target.value)}>
                <option value="all">All barangays</option>
                {[...new Set(visibleRecords.map((record) => record.barangay))].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
                <option value="all">All years</option>
                {[...new Set(visibleRecords.map((record) => String(record.year)))].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={fundFilter} onChange={(event) => setFundFilter(event.target.value)}>
                <option value="all">All funding states</option>
                <option value="funded">With appropriation</option>
                <option value="unfunded">Unfunded</option>
              </NativeSelect>
              <NativeSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">All project types</option>
                {[...new Set(visibleRecords.map((record) => record.type))].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={officeFilter} onChange={(event) => setOfficeFilter(event.target.value)}>
                <option value="all">All offices</option>
                {[...new Set(visibleRecords.map((record) => record.office))].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                <option value="all">All thematic tags</option>
                {[...new Set(visibleRecords.flatMap((record) => record.tags))].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStageFilter("all");
                  setBarangayFilter("all");
                  setYearFilter("all");
                  setFundFilter("all");
                  setTypeFilter("all");
                  setOfficeFilter("all");
                  setTagFilter("all");
                }}
              >
                Reset
              </Button>
            </div>
          </ContentPanel>
          <div className="grid gap-4">
            {filtered.length ? (
              filtered.map((record) => <ProjectCard key={record.id} item={record} />)
            ) : (
              <EmptyState
                icon={HardHat}
                title="No matching projects"
                description="Clear the local filter to see all sample records."
              />
            )}
          </div>
        </>
      ) : screen === "new" ? (
        <ContentPanel>
          <div className="flex items-center justify-between gap-3">
            <h2>Project setup step {step} of 3</h2>
            <StatusBadge tone="neutral">Local draft</StatusBadge>
          </div>
          <Progress value={step * 33} className="my-4" />
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="font-medium text-sm">
                Source proposal
                <Input
                  className="mt-2"
                  value={sourceProposal}
                  onChange={(event) => setSourceProposal(event.target.value)}
                />
              </label>
              <label className="font-medium text-sm">
                Approved plan item
                <Input className="mt-2" value={sourcePlan} onChange={(event) => setSourcePlan(event.target.value)} />
              </label>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="font-medium text-sm">
                Appropriation reference
                <Input
                  className="mt-2"
                  value={appropriation}
                  onChange={(event) => setAppropriation(event.target.value)}
                />
              </label>
              <label className="font-medium text-sm">
                Responsible office
                <Input className="mt-2" value={office} onChange={(event) => setOffice(event.target.value)} />
              </label>
              <label className="font-medium text-sm">
                Project title
                <Input
                  className="mt-2"
                  value={projectTitle}
                  onChange={(event) => setProjectTitle(event.target.value)}
                />
              </label>
              <label className="font-medium text-sm">
                Initial allocation (PHP)
                <Input
                  className="mt-2"
                  inputMode="numeric"
                  value={allocation}
                  onChange={(event) => setAllocation(event.target.value)}
                />
              </label>
            </div>
          )}
          {step === 3 && (
            <>
              <label className="font-medium text-sm">
                Scope and baseline
                <Textarea className="mt-2" value={scope} onChange={(event) => setScope(event.target.value)} />
              </label>
              <NoticePanel className="mt-4">
                Creating the draft does not start procurement. Mandatory evidence remains a separate gate.
              </NoticePanel>
              {createdId && <StatusBadge tone="success">Created as {createdId}</StatusBadge>}
            </>
          )}
          <div className="mt-6 flex justify-between">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep((v) => v - 1)}>
              Back
            </Button>
            <Button disabled={Boolean(createdId)} onClick={() => (step < 3 ? setStep((v) => v + 1) : createProject())}>
              {step < 3 ? "Continue" : "Create sample draft"}
            </Button>
          </div>
        </ContentPanel>
      ) : !item ? (
        <EmptyState
          icon={HardHat}
          title="Project unavailable"
          description="The requested reference does not exist or is outside the role scope."
        />
      ) : screen === "overview" ? (
        <div className="space-y-5">
          <ProjectCard item={item} />
          <Metrics item={item} />
          <div className="grid gap-5 lg:grid-cols-2">
            <ContentPanel>
              <h2>Readiness gates</h2>
              <div className="mt-4 space-y-3">
                {item.readiness.map((gate) => (
                  <div key={gate.id} className="flex flex-wrap justify-between gap-2 border-t pt-3">
                    <span>
                      {gate.label}
                      <small className="muted block">
                        {gate.owner} · {gate.evidenceReference ?? "No evidence"}
                      </small>
                    </span>
                    <StatusBadge tone={gate.state === "complete" ? "success" : "warning"}>{gate.state}</StatusBadge>
                  </div>
                ))}
              </div>
              <Button
                className="mt-4 w-full"
                disabled={!allReady || scenarioBlocks || item.stage !== "readiness"}
                onClick={() => {
                  const updated = projectMonitoringRepository.startProcurement(item.id);
                  setRecords(projectMonitoringRepository.list());
                  recordAction(
                    updated
                      ? "Readiness gates passed and the sample procurement stage opened."
                      : "Procurement stayed blocked by readiness or funding.",
                  );
                }}
              >
                Start procurement
              </Button>
            </ContentPanel>
            <ContentPanel>
              <h2>Source and funding</h2>
              <p className="mt-3 text-sm">
                {item.sourceProposal} → {item.sourcePlan}
              </p>
              <p className="text-sm">Appropriation: {item.appropriationReference ?? "Missing — unfunded"}</p>
              {item.fundSources.map((fund) => (
                <p className="mt-2 text-sm" key={fund.label}>
                  {fund.label}: {money(fund.amountMinor)}
                </p>
              ))}
            </ContentPanel>
          </div>
          <ContentPanel>
            <h2>Project history</h2>
            <div className="mt-3 grid gap-2 text-sm">
              {item.history.map((entry) => (
                <p key={entry}>• {entry}</p>
              ))}
            </div>
          </ContentPanel>
        </div>
      ) : screen === "procurement" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
          <ContentPanel>
            <h2>Stage sequence</h2>
            {[
              "Plan and mode justification",
              "BAC record",
              "Posting",
              "Evaluation",
              "Award",
              "Signed contract",
              "Notice to proceed",
            ].map((stage, index) => (
              <div className="mt-3 flex items-center justify-between border-t pt-3" key={stage}>
                <span>
                  {index + 1}. {stage}
                </span>
                <StatusBadge tone={index < 7 && item.contractReference ? "success" : "pending"}>
                  {item.contractReference ? "evidenced" : "pending"}
                </StatusBadge>
              </div>
            ))}
          </ContentPanel>
          <div className="space-y-5">
            <ContentPanel>
              <h2>Contract facts</h2>
              <p className="mt-3 text-sm">{item.contractReference ?? "No awarded contract"}</p>
              <p className="text-sm">{item.contractor ?? "No contractor"}</p>
              <p className="text-sm">Posting: {item.postingReference ?? "Not posted"}</p>
              <p className="text-sm">Security expiry: {item.securityExpiry ?? "Not applicable"}</p>
            </ContentPanel>
            {item.emergencyAuthority && (
              <NoticePanel>
                {item.emergencyAuthority}. The emergency path keeps required authority and post-review evidence.
              </NoticePanel>
            )}
          </div>
        </div>
      ) : screen === "execution" ? (
        <div className="space-y-5">
          <Metrics item={item} />
          <div className="grid gap-5 lg:grid-cols-2">
            <ContentPanel>
              <h2>Original and current baseline</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="muted">Original</dt>
                  <dd>
                    {money(item.originalCostMinor)}
                    <br />
                    {item.originalEnd}
                  </dd>
                </div>
                <div>
                  <dt className="muted">Current</dt>
                  <dd>
                    {money(item.currentCostMinor)}
                    <br />
                    {item.currentEnd}
                  </dd>
                </div>
              </dl>
            </ContentPanel>
            <ContentPanel>
              <h2>Variation</h2>
              {item.variation ? (
                <>
                  <p className="mt-3">
                    {item.variation.reference} · {item.variation.status}
                  </p>
                  <p className="muted text-sm">
                    +{money(item.variation.costImpactMinor)} · +{item.variation.dayImpact} days
                  </p>
                  <p className="mt-2 text-sm">{item.variation.reason}</p>
                  <label className="mt-4 grid gap-2 font-medium text-sm">
                    Reviewer reason
                    <Textarea value={variationReason} onChange={(event) => setVariationReason(event.target.value)} />
                  </label>
                </>
              ) : (
                <p className="muted mt-3">No variation proposed.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const updated = projectMonitoringRepository.decideVariation(
                      item.id,
                      "Approved sample revision",
                      variationReason,
                    );
                    setRecords(projectMonitoringRepository.list());
                    recordAction(
                      updated ? "Variation approved with cost and time impact." : "A reviewer reason is required.",
                    );
                  }}
                  disabled={scenarioBlocks || !item.variation || variationReason.trim().length < 8}
                >
                  Approve change
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const updated = projectMonitoringRepository.decideVariation(
                      item.id,
                      "Rejected sample request",
                      variationReason,
                    );
                    setRecords(projectMonitoringRepository.list());
                    recordAction(
                      updated
                        ? "Variation rejected and the original baseline retained."
                        : "A reviewer reason is required.",
                    );
                  }}
                  disabled={scenarioBlocks || !item.variation || variationReason.trim().length < 8}
                >
                  Reject change
                </Button>
              </div>
            </ContentPanel>
          </div>
        </div>
      ) : screen === "inspections" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
          <ContentPanel>
            <h2>Inspection evidence</h2>
            {item.inspections.length ? (
              item.inspections.map((inspection) => (
                <div className="mt-4 border-t pt-4" key={inspection.id}>
                  <div className="flex justify-between gap-3">
                    <strong>{inspection.id}</strong>
                    <StatusBadge tone={inspection.syncState === "synced" ? "success" : "warning"}>
                      {effective === "offline-conflict" ? "conflict — choose version" : inspection.syncState}
                    </StatusBadge>
                  </div>
                  <p className="muted mt-2 text-sm">
                    Captured {inspection.capturedAt} · reported {inspection.reportedAt}
                  </p>
                  <p className="text-sm">
                    {inspection.coordinates} · photo metadata {inspection.photoReference}
                  </p>
                  <p className="mt-2">{inspection.finding}</p>
                  <NoticePanel className="mt-3">
                    Photo and GPS metadata support review; they do not prove accomplishment or quality alone.
                  </NoticePanel>
                </div>
              ))
            ) : (
              <EmptyState
                icon={ClipboardCheck}
                title="No inspections"
                description="No field evidence has been captured for this sample project."
              />
            )}
          </ContentPanel>
          <ContentPanel>
            <h2>Punch list</h2>
            {item.issues.map((issue) => (
              <div className="mt-4 border-t pt-4" key={issue.id}>
                <StatusBadge tone={issue.status === "resolved" ? "success" : "warning"}>{issue.status}</StatusBadge>
                <p className="mt-2 text-sm">{issue.description}</p>
                <p className="muted text-sm">
                  {issue.assignee} · due {issue.dueAt}
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={scenarioBlocks || issue.status === "resolved"}
                  onClick={() => {
                    projectMonitoringRepository.resolveIssue(item.id, issue.id);
                    setRecords(projectMonitoringRepository.list());
                    recordAction("Punch-list closure evidence added.");
                  }}
                >
                  Resolve with evidence
                </Button>
              </div>
            ))}
          </ContentPanel>
        </div>
      ) : screen === "billings" ? (
        <div className="space-y-5">
          <Metrics item={item} />
          {item.billings.length ? (
            item.billings.map((bill) => (
              <ContentPanel key={bill.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <span className="eyebrow">{bill.id}</span>
                    <h2>{bill.status}</h2>
                  </div>
                  <StatusBadge tone={bill.verifiedInspectionReference ? "success" : "warning"}>
                    {bill.verifiedInspectionReference ? "verified accomplishment linked" : "verification missing"}
                  </StatusBadge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <p>
                    Gross
                    <br />
                    <strong>{money(bill.grossMinor)}</strong>
                  </p>
                  <p>
                    Retention
                    <br />
                    <strong>{money(bill.retentionMinor)}</strong>
                  </p>
                  <p>
                    Net
                    <br />
                    <strong>{money(bill.netMinor)}</strong>
                  </p>
                </div>
                <p className="muted mt-4 text-sm">
                  M14: {bill.financeReference ?? "Not handed off"}. Approval here does not release cash.
                </p>
                <Button
                  className="mt-4"
                  disabled={!bill.verifiedInspectionReference || scenarioBlocks}
                  onClick={() => {
                    const updated = projectMonitoringRepository.sendBilling(item.id, bill.id);
                    setRecords(projectMonitoringRepository.list());
                    recordAction(
                      updated
                        ? "Billing sent to the M14 sample review queue; it remains unpaid."
                        : "Billing stayed blocked because verified accomplishment or allowed amount is missing.",
                    );
                  }}
                >
                  Send to M14 review
                </Button>
              </ContentPanel>
            ))
          ) : (
            <EmptyState
              icon={CircleDollarSign}
              title="No billing submitted"
              description="A billing cannot be approved without verified accomplishment."
            />
          )}
        </div>
      ) : screen === "completion" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <ContentPanel>
            <h2>Acceptance checklist</h2>
            {[
              "Verified final inspection",
              "Punch list closed",
              "As-built package",
              "Receiving custodian",
              "Warranty/security record",
            ].map((label, index) => {
              const complete =
                (index === 0 && item.physicalProgress === 100 && item.inspections.length > 0) ||
                (index === 1 && item.issues.every((issue) => issue.status === "resolved")) ||
                (index === 2 && Boolean(item.asBuiltReference)) ||
                (index === 3 && Boolean(item.receivingCustodian)) ||
                (index === 4 && Boolean(item.warrantyUntil));
              return (
                <div className="mt-3 flex justify-between gap-3 border-t pt-3" key={label}>
                  <span>{label}</span>
                  <StatusBadge tone={complete ? "success" : "pending"}>
                    {complete ? "complete" : "required"}
                  </StatusBadge>
                </div>
              );
            })}
            <Button
              className="mt-5 w-full"
              disabled={
                item.physicalProgress < 100 ||
                item.inspections.length === 0 ||
                item.issues.some((issue) => issue.status !== "resolved") ||
                scenarioBlocks
              }
              onClick={() => {
                const updated = projectMonitoringRepository.acceptCompletion(item.id);
                setRecords(projectMonitoringRepository.list());
                recordAction(
                  updated
                    ? "Acceptance evidence and turnover projection prepared."
                    : "Acceptance stayed blocked by progress or punch-list conditions.",
                );
              }}
            >
              Prepare acceptance
            </Button>
          </ContentPanel>
          <ContentPanel>
            <h2>Turnover and audit</h2>
            <p className="mt-3 text-sm">Turnover: {item.turnoverReference ?? "Not recorded"}</p>
            <p className="text-sm">As-built: {item.asBuiltReference ?? "Pending acceptance"}</p>
            <p className="text-sm">Receiving custodian: {item.receivingCustodian ?? "Pending acceptance"}</p>
            <p className="text-sm">Warranty: {item.warrantyUntil ?? "Pending acceptance"}</p>
            <p className="mt-3 text-sm">Observation: {item.auditObservation ?? "None"}</p>
            <NoticePanel className="mt-4">
              Public visibility requires a separate approved M16 projection. Internal attachments remain private.
            </NoticePanel>
          </ContentPanel>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <ContentPanel>
              <HardHat className="text-primary" />
              <strong className="mt-2 block text-3xl">{visibleRecords.length}</strong>
              <span className="muted text-sm">Portfolio records</span>
            </ContentPanel>
            <ContentPanel>
              <FileWarning className="text-primary" />
              <strong className="mt-2 block text-3xl">
                {visibleRecords.filter((r) => r.issues.some((i) => i.status !== "resolved")).length}
              </strong>
              <span className="muted text-sm">Open evidence actions</span>
            </ContentPanel>
            <ContentPanel>
              <ShieldCheck className="text-primary" />
              <strong className="mt-2 block text-3xl">1</strong>
              <span className="muted text-sm">Emergency review pack</span>
            </ContentPanel>
          </div>
          {visibleRecords.map((record) => (
            <ProjectCard item={record} key={record.id} />
          ))}
        </div>
      )}
      {effective === "missing-gate" && (
        <NoticePanel className="mt-5">
          Mandatory design or right-of-way evidence is missing. Procurement remains blocked and has no generic override.
        </NoticePanel>
      )}
      {effective === "expired-security" && (
        <NoticePanel className="mt-5">
          Contract security is expired. Award or payment actions remain disabled.
        </NoticePanel>
      )}
      {effective === "rebid" && (
        <NoticePanel className="mt-5">
          The procurement stage was returned for a documented rebid route. Original evidence stays in history.
        </NoticePanel>
      )}
      {effective === "stale-baseline" && (
        <NoticePanel className="mt-5">
          The baseline changed after this screen loaded. Reload before recording a variation or progress event.
        </NoticePanel>
      )}
      {effective === "overdue-audit" && (
        <NoticePanel className="mt-5">
          An audit observation response is overdue; the evidence pack retains responder and due date.
        </NoticePanel>
      )}
    </>
  );
}

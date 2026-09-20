"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  EllipsisVertical,
  Eye,
  FileCheck2,
  FilePlus2,
  FolderOpen,
  Gauge,
  Gavel,
  Pencil,
  Play,
  ReceiptText,
  RotateCcw,
  SearchX,
  ShieldAlert,
} from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { ProjectSummaryCards } from "../components/project-summary-cards";
import { projectMonitoringRepository as repository } from "../services/project-monitoring-repository";
import {
  displayProjectReference,
  formatProjectCurrency,
  projectStageLabel,
  projectStageTone,
} from "../services/project-presentation";
import type { ProjectRecord } from "../types/project-monitoring";

const TODAY = "2026-09-20";

function Access({ children }: { children: React.ReactNode }) {
  const { role } = useWorkspaceSession();
  if (role !== "municipal")
    return (
      <PermissionState
        title="Project delivery requires municipal access"
        description="Authorized municipal staff can review these records."
      />
    );
  return children;
}

function options(values: (string | number | undefined)[]) {
  return [...new Set(values.filter((value): value is string | number => value !== undefined && value !== ""))]
    .sort((a, b) => String(a).localeCompare(String(b)))
    .map((value) => ({ value: String(value), label: String(value) }));
}

function readinessComplete(item: ProjectRecord) {
  return (
    Boolean(item.appropriationReference) && item.readiness.every((gate) => !gate.mandatory || gate.state === "complete")
  );
}

function scheduleState(item: ProjectRecord) {
  return item.currentEnd > item.originalEnd || item.elapsedProgress - item.physicalProgress >= 10
    ? "delayed"
    : "on-track";
}

function riskState(item: ProjectRecord) {
  if (
    item.stage === "suspended" ||
    item.issues.some((issue) => issue.status === "overdue") ||
    item.elapsedProgress - item.physicalProgress >= 15
  )
    return "High";
  if (item.readiness.some((gate) => gate.mandatory && gate.state !== "complete") || item.auditObservation)
    return "Attention";
  return "On track";
}

export function ProcurementListView() {
  const [records, setRecords] = useState(() => repository.list().filter((item) => item.stage !== "archived"));
  const [query, setQuery] = useState("");
  const [barangay, setBarangay] = useState("");
  const [office, setOffice] = useState("");
  const [year, setYear] = useState("");
  const [stage, setStage] = useState("");
  const [readiness, setReadiness] = useState("");
  const [mode, setMode] = useState("");
  const [posting, setPosting] = useState("");
  const [contract, setContract] = useState("");
  const [contractor, setContractor] = useState("");
  const [security, setSecurity] = useState("");
  const [funding, setFunding] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = (message: string) => {
    setRecords(repository.list().filter((item) => item.stage !== "archived"));
    setNotice(message);
  };
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter((item) => {
      const securityState = !item.securityExpiry ? "not-recorded" : item.securityExpiry < TODAY ? "expired" : "current";
      return (
        (!barangay || item.barangay === barangay) &&
        (!office || item.office === office) &&
        (!year || String(item.year) === year) &&
        (!stage || item.stage === stage) &&
        (!readiness || (readiness === "ready") === readinessComplete(item)) &&
        (!mode || item.procurementMode === mode) &&
        (!posting || (posting === "posted") === Boolean(item.postingReference)) &&
        (!contract || (contract === "awarded") === Boolean(item.contractReference)) &&
        (!contractor || (contractor === "selected") === Boolean(item.contractor)) &&
        (!security || security === securityState) &&
        (!funding || (funding === "funded") === item.fundSources.length > 0) &&
        (!normalized ||
          `${item.id} ${item.title} ${item.procurementMode} ${item.contractor ?? ""} ${item.postingReference ?? ""} ${item.contractReference ?? ""}`
            .toLocaleLowerCase()
            .includes(normalized))
      );
    });
  }, [
    barangay,
    contract,
    contractor,
    funding,
    mode,
    office,
    posting,
    query,
    readiness,
    records,
    security,
    stage,
    year,
  ]);
  const ready = records.filter(readinessComplete).length;
  const contracted = records.filter((item) => item.contractReference).length;
  const missing = records.filter((item) => !readinessComplete(item)).length;
  const columns: DataTableColumn<ProjectRecord>[] = [
    {
      key: "project",
      header: "Project",
      className: "ops-wide-cell",
      sortValue: (item) => item.title,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/projects/${displayProjectReference(item.id)}/procurement`}>
            {displayProjectReference(item.id)}
          </Link>
          <strong>{item.title}</strong>
          <small>
            {item.barangay} · {item.office}
          </small>
        </div>
      ),
    },
    {
      key: "mode",
      header: "Procurement",
      sortValue: (item) => item.procurementMode,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{item.procurementMode}</strong>
          <small>{displayProjectReference(item.postingReference) || "Posting pending"}</small>
        </div>
      ),
    },
    {
      key: "contract",
      header: "Contract",
      sortValue: (item) => item.contractReference ?? "",
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{displayProjectReference(item.contractReference) || "Not awarded"}</strong>
          <small>{item.contractor ?? "Contractor not selected"}</small>
        </div>
      ),
    },
    {
      key: "readiness",
      header: "Readiness",
      sortValue: (item) => item.readiness.filter((gate) => gate.state === "complete").length,
      cell: (item) =>
        `${item.readiness.filter((gate) => gate.state === "complete").length}/${item.readiness.length} complete`,
    },
    {
      key: "stage",
      header: "Stage",
      sortValue: (item) => item.stage,
      cell: (item) => <StatusBadge tone={projectStageTone(item.stage)}>{projectStageLabel(item.stage)}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => {
        const reference = displayProjectReference(item.id);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.title}`}>
              <EllipsisVertical size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ops-row-menu-content">
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/procurement`}>
                  <Eye /> View procurement
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/procurement/edit`}>
                  <Pencil /> Edit procurement
                </Link>
              </DropdownMenuItem>
              {item.stage === "readiness" && (
                <DropdownMenuItem
                  disabled={!readinessComplete(item)}
                  onSelect={() =>
                    refresh(
                      repository.startProcurement(item.id)
                        ? "Procurement was opened."
                        : "Complete all mandatory readiness requirements first.",
                    )
                  }
                >
                  <Play /> Start procurement
                </DropdownMenuItem>
              )}
              {item.stage !== "readiness" && (
                <DropdownMenuItem
                  onSelect={() =>
                    refresh(
                      repository.returnToReadiness(
                        item.id,
                        "Requirements need further review before procurement continues.",
                      )
                        ? "Project returned to readiness review."
                        : "The project could not be returned.",
                    )
                  }
                >
                  <RotateCcw /> Return to readiness
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}`}>
                  <FolderOpen /> Open project
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Procurement</h1>
          <p>Manage readiness requirements, procurement modes, postings, awards, contracts, and securities.</p>
        </div>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ProjectSummaryCards
        label="Procurement totals"
        items={[
          { label: "Active records", value: records.length, detail: "projects", icon: ClipboardList },
          { label: "Ready", value: ready, detail: "requirements complete", icon: CheckCircle2 },
          { label: "Contracted", value: contracted, detail: "awarded contracts", icon: FileCheck2 },
          { label: "Needs action", value: missing, detail: "missing requirements", icon: AlertTriangle },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Project, contractor, or reference…" />
        <OpsFilter
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          anyLabel="Any barangay"
          options={options(records.map((item) => item.barangay))}
        />
        <OpsFilter
          label="Office"
          value={office}
          onChange={setOffice}
          anyLabel="Any office"
          options={options(records.map((item) => item.office))}
        />
        <OpsFilter
          label="Year"
          value={year}
          onChange={setYear}
          anyLabel="Any year"
          options={options(records.map((item) => item.year))}
        />
        <OpsFilter
          label="Stage"
          value={stage}
          onChange={setStage}
          anyLabel="Any stage"
          options={[...new Set(records.map((item) => item.stage))].map((value) => ({
            value,
            label: projectStageLabel(value),
          }))}
        />
        <OpsFilter
          label="Readiness"
          value={readiness}
          onChange={setReadiness}
          options={[
            { value: "ready", label: "Complete" },
            { value: "incomplete", label: "Incomplete" },
          ]}
        />
        <OpsFilter
          label="Mode"
          value={mode}
          onChange={setMode}
          anyLabel="Any mode"
          options={options(records.map((item) => item.procurementMode))}
        />
        <OpsFilter
          label="Posting"
          value={posting}
          onChange={setPosting}
          options={[
            { value: "posted", label: "Posted" },
            { value: "pending", label: "Pending" },
          ]}
        />
        <OpsFilter
          label="Contract"
          value={contract}
          onChange={setContract}
          options={[
            { value: "awarded", label: "Awarded" },
            { value: "pending", label: "Pending" },
          ]}
        />
        <OpsFilter
          label="Contractor"
          value={contractor}
          onChange={setContractor}
          options={[
            { value: "selected", label: "Selected" },
            { value: "pending", label: "Not selected" },
          ]}
        />
        <OpsFilter
          label="Security"
          value={security}
          onChange={setSecurity}
          options={[
            { value: "current", label: "Current" },
            { value: "expired", label: "Expired" },
            { value: "not-recorded", label: "Not recorded" },
          ]}
        />
        <OpsFilter
          label="Funding"
          value={funding}
          onChange={setFunding}
          options={[
            { value: "funded", label: "Funded" },
            { value: "unfunded", label: "Unfunded" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          summary={`${rows.length} procurement records`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title="No procurement records match"
          description="Change one or more filters to see other records."
        />
      )}
    </Access>
  );
}

export function ProjectMonitoringListView() {
  const [records] = useState(() => repository.list().filter((item) => item.stage !== "archived"));
  const [query, setQuery] = useState("");
  const [barangay, setBarangay] = useState("");
  const [office, setOffice] = useState("");
  const [type, setType] = useState("");
  const [stage, setStage] = useState("");
  const [physical, setPhysical] = useState("");
  const [schedule, setSchedule] = useState("");
  const [inspection, setInspection] = useState("");
  const [issue, setIssue] = useState("");
  const [billing, setBilling] = useState("");
  const [completion, setCompletion] = useState("");
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter((item) => {
      const progressMatches =
        !physical ||
        (physical === "0" && item.physicalProgress === 0) ||
        (physical === "1-49" && item.physicalProgress >= 1 && item.physicalProgress <= 49) ||
        (physical === "50-99" && item.physicalProgress >= 50 && item.physicalProgress <= 99) ||
        (physical === "100" && item.physicalProgress === 100);
      return (
        (!barangay || item.barangay === barangay) &&
        (!office || item.office === office) &&
        (!type || item.type === type) &&
        (!stage || item.stage === stage) &&
        progressMatches &&
        (!schedule || scheduleState(item) === schedule) &&
        (!inspection || (inspection === "recorded") === item.inspections.length > 0) &&
        (!issue || (issue === "open") === item.issues.some((entry) => entry.status !== "resolved")) &&
        (!billing || (billing === "recorded") === item.billings.length > 0) &&
        (!completion || (completion === "accepted") === (item.stage === "accepted")) &&
        (!normalized ||
          `${item.id} ${item.title} ${item.barangay} ${item.office} ${item.contractor ?? ""}`
            .toLocaleLowerCase()
            .includes(normalized))
      );
    });
  }, [barangay, billing, completion, inspection, issue, office, physical, query, records, schedule, stage, type]);
  const totalValue = records.reduce((sum, item) => sum + item.currentCostMinor, 0);
  const openIssues = records.reduce(
    (sum, item) => sum + item.issues.filter((entry) => entry.status !== "resolved").length,
    0,
  );
  const inspections = records.reduce((sum, item) => sum + item.inspections.length, 0);
  const columns: DataTableColumn<ProjectRecord>[] = [
    {
      key: "project",
      header: "Project",
      className: "ops-wide-cell",
      sortValue: (item) => item.title,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/projects/${displayProjectReference(item.id)}/execution`}>
            {displayProjectReference(item.id)}
          </Link>
          <strong>{item.title}</strong>
          <small>
            {item.barangay} · {item.contractor ?? item.office}
          </small>
        </div>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      sortValue: (item) => item.physicalProgress,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{item.physicalProgress}% physical</strong>
          <small>
            {item.financialProgress}% financial · {item.elapsedProgress}% elapsed
          </small>
        </div>
      ),
    },
    {
      key: "field",
      header: "Field records",
      sortValue: (item) => item.inspections.length,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{item.inspections.length} inspections</strong>
          <small>{item.issues.filter((entry) => entry.status !== "resolved").length} open issues</small>
        </div>
      ),
    },
    {
      key: "billing",
      header: "Billings",
      sortValue: (item) => item.billings.length,
      cell: (item) => `${item.billings.length} records`,
    },
    {
      key: "stage",
      header: "Stage",
      sortValue: (item) => item.stage,
      cell: (item) => <StatusBadge tone={projectStageTone(item.stage)}>{projectStageLabel(item.stage)}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => {
        const reference = displayProjectReference(item.id);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.title}`}>
              <EllipsisVertical size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ops-row-menu-content">
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/execution`}>
                  <Activity /> Open progress
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/progress`}>
                  <Pencil /> Update progress
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/inspections`}>
                  <ClipboardCheck /> View inspections
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/inspections/new`}>
                  <FilePlus2 /> Add inspection
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/issues/new`}>
                  <AlertTriangle /> Add issue
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/billings`}>
                  <ReceiptText /> View billings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/billings/new`}>
                  <FilePlus2 /> Add billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/completion`}>
                  <BadgeCheck /> Open completion
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Monitoring</h1>
          <p>
            Track physical, financial, and elapsed progress with field inspections, issues, billings, and completion
            records.
          </p>
        </div>
      </div>
      <ProjectSummaryCards
        label="Monitoring totals"
        items={[
          { label: "Monitored projects", value: records.length, detail: "active records", icon: Gauge },
          {
            label: "Portfolio value",
            value: formatProjectCurrency(totalValue),
            detail: "current cost",
            icon: CircleDollarSign,
          },
          { label: "Inspections", value: inspections, detail: "field records", icon: ClipboardList },
          { label: "Open issues", value: openIssues, detail: "require action", icon: AlertTriangle },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Project, barangay, contractor, or reference…" />
        <OpsFilter
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          anyLabel="Any barangay"
          options={options(records.map((item) => item.barangay))}
        />
        <OpsFilter
          label="Office"
          value={office}
          onChange={setOffice}
          anyLabel="Any office"
          options={options(records.map((item) => item.office))}
        />
        <OpsFilter
          label="Type"
          value={type}
          onChange={setType}
          anyLabel="Any type"
          options={options(records.map((item) => item.type))}
        />
        <OpsFilter
          label="Stage"
          value={stage}
          onChange={setStage}
          anyLabel="Any stage"
          options={[...new Set(records.map((item) => item.stage))].map((value) => ({
            value,
            label: projectStageLabel(value),
          }))}
        />
        <OpsFilter
          label="Physical progress"
          value={physical}
          onChange={setPhysical}
          options={[
            { value: "0", label: "Not started" },
            { value: "1-49", label: "1–49%" },
            { value: "50-99", label: "50–99%" },
            { value: "100", label: "100%" },
          ]}
        />
        <OpsFilter
          label="Schedule"
          value={schedule}
          onChange={setSchedule}
          options={[
            { value: "on-track", label: "On track" },
            { value: "delayed", label: "Delayed" },
          ]}
        />
        <OpsFilter
          label="Inspection"
          value={inspection}
          onChange={setInspection}
          options={[
            { value: "recorded", label: "Recorded" },
            { value: "none", label: "None" },
          ]}
        />
        <OpsFilter
          label="Issues"
          value={issue}
          onChange={setIssue}
          options={[
            { value: "open", label: "Open" },
            { value: "clear", label: "Clear" },
          ]}
        />
        <OpsFilter
          label="Billing"
          value={billing}
          onChange={setBilling}
          options={[
            { value: "recorded", label: "Recorded" },
            { value: "none", label: "None" },
          ]}
        />
        <OpsFilter
          label="Completion"
          value={completion}
          onChange={setCompletion}
          options={[
            { value: "accepted", label: "Accepted" },
            { value: "pending", label: "Pending" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          initialSort={{ key: "progress", direction: "desc" }}
          summary={`${rows.length} monitored projects`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title="No monitored projects match"
          description="Change one or more filters to see other records."
        />
      )}
    </Access>
  );
}

export function ProjectOversightView() {
  const [records] = useState(() => repository.list().filter((item) => item.stage !== "archived"));
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("");
  const [barangay, setBarangay] = useState("");
  const [office, setOffice] = useState("");
  const [type, setType] = useState("");
  const [year, setYear] = useState("");
  const [stage, setStage] = useState("");
  const [funding, setFunding] = useState("");
  const [schedule, setSchedule] = useState("");
  const [audit, setAudit] = useState("");
  const [issues, setIssues] = useState("");
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter(
      (item) =>
        (!risk || riskState(item) === risk) &&
        (!barangay || item.barangay === barangay) &&
        (!office || item.office === office) &&
        (!type || item.type === type) &&
        (!year || String(item.year) === year) &&
        (!stage || item.stage === stage) &&
        (!funding || (funding === "funded") === item.fundSources.length > 0) &&
        (!schedule || scheduleState(item) === schedule) &&
        (!audit || (audit === "open") === Boolean(item.auditObservation)) &&
        (!issues || (issues === "open") === item.issues.some((entry) => entry.status !== "resolved")) &&
        (!normalized ||
          `${item.id} ${item.title} ${item.barangay} ${item.office} ${item.type}`
            .toLocaleLowerCase()
            .includes(normalized)),
    );
  }, [audit, barangay, funding, issues, office, query, records, risk, schedule, stage, type, year]);
  const columns: DataTableColumn<ProjectRecord>[] = [
    {
      key: "project",
      header: "Project",
      className: "ops-wide-cell",
      sortValue: (item) => item.title,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/projects/${displayProjectReference(item.id)}`}>
            {displayProjectReference(item.id)}
          </Link>
          <strong>{item.title}</strong>
          <small>
            {item.barangay} · {item.office}
          </small>
        </div>
      ),
    },
    {
      key: "delivery",
      header: "Delivery",
      sortValue: (item) => item.physicalProgress,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{item.physicalProgress}% physical</strong>
          <small>
            {item.elapsedProgress}% elapsed · {scheduleState(item) === "delayed" ? "Delayed" : "On track"}
          </small>
        </div>
      ),
    },
    {
      key: "funding",
      header: "Current cost",
      sortValue: (item) => item.currentCostMinor,
      cell: (item) => formatProjectCurrency(item.currentCostMinor),
    },
    {
      key: "exceptions",
      header: "Open actions",
      sortValue: (item) => item.issues.filter((entry) => entry.status !== "resolved").length,
      cell: (item) => `${item.issues.filter((entry) => entry.status !== "resolved").length} issues`,
    },
    {
      key: "risk",
      header: "Oversight status",
      sortValue: riskState,
      cell: (item) => (
        <StatusBadge
          tone={riskState(item) === "On track" ? "success" : riskState(item) === "High" ? "destructive" : "warning"}
        >
          {riskState(item)}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => {
        const reference = displayProjectReference(item.id);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.title}`}>
              <EllipsisVertical size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ops-row-menu-content">
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}`}>
                  <Eye /> Review project
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/procurement`}>
                  <Gavel /> Procurement
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/execution`}>
                  <Activity /> Monitoring
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${reference}/completion`}>
                  <BadgeCheck /> Audit and completion
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
  const high = records.filter((item) => riskState(item) === "High").length;
  const attention = records.filter((item) => riskState(item) === "Attention").length;
  const audits = records.filter((item) => item.auditObservation).length;
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Oversight</h1>
          <p>Review delivery risks, missing requirements, audit observations, and portfolio performance.</p>
        </div>
      </div>
      <ProjectSummaryCards
        label="Project oversight totals"
        items={[
          { label: "Portfolio", value: records.length, detail: "active projects", icon: ClipboardList },
          { label: "High risk", value: high, detail: "immediate review", icon: ShieldAlert },
          { label: "Needs attention", value: attention, detail: "follow-up required", icon: AlertTriangle },
          { label: "Audit observations", value: audits, detail: "recorded", icon: FileCheck2 },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Project, barangay, office, or type…" />
        <OpsFilter
          label="Risk"
          value={risk}
          onChange={setRisk}
          options={[
            { value: "High", label: "High" },
            { value: "Attention", label: "Needs attention" },
            { value: "On track", label: "On track" },
          ]}
        />
        <OpsFilter
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          anyLabel="Any barangay"
          options={options(records.map((item) => item.barangay))}
        />
        <OpsFilter
          label="Office"
          value={office}
          onChange={setOffice}
          anyLabel="Any office"
          options={options(records.map((item) => item.office))}
        />
        <OpsFilter
          label="Type"
          value={type}
          onChange={setType}
          anyLabel="Any type"
          options={options(records.map((item) => item.type))}
        />
        <OpsFilter
          label="Year"
          value={year}
          onChange={setYear}
          anyLabel="Any year"
          options={options(records.map((item) => item.year))}
        />
        <OpsFilter
          label="Stage"
          value={stage}
          onChange={setStage}
          anyLabel="Any stage"
          options={[...new Set(records.map((item) => item.stage))].map((value) => ({
            value,
            label: projectStageLabel(value),
          }))}
        />
        <OpsFilter
          label="Funding"
          value={funding}
          onChange={setFunding}
          options={[
            { value: "funded", label: "Funded" },
            { value: "unfunded", label: "Unfunded" },
          ]}
        />
        <OpsFilter
          label="Schedule"
          value={schedule}
          onChange={setSchedule}
          options={[
            { value: "on-track", label: "On track" },
            { value: "delayed", label: "Delayed" },
          ]}
        />
        <OpsFilter
          label="Audit"
          value={audit}
          onChange={setAudit}
          options={[
            { value: "open", label: "Observation open" },
            { value: "clear", label: "No observation" },
          ]}
        />
        <OpsFilter
          label="Issues"
          value={issues}
          onChange={setIssues}
          options={[
            { value: "open", label: "Open issues" },
            { value: "clear", label: "No open issues" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          initialSort={{ key: "risk", direction: "asc" }}
          summary={`${rows.length} projects reviewed`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title="No oversight records match"
          description="Change one or more filters to see other projects."
        />
      )}
    </Access>
  );
}

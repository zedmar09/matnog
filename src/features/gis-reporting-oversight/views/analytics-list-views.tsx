"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Archive,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Database,
  EllipsisVertical,
  Eye,
  FileBarChart,
  Layers3,
  MapPinned,
  Pencil,
  Play,
  Plus,
  RefreshCcw,
  SearchX,
  ShieldAlert,
} from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { AnalyticsSummary } from "../components/analytics-ui";
import { analyticsRepository as repository } from "../services/analytics-repository";
import type { BarangayProfile, MapLayer, QualityIssue, ReportDefinition } from "../types/analytics";

function Access({ children, municipalOnly = false }: { children: React.ReactNode; municipalOnly?: boolean }) {
  const { role } = useWorkspaceSession();
  if (role !== "municipal" && (municipalOnly || role !== "barangay"))
    return (
      <PermissionState
        title="Analytics workspace unavailable"
        description="Authorized municipal and barangay staff can access analytics records within their assigned scope."
      />
    );
  return children;
}
function options(values: string[]) {
  return [...new Set(values)].sort().map((value) => ({ value, label: value }));
}
function Empty({ noun }: { noun: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title={`No ${noun} match`}
      description="Change one or more filters to see other records."
    />
  );
}
function Notice({ text }: { text: string }) {
  return text ? (
    <div className="registry-save-notice mb-6" role="status">
      {text}
    </div>
  ) : null;
}
function tone(status: string): StatusTone {
  if (["Active", "Resolved"].includes(status)) return "success";
  if (["Critical", "High", "Open", "Archived"].includes(status))
    return status === "Critical" ? "destructive" : "warning";
  return "neutral";
}

export function BarangayListView() {
  const [records, setRecords] = useState(() => repository.listBarangays());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [coverage, setCoverage] = useState("");
  const [owner, setOwner] = useState("");
  const [archiving, setArchiving] = useState<BarangayProfile>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.toLocaleLowerCase().trim();
    return records.filter(
      (item) =>
        (!status || item.status === status) &&
        (!owner || item.owner === owner) &&
        (!coverage ||
          (coverage === "target"
            ? item.registryCompleteness >= item.target
            : coverage === "near"
              ? item.registryCompleteness >= item.target - 5 && item.registryCompleteness < item.target
              : item.registryCompleteness < item.target - 5)) &&
        (!q ||
          `${item.id} ${item.name} ${item.psgcCode} ${item.owner} ${item.followUp}`.toLocaleLowerCase().includes(q)),
    );
  }, [coverage, owner, query, records, status]);
  const columns: DataTableColumn<BarangayProfile>[] = [
    {
      key: "barangay",
      header: "Barangay",
      className: "ops-wide-cell",
      sortValue: (i) => i.name,
      cell: (i) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/insights/barangays/${i.id}`}>
            {i.name}
          </Link>
          <strong>{i.psgcCode}</strong>
          <small>
            {i.population.toLocaleString()} population · {i.households.toLocaleString()} households
          </small>
        </div>
      ),
    },
    {
      key: "coverage",
      header: "Registry coverage",
      sortValue: (i) => i.registryCompleteness,
      cell: (i) => (
        <>
          <strong>{i.registryCompleteness}% complete</strong>
          <small>{i.target}% target</small>
        </>
      ),
    },
    {
      key: "service",
      header: "Service performance",
      sortValue: (i) => i.serviceTurnaround,
      cell: (i) => (
        <>
          <strong>{i.serviceTurnaround.toFixed(1)} days</strong>
          <small>average turnaround</small>
        </>
      ),
    },
    {
      key: "owner",
      header: "Record owner",
      sortValue: (i) => i.owner,
      cell: (i) => (
        <>
          <strong>{i.owner}</strong>
          <small>Submitted {i.lastSubmission}</small>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (i) => i.status,
      cell: (i) => <StatusBadge tone={tone(i.status)}>{i.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (i) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${i.name}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/insights/barangays/${i.id}`}>
                <Eye /> View profile
              </Link>
            </DropdownMenuItem>
            {i.status !== "Archived" && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/insights/barangays/${i.id}/edit`}>
                  <Pencil /> Edit profile
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {i.status === "Archived" ? (
              <DropdownMenuItem
                onSelect={() => {
                  repository.restoreBarangay(i.id);
                  setNotice(`${i.name} was restored.`);
                  setRecords(repository.listBarangays());
                }}
              >
                <RefreshCcw /> Restore profile
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onSelect={() => setArchiving(i)}>
                <Archive /> Archive profile
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  const active = records.filter((i) => i.status === "Active");
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Barangays</h1>
          <p>Monitor registry coverage, service performance, submission freshness, targets, and assigned follow-ups.</p>
        </div>
        <Button asChild>
          <Link href="/ops/insights/barangays/new">
            <Plus /> New profile
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <AnalyticsSummary
        items={[
          { label: "Active barangays", value: active.length, detail: "analytics profiles", icon: Database },
          {
            label: "Average coverage",
            value: `${Math.round(active.reduce((s, i) => s + i.registryCompleteness, 0) / active.length)}%`,
            detail: "registry completeness",
            icon: BarChart3,
          },
          {
            label: "At target",
            value: active.filter((i) => i.registryCompleteness >= i.target).length,
            detail: "coverage targets met",
            icon: CheckCircle2,
          },
          {
            label: "Needs follow-up",
            value: active.filter((i) => i.registryCompleteness < i.target).length,
            detail: "below target",
            icon: CircleAlert,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Barangay, PSGC code, owner, or follow-up…" />
        <OpsFilter label="Status" value={status} onChange={setStatus} options={options(records.map((i) => i.status))} />
        <OpsFilter
          label="Coverage"
          value={coverage}
          onChange={setCoverage}
          options={[
            { value: "target", label: "Target met" },
            { value: "near", label: "Near target" },
            { value: "below", label: "Below target" },
          ]}
        />
        <OpsFilter label="Owner" value={owner} onChange={setOwner} options={options(records.map((i) => i.owner))} />
      </div>
      {rows.length ? (
        <DataTable columns={columns} rows={rows} getRowKey={(i) => i.id} summary={`${rows.length} barangay profiles`} />
      ) : (
        <Empty noun="barangays" />
      )}
      <ConfirmationDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive barangay profile?"
        description="The profile will leave active analytics views and remain available for restoration."
        confirmLabel="Archive profile"
        destructive
        onConfirm={() => {
          if (!archiving) return;
          repository.archiveBarangay(archiving.id);
          setNotice(`${archiving.name} was archived.`);
          setArchiving(undefined);
          setRecords(repository.listBarangays());
        }}
      />
    </Access>
  );
}

export function LayerListView() {
  const [records, setRecords] = useState(() => repository.listLayers());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState("");
  const [status, setStatus] = useState("");
  const [archiving, setArchiving] = useState<MapLayer>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.toLocaleLowerCase().trim();
    return records.filter(
      (i) =>
        (!category || i.category === category) &&
        (!visibility || i.visibility === visibility) &&
        (!status || i.status === status) &&
        (!q || `${i.id} ${i.name} ${i.sourceModule} ${i.owner} ${i.scope}`.toLocaleLowerCase().includes(q)),
    );
  }, [category, query, records, status, visibility]);
  const columns: DataTableColumn<MapLayer>[] = [
    {
      key: "layer",
      header: "Map layer",
      className: "ops-wide-cell",
      sortValue: (i) => i.name,
      cell: (i) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/insights/maps/${i.id}`}>
            {i.name}
          </Link>
          <strong>{i.category}</strong>
          <small>
            {i.id} · {i.scope}
          </small>
        </div>
      ),
    },
    {
      key: "source",
      header: "Source and owner",
      sortValue: (i) => i.sourceModule,
      cell: (i) => (
        <>
          <strong>{i.sourceModule}</strong>
          <small>{i.owner}</small>
        </>
      ),
    },
    {
      key: "records",
      header: "Coverage",
      sortValue: (i) => i.recordCount,
      cell: (i) => (
        <>
          <strong>{i.recordCount.toLocaleString()} records</strong>
          <small>Updated {i.lastUpdated}</small>
        </>
      ),
    },
    {
      key: "visibility",
      header: "Visibility",
      sortValue: (i) => i.visibility,
      cell: (i) => (
        <StatusBadge
          tone={i.visibility === "Public" ? "success" : i.visibility === "Restricted" ? "warning" : "neutral"}
        >
          {i.visibility}
        </StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (i) => i.status,
      cell: (i) => <StatusBadge tone={tone(i.status)}>{i.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (i) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${i.name}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/insights/maps/${i.id}`}>
                <Eye /> View layer
              </Link>
            </DropdownMenuItem>
            {i.status !== "Archived" && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/insights/maps/${i.id}/edit`}>
                  <Pencil /> Edit layer
                </Link>
              </DropdownMenuItem>
            )}
            {i.status !== "Archived" && (
              <DropdownMenuItem
                onSelect={() => {
                  repository.toggleLayer(i.id);
                  setRecords(repository.listLayers());
                  setNotice(`${i.name} is now ${i.status === "Active" ? "inactive" : "active"}.`);
                }}
              >
                <RefreshCcw /> {i.status === "Active" ? "Disable" : "Enable"} layer
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {i.status === "Archived" ? (
              <DropdownMenuItem
                onSelect={() => {
                  repository.restoreLayer(i.id);
                  setRecords(repository.listLayers());
                  setNotice(`${i.name} was restored.`);
                }}
              >
                <RefreshCcw /> Restore layer
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onSelect={() => setArchiving(i)}>
                <Archive /> Archive layer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Map</h1>
          <p>Manage geographic layers, data sources, disclosure levels, record coverage, and responsible offices.</p>
        </div>
        <Button asChild>
          <Link href="/ops/insights/maps/new">
            <Plus /> New layer
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <AnalyticsSummary
        items={[
          {
            label: "Total layers",
            value: records.filter((i) => i.status !== "Archived").length,
            detail: "configured layers",
            icon: Layers3,
          },
          {
            label: "Active",
            value: records.filter((i) => i.status === "Active").length,
            detail: "available to staff",
            icon: MapPinned,
          },
          {
            label: "Public",
            value: records.filter((i) => i.visibility === "Public" && i.status === "Active").length,
            detail: "approved for publishing",
            icon: Eye,
          },
          {
            label: "Restricted",
            value: records.filter((i) => i.visibility === "Restricted" && i.status === "Active").length,
            detail: "controlled access",
            icon: ShieldAlert,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Layer, source module, owner, or scope…" />
        <OpsFilter
          label="Category"
          value={category}
          onChange={setCategory}
          options={options(records.map((i) => i.category))}
        />
        <OpsFilter
          label="Visibility"
          value={visibility}
          onChange={setVisibility}
          options={options(records.map((i) => i.visibility))}
        />
        <OpsFilter label="Status" value={status} onChange={setStatus} options={options(records.map((i) => i.status))} />
      </div>
      {rows.length ? (
        <DataTable columns={columns} rows={rows} getRowKey={(i) => i.id} summary={`${rows.length} map layers`} />
      ) : (
        <Empty noun="map layers" />
      )}
      <ConfirmationDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive map layer?"
        description="The layer will no longer be available in active map views."
        confirmLabel="Archive layer"
        destructive
        onConfirm={() => {
          if (!archiving) return;
          repository.archiveLayer(archiving.id);
          setNotice(`${archiving.name} was archived.`);
          setArchiving(undefined);
          setRecords(repository.listLayers());
        }}
      />
    </Access>
  );
}

export function QualityListView() {
  const [records, setRecords] = useState(() => repository.listIssues());
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.toLocaleLowerCase().trim();
    return records.filter(
      (i) =>
        (!module || i.sourceModule === module) &&
        (!severity || i.severity === severity) &&
        (!status || i.status === status) &&
        (!q || `${i.id} ${i.title} ${i.barangay} ${i.owner} ${i.category}`.toLocaleLowerCase().includes(q)),
    );
  }, [module, query, records, severity, status]);
  const columns: DataTableColumn<QualityIssue>[] = [
    {
      key: "issue",
      header: "Quality issue",
      className: "ops-wide-cell",
      sortValue: (i) => i.title,
      cell: (i) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/insights/data-quality/${i.id}`}>
            {i.title}
          </Link>
          <strong>{i.id}</strong>
          <small>
            {i.category} · {i.barangay}
          </small>
        </div>
      ),
    },
    {
      key: "source",
      header: "Source module",
      sortValue: (i) => i.sourceModule,
      cell: (i) => (
        <>
          <strong>{i.sourceModule}</strong>
          <small>{i.owner}</small>
        </>
      ),
    },
    {
      key: "due",
      header: "Dates",
      sortValue: (i) => i.dueDate,
      cell: (i) => (
        <>
          <strong>Due {i.dueDate}</strong>
          <small>Detected {i.detectedAt}</small>
        </>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      sortValue: (i) => i.severity,
      cell: (i) => <StatusBadge tone={tone(i.severity)}>{i.severity}</StatusBadge>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (i) => i.status,
      cell: (i) => <StatusBadge tone={tone(i.status)}>{i.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (i) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${i.title}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/insights/data-quality/${i.id}`}>
                <Eye /> View issue
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/insights/data-quality/${i.id}/edit`}>
                <Pencil /> Edit issue
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {i.status === "Resolved" ? (
              <DropdownMenuItem
                onSelect={() => {
                  repository.setIssueStatus(i.id, "Reopened");
                  setRecords(repository.listIssues());
                  setNotice(`${i.id} was reopened.`);
                }}
              >
                <RefreshCcw /> Reopen issue
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() => {
                  repository.setIssueStatus(i.id, "Resolved", "Reviewed and resolved by the assigned record owner.");
                  setRecords(repository.listIssues());
                  setNotice(`${i.id} was resolved.`);
                }}
              >
                <CheckCircle2 /> Mark resolved
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Quality</h1>
          <p>
            Manage completeness, validity, freshness, duplication, and reconciliation issues across municipal records.
          </p>
        </div>
        <Button asChild>
          <Link href="/ops/insights/data-quality/new">
            <Plus /> New issue
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <AnalyticsSummary
        items={[
          {
            label: "Open issues",
            value: records.filter((i) => i.status !== "Resolved").length,
            detail: "requiring action",
            icon: CircleAlert,
          },
          {
            label: "Critical and high",
            value: records.filter((i) => i.status !== "Resolved" && ["Critical", "High"].includes(i.severity)).length,
            detail: "priority issues",
            icon: ShieldAlert,
          },
          {
            label: "In progress",
            value: records.filter((i) => i.status === "In progress").length,
            detail: "assigned reviews",
            icon: RefreshCcw,
          },
          {
            label: "Resolved",
            value: records.filter((i) => i.status === "Resolved").length,
            detail: "closed issues",
            icon: CheckCircle2,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Issue, barangay, owner, or category…" />
        <OpsFilter
          label="Source module"
          value={module}
          onChange={setModule}
          options={options(records.map((i) => i.sourceModule))}
        />
        <OpsFilter
          label="Severity"
          value={severity}
          onChange={setSeverity}
          options={options(records.map((i) => i.severity))}
        />
        <OpsFilter label="Status" value={status} onChange={setStatus} options={options(records.map((i) => i.status))} />
      </div>
      {rows.length ? (
        <DataTable columns={columns} rows={rows} getRowKey={(i) => i.id} summary={`${rows.length} quality issues`} />
      ) : (
        <Empty noun="quality issues" />
      )}
    </Access>
  );
}

export function ReportListView() {
  const [records, setRecords] = useState(() => repository.listReports());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState("");
  const [status, setStatus] = useState("");
  const [archiving, setArchiving] = useState<ReportDefinition>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.toLocaleLowerCase().trim();
    return records.filter(
      (i) =>
        (!category || i.category === category) &&
        (!frequency || i.frequency === frequency) &&
        (!status || i.status === status) &&
        (!q || `${i.id} ${i.title} ${i.owner} ${i.scope} ${i.fields.join(" ")}`.toLocaleLowerCase().includes(q)),
    );
  }, [category, frequency, query, records, status]);
  const columns: DataTableColumn<ReportDefinition>[] = [
    {
      key: "report",
      header: "Report",
      className: "ops-wide-cell",
      sortValue: (i) => i.title,
      cell: (i) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/reports/${i.id}`}>
            {i.title}
          </Link>
          <strong>{i.id}</strong>
          <small>
            {i.category} · {i.scope}
          </small>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (i) => i.owner,
      cell: (i) => (
        <>
          <strong>{i.owner}</strong>
          <small>{i.fields.length} selected fields</small>
        </>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      sortValue: (i) => i.frequency,
      cell: (i) => (
        <>
          <strong>{i.frequency}</strong>
          <small>{i.nextRun ? `Next ${i.nextRun}` : "No scheduled run"}</small>
        </>
      ),
    },
    {
      key: "lastRun",
      header: "Last generated",
      sortValue: (i) => i.lastRun,
      cell: (i) => <>{i.lastRun || "Not yet generated"}</>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (i) => i.status,
      cell: (i) => <StatusBadge tone={tone(i.status)}>{i.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (i) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${i.title}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/reports/${i.id}`}>
                <Eye /> View report
              </Link>
            </DropdownMenuItem>
            {i.status !== "Archived" && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/reports/${i.id}/edit`}>
                  <Pencil /> Edit definition
                </Link>
              </DropdownMenuItem>
            )}
            {i.status !== "Archived" && (
              <DropdownMenuItem
                onSelect={() => {
                  repository.runReport(i.id);
                  setRecords(repository.listReports());
                  setNotice(`${i.title} was generated.`);
                }}
              >
                <Play /> Generate report
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                const copy = repository.duplicateReport(i.id);
                setRecords(repository.listReports());
                if (copy) setNotice(`${copy.title} was created.`);
              }}
            >
              <FileBarChart /> Duplicate report
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {i.status === "Archived" ? (
              <DropdownMenuItem
                onSelect={() => {
                  repository.restoreReport(i.id);
                  setRecords(repository.listReports());
                  setNotice(`${i.title} was restored.`);
                }}
              >
                <RefreshCcw /> Restore report
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onSelect={() => setArchiving(i)}>
                <Archive /> Archive report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <Access municipalOnly>
      <div className="ops-topline">
        <div>
          <h1>Reports</h1>
          <p>
            Manage report definitions, schedules, responsible offices, selected fields, formats, and generation history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/insights/dashboards">
              <BarChart3 /> Graphical dashboard
            </Link>
          </Button>
          <Button asChild>
            <Link href="/ops/reports/new">
              <Plus /> New report
            </Link>
          </Button>
        </div>
      </div>
      <Notice text={notice} />
      <AnalyticsSummary
        items={[
          {
            label: "Active reports",
            value: records.filter((i) => i.status === "Active").length,
            detail: "available definitions",
            icon: FileBarChart,
          },
          {
            label: "Scheduled",
            value: records.filter((i) => i.status === "Active" && i.nextRun).length,
            detail: "upcoming runs",
            icon: Play,
          },
          {
            label: "Categories",
            value: new Set(records.filter((i) => i.status !== "Archived").map((i) => i.category)).size,
            detail: "report groups",
            icon: BarChart3,
          },
          {
            label: "Inactive",
            value: records.filter((i) => i.status === "Inactive").length,
            detail: "paused definitions",
            icon: Archive,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Report, owner, scope, or field…" />
        <OpsFilter
          label="Category"
          value={category}
          onChange={setCategory}
          options={options(records.map((i) => i.category))}
        />
        <OpsFilter
          label="Frequency"
          value={frequency}
          onChange={setFrequency}
          options={options(records.map((i) => i.frequency))}
        />
        <OpsFilter label="Status" value={status} onChange={setStatus} options={options(records.map((i) => i.status))} />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(i) => i.id}
          summary={`${rows.length} report definitions`}
        />
      ) : (
        <Empty noun="reports" />
      )}
      <ConfirmationDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive report?"
        description="The report definition will leave active reporting and remain available for restoration."
        confirmLabel="Archive report"
        destructive
        onConfirm={() => {
          if (!archiving) return;
          repository.archiveReport(archiving.id);
          setNotice(`${archiving.title} was archived.`);
          setArchiving(undefined);
          setRecords(repository.listReports());
        }}
      />
    </Access>
  );
}

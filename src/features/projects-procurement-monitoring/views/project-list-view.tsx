"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Archive,
  CircleDollarSign,
  ClipboardList,
  EllipsisVertical,
  Eye,
  Gauge,
  Pencil,
  Plus,
  SearchX,
  TriangleAlert,
} from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
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

export function ProjectListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => repository.list());
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [barangay, setBarangay] = useState("");
  const [office, setOffice] = useState("");
  const [archiving, setArchiving] = useState<ProjectRecord>();
  const [notice, setNotice] = useState("");
  const active = records.filter((item) => item.stage !== "archived");
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter(
      (item) =>
        (!stage || item.stage === stage) &&
        (!barangay || item.barangay === barangay) &&
        (!office || item.office === office) &&
        (!normalized ||
          `${item.id} ${item.title} ${item.scope} ${item.barangay} ${item.office} ${item.type} ${item.tags.join(" ")}`
            .toLocaleLowerCase()
            .includes(normalized)),
    );
  }, [barangay, office, query, records, stage]);
  const portfolioValue = active.reduce((sum, item) => sum + item.currentCostMinor, 0);
  const averageProgress = active.length
    ? Math.round(active.reduce((sum, item) => sum + item.physicalProgress, 0) / active.length)
    : 0;
  const actionCount = active.filter(
    (item) =>
      item.stage === "suspended" ||
      item.readiness.some((gate) => gate.mandatory && gate.state !== "complete") ||
      item.issues.some((issue) => issue.status !== "resolved"),
  ).length;

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
            {item.type} · {item.year}
          </small>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location and office",
      sortValue: (item) => item.barangay,
      cell: (item) => (
        <>
          <strong>{item.barangay}</strong>
          <small>{item.office}</small>
        </>
      ),
    },
    {
      key: "cost",
      header: "Contract value",
      sortValue: (item) => item.currentCostMinor,
      cell: (item) => (
        <>
          <strong>{formatProjectCurrency(item.currentCostMinor)}</strong>
          <small>
            {item.fundSources.length
              ? `${item.fundSources.length} fund source${item.fundSources.length === 1 ? "" : "s"}`
              : "Funding pending"}
          </small>
        </>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      sortValue: (item) => item.physicalProgress,
      cell: (item) => (
        <>
          <strong>{item.physicalProgress}% physical</strong>
          <small>
            {item.financialProgress}% financial · {item.elapsedProgress}% elapsed
          </small>
        </>
      ),
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
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.title}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/projects/${displayProjectReference(item.id)}`}>
                <Eye size={14} /> View project
              </Link>
            </DropdownMenuItem>
            {item.stage !== "archived" && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/projects/${displayProjectReference(item.id)}/edit`}>
                  <Pencil size={14} /> Edit project
                </Link>
              </DropdownMenuItem>
            )}
            {item.stage !== "archived" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setArchiving(item)}>
                  <Archive size={14} /> Archive project
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  if (role !== "municipal")
    return (
      <PermissionState
        title="Project delivery requires municipal access"
        description="Authorized municipal staff can manage projects, contracts, field progress, and completion."
      />
    );
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Projects</h1>
          <p>Manage project origins, funding, delivery status, responsible offices, and completion records.</p>
        </div>
        <Button asChild>
          <Link href="/ops/projects/new">
            <Plus /> New project
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ProjectSummaryCards
        label="Project portfolio totals"
        items={[
          { label: "Active projects", value: active.length, detail: "portfolio records", icon: ClipboardList },
          {
            label: "Portfolio value",
            value: formatProjectCurrency(portfolioValue),
            detail: "current cost",
            icon: CircleDollarSign,
          },
          { label: "Average progress", value: `${averageProgress}%`, detail: "physical", icon: Gauge },
          { label: "Needs action", value: actionCount, detail: "requirements or issues", icon: TriangleAlert },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Reference, project, location, office, or tag…" />
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
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          anyLabel="Any barangay"
          options={[...new Set(records.map((item) => item.barangay))].sort().map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Office"
          value={office}
          onChange={setOffice}
          anyLabel="Any office"
          options={[...new Set(records.map((item) => item.office))].sort().map((value) => ({ value, label: value }))}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          initialSort={{ key: "project", direction: "asc" }}
          summary={`${rows.length} project records`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title="No projects match these filters"
          description="Change the search, stage, barangay, or office filter."
        />
      )}
      <ConfirmationDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive project?"
        description="The project will leave the active portfolio and remain available as an archived record."
        confirmLabel="Archive project"
        destructive
        onConfirm={() => {
          if (!archiving) return;
          repository.archive(archiving.id);
          setNotice(`${displayProjectReference(archiving.id)} was archived.`);
          setArchiving(undefined);
          setRecords(repository.list());
        }}
      />
    </>
  );
}

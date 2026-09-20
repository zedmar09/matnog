"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Archive,
  CheckCircle2,
  ClipboardList,
  EllipsisVertical,
  Eye,
  FileClock,
  Layers3,
  Pencil,
  Plus,
  SearchX,
} from "lucide-react";

import { PlanningSummaryCards } from "@/features/development-planning/components/planning-summary-cards";
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

import { developmentPlanningRepository as repository } from "../services/development-planning-repository";
import { displayPlanningReference, planningStatusTone } from "../services/planning-presentation";
import type { MunicipalPlan } from "../types/development-planning";

export function MunicipalPlanListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => repository.listPlans());
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [archiving, setArchiving] = useState<MunicipalPlan>();
  const [notice, setNotice] = useState("");
  const statuses = useMemo(() => [...new Set(records.map((item) => item.approvalStatus))].sort(), [records]);
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter(
      (item) =>
        (!level || item.level === level) &&
        (!status || item.approvalStatus === status) &&
        (!normalized ||
          `${item.id} ${item.title} ${item.fiscalYears} ${item.version}`.toLocaleLowerCase().includes(normalized)),
    );
  }, [level, query, records, status]);
  const totals = records.reduce(
    (value, item) => ({
      approved: value.approved + (item.approvalStatus === "Approved" ? 1 : 0),
      review: value.review + (item.approvalStatus === "Under review" ? 1 : 0),
      items: value.items + item.itemReferences.length,
    }),
    { approved: 0, review: 0, items: 0 },
  );
  const columns: DataTableColumn<MunicipalPlan>[] = [
    {
      key: "plan",
      header: "Municipal plan",
      className: "ops-wide-cell",
      sortValue: (item) => item.title,
      cell: (item) => (
        <>
          <Link className="registry-member-link" href={`/ops/planning/plans/${displayPlanningReference(item.id)}`}>
            {displayPlanningReference(item.id)}
          </Link>
          <strong>{item.title}</strong>
        </>
      ),
    },
    {
      key: "level",
      header: "Level and period",
      sortValue: (item) => item.level,
      cell: (item) => (
        <>
          <strong>{item.level}</strong>
          <small>{item.fiscalYears}</small>
        </>
      ),
    },
    {
      key: "version",
      header: "Version",
      sortValue: (item) => item.version,
      cell: (item) => (
        <>
          <strong>{item.version}</strong>
          <small>{item.previousVersion ? `From ${item.previousVersion}` : "Initial version"}</small>
        </>
      ),
    },
    {
      key: "items",
      header: "Items",
      sortValue: (item) => item.itemReferences.length,
      cell: (item) => `${item.itemReferences.length} proposals`,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (item) => item.approvalStatus,
      cell: (item) => <StatusBadge tone={planningStatusTone(item.approvalStatus)}>{item.approvalStatus}</StatusBadge>,
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
              <Link href={`/ops/planning/plans/${displayPlanningReference(item.id)}`}>
                <Eye size={14} /> View plan
              </Link>
            </DropdownMenuItem>
            {item.approvalStatus !== "Archived" && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/planning/plans/${displayPlanningReference(item.id)}/edit`}>
                  <Pencil size={14} /> Edit plan
                </Link>
              </DropdownMenuItem>
            )}
            {item.approvalStatus !== "Archived" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setArchiving(item)}>
                  <Archive size={14} /> Archive plan
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
        title="Municipal plans require municipal access"
        description="Authorized municipal planning staff can maintain CDP, LDIP, and AIP records."
      />
    );
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Municipal Plans</h1>
          <p>Manage the CDP, LDIP, and AIP hierarchy, versions, proposal links, and approval status.</p>
        </div>
        <Button asChild>
          <Link href="/ops/planning/plans/new">
            <Plus /> New municipal plan
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <PlanningSummaryCards
        label="Municipal plan totals"
        items={[
          { label: "All plans", value: records.length, detail: "records", icon: ClipboardList },
          { label: "Approved", value: totals.approved, detail: "active plans", icon: CheckCircle2 },
          { label: "Under review", value: totals.review, detail: "awaiting decision", icon: FileClock },
          { label: "Linked items", value: totals.items, detail: "proposal references", icon: Layers3 },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Reference, title, fiscal year, or version…" />
        <OpsFilter
          label="Plan level"
          value={level}
          onChange={setLevel}
          anyLabel="Any level"
          options={["CDP", "LDIP", "AIP"].map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={statuses.map((value) => ({ value, label: value }))}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          initialSort={{ key: "level", direction: "asc" }}
          summary={`${rows.length} municipal plans`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title="No municipal plans match these filters"
          description="Change the search, plan level, or status filter."
        />
      )}
      <ConfirmationDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive municipal plan?"
        description="The plan will leave active planning views and remain available as an archived record."
        confirmLabel="Archive plan"
        destructive
        onConfirm={() => {
          if (!archiving) return;
          repository.archivePlan(archiving.id);
          setNotice(`${displayPlanningReference(archiving.id)} was archived.`);
          setArchiving(undefined);
          setRecords(repository.listPlans());
        }}
      />
    </>
  );
}

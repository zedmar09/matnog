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
  Pencil,
  Plus,
  SearchX,
  Send,
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
import type { BarangayPlan } from "../types/development-planning";

export function BarangayPlanListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => repository.listBarangayPlans());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [archiving, setArchiving] = useState<BarangayPlan>();
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter(
      (record) =>
        (!status || record.status === status) &&
        (!normalized ||
          `${record.id} ${record.title} ${record.barangay} ${record.priorities.join(" ")}`
            .toLocaleLowerCase()
            .includes(normalized)),
    );
  }, [query, records, status]);

  const totals = records.reduce(
    (summary, record) => ({
      submitted: summary.submitted + (record.status === "Submitted" ? 1 : 0),
      reviewed: summary.reviewed + (record.status === "Reviewed" ? 1 : 0),
      correction: summary.correction + (record.status === "For correction" ? 1 : 0),
      draft: summary.draft + (record.status === "Draft" ? 1 : 0),
    }),
    { submitted: 0, reviewed: 0, correction: 0, draft: 0 },
  );

  function submit(plan: BarangayPlan) {
    repository.transitionBarangayPlan(plan.id, "Submitted");
    setRecords(repository.listBarangayPlans());
    setNotice(`${displayPlanningReference(plan.id)} was submitted for municipal review.`);
  }

  function archive() {
    if (!archiving) return;
    repository.archiveBarangayPlan(archiving.id);
    setNotice(`${displayPlanningReference(archiving.id)} was archived.`);
    setArchiving(undefined);
    setRecords(repository.listBarangayPlans());
  }

  const columns: DataTableColumn<BarangayPlan>[] = [
    {
      key: "reference",
      header: "Plan",
      sortValue: (record) => record.id,
      cell: (record) => (
        <>
          <Link
            className="registry-member-link"
            href={`/ops/planning/barangay-plans/${displayPlanningReference(record.id)}`}
          >
            {displayPlanningReference(record.id)}
          </Link>
          <small>{record.title}</small>
        </>
      ),
    },
    {
      key: "barangay",
      header: "Barangay",
      sortValue: (record) => record.barangay,
      cell: (record) => <strong>{record.barangay}</strong>,
    },
    {
      key: "priorities",
      header: "Development priorities",
      className: "ops-wide-cell",
      sortValue: (record) => record.priorities.length,
      cell: (record) => (
        <>
          <strong>{record.priorities.at(0)}</strong>
          <small>{record.priorities.length} priorities recorded</small>
        </>
      ),
    },
    {
      key: "minutes",
      header: "BDC minutes",
      sortValue: (record) => record.councilMinutesReference ?? "",
      cell: (record) => displayPlanningReference(record.councilMinutesReference ?? undefined),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (record) => record.status,
      cell: (record) => <StatusBadge tone={planningStatusTone(record.status)}>{record.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (record) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${record.title}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/planning/barangay-plans/${displayPlanningReference(record.id)}`}>
                <Eye size={14} /> View plan
              </Link>
            </DropdownMenuItem>
            {record.status !== "Archived" && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/planning/barangay-plans/${displayPlanningReference(record.id)}/edit`}>
                  <Pencil size={14} /> Edit plan
                </Link>
              </DropdownMenuItem>
            )}
            {record.status === "Draft" && (
              <DropdownMenuItem onSelect={() => submit(record)}>
                <Send size={14} /> Submit for review
              </DropdownMenuItem>
            )}
            {record.status !== "Archived" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setArchiving(record)}>
                  <Archive size={14} /> Archive plan
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (!role || !["municipal", "barangay"].includes(role))
    return (
      <PermissionState
        title="Barangay plans require planning access"
        description="These records are available to authorized municipal and barangay staff."
      />
    );

  const filtering = Boolean(query || status);
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Barangay Plans</h1>
          <p>Manage Barangay Development Council priorities, minutes, submissions, and municipal review status.</p>
        </div>
        <Button asChild>
          <Link href="/ops/planning/barangay-plans/new">
            <Plus /> New barangay plan
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <PlanningSummaryCards
        label="Barangay plan totals"
        items={[
          { label: "All plans", value: records.length, detail: "records", icon: ClipboardList },
          { label: "Submitted", value: totals.submitted, detail: "awaiting review", icon: Send },
          { label: "Reviewed", value: totals.reviewed, detail: "completed", icon: CheckCircle2 },
          {
            label: "Needs action",
            value: totals.correction + totals.draft,
            detail: "draft or correction",
            icon: FileClock,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Reference, title, barangay, or priority…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={["Draft", "Submitted", "For correction", "Reviewed", "Archived"].map((value) => ({
            value,
            label: value,
          }))}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(record) => record.id}
          initialSort={{ key: "barangay", direction: "asc" }}
          summary={`${rows.length} barangay plans`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title={filtering ? "No barangay plans match these filters" : "No barangay plans recorded"}
          description={
            filtering ? "Change the search or status filter." : "Create the first barangay development plan."
          }
        />
      )}
      <ConfirmationDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive barangay plan?"
        description="The plan will leave the active planning workflow and remain available as an archived record."
        confirmLabel="Archive plan"
        destructive
        onConfirm={archive}
      />
    </>
  );
}

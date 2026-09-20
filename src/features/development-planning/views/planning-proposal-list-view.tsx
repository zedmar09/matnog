"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Archive,
  CircleDollarSign,
  ClipboardCheck,
  EllipsisVertical,
  Eye,
  FileClock,
  Pencil,
  Plus,
  SearchX,
  Trophy,
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
import {
  displayPlanningReference,
  formatPlanningCurrency,
  proposalStatusLabel,
  proposalStatusTone,
} from "../services/planning-presentation";
import type { PlanningProposal, PlanningStatus } from "../types/development-planning";

const STATUSES: PlanningStatus[] = [
  "draft",
  "for-correction",
  "under-review",
  "prioritized",
  "deferred",
  "approved-unfunded",
  "project-linked",
  "archived",
];

export function PlanningProposalListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => repository.listProposals());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [barangay, setBarangay] = useState("");
  const [archiving, setArchiving] = useState<PlanningProposal>();
  const [notice, setNotice] = useState("");
  const barangays = useMemo(() => [...new Set(records.map((item) => item.barangay))].sort(), [records]);
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter(
      (record) =>
        (!status || record.status === status) &&
        (!barangay || record.barangay === barangay) &&
        (!normalized ||
          `${record.id} ${record.problem} ${record.location} ${record.sourceOffice} ${record.tags.join(" ")}`
            .toLocaleLowerCase()
            .includes(normalized)),
    );
  }, [barangay, query, records, status]);
  const totals = records.reduce(
    (value, item) => ({
      review: value.review + (item.status === "under-review" ? 1 : 0),
      selected: value.selected + (["prioritized", "approved-unfunded", "project-linked"].includes(item.status) ? 1 : 0),
      action: value.action + (["draft", "for-correction", "deferred"].includes(item.status) ? 1 : 0),
      amount: value.amount + (item.status !== "archived" ? item.estimateMinor : 0),
    }),
    { review: 0, selected: 0, action: 0, amount: 0 },
  );

  function transition(record: PlanningProposal, next: PlanningStatus, message: string) {
    repository.transition(record.id, next, message);
    setRecords(repository.listProposals());
    setNotice(
      `${displayPlanningReference(record.id)} was updated to ${proposalStatusLabel(next).toLocaleLowerCase()}.`,
    );
  }
  const columns: DataTableColumn<PlanningProposal>[] = [
    {
      key: "proposal",
      header: "Proposal",
      className: "ops-wide-cell",
      sortValue: (item) => item.problem,
      cell: (item) => (
        <>
          <Link className="registry-member-link" href={`/ops/planning/proposals/${displayPlanningReference(item.id)}`}>
            {displayPlanningReference(item.id)}
          </Link>
          <strong>{item.problem}</strong>
          <small>{item.location}</small>
        </>
      ),
    },
    {
      key: "source",
      header: "Source",
      sortValue: (item) => item.barangay,
      cell: (item) => (
        <>
          <strong>{item.barangay}</strong>
          <small>{item.sourceOffice}</small>
        </>
      ),
    },
    {
      key: "reach",
      header: "Cost and reach",
      sortValue: (item) => item.estimateMinor,
      cell: (item) => (
        <>
          <strong>{formatPlanningCurrency(item.estimateMinor)}</strong>
          <small>{item.beneficiaries.toLocaleString()} beneficiaries</small>
        </>
      ),
    },
    {
      key: "score",
      header: "Score",
      sortValue: (item) => item.score,
      cell: (item) => (item.score ? <strong>{item.score}</strong> : <span className="muted">Pending</span>),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (item) => item.status,
      cell: (item) => (
        <StatusBadge tone={proposalStatusTone(item.status)}>{proposalStatusLabel(item.status)}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${displayPlanningReference(item.id)}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/planning/proposals/${displayPlanningReference(item.id)}`}>
                <Eye size={14} /> View proposal
              </Link>
            </DropdownMenuItem>
            {item.status !== "archived" && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/planning/proposals/${displayPlanningReference(item.id)}/edit`}>
                  <Pencil size={14} /> Edit proposal
                </Link>
              </DropdownMenuItem>
            )}
            {role === "municipal" && item.status !== "archived" && (
              <>
                <DropdownMenuItem
                  onSelect={() =>
                    transition(item, "prioritized", "Prioritized through the municipal development review.")
                  }
                >
                  <Trophy size={14} /> Prioritize
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => transition(item, "deferred", "Deferred for a later planning and funding cycle.")}
                >
                  <FileClock size={14} /> Defer
                </DropdownMenuItem>
              </>
            )}
            {item.status !== "archived" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setArchiving(item)}>
                  <Archive size={14} /> Archive proposal
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
        title="Development proposals require planning access"
        description="These records are available to authorized municipal and barangay staff."
      />
    );
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Proposals</h1>
          <p>Review community needs, evidence, estimated cost, beneficiaries, and planning decisions.</p>
        </div>
        <Button asChild>
          <Link href="/ops/planning/proposals/new">
            <Plus /> New proposal
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <PlanningSummaryCards
        label="Proposal totals"
        items={[
          { label: "All proposals", value: records.length, detail: "records", icon: ClipboardCheck },
          { label: "Under review", value: totals.review, detail: "awaiting decision", icon: FileClock },
          { label: "Selected", value: totals.selected, detail: "prioritized or linked", icon: Trophy },
          {
            label: "Active value",
            value: formatPlanningCurrency(totals.amount),
            detail: "estimated",
            icon: CircleDollarSign,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Reference, problem, location, office, or tag…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={STATUSES.map((value) => ({ value, label: proposalStatusLabel(value) }))}
        />
        <OpsFilter
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          anyLabel="Any barangay"
          options={barangays.map((value) => ({ value, label: value }))}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          initialSort={{ key: "score", direction: "desc" }}
          summary={`${rows.length} development proposals`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title="No proposals match these filters"
          description="Change the search, status, or barangay filter."
        />
      )}
      <ConfirmationDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive proposal?"
        description="The proposal will leave active planning views and remain available as an archived record."
        confirmLabel="Archive proposal"
        destructive
        onConfirm={() => {
          if (!archiving) return;
          repository.archiveProposal(archiving.id);
          setNotice(`${displayPlanningReference(archiving.id)} was archived.`);
          setArchiving(undefined);
          setRecords(repository.listProposals());
        }}
      />
    </>
  );
}

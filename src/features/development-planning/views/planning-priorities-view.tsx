"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { BarChart3, CircleDollarSign, Eye, SearchX, Trophy, Users } from "lucide-react";

import { PlanningSummaryCards } from "@/features/development-planning/components/planning-summary-cards";
import { ContentPanel } from "@/shared/components/content-panel";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { developmentPlanningRepository as repository } from "../services/development-planning-repository";
import {
  displayPlanningReference,
  formatPlanningCurrency,
  proposalStatusLabel,
  proposalStatusTone,
} from "../services/planning-presentation";
import type { PlanningProposal } from "../types/development-planning";

export function PlanningPrioritiesView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => repository.listProposals());
  const [query, setQuery] = useState("");
  const [barangay, setBarangay] = useState("");
  const [notice, setNotice] = useState("");
  const eligible = records.filter((item) => item.status !== "archived");
  const barangays = [...new Set(eligible.map((item) => item.barangay))].sort();
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records
      .filter(
        (item) =>
          item.status !== "archived" &&
          (!barangay || item.barangay === barangay) &&
          (!normalized ||
            `${item.id} ${item.problem} ${item.location} ${item.barangay}`.toLocaleLowerCase().includes(normalized)),
      )
      .sort((a, b) => b.score - a.score);
  }, [barangay, query, records]);
  const totalValue = eligible.reduce((sum, item) => sum + item.estimateMinor, 0);
  const totalReach = eligible.reduce((sum, item) => sum + item.beneficiaries, 0);
  const scored = eligible.filter((item) => item.score > 0).length;
  const selected = eligible.filter((item) =>
    ["prioritized", "approved-unfunded", "project-linked"].includes(item.status),
  ).length;
  function prioritize(item: PlanningProposal) {
    repository.transition(item.id, "prioritized", "Prioritized through the municipal development review.");
    setRecords(repository.listProposals());
    setNotice(`${displayPlanningReference(item.id)} was prioritized.`);
  }
  const columns: DataTableColumn<PlanningProposal>[] = [
    {
      key: "rank",
      header: "Rank",
      sortValue: (item) => item.score,
      cell: (item) => (item.score ? <strong>#{rows.findIndex((row) => row.id === item.id) + 1}</strong> : "—"),
    },
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
          <small>
            {item.barangay} · {item.location}
          </small>
        </>
      ),
    },
    {
      key: "reach",
      header: "Reach",
      sortValue: (item) => item.beneficiaries,
      cell: (item) => `${item.beneficiaries.toLocaleString()} people`,
    },
    {
      key: "estimate",
      header: "Estimate",
      sortValue: (item) => item.estimateMinor,
      cell: (item) => formatPlanningCurrency(item.estimateMinor),
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
        <div className="flex justify-end gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/ops/planning/proposals/${displayPlanningReference(item.id)}`}>
              <Eye /> Open
            </Link>
          </Button>
          {item.status !== "prioritized" && (
            <Button className="!text-primary-foreground min-w-20" size="sm" onClick={() => prioritize(item)}>
              Prioritize
            </Button>
          )}
        </div>
      ),
    },
  ];
  if (role !== "municipal")
    return (
      <PermissionState
        title="Prioritization requires municipal access"
        description="Authorized municipal planning staff can compare and rank development proposals."
      />
    );
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Priorities</h1>
          <p>Compare reviewed proposals using need, reach, readiness, policy alignment, and recorded evidence.</p>
        </div>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <PlanningSummaryCards
        label="Prioritization totals"
        items={[
          { label: "Scored proposals", value: scored, detail: "ready to compare", icon: BarChart3 },
          { label: "Selected", value: selected, detail: "prioritized or linked", icon: Trophy },
          { label: "Service reach", value: totalReach.toLocaleString(), detail: "beneficiaries", icon: Users },
          {
            label: "Portfolio value",
            value: formatPlanningCurrency(totalValue),
            detail: "estimated",
            icon: CircleDollarSign,
          },
        ]}
      />
      <ContentPanel as="section" className="!p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow">Scoring framework</span>
            <h2>Municipal development criteria</h2>
            <p className="muted mt-2">
              Each proposal records its scoring version so rankings remain traceable when criteria change.
            </p>
          </div>
          <StatusBadge tone="pending">MPDO-2026-v2</StatusBadge>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Need", "35%"],
            ["Reach", "20%"],
            ["Readiness", "25%"],
            ["Policy alignment", "20%"],
          ].map(([label, value]) => (
            <div
              className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5"
              key={label}
            >
              <span className="truncate text-muted-foreground text-sm">{label}</span>
              <strong className="shrink-0 text-sm">{value}</strong>
            </div>
          ))}
        </div>
      </ContentPanel>
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Reference, problem, location, or barangay…" />
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
          summary={`${rows.length} proposals compared`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title="No proposals match these filters"
          description="Change the search or barangay filter."
        />
      )}
    </>
  );
}

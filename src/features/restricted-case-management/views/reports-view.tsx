"use client";

import { useState } from "react";

import { BarChart3, SearchX } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localRestrictedCaseRepository as repository } from "../services/local-restricted-case-repository";
import type { CaseReportRow } from "../types/restricted-case";

export function ReportsView() {
  const { role } = useWorkspaceSession();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("September 2026");
  const [scope, setScope] = useState("Municipality of Matnog");
  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Case reports are not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );
  const data = repository.reportingProjection(scope || "All authorized scopes", period || "All reporting periods");
  const query = search.trim().toLocaleLowerCase();
  const rows = data.filter(
    (item) => !query || `${item.label} ${item.period} ${item.scope}`.toLocaleLowerCase().includes(query),
  );
  const columns: DataTableColumn<CaseReportRow>[] = [
    {
      key: "category",
      header: "Case category",
      sortValue: (row) => row.label,
      cell: (row) => <strong>{row.label}</strong>,
    },
    {
      key: "count",
      header: "Recorded cases",
      sortValue: (row) => (typeof row.count === "number" ? row.count : -1),
      cell: (row) => (row.count === "Suppressed" ? <StatusBadge tone="neutral">Suppressed</StatusBadge> : row.count),
    },
    { key: "period", header: "Reporting period", sortValue: (row) => row.period, cell: (row) => row.period },
    { key: "scope", header: "Scope", sortValue: (row) => row.scope, cell: (row) => row.scope },
  ];
  function reset() {
    setSearch("");
    setPeriod("September 2026");
    setScope("Municipality of Matnog");
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Reports</h1>
          <p>Review sanitized case totals by category, reporting period, and municipal or barangay scope.</p>
        </div>
      </div>
      <div className="ops-controls">
        <OpsSearch value={search} onChange={setSearch} placeholder="Case category, period, or scope…" />
        <OpsFilter
          label="Period"
          value={period}
          onChange={setPeriod}
          anyLabel="Any period"
          width={210}
          options={["September 2026", "August 2026", "Third quarter 2026"].map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Scope"
          value={scope}
          onChange={setScope}
          anyLabel="Any scope"
          width={230}
          options={["Municipality of Matnog", "Poblacion", "Camcaman", "Calintaan", "Pawa", "Gadgaron", "Laboy"].map(
            (value) => ({ value, label: value }),
          )}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.label}
          pageSize={10}
          initialSort={{ key: "category", direction: "asc" }}
          summary={`${rows.length} reporting categories`}
        />
      ) : (
        <EmptyState
          icon={search ? SearchX : BarChart3}
          title="No report rows match your filters."
          description="Adjust the reporting filters."
          action={
            <Button variant="outline" onClick={reset}>
              Reset filters
            </Button>
          }
        />
      )}
    </>
  );
}

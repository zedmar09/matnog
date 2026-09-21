"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Home,
  HousePlus,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  SearchX,
  UsersRound,
} from "lucide-react";

import { DataTable } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useDemoNow } from "@/shared/hooks/use-demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { HOUSEHOLDS } from "../data/households";
import { useRegistryActor } from "../hooks/use-registry-actor";
import { canEditRegistry } from "../services/registry-projections";
import { isStale, listHouseholds } from "../services/registry-repository";
import type { Household, Structure } from "../types/registry";

type Row = { household: Household; structure?: Structure; memberCount: number };

const GRID_SIZE = 9;
const INCOME_BRACKETS = [...new Set(HOUSEHOLDS.map((item) => item.socioeconomic.incomeBracket))];
const LIVELIHOODS = [...new Set(HOUSEHOLDS.map((item) => item.socioeconomic.livelihood))];
/** Only unrestricted indicators are offered as a filter. */
const VULNERABILITIES = [
  ...new Map(
    HOUSEHOLDS.flatMap((item) => item.vulnerabilityFlags)
      .filter((flag) => !flag.restricted)
      .map((flag) => [flag.id, flag] as const),
  ).values(),
];

export function HouseholdDirectoryView() {
  const actor = useRegistryActor();
  const { scenario, generation } = useWorkspaceSession();
  useDemoNow();
  const [search, setSearch] = useState("");
  const [verification, setVerification] = useState("");
  const [income, setIncome] = useState("");
  const [livelihood, setLivelihood] = useState("");
  const [vulnerability, setVulnerability] = useState("");
  const [status, setStatus] = useState("");
  const [presentation, setPresentation] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<RepositoryResult<Row[]> | null>(null);

  // A reset can leave the role (and therefore the actor) unchanged while the
  // fixtures and demo clock have been restored, so `generation` is carried as
  // an explicit refetch trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate refetch trigger.
  useEffect(() => {
    if (!actor) return;
    let active = true;
    setResult(null);
    void listHouseholds(actor, { search, includeClosed: true }, scenario).then((next) => {
      if (active) setResult(next);
    });
    return () => {
      active = false;
    };
  }, [actor, search, scenario, generation]);

  const base = result?.kind === "success" ? result.data : [];
  const rows = base.filter((row) => {
    const closed = Boolean(row.household.closure);
    // Closed households stay out of the directory unless explicitly asked for.
    if (status === "closed" ? !closed : closed) return false;
    const overdue = isStale(row.household);
    if (verification === "verified" && overdue) return false;
    if (verification === "overdue" && !overdue) return false;
    if (income && row.household.socioeconomic.incomeBracket !== income) return false;
    if (livelihood && row.household.socioeconomic.livelihood !== livelihood) return false;
    if (vulnerability) {
      const flag = row.household.vulnerabilityFlags.find((item) => item.id === vulnerability);
      if (flag?.value !== "yes") return false;
    }
    return true;
  });
  const filtered = Boolean(search || verification || income || livelihood || vulnerability || status);
  const pageCount = Math.max(1, Math.ceil(rows.length / GRID_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = rows.slice((currentPage - 1) * GRID_SIZE, currentPage * GRID_SIZE);

  function reset() {
    setSearch("");
    setStatus("");
    setVerification("");
    setIncome("");
    setLivelihood("");
    setVulnerability("");
    setPage(1);
  }

  if (!actor) {
    return (
      <PermissionState
        title="The registry is not part of this workspace"
        description="The tourism partner role has no household registry access."
        action={
          <Button asChild variant="outline">
            <Link href="/ops">Back to workspace overview</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Households</h1>
          <p>
            Households are groups of residents at a structure. One structure can hold several households, and each keeps
            its own membership and verification date.
          </p>
        </div>
        {canEditRegistry(actor) && (
          <Button asChild>
            <Link href="/ops/households/new">
              <HousePlus />
              Add household
            </Link>
          </Button>
        )}
      </div>

      <div className="ops-controls">
        <OpsSearch value={search} onChange={setSearch} placeholder="Household, address, or purok…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Active households"
          width={180}
          options={[{ value: "closed", label: "Closed households" }]}
        />
        <OpsFilter
          label="Verification"
          value={verification}
          onChange={setVerification}
          anyLabel="Any verification state"
          options={[
            { value: "verified", label: "Verified" },
            { value: "overdue", label: "Verification overdue" },
          ]}
        />
        <OpsFilter
          label="Income bracket"
          value={income}
          onChange={setIncome}
          anyLabel="Any income bracket"
          width={230}
          options={INCOME_BRACKETS.map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Livelihood"
          value={livelihood}
          onChange={setLivelihood}
          anyLabel="Any livelihood"
          width={230}
          options={LIVELIHOODS.map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Vulnerability"
          value={vulnerability}
          onChange={setVulnerability}
          anyLabel="Any vulnerability"
          width={230}
          options={VULNERABILITIES.map((flag) => ({ value: flag.id, label: flag.label }))}
        />
      </div>

      <div className="registry-view-toggle">
        <Button
          type="button"
          size="sm"
          variant={presentation === "list" ? "default" : "outline"}
          onClick={() => setPresentation("list")}
        >
          <List /> List view
        </Button>
        <Button
          type="button"
          size="sm"
          variant={presentation === "grid" ? "default" : "outline"}
          onClick={() => setPresentation("grid")}
        >
          <LayoutGrid /> Grid view
        </Button>
      </div>

      {result === null ? (
        <LoadingState label="Loading households" message="Loading the household directory…" />
      ) : result.kind === "denied" ? (
        <PermissionState description={result.message} />
      ) : result.kind === "failure" ? (
        <ErrorState onRetry={() => setSearch((value) => value)} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={filtered ? SearchX : Home}
          title={
            status === "closed"
              ? "No closed households."
              : filtered
                ? "No households match your filters."
                : "No households in scope."
          }
          description={
            filtered ? "Adjust the search or clear the filters." : "This demo role has no assigned households."
          }
          action={
            <Button variant="outline" onClick={reset}>
              Reset filters
            </Button>
          }
        />
      ) : presentation === "list" ? (
        <DataTable
          columns={[
            {
              key: "household",
              header: "Household",
              sortValue: (row) => row.household.envelope.scope.label,
              cell: (row) => (
                <Link className="registry-member-link" href={`/ops/households/${row.household.envelope.id}`}>
                  {row.household.envelope.scope.label}
                </Link>
              ),
            },
            {
              key: "id",
              header: "Household ID",
              sortValue: (row) => row.household.envelope.id,
              cell: (row) => row.household.envelope.id,
            },
            {
              key: "address",
              header: "Address",
              sortValue: (row) => row.structure?.street ?? "",
              cell: (row) =>
                row.structure
                  ? `${row.structure.houseNumber} ${row.structure.street}, ${[row.structure.sitio, row.structure.purok].filter(Boolean).join(", ")}`
                  : "No address recorded",
            },
            {
              key: "members",
              header: "Members",
              className: "ops-numeric-cell",
              sortValue: (row) => row.memberCount,
              cell: (row) => row.memberCount,
            },
            {
              key: "verified",
              header: "Verification",
              className: "ops-status-cell",
              sortValue: (row) => row.household.lastVerifiedAt ?? "",
              cell: (row) =>
                row.household.closure ? (
                  <StatusBadge tone="neutral">Closed</StatusBadge>
                ) : (
                  <StatusBadge tone={isStale(row.household) ? "warning" : "success"}>
                    {isStale(row.household) ? "Verification overdue" : "Verified"}
                  </StatusBadge>
                ),
            },
            {
              key: "actions",
              header: "Actions",
              headerHidden: true,
              cell: (row) => {
                const id = row.household.envelope.id;
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${id}`}>
                      <EllipsisVertical size={16} aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="ops-row-menu-content">
                      <DropdownMenuItem asChild>
                        <Link href={`/ops/households/${id}`}>
                          <UsersRound size={14} aria-hidden="true" />
                          Open record
                        </Link>
                      </DropdownMenuItem>
                      {canEditRegistry(actor) && !row.household.closure ? (
                        <DropdownMenuItem asChild>
                          <Link href={`/ops/households/${id}/edit`}>
                            <Pencil size={14} aria-hidden="true" />
                            Edit household
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              },
            },
          ]}
          rows={rows}
          getRowKey={(row) => row.household.envelope.id}
          summary={`${rows.length} ${rows.length === 1 ? "household" : "households"} in your assigned scope`}
        />
      ) : (
        <>
          <div className="registry-household-grid">
            {paged.map((row) => (
              <Link
                key={row.household.envelope.id}
                href={`/ops/households/${row.household.envelope.id}`}
                className="registry-household-card"
              >
                <div className="registry-household-top">
                  <strong>{row.household.envelope.scope.label}</strong>
                  {row.household.closure ? (
                    <StatusBadge tone="neutral">Closed</StatusBadge>
                  ) : (
                    <StatusBadge tone={isStale(row.household) ? "warning" : "success"}>
                      {isStale(row.household) ? "Verification overdue" : "Verified"}
                    </StatusBadge>
                  )}
                </div>
                <p>
                  {row.household.envelope.id} · {row.memberCount} current {row.memberCount === 1 ? "member" : "members"}
                </p>
                {row.structure && (
                  <small>
                    <MapPin size={13} aria-hidden="true" />
                    {row.structure.houseNumber} {row.structure.street},{" "}
                    {[row.structure.sitio, row.structure.purok].filter(Boolean).join(", ")},{" "}
                    {row.structure.barangay.label}
                  </small>
                )}
                <span className="registry-household-foot">Last verified {row.household.lastVerifiedAt ?? "never"}</span>
              </Link>
            ))}
          </div>
          <div className="ops-table-foot">
            <p className="ops-table-summary">
              Showing {(currentPage - 1) * GRID_SIZE + 1}–{Math.min(currentPage * GRID_SIZE, rows.length)} of{" "}
              {rows.length}
            </p>
            <nav className="ops-pagination" aria-label="Household pages">
              <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft size={15} aria-hidden="true" />
                <span className="sr-only">Previous page</span>
              </button>
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount}>
                <ChevronRight size={15} aria-hidden="true" />
                <span className="sr-only">Next page</span>
              </button>
            </nav>
          </div>
        </>
      )}
    </>
  );
}

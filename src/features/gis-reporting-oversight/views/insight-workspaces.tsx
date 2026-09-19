"use client";

import { type ReactNode, useState } from "react";

import Link from "next/link";

import { BarChart3, DatabaseZap, FileBarChart, FileQuestion, MapPinned, ShieldAlert } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { DataTable } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { FormField } from "@/shared/components/form-field";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import {
  BARANGAY_SCORECARDS,
  DATA_QUALITY_ISSUES,
  INSIGHT_METRICS,
  INSIGHT_SNAPSHOTS,
  MAP_LAYERS,
  REPORT_DEFINITION,
} from "../data/insight-fixtures";

function OversightBoundary({ children, municipalOnly = false }: { children: ReactNode; municipalOnly?: boolean }) {
  const { role, scenario, setScenario } = useWorkspaceSession();
  const permitted = role === "municipal" || (!municipalOnly && role === "barangay");
  if (!permitted || scenario === "denied")
    return (
      <PermissionState
        title="Oversight workspace unavailable"
        description="Choose an authorized municipal or barangay demo role. Restricted source details are never exposed through this workspace."
      />
    );
  if (scenario === "slow") return <LoadingState label="Loading dated insight projection…" />;
  if (scenario === "error")
    return (
      <ErrorState
        title="Insight projection could not load"
        description="The local source projection failed. No analytics or export service was called."
        onRetry={() => setScenario("normal")}
      />
    );
  if (scenario === "empty")
    return (
      <EmptyState
        icon={FileQuestion}
        headingLevel="h1"
        title="No permitted insight rows"
        description="The selected sample scope contains no available projection. This is not interpreted as zero."
      />
    );
  return children;
}

function WorkspaceHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="ops-topline">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function InsightsOverviewView() {
  const [snapshotId, setSnapshotId] = useState("current");
  const [scope, setScope] = useState("municipality");
  const snapshot = INSIGHT_SNAPSHOTS.find((item) => item.id === snapshotId) ?? INSIGHT_SNAPSHOTS[0];
  return (
    <OversightBoundary>
      <WorkspaceHeader
        eyebrow="M15 · Scoped municipal insight"
        title="Municipal insights"
        description="Read dated cross-module projections with visible definitions, coverage and owning-module links."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/ops/insights/maps">Maps</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ops/insights/barangays">Barangays</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ops/insights/data-quality">Data quality</Link>
            </Button>
          </div>
        }
      />
      <NoticePanel className="mb-6">
        Missing coverage stays unavailable or partial and is never silently converted to zero. M10 contributes sanitized
        aggregates only.
      </NoticePanel>
      <ContentPanel as="section" className="mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="insight-snapshot" label="Reproducible snapshot">
            {(field) => (
              <NativeSelect {...field} value={snapshotId} onChange={(event) => setSnapshotId(event.target.value)}>
                {INSIGHT_SNAPSHOTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="insight-scope" label="Geographic scope">
            {(field) => (
              <NativeSelect {...field} value={scope} onChange={(event) => setScope(event.target.value)}>
                <option value="municipality">Municipality</option>
                <option value="barangay-a">Demo Barangay A</option>
                <option value="barangay-b">Demo Barangay B · partial</option>
              </NativeSelect>
            )}
          </FormField>
        </div>
        <p className="muted mt-4 text-sm">
          As of {snapshot.asOf} · {snapshot.coverage} · selected scope {scope.replaceAll("-", " ")}
        </p>
      </ContentPanel>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {INSIGHT_METRICS.map((metric) => {
          const scopedValue =
            scope === "barangay-a"
              ? metric.barangayAValue
              : scope === "barangay-b"
                ? metric.barangayBValue
                : snapshotId === "prior"
                  ? metric.priorValue
                  : metric.value;
          const displayedValue =
            scope !== "municipality" && snapshotId === "prior" ? `${scopedValue} · retained` : scopedValue;
          return (
            <ContentPanel as="article" key={metric.id}>
              <div className="flex items-start justify-between gap-3">
                <BarChart3 className="text-primary" aria-hidden="true" />
                <StatusBadge tone={metric.value === "Suppressed" ? "warning" : "neutral"}>
                  {metric.coverage}
                </StatusBadge>
              </div>
              <h2 className="mt-4 text-base">{metric.label}</h2>
              <p className="mt-2 font-bold text-3xl">{displayedValue}</p>
              <p className="muted mt-1 text-sm">{metric.comparison}</p>
              <PanelDivider />
              <p className="text-sm">
                <strong>Definition:</strong> {metric.definition}
              </p>
              <p className="muted mt-2 text-sm">{metric.source}</p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href={metric.owningRoute}>Open permitted source</Link>
              </Button>
            </ContentPanel>
          );
        })}
      </div>
    </OversightBoundary>
  );
}

export function InsightMapsView() {
  const [layerId, setLayerId] = useState("businesses");
  const [scope, setScope] = useState("municipality");
  const layer = MAP_LAYERS.find((item) => item.id === layerId) ?? MAP_LAYERS[0];
  return (
    <OversightBoundary>
      <WorkspaceHeader
        eyebrow="M15 · Geographic projection"
        title="Map and accessible list"
        description="Choose one disclosure-safe layer; the list carries the same records and meaning as the visual placeholder."
      />
      <NoticePanel className="mb-6">
        No live tiles, household coordinates or restricted case locations are loaded. Map failure never removes the
        equivalent list.
      </NoticePanel>
      <ContentPanel as="section" className="mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="insight-layer" label="Map layer">
            {(field) => (
              <NativeSelect {...field} value={layerId} onChange={(event) => setLayerId(event.target.value)}>
                {MAP_LAYERS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="insight-map-scope" label="Geographic scope">
            {(field) => (
              <NativeSelect {...field} value={scope} onChange={(event) => setScope(event.target.value)}>
                <option value="municipality">Municipality</option>
                <option value="barangay-a">Demo Barangay A</option>
                <option value="barangay-b">Demo Barangay B</option>
              </NativeSelect>
            )}
          </FormField>
        </div>
      </ContentPanel>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,.9fr)]">
        <ContentPanel className="grid min-h-96 place-items-center text-center">
          <div>
            <MapPinned className="mx-auto size-12 text-primary" />
            <h2 className="mt-4">{layer.label} layer</h2>
            <p className="muted mt-2">
              Nongeographic local placeholder · {layer.count} visible · {scope.replaceAll("-", " ")}
            </p>
          </div>
        </ContentPanel>
        <ContentPanel as="section">
          <span className="eyebrow">Equivalent record list</span>
          <h2 className="mt-1">{layer.label}</h2>
          <article className="mt-5 rounded-lg border p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <strong>{layer.source}</strong>
              <StatusBadge tone="neutral">{layer.count}</StatusBadge>
            </div>
            <p className="muted mt-3 text-sm">{layer.privacy}</p>
          </article>
          <PanelDivider />
          <p className="text-sm">
            This list remains usable when the visual map is unavailable, at large text sizes, or with assistive
            technology.
          </p>
        </ContentPanel>
      </div>
    </OversightBoundary>
  );
}

export function BarangayScorecardsView() {
  return (
    <OversightBoundary>
      <WorkspaceHeader
        eyebrow="M15 · Contextual comparison"
        title="Barangay scorecards"
        description="Compare freshness and coverage only when denominators and scope are known."
      />
      <NoticePanel className="mb-6">
        Scorecards are operational follow-up aids, not rankings. Unavailable turnaround is not displayed as zero.
      </NoticePanel>
      <div className="grid gap-5 lg:grid-cols-2">
        {BARANGAY_SCORECARDS.map((item) => (
          <ContentPanel as="article" key={item.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="eyebrow">{item.id}</span>
                <h2 className="mt-1">{item.name}</h2>
              </div>
              <StatusBadge tone={item.readiness === "On track" ? "success" : "warning"}>{item.readiness}</StatusBadge>
            </div>
            <dl className="registry-facts mt-5">
              <div>
                <dt>Registry completeness</dt>
                <dd>{item.completeness}</dd>
              </div>
              <div>
                <dt>Freshness</dt>
                <dd>{item.freshness}</dd>
              </div>
              <div>
                <dt>Service turnaround</dt>
                <dd>{item.turnaround}</dd>
              </div>
              <div>
                <dt>Plan submission</dt>
                <dd>{item.planSubmission}</dd>
              </div>
              <div>
                <dt>Capacity gap</dt>
                <dd>{item.capacityGap}</dd>
              </div>
              <div>
                <dt>Follow-up</dt>
                <dd>{item.followUp}</dd>
              </div>
            </dl>
            <Button asChild variant="outline" className="mt-5">
              <Link href={`/ops/insights/barangays?selected=${item.id}`}>Open permitted follow-up</Link>
            </Button>
          </ContentPanel>
        ))}
      </div>
    </OversightBoundary>
  );
}

export function ReportsView() {
  return (
    <OversightBoundary municipalOnly>
      <WorkspaceHeader
        eyebrow="M15 · Controlled definitions"
        title="Saved reports"
        description="Review allowed fields, snapshot lineage and local schedule status before opening a report."
        action={
          <Button asChild>
            <Link href="/ops/reports/builder">Build sample report</Link>
          </Button>
        }
      />
      <ContentPanel as="article">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <span className="eyebrow">{REPORT_DEFINITION.id}</span>
            <h2 className="mt-1">{REPORT_DEFINITION.title}</h2>
          </div>
          <StatusBadge tone="warning">schedule paused</StatusBadge>
        </div>
        <p className="muted mt-3">{REPORT_DEFINITION.description}</p>
        <p className="mt-4 text-sm">{REPORT_DEFINITION.schedule}</p>
        <Button asChild variant="outline" className="mt-5">
          <Link href={`/ops/reports/${REPORT_DEFINITION.id}`}>Open retained snapshot</Link>
        </Button>
      </ContentPanel>
    </OversightBoundary>
  );
}

export function ReportBuilderView() {
  const [selected, setSelected] = useState<string[]>(["Metric", "Value", "Coverage"]);
  const [grouping, setGrouping] = useState("No grouping");
  const [scope, setScope] = useState("Municipality");
  const [snapshot, setSnapshot] = useState("current");
  const [schedule, setSchedule] = useState("Paused local sample");
  const [prepared, setPrepared] = useState(false);
  return (
    <OversightBoundary municipalOnly>
      <WorkspaceHeader
        eyebrow="M15 · Allowed-field builder"
        title="Build a sample report"
        description="Choose only disclosure-safe fields and preview suppression before a local export."
      />
      <NoticePanel className="mb-6">
        This builder has no unrestricted query language, scheduled delivery or live export service.
      </NoticePanel>
      <div className="grid gap-6 xl:grid-cols-2">
        <ContentPanel as="section">
          <h2>Allowed fields</h2>
          <div className="mt-4 grid gap-3">
            {REPORT_DEFINITION.allowedFields.map((field) => (
              <label className="flex items-center gap-3 rounded-lg border p-3" key={field}>
                <input
                  type="checkbox"
                  checked={selected.includes(field)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(field) ? current.filter((item) => item !== field) : [...current, field],
                    )
                  }
                />
                {field}
              </label>
            ))}
          </div>
          <PanelDivider />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 font-medium text-sm">
              Grouping
              <NativeSelect value={grouping} onChange={(event) => setGrouping(event.target.value)}>
                {REPORT_DEFINITION.allowedGroupings.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
            </label>
            <label className="grid gap-2 font-medium text-sm">
              Scope
              <NativeSelect value={scope} onChange={(event) => setScope(event.target.value)}>
                <option>Municipality</option>
                <option>Demo Barangay A</option>
                <option>Demo Barangay B · partial</option>
              </NativeSelect>
            </label>
            <label className="grid gap-2 font-medium text-sm">
              Snapshot / period
              <NativeSelect value={snapshot} onChange={(event) => setSnapshot(event.target.value)}>
                {INSIGHT_SNAPSHOTS.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="grid gap-2 font-medium text-sm">
              Sample schedule
              <NativeSelect value={schedule} onChange={(event) => setSchedule(event.target.value)}>
                <option>Paused local sample</option>
                <option>Monthly preview · no delivery</option>
                <option>One-time preview · no delivery</option>
              </NativeSelect>
            </label>
          </div>
          <PanelDivider />
          <h3 className="text-base">Unavailable sensitive fields</h3>
          <p className="muted mt-2 text-sm">{REPORT_DEFINITION.blockedFields.join(" · ")}</p>
          <Button className="mt-5" disabled={selected.length === 0} onClick={() => setPrepared(true)}>
            Prepare local sample export
          </Button>
          {prepared && (
            <NoticePanel className="mt-4">
              Watermarked preview prepared for {scope}, grouped by {grouping.toLowerCase()}, from {snapshot};{" "}
              {schedule.toLowerCase()}. No file was delivered.
            </NoticePanel>
          )}
        </ContentPanel>
        <ContentPanel as="section">
          <h2>Preview</h2>
          <p className="muted mt-2 text-sm">
            {selected.length} allowed fields · {grouping} · {scope} · suppressed groups remain suppressed in every
            format.
          </p>
          <div className="mt-4 grid gap-3">
            {INSIGHT_METRICS.slice(0, 3).map((metric) => (
              <article className="rounded-lg border p-3" key={metric.id}>
                <strong>{metric.label}</strong>
                <p className="mt-1">{metric.value}</p>
                <p className="muted text-sm">{metric.coverage}</p>
              </article>
            ))}
          </div>
        </ContentPanel>
      </div>
    </OversightBoundary>
  );
}

export function ReportDetailView({ reportId }: { reportId: string }) {
  const [prepared, setPrepared] = useState(false);
  if (reportId.toUpperCase() !== REPORT_DEFINITION.id)
    return (
      <OversightBoundary municipalOnly>
        <EmptyState
          icon={FileQuestion}
          headingLevel="h1"
          title="Report unavailable"
          description="The saved report definition was not found."
          action={
            <Button asChild>
              <Link href="/ops/reports">Return to reports</Link>
            </Button>
          }
        />
      </OversightBoundary>
    );
  return (
    <OversightBoundary municipalOnly>
      <WorkspaceHeader
        eyebrow="M15 · Reproducible snapshot"
        title={REPORT_DEFINITION.title}
        description={`${REPORT_DEFINITION.id} · ${INSIGHT_SNAPSHOTS[0].asOf}`}
      />
      <NoticePanel className="mb-6">
        Small cells, restricted fields and missing coverage use the same projection in cards, table and sample export.
      </NoticePanel>
      <ContentPanel as="section">
        <h2>Accessible data table</h2>
        <DataTable
          columns={[
            { key: "label", header: "Metric", sortValue: (row) => row.label, cell: (row) => row.label },
            { key: "value", header: "Value", cell: (row) => row.value },
            { key: "coverage", header: "Coverage", sortValue: (row) => row.coverage, cell: (row) => row.coverage },
            { key: "source", header: "Source", sortValue: (row) => row.source, cell: (row) => row.source },
          ]}
          rows={REPORT_DEFINITION.rows}
          getRowKey={(row) => row.id}
        />
        <Button className="mt-5" variant="outline" onClick={() => setPrepared(true)}>
          <FileBarChart /> Prepare watermarked sample export
        </Button>
        {prepared && (
          <NoticePanel className="mt-4">
            Watermarked local export preview prepared from {INSIGHT_SNAPSHOTS[0].id}. Suppressed and blocked fields
            remain excluded.
          </NoticePanel>
        )}
      </ContentPanel>
    </OversightBoundary>
  );
}

export function DataQualityView() {
  const [assigned, setAssigned] = useState<string[]>([]);
  return (
    <OversightBoundary>
      <WorkspaceHeader
        eyebrow="M15 · Source quality"
        title="Coverage and validation issues"
        description="Keep stale, missing and duplicate-like source conditions visible before interpreting a metric."
      />
      <div className="grid gap-4">
        {DATA_QUALITY_ISSUES.map((issue) => (
          <ContentPanel as="article" key={issue.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex items-start gap-3">
                {issue.severity === "warning" ? (
                  <ShieldAlert className="text-warning" />
                ) : (
                  <DatabaseZap className="text-primary" />
                )}
                <div>
                  <span className="eyebrow">
                    {issue.source} · {issue.id}
                  </span>
                  <h2 className="mt-1 text-base">{issue.title}</h2>
                </div>
              </div>
              <StatusBadge tone={issue.severity === "warning" ? "warning" : "neutral"}>{issue.severity}</StatusBadge>
            </div>
            <p className="muted mt-3">{issue.detail}</p>
            <Button
              className="mt-4"
              variant="outline"
              disabled={assigned.includes(issue.id)}
              onClick={() => setAssigned((current) => [...current, issue.id])}
            >
              {assigned.includes(issue.id) ? "Follow-up assigned" : "Assign local follow-up"}
            </Button>
          </ContentPanel>
        ))}
      </div>
    </OversightBoundary>
  );
}

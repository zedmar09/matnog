"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { BarChart3, FileBarChart, LayoutDashboard, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useOptionalWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { ReportDashboardWidget } from "../components/report-dashboard-widget";
import { readDashboardLayout, saveDashboardLayout } from "../services/report-dashboard-layout";
import { defaultDashboardWidgets, loadDashboardSources } from "../services/report-dashboard-sources";
import type { DashboardAudience, DashboardSource, DashboardWidget } from "../types/report-dashboard";

const AUDIENCE: Record<DashboardAudience, { title: string; description: string }> = {
  public: {
    title: "Public information dashboard",
    description: "Explore published Matnog notices, disclosures, and project updates through simple charts.",
  },
  municipal: {
    title: "Municipal dashboard",
    description: "Review registry, service, project, tourism, and data quality indicators across the municipality.",
  },
  barangay: {
    title: "Barangay dashboard",
    description: "Follow your barangay's registry coverage, assigned surveys, and local quality issues.",
  },
  partner: {
    title: "Tourism partner dashboard",
    description: "Track your operator's trips, manifested passengers, and active maritime advisories.",
  },
  enumerator: {
    title: "Field Surveyor dashboard",
    description: "Review your assigned surveys, capture progress, and records that need attention.",
  },
};

export function ReportDashboardView() {
  const workspace = useOptionalWorkspaceSession();
  const role = workspace?.role ?? "public";
  const ready = workspace?.ready ?? true;
  const [sources, setSources] = useState<DashboardSource[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("All");
  const loadRequest = useRef(0);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setError("");
    setCatalogFilter("All");
    try {
      const available = await loadDashboardSources(role);
      if (request !== loadRequest.current) return;
      setSources(available);
      setWidgets(readDashboardLayout(role, available) ?? defaultDashboardWidgets(role, available));
    } catch {
      if (request === loadRequest.current) setError("The dashboard sources could not be loaded. Try again.");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (ready) void load();
    return () => {
      loadRequest.current += 1;
    };
  }, [ready, load]);

  const save = (next: DashboardWidget[], message: string) => {
    setWidgets(next);
    setNotice(
      saveDashboardLayout(role, next) ? message : "Layout changed for this session. Browser storage is unavailable.",
    );
  };

  const sourceById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);
  const selected = new Set(widgets.map((widget) => widget.sourceId));
  const sections = ["All", ...new Set(sources.map((source) => source.section))];
  const available = sources.filter(
    (source) => !selected.has(source.id) && (catalogFilter === "All" || source.section === catalogFilter),
  );

  function move(from: number, to: number) {
    if (to < 0 || to >= widgets.length) return;
    save(arrayMove(widgets, from, to), "Dashboard order saved.");
  }

  function onDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = widgets.findIndex((widget) => widget.sourceId === event.active.id);
    const to = widgets.findIndex((widget) => widget.sourceId === event.over?.id);
    if (from >= 0 && to >= 0) move(from, to);
  }

  if (!ready || loading) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-muted-foreground" role="status">
        Loading your graphical dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border bg-card p-8">
        <h1 className="text-xl">Dashboard unavailable</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">Analytics · graphical reports</span>
          <h1>{AUDIENCE[role].title}</h1>
          <p>{AUDIENCE[role].description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role === "municipal" && (
            <Button asChild variant="outline">
              <Link href="/ops/reports">
                <FileBarChart /> Manage reports
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => save(defaultDashboardWidgets(role, sources), "Default dashboard restored.")}
          >
            <RotateCcw /> Reset layout
          </Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          <LayoutDashboard className="text-primary" size={17} />
          <strong>{`${widgets.length} ${widgets.length === 1 ? "chart" : "charts"} on your dashboard`}</strong>
        </span>
        <span className="text-muted-foreground">
          Drag a chart handle to arrange it. Use arrow buttons for keyboard access. Layout saves in this browser for{" "}
          this dashboard.
        </span>
      </div>
      {notice && (
        <div className="registry-save-notice mb-5" role="status">
          {notice}
        </div>
      )}

      <section aria-labelledby="my-charts-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <span className="eyebrow">My dashboard</span>
            <h2 id="my-charts-heading" className="text-xl">
              Graphical reports
            </h2>
          </div>
        </div>
        {widgets.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={widgets.map((widget) => widget.sourceId)} strategy={rectSortingStrategy}>
              <div className="grid gap-4 lg:grid-cols-2">
                {widgets.map((widget, index) => {
                  const source = sourceById.get(widget.sourceId);
                  if (!source) return null;
                  return (
                    <ReportDashboardWidget
                      key={widget.sourceId}
                      source={source}
                      widget={widget}
                      index={index}
                      count={widgets.length}
                      onChange={(next) =>
                        save(
                          widgets.map((item) => (item.sourceId === widget.sourceId ? next : item)),
                          "Chart settings saved.",
                        )
                      }
                      onRemove={() =>
                        save(
                          widgets.filter((item) => item.sourceId !== widget.sourceId),
                          "Chart removed from dashboard.",
                        )
                      }
                      onMove={(direction) => move(index, index + direction)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed bg-muted/15 p-8 text-center">
            <div>
              <BarChart3 className="mx-auto text-primary" />
              <strong className="mt-3 block">Your dashboard is empty</strong>
              <p className="mt-1 text-muted-foreground text-sm">
                Choose a graphical report below to start building it.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="add-chart-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="eyebrow">Available to your role</span>
            <h2 id="add-chart-heading" className="text-xl">
              Add graphical reports
            </h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Each chart uses the same local records as its linked operational module.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            Section{" "}
            <select
              className="h-9 rounded-lg border bg-card px-3"
              value={catalogFilter}
              onChange={(event) => setCatalogFilter(event.target.value)}
            >
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </label>
        </div>
        {available.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {available.map((source) => (
              <article className="rounded-xl border bg-card p-4" key={source.id}>
                <span className="font-semibold text-primary text-xs uppercase tracking-wide">{source.section}</span>
                <h3 className="mt-1 font-semibold">{source.title}</h3>
                <p className="mt-1 min-h-10 text-muted-foreground text-sm">{source.description}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
                  <span>{source.scope}</span>
                  <span>Snapshot: {source.asOf}</span>
                </div>
                {source.reportTitle && (
                  <p className="mt-2 rounded-md bg-primary/5 px-2 py-1.5 text-primary text-xs">
                    Saved report: {source.reportTitle}
                  </p>
                )}
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    save(
                      [...widgets, { sourceId: source.id, chartType: source.chartTypes[0], width: "half" }],
                      `${source.title} added to your dashboard.`,
                    )
                  }
                >
                  <Plus /> Add chart
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/15 p-6 text-center text-muted-foreground text-sm">
            All graphical reports in this section are already on your dashboard.
          </div>
        )}
      </section>
    </>
  );
}

"use client";

import Link from "next/link";

import { useSortable } from "@dnd-kit/sortable";
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Maximize2, Minimize2, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

import type { DashboardSource, DashboardWidget } from "../types/report-dashboard";
import { ReportDashboardChart } from "./report-dashboard-chart";

const CHART_LABELS = { bar: "Bar", line: "Line", pie: "Donut" } as const;

export function ReportDashboardWidget({
  source,
  widget,
  onChange,
  onRemove,
  onMove,
  index,
  count,
}: {
  source: DashboardSource;
  widget: DashboardWidget;
  onChange: (next: DashboardWidget) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  index: number;
  count: number;
}) {
  const sortable = useSortable({ id: widget.sourceId });
  return (
    <article
      ref={sortable.setNodeRef}
      style={{
        transform: sortable.transform
          ? `translate3d(${sortable.transform.x}px, ${sortable.transform.y}px, 0)`
          : undefined,
        transition: sortable.transition,
      }}
      className={`min-w-0 rounded-2xl border bg-card p-5 shadow-sm ${widget.width === "full" ? "lg:col-span-2" : ""} ${sortable.isDragging ? "z-20 ring-2 ring-primary/40" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2">
          <button
            type="button"
            className="mt-0.5 flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
            aria-label={`Drag ${source.title} to rearrange`}
            {...sortable.attributes}
            {...sortable.listeners}
          >
            <GripVertical size={17} />
          </button>
          <div className="min-w-0">
            <span className="font-semibold text-primary text-xs uppercase tracking-wide">{source.section}</span>
            <h2 className="mt-1 text-lg">{source.title}</h2>
            <p className="mt-1 text-muted-foreground text-sm">{source.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Select
            value={widget.chartType}
            onValueChange={(chartType) => onChange({ ...widget, chartType: chartType as DashboardWidget["chartType"] })}
          >
            <SelectTrigger size="sm" aria-label={`Chart type for ${source.title}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {source.chartTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {CHART_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={widget.width === "full" ? `Make ${source.title} half width` : `Make ${source.title} full width`}
            onClick={() => onChange({ ...widget, width: widget.width === "full" ? "half" : "full" })}
          >
            {widget.width === "full" ? <Minimize2 /> : <Maximize2 />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Move ${source.title} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Move ${source.title} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Remove ${source.title}`} onClick={onRemove}>
            <X />
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-muted/15 px-2 py-3 sm:px-4">
        <ReportDashboardChart source={source} chartType={widget.chartType} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
        <span>
          Scope: {source.scope} · Snapshot: {source.asOf}
        </span>
        <Link
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          href={source.reportId ? `/ops/reports/${source.reportId}` : source.href}
        >
          {source.reportId ? "Open report" : "Open records"} <ExternalLink size={13} />
        </Link>
      </div>
      <details className="mt-3 border-t pt-3 text-sm">
        <summary className="cursor-pointer font-medium text-muted-foreground">View chart data</summary>
        <div className="mt-2 max-h-48 overflow-auto rounded-lg border">
          <table className="w-full text-left">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2">Group</th>
                <th className="px-3 py-2 text-right">{source.unit}</th>
              </tr>
            </thead>
            <tbody>
              {source.points.map((point) => (
                <tr className="border-t" key={point.label}>
                  <td className="px-3 py-2">{point.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{point.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}

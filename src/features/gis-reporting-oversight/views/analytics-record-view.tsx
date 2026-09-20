"use client";

import { useState } from "react";

import Link from "next/link";

import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Database,
  Eye,
  FileBarChart,
  FileText,
  Layers3,
  MapPinned,
  Pencil,
  Play,
  RefreshCcw,
  ShieldAlert,
  Tag,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { FactGrid, History, RecordHero } from "../components/analytics-ui";
import { analyticsRepository as repository } from "../services/analytics-repository";
import type { AnalyticsRecordKind } from "../types/analytics";

const destinations: Record<AnalyticsRecordKind, string> = {
  barangay: "/ops/insights/barangays",
  layer: "/ops/insights/maps",
  quality: "/ops/insights/data-quality",
  report: "/ops/reports",
};
function statusTone(value: string): StatusTone {
  if (["Active", "Resolved"].includes(value)) return "success";
  if (value === "Critical") return "destructive";
  if (["High", "Open", "Archived"].includes(value)) return "warning";
  return "neutral";
}

export function AnalyticsRecordView({ kind, recordId }: { kind: AnalyticsRecordKind; recordId: string }) {
  const { role } = useWorkspaceSession();
  const [, refresh] = useState(0);
  const [notice, setNotice] = useState("");
  const barangay = kind === "barangay" ? repository.findBarangay(recordId) : undefined;
  const layer = kind === "layer" ? repository.findLayer(recordId) : undefined;
  const issue = kind === "quality" ? repository.findIssue(recordId) : undefined;
  const report = kind === "report" ? repository.findReport(recordId) : undefined;
  const record = barangay ?? layer ?? issue ?? report;
  const destination = destinations[kind];
  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Analytics record unavailable"
        description="Authorized staff can view analytics records within their assigned scope."
      />
    );
  if (!record)
    return (
      <EmptyState
        icon={FileText}
        headingLevel="h1"
        title="Analytics record unavailable"
        description="The requested record could not be found."
        action={
          <Button asChild variant="outline">
            <Link href={destination}>Return to records</Link>
          </Button>
        }
      />
    );
  const update = (message: string) => {
    setNotice(message);
    refresh((v) => v + 1);
  };
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href={destination}>
            <ArrowLeft size={15} />
            {kind === "layer" ? "Map" : kind === "quality" ? "Quality" : kind === "report" ? "Reports" : "Barangays"}
          </Link>
          <h1>{barangay?.name ?? layer?.name ?? issue?.title ?? report?.title}</h1>
          <p>{record.id} · Municipal analytics record</p>
        </div>
        {role === "municipal" && (
          <Button asChild variant="outline">
            <Link href={`${destination}/${record.id}/edit`}>
              <Pencil /> Edit record
            </Link>
          </Button>
        )}
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      {barangay && (
        <div className="space-y-6">
          <RecordHero
            icon={UsersRound}
            eyebrow="Barangay analytics profile"
            title={barangay.name}
            description={`Current population, household coverage, service performance, and follow-up information for ${barangay.name}.`}
            status={barangay.status}
            tone={statusTone(barangay.status)}
            value={`${barangay.registryCompleteness}%`}
            valueLabel="Registry completeness"
          />
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Barangay indicators">
            <Indicator
              label="Population"
              value={barangay.population.toLocaleString()}
              detail="official profile value"
              icon={UsersRound}
            />
            <Indicator
              label="Households"
              value={barangay.households.toLocaleString()}
              detail="registered households"
              icon={Building2}
            />
            <Indicator
              label="Turnaround"
              value={`${barangay.serviceTurnaround.toFixed(1)} days`}
              detail="average service time"
              icon={BarChart3}
            />
            <Indicator
              label="Coverage target"
              value={`${barangay.target}%`}
              detail={`${Math.max(0, barangay.target - barangay.registryCompleteness)} points remaining`}
              icon={Target}
            />
          </section>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <ContentPanel as="section">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">Profile and ownership</span>
                  <h2>Barangay information</h2>
                </div>
                <StatusBadge tone={statusTone(barangay.status)}>{barangay.status}</StatusBadge>
              </div>
              <div className="mt-5">
                <FactGrid
                  items={[
                    { label: "PSGC code", value: barangay.psgcCode, icon: Tag },
                    { label: "Classification", value: barangay.classification, icon: MapPinned },
                    { label: "Responsible staff", value: barangay.owner, icon: UserRound },
                    { label: "Last submission", value: barangay.lastSubmission, icon: CalendarDays },
                  ]}
                />
              </div>
              <div className="mt-5 rounded-xl border bg-primary/5 p-4">
                <div className="flex justify-between gap-3">
                  <strong>Coverage progress</strong>
                  <span>
                    {barangay.registryCompleteness}% of {barangay.target}% target
                  </span>
                </div>
                <Progress className="mt-3" value={barangay.registryCompleteness} />
              </div>
              <div className="mt-5 rounded-xl border p-4">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Current follow-up
                </span>
                <p className="mt-2 leading-relaxed">{barangay.followUp || "No follow-up recorded."}</p>
              </div>
            </ContentPanel>
            <History entries={barangay.history} />
          </div>
        </div>
      )}
      {layer && (
        <div className="space-y-6">
          <RecordHero
            icon={MapPinned}
            eyebrow="Geographic data layer"
            title={layer.name}
            description={layer.description}
            status={layer.status}
            tone={statusTone(layer.status)}
            value={layer.recordCount.toLocaleString()}
            valueLabel="Mapped records"
          />
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <ContentPanel as="section">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">Configuration</span>
                  <h2>Layer information</h2>
                </div>
                <StatusBadge
                  tone={
                    layer.visibility === "Public"
                      ? "success"
                      : layer.visibility === "Restricted"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {layer.visibility}
                </StatusBadge>
              </div>
              <div className="mt-5">
                <FactGrid
                  items={[
                    { label: "Category", value: layer.category, icon: Layers3 },
                    { label: "Source module", value: layer.sourceModule, icon: Database },
                    { label: "Geographic scope", value: layer.scope, icon: MapPinned },
                    { label: "Responsible office", value: layer.owner, icon: Building2 },
                    { label: "Last updated", value: layer.lastUpdated, icon: CalendarDays },
                    { label: "Visibility", value: layer.visibility, icon: Eye },
                  ]}
                />
              </div>
              {role === "municipal" && layer.status !== "Archived" && (
                <div className="mt-5 flex flex-wrap gap-3 border-t pt-5">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const changed = repository.toggleLayer(layer.id);
                      if (changed) update(`${layer.name} is now ${changed.status.toLocaleLowerCase()}.`);
                    }}
                  >
                    <RefreshCcw /> {layer.status === "Active" ? "Disable layer" : "Enable layer"}
                  </Button>
                </div>
              )}
            </ContentPanel>
            <History entries={layer.history} />
          </div>
        </div>
      )}
      {issue && (
        <div className="space-y-6">
          <RecordHero
            icon={ShieldAlert}
            eyebrow="Data quality issue"
            title={issue.title}
            description={issue.description}
            status={issue.status}
            tone={statusTone(issue.status)}
            value={issue.severity}
            valueLabel="Severity"
          />
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <ContentPanel as="section">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">Assignment and deadline</span>
                  <h2>Issue information</h2>
                </div>
                <StatusBadge tone={statusTone(issue.severity)}>{issue.severity}</StatusBadge>
              </div>
              <div className="mt-5">
                <FactGrid
                  items={[
                    { label: "Source module", value: issue.sourceModule, icon: Database },
                    { label: "Category", value: issue.category, icon: Tag },
                    { label: "Affected scope", value: issue.barangay, icon: MapPinned },
                    { label: "Assigned owner", value: issue.owner, icon: UserRound },
                    { label: "Detected", value: issue.detectedAt, icon: CalendarDays },
                    { label: "Due date", value: issue.dueDate, icon: Target },
                  ]}
                />
              </div>
              <div className="mt-5 rounded-xl border p-4">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Resolution</span>
                <p className="mt-2 leading-relaxed">{issue.resolution || "Resolution has not been recorded."}</p>
              </div>
              {role === "municipal" && (
                <div className="mt-5 flex flex-wrap gap-3 border-t pt-5">
                  {issue.status === "Resolved" ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        repository.setIssueStatus(issue.id, "Reopened");
                        update(`${issue.id} was reopened.`);
                      }}
                    >
                      <RefreshCcw /> Reopen issue
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        repository.setIssueStatus(
                          issue.id,
                          "Resolved",
                          "Reviewed and resolved by the assigned record owner.",
                        );
                        update(`${issue.id} was resolved.`);
                      }}
                    >
                      <CheckCircle2 /> Mark resolved
                    </Button>
                  )}
                </div>
              )}
            </ContentPanel>
            <History entries={issue.history} />
          </div>
        </div>
      )}
      {report && (
        <div className="space-y-6">
          <RecordHero
            icon={FileBarChart}
            eyebrow="Report definition"
            title={report.title}
            description={report.description}
            status={report.status}
            tone={statusTone(report.status)}
            value={report.frequency}
            valueLabel="Generation schedule"
          />
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <ContentPanel as="section">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">Definition and schedule</span>
                  <h2>Report configuration</h2>
                </div>
                <StatusBadge tone={statusTone(report.status)}>{report.status}</StatusBadge>
              </div>
              <div className="mt-5">
                <FactGrid
                  items={[
                    { label: "Category", value: report.category, icon: Tag },
                    { label: "Responsible office", value: report.owner, icon: Building2 },
                    { label: "Scope", value: report.scope, icon: MapPinned },
                    { label: "Primary grouping", value: report.grouping, icon: BarChart3 },
                    { label: "Output format", value: report.format, icon: FileText },
                    { label: "Next run", value: report.nextRun || "Not scheduled", icon: CalendarDays },
                  ]}
                />
              </div>
              <div className="mt-5 rounded-xl border p-4">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Included fields
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {report.fields.map((field) => (
                    <StatusBadge key={field} tone="neutral">
                      {field}
                    </StatusBadge>
                  ))}
                </div>
              </div>
              {role === "municipal" && report.status !== "Archived" && (
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-5">
                  <Button
                    onClick={() => {
                      const generated = repository.runReport(report.id);
                      if (generated) update(`${report.title} was generated on ${generated.lastRun}.`);
                    }}
                  >
                    <Play /> Generate report
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    Last generated: {report.lastRun || "Not yet generated"}
                  </span>
                </div>
              )}
            </ContentPanel>
            <History entries={report.history} />
          </div>
        </div>
      )}
    </>
  );
}

function Indicator({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon size={16} />
        </span>
        <span className="font-semibold text-xs uppercase tracking-wide">{label}</span>
      </div>
      <strong className="mt-4 block text-2xl tracking-tight">{value}</strong>
      <small className="mt-1 block text-muted-foreground">{detail}</small>
    </div>
  );
}

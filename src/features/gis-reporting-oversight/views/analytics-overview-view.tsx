"use client";

import Link from "next/link";

import {
  BarChart3,
  CheckCircle2,
  CircleAlert,
  FileBarChart,
  Layers3,
  MapPinned,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { AnalyticsSummary } from "../components/analytics-ui";
import { analyticsRepository as repository } from "../services/analytics-repository";
import type { QualityIssue } from "../types/analytics";

export function AnalyticsOverviewView() {
  const { role } = useWorkspaceSession();
  const barangays = repository.listBarangays().filter((item) => item.status === "Active");
  const layers = repository.listLayers().filter((item) => item.status === "Active");
  const issues = repository.listIssues();
  const reports = repository.listReports().filter((item) => item.status === "Active");
  const openIssues = issues.filter((item) => item.status !== "Resolved");
  const averageCoverage = Math.round(
    barangays.reduce((sum, item) => sum + item.registryCompleteness, 0) / barangays.length,
  );
  const issueColumns: DataTableColumn<QualityIssue>[] = [
    {
      key: "issue",
      header: "Priority issue",
      className: "ops-wide-cell",
      sortValue: (item) => item.title,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/insights/data-quality/${item.id}`}>
            {item.title}
          </Link>
          <strong>{item.sourceModule}</strong>
          <small>
            {item.id} · {item.barangay}
          </small>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (item) => item.owner,
      cell: (item) => (
        <>
          <strong>{item.owner}</strong>
          <small>Due {item.dueDate}</small>
        </>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      sortValue: (item) => item.severity,
      cell: (item) => (
        <StatusBadge
          tone={item.severity === "Critical" ? "destructive" : item.severity === "High" ? "warning" : "neutral"}
        >
          {item.severity}
        </StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (item) => item.status,
      cell: (item) => (
        <StatusBadge tone={item.status === "Resolved" ? "success" : item.status === "Open" ? "warning" : "pending"}>
          {item.status}
        </StatusBadge>
      ),
    },
  ];
  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Analytics workspace unavailable"
        description="Authorized municipal and barangay staff can review municipal indicators within their assigned scope."
      />
    );
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Analytics overview</h1>
          <p>
            Review municipal coverage, operational quality, geographic data, and scheduled reporting from one workspace.
          </p>
        </div>
        <Button asChild>
          <Link href="/ops/reports/new">
            <FileBarChart /> New report
          </Link>
        </Button>
      </div>
      <AnalyticsSummary
        items={[
          {
            label: "Registry coverage",
            value: `${averageCoverage}%`,
            detail: "average completeness",
            icon: UsersRound,
          },
          { label: "Active map layers", value: layers.length, detail: "available datasets", icon: MapPinned },
          { label: "Open quality issues", value: openIssues.length, detail: "requiring action", icon: CircleAlert },
          { label: "Active reports", value: reports.length, detail: "managed definitions", icon: FileBarChart },
        ]}
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Barangay performance</span>
              <h2>Registry coverage</h2>
              <p className="muted mt-1 text-sm">Current completeness against each barangay target.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/ops/insights/barangays">View all</Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-4">
            {barangays.slice(0, 5).map((item) => (
              <div className="rounded-xl border bg-muted/15 p-4" key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <strong>{item.name}</strong>
                    <small className="block text-muted-foreground">Target {item.target}%</small>
                  </div>
                  <span className="font-bold text-primary">{item.registryCompleteness}%</span>
                </div>
                <Progress className="mt-3" value={item.registryCompleteness} />
              </div>
            ))}
          </div>
        </ContentPanel>
        <ContentPanel as="section">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Data operations</span>
              <h2>Workspace health</h2>
            </div>
            <Layers3 className="text-primary" />
          </div>
          <div className="mt-5 grid gap-3">
            <Link
              className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/40"
              href="/ops/insights/maps"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <MapPinned size={17} />
                </span>
                <span>
                  <strong className="block">Geographic layers</strong>
                  <small className="text-muted-foreground">{layers.length} active layers</small>
                </span>
              </span>
              <StatusBadge>Available</StatusBadge>
            </Link>
            <Link
              className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/40"
              href="/ops/insights/data-quality"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck size={17} />
                </span>
                <span>
                  <strong className="block">Data quality</strong>
                  <small className="text-muted-foreground">{openIssues.length} open issues</small>
                </span>
              </span>
              <StatusBadge tone={openIssues.some((i) => i.severity === "Critical") ? "destructive" : "warning"}>
                Needs review
              </StatusBadge>
            </Link>
            <Link
              className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/40"
              href="/ops/reports"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 size={17} />
                </span>
                <span>
                  <strong className="block">Scheduled reports</strong>
                  <small className="text-muted-foreground">
                    {reports.filter((i) => i.nextRun).length} upcoming runs
                  </small>
                </span>
              </span>
              <StatusBadge icon={<CheckCircle2 size={13} />}>Operational</StatusBadge>
            </Link>
          </div>
        </ContentPanel>
      </div>
      <section className="mt-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <span className="eyebrow">Priority queue</span>
            <h2>Quality issues requiring action</h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/ops/insights/data-quality">Open quality register</Link>
          </Button>
        </div>
        <DataTable
          columns={issueColumns}
          rows={openIssues.slice(0, 5)}
          getRowKey={(item) => item.id}
          summary={`${openIssues.length} open quality issues`}
        />
      </section>
    </>
  );
}

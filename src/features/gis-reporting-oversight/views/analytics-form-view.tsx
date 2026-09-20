"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Plus, Save } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { analyticsRepository as repository } from "../services/analytics-repository";
import type { AnalyticsRecordKind, QualityStatus, RecordStatus, Severity } from "../types/analytics";

const destinations: Record<AnalyticsRecordKind, string> = {
  barangay: "/ops/insights/barangays",
  layer: "/ops/insights/maps",
  quality: "/ops/insights/data-quality",
  report: "/ops/reports",
};
const labels: Record<AnalyticsRecordKind, string> = {
  barangay: "barangay profile",
  layer: "map layer",
  quality: "quality issue",
  report: "report",
};
const split = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function AnalyticsFormView({ kind, recordId }: { kind: AnalyticsRecordKind; recordId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const destination = destinations[kind];
  const editing = Boolean(recordId);
  const barangay = kind === "barangay" && recordId ? repository.findBarangay(recordId) : undefined;
  const layer = kind === "layer" && recordId ? repository.findLayer(recordId) : undefined;
  const issue = kind === "quality" && recordId ? repository.findIssue(recordId) : undefined;
  const report = kind === "report" && recordId ? repository.findReport(recordId) : undefined;
  const record = barangay ?? layer ?? issue ?? report;
  const [error, setError] = useState("");

  const [name, setName] = useState(barangay?.name ?? layer?.name ?? report?.title ?? issue?.title ?? "");
  const [psgc, setPsgc] = useState(barangay?.psgcCode ?? "");
  const [classification, setClassification] = useState(barangay?.classification ?? "Rural");
  const [population, setPopulation] = useState(String(barangay?.population ?? ""));
  const [households, setHouseholds] = useState(String(barangay?.households ?? ""));
  const [coverage, setCoverage] = useState(String(barangay?.registryCompleteness ?? ""));
  const [turnaround, setTurnaround] = useState(String(barangay?.serviceTurnaround ?? ""));
  const [submission, setSubmission] = useState(barangay?.lastSubmission ?? "2026-09-20");
  const [target, setTarget] = useState(String(barangay?.target ?? 95));
  const [followUp, setFollowUp] = useState(barangay?.followUp ?? "");
  const [category, setCategory] = useState(layer?.category ?? report?.category ?? issue?.category ?? "");
  const [source, setSource] = useState(layer?.sourceModule ?? issue?.sourceModule ?? "");
  const [scope, setScope] = useState(layer?.scope ?? report?.scope ?? "Municipality");
  const [visibility, setVisibility] = useState(layer?.visibility ?? "Internal");
  const [recordCount, setRecordCount] = useState(String(layer?.recordCount ?? 0));
  const [updated, setUpdated] = useState(layer?.lastUpdated ?? "2026-09-20");
  const [severity, setSeverity] = useState<Severity>(issue?.severity ?? "Medium");
  const [qualityStatus, setQualityStatus] = useState<QualityStatus>(issue?.status ?? "Open");
  const [qualityBarangay, setQualityBarangay] = useState(issue?.barangay ?? "Municipality");
  const [detected, setDetected] = useState(issue?.detectedAt ?? "2026-09-20");
  const [due, setDue] = useState(issue?.dueDate ?? "2026-09-27");
  const [resolution, setResolution] = useState(issue?.resolution ?? "");
  const [owner, setOwner] = useState(barangay?.owner ?? layer?.owner ?? issue?.owner ?? report?.owner ?? "");
  const [status, setStatus] = useState<RecordStatus>(barangay?.status ?? layer?.status ?? report?.status ?? "Active");
  const [description, setDescription] = useState(layer?.description ?? issue?.description ?? report?.description ?? "");
  const [frequency, setFrequency] = useState(report?.frequency ?? "Monthly");
  const [lastRun, setLastRun] = useState(report?.lastRun ?? "");
  const [nextRun, setNextRun] = useState(report?.nextRun ?? "");
  const [fields, setFields] = useState(report?.fields.join(", ") ?? "");
  const [grouping, setGrouping] = useState(report?.grouping ?? "Barangay");
  const [format, setFormat] = useState(report?.format ?? "PDF and XLSX");

  if (role !== "municipal")
    return (
      <PermissionState
        title="Record maintenance requires municipal access"
        description="Authorized municipal staff can create and update analytics records."
      />
    );
  if (editing && !record)
    return (
      <EmptyState
        icon={Plus}
        headingLevel="h1"
        title="Record unavailable"
        description="The requested analytics record could not be found."
        action={
          <Button asChild variant="outline">
            <Link href={destination}>Back to {labels[kind]}s</Link>
          </Button>
        }
      />
    );

  function submit(event: FormEvent) {
    event.preventDefault();
    let saved: { id: string } | undefined;
    if (kind === "barangay") {
      const input = {
        name,
        psgcCode: psgc,
        classification: classification as "Rural" | "Urban",
        population: Number(population),
        households: Number(households),
        registryCompleteness: Number(coverage),
        serviceTurnaround: Number(turnaround),
        lastSubmission: submission,
        status,
        owner,
        target: Number(target),
        followUp,
      };
      saved = barangay ? repository.updateBarangay(barangay.id, input) : repository.createBarangay(input);
    }
    if (kind === "layer") {
      const input = {
        name,
        category,
        sourceModule: source,
        scope,
        visibility: visibility as "Internal" | "Public" | "Restricted",
        status,
        recordCount: Number(recordCount),
        owner,
        lastUpdated: updated,
        description,
      };
      saved = layer ? repository.updateLayer(layer.id, input) : repository.createLayer(input);
    }
    if (kind === "quality") {
      const input = {
        title: name,
        sourceModule: source,
        category,
        severity,
        status: qualityStatus,
        barangay: qualityBarangay,
        owner,
        detectedAt: detected,
        dueDate: due,
        description,
        resolution,
      };
      saved = issue ? repository.updateIssue(issue.id, input) : repository.createIssue(input);
    }
    if (kind === "report") {
      const input = {
        title: name,
        category,
        owner,
        frequency,
        status,
        scope,
        lastRun,
        nextRun,
        description,
        fields: split(fields),
        grouping,
        format,
      };
      saved = report ? repository.updateReport(report.id, input) : repository.createReport(input);
    }
    if (!saved) {
      setError("Complete all required fields with valid values before saving this record.");
      return;
    }
    router.push(`${destination}/${saved.id}`);
  }

  return (
    <>
      <div className="ops-topline analytics-form-topline">
        <div>
          <Link className="ops-back-link" href={record ? `${destination}/${record.id}` : destination}>
            <ArrowLeft size={15} />{" "}
            {kind === "quality"
              ? "Quality"
              : kind === "layer"
                ? "Map"
                : `${labels[kind][0].toUpperCase()}${labels[kind].slice(1)}s`}
          </Link>
          <h1>{editing ? `Edit ${labels[kind]}` : `New ${labels[kind]}`}</h1>
          <p>
            {kind === "barangay"
              ? "Maintain the official analytics profile, coverage targets, responsible staff, and current follow-up."
              : kind === "layer"
                ? "Configure the layer source, geographic scope, disclosure level, ownership, and availability."
                : kind === "quality"
                  ? "Record the source, severity, ownership, due date, current status, and resolution details."
                  : "Define the report scope, selected fields, grouping, format, owner, and generation schedule."}
          </p>
        </div>
      </div>
      <ContentPanel as="section" className="analytics-form-panel">
        <form className="analytics-form-grid grid md:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          <FormField
            id="analytics-name"
            label={
              kind === "report"
                ? "Report title"
                : kind === "quality"
                  ? "Issue title"
                  : kind === "layer"
                    ? "Layer name"
                    : "Barangay name"
            }
            required
          >
            {(props) => <Input {...props} value={name} onChange={(e) => setName(e.target.value)} />}
          </FormField>
          {kind === "barangay" && (
            <>
              <FormField id="analytics-psgc" label="PSGC code" required>
                {(p) => <Input {...p} value={psgc} onChange={(e) => setPsgc(e.target.value)} />}
              </FormField>
              <FormField id="analytics-classification" label="Classification" required>
                {(p) => (
                  <NativeSelect
                    {...p}
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as "Rural" | "Urban")}
                  >
                    <option>Rural</option>
                    <option>Urban</option>
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="analytics-population" label="Population" required>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min="0"
                    value={population}
                    onChange={(e) => setPopulation(e.target.value)}
                  />
                )}
              </FormField>
              <FormField id="analytics-households" label="Households" required>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min="0"
                    value={households}
                    onChange={(e) => setHouseholds(e.target.value)}
                  />
                )}
              </FormField>
              <FormField id="analytics-coverage" label="Registry completeness (%)" required>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min="0"
                    max="100"
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value)}
                  />
                )}
              </FormField>
              <FormField id="analytics-target" label="Coverage target (%)" required>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min="0"
                    max="100"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                )}
              </FormField>
              <FormField id="analytics-turnaround" label="Average turnaround (days)" required>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min="0"
                    step="0.1"
                    value={turnaround}
                    onChange={(e) => setTurnaround(e.target.value)}
                  />
                )}
              </FormField>
              <FormField id="analytics-submission" label="Last submission" required>
                {(p) => <Input {...p} type="date" value={submission} onChange={(e) => setSubmission(e.target.value)} />}
              </FormField>
            </>
          )}
          {(kind === "layer" || kind === "quality") && (
            <FormField id="analytics-source" label="Source module" required>
              {(p) => <Input {...p} value={source} onChange={(e) => setSource(e.target.value)} />}
            </FormField>
          )}
          {kind !== "barangay" && (
            <FormField id="analytics-category" label="Category" required>
              {(p) => <Input {...p} value={category} onChange={(e) => setCategory(e.target.value)} />}
            </FormField>
          )}
          {kind === "layer" && (
            <>
              <FormField id="analytics-scope" label="Geographic scope" required>
                {(p) => <Input {...p} value={scope} onChange={(e) => setScope(e.target.value)} />}
              </FormField>
              <FormField id="analytics-visibility" label="Visibility" required>
                {(p) => (
                  <NativeSelect
                    {...p}
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as "Internal" | "Public" | "Restricted")}
                  >
                    <option>Internal</option>
                    <option>Public</option>
                    <option>Restricted</option>
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="analytics-count" label="Record count" required>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min="0"
                    value={recordCount}
                    onChange={(e) => setRecordCount(e.target.value)}
                  />
                )}
              </FormField>
              <FormField id="analytics-updated" label="Last updated" required>
                {(p) => <Input {...p} type="date" value={updated} onChange={(e) => setUpdated(e.target.value)} />}
              </FormField>
            </>
          )}
          {kind === "quality" && (
            <>
              <FormField id="analytics-quality-barangay" label="Affected scope" required>
                {(p) => <Input {...p} value={qualityBarangay} onChange={(e) => setQualityBarangay(e.target.value)} />}
              </FormField>
              <FormField id="analytics-severity" label="Severity" required>
                {(p) => (
                  <NativeSelect {...p} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="analytics-quality-status" label="Status" required>
                {(p) => (
                  <NativeSelect
                    {...p}
                    value={qualityStatus}
                    onChange={(e) => setQualityStatus(e.target.value as QualityStatus)}
                  >
                    <option>Open</option>
                    <option>In progress</option>
                    <option>Resolved</option>
                    <option>Reopened</option>
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="analytics-detected" label="Detected date" required>
                {(p) => <Input {...p} type="date" value={detected} onChange={(e) => setDetected(e.target.value)} />}
              </FormField>
              <FormField id="analytics-due" label="Due date" required>
                {(p) => <Input {...p} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}
              </FormField>
            </>
          )}
          {kind === "report" && (
            <>
              <FormField id="analytics-scope" label="Report scope" required>
                {(p) => <Input {...p} value={scope} onChange={(e) => setScope(e.target.value)} />}
              </FormField>
              <FormField id="analytics-frequency" label="Frequency" required>
                {(p) => (
                  <NativeSelect {...p} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Biweekly</option>
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>Annual</option>
                    <option>On demand</option>
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="analytics-grouping" label="Primary grouping" required>
                {(p) => <Input {...p} value={grouping} onChange={(e) => setGrouping(e.target.value)} />}
              </FormField>
              <FormField id="analytics-format" label="Output format" required>
                {(p) => (
                  <NativeSelect {...p} value={format} onChange={(e) => setFormat(e.target.value)}>
                    <option>PDF</option>
                    <option>XLSX</option>
                    <option>CSV</option>
                    <option>PDF and XLSX</option>
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="analytics-last-run" label="Last generated">
                {(p) => <Input {...p} type="date" value={lastRun} onChange={(e) => setLastRun(e.target.value)} />}
              </FormField>
              <FormField id="analytics-next-run" label="Next run">
                {(p) => <Input {...p} type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} />}
              </FormField>
              <label className="form-field md:col-span-2 xl:col-span-3">
                <span className="form-label">Included fields</span>
                <span className="form-hint">Separate fields with commas</span>
                <Textarea rows={2} value={fields} onChange={(e) => setFields(e.target.value)} />
              </label>
            </>
          )}
          <FormField id="analytics-owner" label="Responsible office or owner" required>
            {(p) => <Input {...p} value={owner} onChange={(e) => setOwner(e.target.value)} />}
          </FormField>
          {kind !== "quality" && (
            <FormField id="analytics-status" label="Status" required>
              {(p) => (
                <NativeSelect {...p} value={status} onChange={(e) => setStatus(e.target.value as RecordStatus)}>
                  <option>Active</option>
                  <option>Inactive</option>
                  {editing && <option>Archived</option>}
                </NativeSelect>
              )}
            </FormField>
          )}
          {kind === "barangay" ? (
            <label className="form-field md:col-span-2 xl:col-span-3">
              <span className="form-label">Current follow-up</span>
              <Textarea rows={2} value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
            </label>
          ) : (
            <label className="form-field md:col-span-2 xl:col-span-3">
              <span className="form-label">Description</span>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          )}
          {kind === "quality" && (
            <label className="form-field md:col-span-2 xl:col-span-3">
              <span className="form-label">Resolution</span>
              <Textarea rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} />
            </label>
          )}
          {error && (
            <p
              className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm md:col-span-2 xl:col-span-3"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-4 md:col-span-2 xl:col-span-3">
            <Button asChild type="button" variant="outline">
              <Link href={record ? `${destination}/${record.id}` : destination}>Cancel</Link>
            </Button>
            <Button type="submit">
              {editing ? <Save /> : <Plus />}
              {editing ? "Save changes" : `Create ${labels[kind]}`}
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}

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
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { projectMonitoringRepository as repository } from "../services/project-monitoring-repository";
import { displayProjectReference } from "../services/project-presentation";

export type RelatedRecordKind = "inspection" | "issue" | "billing";

export function ProjectRelatedFormView({
  projectId,
  kind,
  recordId,
}: {
  projectId: string;
  kind: RelatedRecordKind;
  recordId?: string;
}) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const record = repository.find(projectId);
  const inspection =
    kind === "inspection"
      ? record?.inspections.find((item) => item.id === recordId || item.id === `DEMO-${recordId}`)
      : undefined;
  const issue =
    kind === "issue"
      ? record?.issues.find((item) => item.id === recordId || item.id === `DEMO-${recordId}`)
      : undefined;
  const billing =
    kind === "billing"
      ? record?.billings.find((item) => item.id === recordId || item.id === `DEMO-${recordId}`)
      : undefined;
  const editing = Boolean(recordId);
  const [capturedAt, setCapturedAt] = useState(
    inspection?.capturedAt.replace(" ", "T").slice(0, 16) ?? "2026-09-20T09:00",
  );
  const [reportedAt, setReportedAt] = useState(
    inspection?.reportedAt.replace(" ", "T").slice(0, 16) ?? "2026-09-20T09:15",
  );
  const [coordinates, setCoordinates] = useState(inspection?.coordinates ?? "");
  const [photo, setPhoto] = useState(inspection?.photoReference ?? "");
  const [material, setMaterial] = useState(inspection?.materialResult ?? "");
  const [finding, setFinding] = useState(inspection?.finding ?? "");
  const [description, setDescription] = useState(issue?.description ?? "");
  const [assignee, setAssignee] = useState(issue?.assignee ?? "");
  const [dueAt, setDueAt] = useState(issue?.dueAt ?? "2026-09-30");
  const [inspectionRef, setInspectionRef] = useState(
    billing?.verifiedInspectionReference ?? record?.inspections.at(0)?.id ?? "",
  );
  const [gross, setGross] = useState(billing ? String(billing.grossMinor / 100) : "");
  const [retention, setRetention] = useState(billing ? String(billing.retentionMinor / 100) : "");
  const [error, setError] = useState("");
  if (role !== "municipal")
    return (
      <PermissionState
        title="Project maintenance requires municipal access"
        description="Authorized municipal staff can maintain project records."
      />
    );
  if (!record)
    return (
      <EmptyState
        icon={Plus}
        headingLevel="h1"
        title="Project unavailable"
        description="The requested project could not be found."
      />
    );
  if (editing && !inspection && !issue && !billing)
    return (
      <EmptyState
        icon={Plus}
        headingLevel="h1"
        title="Record unavailable"
        description="The requested related record could not be found."
      />
    );
  const reference = displayProjectReference(record.id);
  const resolvedProjectId = record.id;
  const section = kind === "billing" ? "billings" : "inspections";
  function submit(event: FormEvent) {
    event.preventDefault();
    let saved = false;
    if (kind === "inspection") {
      const input = {
        capturedAt: capturedAt.replace("T", " "),
        reportedAt: reportedAt.replace("T", " "),
        coordinates,
        photoReference: photo,
        materialResult: material,
        finding,
        syncState: inspection?.syncState ?? "synced",
        reviewStatus: inspection?.reviewStatus ?? "For review",
      };
      saved = Boolean(
        inspection
          ? repository.updateInspection(resolvedProjectId, inspection.id, input)
          : repository.addInspection(resolvedProjectId, input),
      );
    } else if (kind === "issue") {
      saved = Boolean(
        issue
          ? repository.updateIssue(resolvedProjectId, issue.id, {
              description,
              assignee,
              dueAt,
              status: issue.status,
              closureEvidence: issue.closureEvidence,
            })
          : repository.addIssue(resolvedProjectId, { description, assignee, dueAt }),
      );
    } else {
      const input = {
        verifiedInspectionReference: inspectionRef || undefined,
        grossMinor: Math.round(Number(gross) * 100),
        retentionMinor: Math.round(Number(retention) * 100),
        financeReference: billing?.financeReference,
      };
      saved = Boolean(
        billing
          ? repository.updateBilling(resolvedProjectId, billing.id, input)
          : repository.addBilling(resolvedProjectId, input),
      );
    }
    if (!saved) {
      setError("Complete all required fields with valid values before saving.");
      return;
    }
    router.push(`/ops/projects/${reference}/${section}`);
  }
  const noun = kind === "inspection" ? "inspection" : kind === "issue" ? "project issue" : "billing";
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href={`/ops/projects/${reference}/${section}`}>
            <ArrowLeft size={15} /> {section === "billings" ? "Billings" : "Inspections"}
          </Link>
          <h1>{editing ? `Edit ${noun}` : `New ${noun}`}</h1>
          <p>
            {reference} · {record.title}
          </p>
        </div>
      </div>
      <ContentPanel as="section">
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          {kind === "inspection" && (
            <>
              <FormField id="inspection-captured" label="Captured at" required>
                {(props) => (
                  <Input
                    {...props}
                    type="datetime-local"
                    value={capturedAt}
                    onChange={(event) => setCapturedAt(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="inspection-reported" label="Reported at" required>
                {(props) => (
                  <Input
                    {...props}
                    type="datetime-local"
                    value={reportedAt}
                    onChange={(event) => setReportedAt(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="inspection-coordinates" label="Coordinates" required>
                {(props) => (
                  <Input {...props} value={coordinates} onChange={(event) => setCoordinates(event.target.value)} />
                )}
              </FormField>
              <FormField id="inspection-photo" label="Photo or document reference" required>
                {(props) => <Input {...props} value={photo} onChange={(event) => setPhoto(event.target.value)} />}
              </FormField>
              <FormField id="inspection-material" label="Material test result" required>
                {(props) => <Input {...props} value={material} onChange={(event) => setMaterial(event.target.value)} />}
              </FormField>
              <label className="form-field sm:col-span-2">
                <span className="form-label">Finding</span>
                <Textarea value={finding} onChange={(event) => setFinding(event.target.value)} />
              </label>
            </>
          )}
          {kind === "issue" && (
            <>
              <label className="form-field sm:col-span-2">
                <span className="form-label">Issue description</span>
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
              </label>
              <FormField id="issue-assignee" label="Assigned person or office" required>
                {(props) => <Input {...props} value={assignee} onChange={(event) => setAssignee(event.target.value)} />}
              </FormField>
              <FormField id="issue-due" label="Due date" required>
                {(props) => (
                  <Input {...props} type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
                )}
              </FormField>
            </>
          )}
          {kind === "billing" && (
            <>
              <FormField id="billing-inspection" label="Verified inspection reference" required>
                {(props) => (
                  <Input {...props} value={inspectionRef} onChange={(event) => setInspectionRef(event.target.value)} />
                )}
              </FormField>
              <FormField id="billing-gross" label="Gross amount (PHP)" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="1"
                    value={gross}
                    onChange={(event) => setGross(event.target.value)}
                  />
                )}
              </FormField>
              <FormField id="billing-retention" label="Retention amount (PHP)" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="0"
                    value={retention}
                    onChange={(event) => setRetention(event.target.value)}
                  />
                )}
              </FormField>
            </>
          )}
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
            <Button asChild type="button" variant="outline">
              <Link href={`/ops/projects/${reference}/${section}`}>Cancel</Link>
            </Button>
            <Button type="submit">
              {editing ? <Save /> : <Plus />}
              {editing ? "Save changes" : `Create ${kind}`}
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}

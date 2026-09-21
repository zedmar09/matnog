"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Clock3, FileLock2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { type TimelineEntryValues, timelineEntrySchema } from "../schemas/case-schema";
import { localRestrictedCaseRepository as repository } from "../services/local-restricted-case-repository";
import type { CasePriority, CaseStatus, CaseTimelineEntry } from "../types/restricted-case";

const STATUS_TONE: Record<CaseStatus, StatusTone> = {
  New: "pending",
  "Under review": "pending",
  Scheduled: "warning",
  Referred: "warning",
  Resolved: "success",
  Closed: "neutral",
};
const PRIORITY_TONE: Record<CasePriority, StatusTone> = {
  Routine: "neutral",
  Priority: "pending",
  Urgent: "destructive",
};
const BLANK_TIMELINE: TimelineEntryValues = { at: "2026-09-19T08:00", action: "", officer: "", note: "" };
const inputDate = (value: string) => value.replace(" ", "T").slice(0, 16);
const storedDate = (value: string) => value.replace("T", " ");

export function CaseDetailView({ caseId }: { caseId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [timelineDelete, setTimelineDelete] = useState<CaseTimelineEntry>();
  const [editingTimelineId, setEditingTimelineId] = useState<string>();
  const [timelineValues, setTimelineValues] = useState<TimelineEntryValues>(BLANK_TIMELINE);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();
  const record = repository.caseRecord(caseId);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Case management is not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );
  if (!record)
    return (
      <PermissionState
        title="Case unavailable"
        description="The requested case record was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/cases">Back to cases</Link>
          </Button>
        }
      />
    );

  function setTimeline<K extends keyof TimelineEntryValues>(key: K, next: TimelineEntryValues[K]) {
    setTimelineValues((current) => ({ ...current, [key]: next }));
  }
  function editTimeline(entry: CaseTimelineEntry) {
    setEditingTimelineId(entry.id);
    setTimelineValues({ at: inputDate(entry.at), action: entry.action, officer: entry.officer, note: entry.note });
    setErrors([]);
  }
  function resetTimeline() {
    setEditingTimelineId(undefined);
    setTimelineValues(BLANK_TIMELINE);
    setErrors([]);
  }
  function saveTimeline() {
    if (!record) return;
    const parsed = timelineEntrySchema.safeParse({ ...timelineValues, at: storedDate(timelineValues.at) });
    if (!parsed.success)
      return setErrors(
        parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "timeline"), message: issue.message })),
      );
    const result = editingTimelineId
      ? repository.updateTimelineEntry(record.id, editingTimelineId, parsed.data)
      : repository.addTimelineEntry(record.id, parsed.data);
    if (!result) return setErrors([{ id: "timeline", message: "The case activity could not be saved." }]);
    setNotice(editingTimelineId ? "Case activity updated." : "Case activity added.");
    resetTimeline();
    refresh((value) => value + 1);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">Protected case record</span>
          <h1>{record.discreetLabel}</h1>
          <p>
            {record.id} · {record.caseClass}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/cases">
              <ArrowLeft />
              Back to cases
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/cases/${record.id}/edit`}>
              <Pencil />
              Edit case
            </Link>
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This case activity could not be saved" />
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Case administration</span>
              <h2 className="mt-1">{record.caseClass}</h2>
            </div>
            <div className="flex gap-2">
              <StatusBadge tone={PRIORITY_TONE[record.priority]}>{record.priority}</StatusBadge>
              <StatusBadge tone={STATUS_TONE[record.status]}>{record.status}</StatusBadge>
            </div>
          </div>
          <p className="mt-5">{record.administrativeSummary}</p>
          <dl className="registry-facts mt-6">
            <Fact label="Barangay / scope" value={record.scope} />
            <Fact label="Linked resident IDs" value={record.participantPersonIds?.join(" · ") || "None recorded"} />
            <Fact label="Assigned desk" value={record.assignedDesk} />
            <Fact label="Assigned officer" value={record.assignedOfficer} />
            <Fact label="Procedure" value={record.procedureVersion} />
            <Fact label="Opened at" value={record.openedAt} />
            <Fact label="Last updated" value={record.updatedAt} />
            <Fact label="Schedule / next action" value={record.schedule} />
            <Fact label="Referral / disposition" value={record.referral} />
          </dl>
        </ContentPanel>
        <ContentPanel as="aside">
          <FileLock2 className="text-primary" />
          <h2 className="mt-3">Evidence and disclosure</h2>
          <p className="muted">Only administrative references are displayed in this workspace.</p>
          <PanelDivider />
          <dl className="grid gap-5">
            <Fact label="Evidence references" value={record.evidence.join(" · ")} />
            <Fact label="Certificate eligibility" value={record.certificateEligibility} />
            <Fact label="Disclosure decisions" value={String(repository.caseDisclosures(record.id).length)} />
          </dl>
          <Button asChild variant="outline" className="mt-6">
            <Link href={`/ops/cases/${record.id}/disclosure`}>
              <ShieldCheck />
              Review disclosure
            </Link>
          </Button>
        </ContentPanel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <Clock3 className="text-primary" />
          <h2 className="mt-3">Case timeline</h2>
          <div className="mt-5 grid gap-3">
            {record.timeline.map((entry) => (
              <div className="rounded-xl border p-4" key={entry.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong>{entry.action}</strong>
                    <p className="muted mt-1 text-sm">
                      {entry.officer} · {entry.at}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => editTimeline(entry)}>
                      <Pencil />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setTimelineDelete(entry)}
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-sm">{entry.note}</p>
              </div>
            ))}
          </div>
        </ContentPanel>
        <ContentPanel as="section">
          <Plus className="text-primary" />
          <h2 className="mt-3">{editingTimelineId ? "Edit case activity" : "Add case activity"}</h2>
          <div className="mt-5 grid gap-4">
            <FormField id="timeline-at" label="Date and time" required>
              {(field) => (
                <Input
                  {...field}
                  type="datetime-local"
                  value={timelineValues.at}
                  onChange={(event) => setTimeline("at", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="timeline-action" label="Activity" required>
              {(field) => (
                <Input
                  {...field}
                  value={timelineValues.action}
                  onChange={(event) => setTimeline("action", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="timeline-officer" label="Officer" required>
              {(field) => (
                <Input
                  {...field}
                  value={timelineValues.officer}
                  onChange={(event) => setTimeline("officer", event.target.value)}
                />
              )}
            </FormField>
            <FormField id="timeline-note" label="Administrative note" required>
              {(field) => (
                <Textarea
                  {...field}
                  value={timelineValues.note}
                  onChange={(event) => setTimeline("note", event.target.value)}
                />
              )}
            </FormField>
          </div>
          <div className="mt-5 flex gap-3">
            <Button onClick={saveTimeline}>{editingTimelineId ? "Save activity" : "Add activity"}</Button>
            {editingTimelineId && (
              <Button variant="outline" onClick={resetTimeline}>
                Cancel edit
              </Button>
            )}
          </div>
        </ContentPanel>
      </div>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${record.id}`}
        description="This removes the case, timeline, and disclosure decisions from the current workspace."
        confirmLabel="Delete case"
        destructive
        onConfirm={() => {
          repository.deleteCase(record.id);
          router.replace("/ops/cases");
        }}
      />
      <ConfirmationDialog
        open={timelineDelete !== undefined}
        onOpenChange={(next) => !next && setTimelineDelete(undefined)}
        title="Delete case activity"
        description="This removes the selected activity from the case timeline."
        confirmLabel="Delete activity"
        destructive
        onConfirm={() => {
          if (timelineDelete) repository.deleteTimelineEntry(record.id, timelineDelete.id);
          setTimelineDelete(undefined);
          setNotice("Case activity deleted.");
          refresh((value) => value + 1);
        }}
      />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="muted font-semibold text-xs uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 font-medium text-sm">{value}</dd>
    </div>
  );
}

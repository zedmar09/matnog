"use client";
import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { ClipboardCheck, ClipboardList, FileSpreadsheet, TriangleAlert } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import type { DataTableColumn } from "@/shared/components/data-table";
import { DataTable } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { isOverdue } from "@/shared/data/demo-clock";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useDemoNow } from "@/shared/hooks/use-demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { FieldConflictResolver } from "../components/field-conflict-resolver";
import { IMPORT_PREVIEW } from "../data/surveys";
import { useRegistryActor } from "../hooks/use-registry-actor";
import { listSurveys } from "../services/registry-repository";
import { completedSections } from "../services/registry-rules";
import type { ImportRow, SurveyAssignment } from "../types/survey";

const STATE_TONE = {
  assigned: "pending",
  "in-progress": "pending",
  queued: "pending",
  conflict: "warning",
  accepted: "success",
} as const;

/** The badge reads from the survey state, which is what capture advances. */
const STATE_LABEL = {
  assigned: "Assigned",
  "in-progress": "In progress",
  queued: "Ready to sync",
  conflict: "Conflict",
  accepted: "Accepted",
} as const;

const ISSUE_TONE = { ok: "success", "possible-duplicate": "warning", invalid: "destructive" } as const;
const ISSUE_LABEL = { ok: "Ready", "possible-duplicate": "Possible duplicate", invalid: "Invalid" } as const;

export function RegistrySurveysView() {
  const actor = useRegistryActor();
  const { scenario, generation } = useWorkspaceSession();
  useDemoNow();
  const [result, setResult] = useState<RepositoryResult<SurveyAssignment[]> | null>(null);
  const [tab, setTab] = useState("assignments");
  const [applied, setApplied] = useState(false);

  const load = useCallback(() => {
    if (!actor) return;
    // Keep the current data on screen while refetching. Blanking it would
    // unmount the panels and discard the confirmation a reviewer just saw.
    void listSurveys(actor, scenario).then(setResult);
  }, [actor, scenario]);

  // A reset can leave the role (and therefore the actor) unchanged while the
  // fixtures and demo clock have been restored, so `generation` is carried as
  // an explicit refetch trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate refetch trigger.
  useEffect(load, [load, generation]);

  if (!actor) {
    return (
      <PermissionState
        title="The registry is not part of this workspace"
        description="The tourism partner role has no survey assignments."
        action={
          <Button asChild variant="outline">
            <Link href="/ops">Back to workspace overview</Link>
          </Button>
        }
      />
    );
  }

  const importColumns: DataTableColumn<ImportRow>[] = [
    { key: "line", header: "Line", cell: (row) => row.line },
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <>
          <strong>{row.name || "— missing —"}</strong>
          <small>
            Born {row.birthDate} · {row.householdId}
          </small>
        </>
      ),
    },
    {
      key: "issue",
      header: "Finding",
      className: "ops-status-cell",
      cell: (row) => <StatusBadge tone={ISSUE_TONE[row.issue]}>{ISSUE_LABEL[row.issue]}</StatusBadge>,
    },
    { key: "note", header: "Detail", className: "ops-group-cell", cell: (row) => row.note },
  ];

  const blocking = IMPORT_PREVIEW.filter((row) => row.issue !== "ok").length;
  const conflicts = result?.kind === "success" ? result.data.filter((item) => item.conflicts.length > 0) : [];

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Survey assignments</h1>
          <p>
            Household verification work, the queue of changes waiting to be applied, and a preview of any bulk import
            before it is accepted.
          </p>
        </div>
      </div>

      {result === null ? (
        <LoadingState label="Loading survey assignments" message="Loading assignments…" />
      ) : result.kind === "denied" ? (
        <PermissionState description={result.message} />
      ) : result.kind === "failure" ? (
        <ErrorState onRetry={load} />
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="registry-tabs">
          <TabsList>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts ({conflicts.length})</TabsTrigger>
            <TabsTrigger value="import">Import preview</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            {result.kind !== "success" || result.data.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No survey assignments"
                description="This demo role has no household verification work queued."
              />
            ) : (
              <div className="registry-household-grid">
                {result.data.map((assignment) => (
                  <ContentPanel key={assignment.envelope.id} className="registry-survey-card">
                    <div className="registry-household-top">
                      <strong>{assignment.envelope.scope.label}</strong>
                      <StatusBadge tone={STATE_TONE[assignment.state]}>{STATE_LABEL[assignment.state]}</StatusBadge>
                    </div>
                    <p className="muted">
                      {assignment.envelope.id} · household {assignment.householdId}
                    </p>
                    <div className="registry-progress" aria-hidden="true">
                      <span
                        style={{ width: `${(completedSections(assignment) / assignment.sections.length) * 100}%` }}
                      />
                    </div>
                    <p className="small-note">
                      {completedSections(assignment)} of {assignment.sections.length} sections captured
                    </p>
                    <p className="small-note">
                      Due {assignment.dueOn}
                      {isOverdue(`${assignment.dueOn}T23:59:59+08:00`) ? " · overdue" : ""}
                    </p>
                    {isOverdue(`${assignment.dueOn}T23:59:59+08:00`) && (
                      <StatusBadge tone="warning" icon={<TriangleAlert size={12} aria-hidden="true" />}>
                        Past its due date
                      </StatusBadge>
                    )}
                    <PanelDivider />
                    <div className="registry-survey-actions">
                      {assignment.state === "accepted" ? null : (
                        <Button asChild size="sm">
                          <Link href={`/ops/registry/surveys/${assignment.envelope.id}`}>
                            <ClipboardList size={15} />
                            {completedSections(assignment) === 0 ? "Start survey" : "Continue survey"}
                          </Link>
                        </Button>
                      )}
                      <Link className="text-link" href={`/ops/households/${assignment.householdId}`}>
                        Open household
                      </Link>
                    </div>
                  </ContentPanel>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="conflicts">
            {conflicts.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No conflicting changes"
                description="Every queued change applies cleanly against the current record version."
              />
            ) : (
              conflicts.map((assignment) => (
                <FieldConflictResolver
                  key={assignment.envelope.id}
                  assignment={assignment}
                  actor={actor}
                  scenario={scenario}
                  onDone={load}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="import">
            <ContentPanel>
              <SectionHeading
                eyebrow="File · residents-batch.csv"
                title="Import preview"
                description="Invalid rows and possible duplicates are shown before anything is applied. Nothing is written on the strength of a file alone."
              />
              <DataTable
                columns={importColumns}
                rows={IMPORT_PREVIEW}
                getRowKey={(row) => String(row.line)}
                summary={`${IMPORT_PREVIEW.length} rows · ${blocking} need a decision before import`}
              />
              <div className="registry-actions">
                <Button disabled={blocking > 0} onClick={() => setApplied(true)}>
                  <FileSpreadsheet />
                  Apply the rows that are ready
                </Button>
              </div>
              {blocking > 0 && (
                <p className="small-note">
                  <TriangleAlert size={13} aria-hidden="true" /> Applying is unavailable while {blocking}{" "}
                  {blocking === 1 ? "row needs" : "rows need"} a human decision. Correct the file or resolve each row
                  first.
                </p>
              )}
              {applied && (
                <p className="registry-save-notice" role="status">
                  This is a preview only. No record was created and no file was uploaded.
                </p>
              )}
            </ContentPanel>
          </TabsContent>
        </Tabs>
      )}

      <NoticePanel dot>
        Offline capture, device synchronisation and file upload are simulated. The mobile survey experience arrives with
        the Flutter registry screens.
      </NoticePanel>
    </>
  );
}

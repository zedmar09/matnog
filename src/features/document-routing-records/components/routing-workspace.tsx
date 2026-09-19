"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, CornerUpLeft, Route, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { NoticePanel } from "@/shared/components/notice-panel";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import type { RepositoryResult } from "@/shared/data/repository-result";

import {
  BARANGAY_OFFICE,
  ENGINEERING_OFFICE,
  HEALTH_OFFICE,
  LEGAL_OFFICE,
  MAYORS_OFFICE,
  RECORDS_OFFICE,
  TOURISM_OFFICE,
} from "../data/document-foundation-fixtures";
import { type RouteStageAssignmentValues, routeStageAssignmentSchema } from "../schemas/document-schema";
import { documentRoutingRepository, taskDueState } from "../services/document-foundation";
import type { DocumentWorkspaceRecord, OfficeRef, RouteTask } from "../types/document-routing";

const OFFICES: OfficeRef[] = [
  MAYORS_OFFICE,
  RECORDS_OFFICE,
  TOURISM_OFFICE,
  ENGINEERING_OFFICE,
  HEALTH_OFFICE,
  BARANGAY_OFFICE,
  LEGAL_OFFICE,
];

const SUCCESS_STATES = new Set(["approved", "endorsed", "released"]);

function resultError(result: RepositoryResult<DocumentWorkspaceRecord>, fallback: string): FieldError[] {
  if (result.kind === "invalid") return result.errors;
  if (result.kind === "denied" || result.kind === "conflict" || result.kind === "failure") {
    return [{ id: "task-action", message: result.message }];
  }
  return [{ id: "task-action", message: result.kind === "empty" ? (result.reason ?? fallback) : fallback }];
}

function taskTone(task: RouteTask): StatusTone {
  if (SUCCESS_STATES.has(task.state)) return "success";
  if (task.state === "returned") return "destructive";
  if (taskDueState(task) === "overdue") return "warning";
  if (task.state === "pending-acknowledgment") return "pending";
  return "neutral";
}

function TaskReviewCard({
  record,
  task,
  onUpdate,
}: {
  record: DocumentWorkspaceRecord;
  task: RouteTask;
  onUpdate: (record: DocumentWorkspaceRecord, notice: string) => void;
}) {
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const reviewFieldId = `review-note-${task.id}`;
  const reviewError = errors.find((error) => error.id === reviewFieldId)?.message;
  const delegationExpired =
    !!task.delegationId && !documentRoutingRepository.canUseDelegation(record, task.delegationId, "endorse");
  const reviewable = task.state === "received" || task.state === "in-review";

  const apply = (result: RepositoryResult<DocumentWorkspaceRecord>, notice: string) => {
    setErrors([]);
    if (result.kind !== "success") {
      setErrors(
        resultError(result, "The task could not be updated.").map((error) => ({
          ...error,
          id: error.id === "reason" || error.id === "review-note" ? reviewFieldId : error.id,
        })),
      );
      return;
    }
    setNote("");
    onUpdate(result.data, notice);
  };

  return (
    <article className="document-route-task-card">
      <div className="document-route-task-heading">
        <span className="document-task-sequence">{task.sequence}</span>
        <div>
          <small>
            {task.id} · {task.office.label}
          </small>
          <h3>{task.title}</h3>
          <p>
            {task.assigneePersona} · Due {formatDemoDateTime(task.dueAt)}
          </p>
        </div>
        <div className="document-route-badges">
          {taskDueState(task) === "overdue" && <StatusBadge tone="warning">overdue</StatusBadge>}
          {task.parallelGroup && <StatusBadge tone="neutral">parallel · {task.parallelGroup}</StatusBadge>}
          <StatusBadge tone={taskTone(task)}>{task.state.replaceAll("-", " ")}</StatusBadge>
        </div>
      </div>

      {task.assignmentNote && (
        <p className="document-route-note">
          <strong>Assignment note:</strong> {task.assignmentNote}
        </p>
      )}
      {task.decisionNote && (
        <p className="document-route-note">
          <strong>Recorded decision:</strong> {task.decisionNote}
        </p>
      )}
      {delegationExpired && (
        <NoticePanel className="mt-4">
          This delegation has expired. Reassign the task before recording an endorsement.
        </NoticePanel>
      )}
      <ErrorSummary errors={errors} title="Task action needs attention" />

      {task.state === "pending-acknowledgment" && (
        <div className="document-route-actions">
          <Button
            type="button"
            onClick={() =>
              apply(
                documentRoutingRepository.acknowledgeTask(
                  "municipal",
                  record.document.envelope.id,
                  task.id,
                  "Receiving Clerk",
                ),
                `${task.title} was acknowledged. Physical custody, when present, remains separate.`,
              )
            }
          >
            <CheckCircle2 /> Acknowledge task
          </Button>
        </div>
      )}

      {reviewable && (
        <div className="document-route-review-form">
          <FormField
            id={reviewFieldId}
            label="Review note"
            error={reviewError}
            hint="Required for a return or endorsement."
          >
            {(field) => (
              <Textarea
                {...field}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Record the reason and next expected action"
              />
            )}
          </FormField>
          <div className="document-route-actions">
            <Button
              type="button"
              variant="outline"
              disabled={delegationExpired}
              onClick={() =>
                apply(
                  documentRoutingRepository.returnTask("municipal", record.document.envelope.id, task.id, note),
                  `${task.title} was returned with a recorded correction reason.`,
                )
              }
            >
              <CornerUpLeft /> Return for correction
            </Button>
            <Button
              type="button"
              disabled={delegationExpired}
              onClick={() =>
                apply(
                  documentRoutingRepository.completeTask(
                    "municipal",
                    record.document.envelope.id,
                    task.id,
                    "endorsed",
                    "endorse",
                    note,
                  ),
                  `${task.title} was endorsed. The route completes only when every required task is finished.`,
                )
              }
            >
              <CheckCircle2 /> Endorse stage
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

export function RoutingWorkspace({
  record,
  onUpdate,
}: {
  record: DocumentWorkspaceRecord;
  onUpdate: (record: DocumentWorkspaceRecord) => void;
}) {
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: fieldErrors },
  } = useForm<RouteStageAssignmentValues>({
    resolver: zodResolver(routeStageAssignmentSchema),
    defaultValues: {
      title: "",
      officeId: "",
      assigneePersona: "",
      dueAt: "2026-09-18T17:00",
      acknowledgmentRequired: "yes",
      placement: "next-sequential",
      assignmentNote: "",
    },
  });

  const update = (updated: DocumentWorkspaceRecord, message: string) => {
    setNotice(message);
    onUpdate(updated);
  };

  const assign = (values: RouteStageAssignmentValues) => {
    setErrors([]);
    setNotice("");
    const office = OFFICES.find((item) => item.id === values.officeId);
    if (!office) {
      setErrors([{ id: "office-id", message: "Select the receiving office." }]);
      return;
    }
    const result = documentRoutingRepository.assignStage("municipal", record.document.envelope.id, {
      title: values.title,
      office,
      assigneePersona: values.assigneePersona,
      dueAt: values.dueAt,
      acknowledgmentRequired: values.acknowledgmentRequired === "yes",
      placement: values.placement,
      assignmentNote: values.assignmentNote,
      actor: "Routing Coordinator",
    });
    if (result.kind !== "success") {
      setErrors(resultError(result, "The stage could not be assigned."));
      return;
    }
    update(result.data, `${values.title} was added to the route.`);
    reset();
  };

  return (
    <ContentPanel as="section" className="document-routing-workspace">
      <div className="document-routing-workspace-heading">
        <SectionHeading
          eyebrow={`Active template · version ${record.route.templateVersion}`}
          title="Routing workspace"
          description="Assign a stage, acknowledge receipt, or record a reasoned return or endorsement. Every action is recorded in the document routing history."
        />
        <div className="document-route-badges">
          <StatusBadge tone={record.route.envelope.status === "complete" ? "success" : "pending"}>
            {record.route.envelope.status}
          </StatusBadge>
          <StatusBadge tone="neutral">{record.route.mode}</StatusBadge>
        </div>
      </div>

      {notice && <NoticePanel className="mt-4">{notice}</NoticePanel>}
      <div className="document-routing-workspace-grid">
        <div className="document-route-task-stack">
          {record.tasks.map((task) => (
            <TaskReviewCard key={task.id} record={record} task={task} onUpdate={update} />
          ))}
        </div>

        <section className="document-stage-assignment" aria-labelledby="stage-assignment-title">
          <div className="document-review-icon">
            <UserPlus />
          </div>
          <h2 id="stage-assignment-title">Assign another stage</h2>
          <p>Add an office task as the next sequential stage or a parallel review at the current stage.</p>
          <ErrorSummary errors={errors} title="Assignment needs attention" />
          <form onSubmit={handleSubmit(assign)} noValidate>
            <FormField id="stage-title" label="Stage title" error={fieldErrors.title?.message}>
              {(field) => <Input {...field} {...register("title")} />}
            </FormField>
            <FormField id="office-id" label="Receiving office" error={fieldErrors.officeId?.message}>
              {(field) => (
                <NativeSelect {...field} {...register("officeId")}>
                  <option value="">Select office</option>
                  {OFFICES.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.label}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField id="assignee-persona" label="Assigned persona" error={fieldErrors.assigneePersona?.message}>
              {(field) => <Input {...field} {...register("assigneePersona")} />}
            </FormField>
            <FormField id="due-at" label="Due date and time" error={fieldErrors.dueAt?.message}>
              {(field) => <Input {...field} type="datetime-local" {...register("dueAt")} />}
            </FormField>
            <FormField id="placement" label="Stage placement" error={fieldErrors.placement?.message}>
              {(field) => (
                <NativeSelect {...field} {...register("placement")}>
                  <option value="next-sequential">Next sequential stage</option>
                  <option value="current-parallel">Current-stage parallel review</option>
                </NativeSelect>
              )}
            </FormField>
            <FormField
              id="acknowledgment-required"
              label="Acknowledgment"
              error={fieldErrors.acknowledgmentRequired?.message}
            >
              {(field) => (
                <NativeSelect {...field} {...register("acknowledgmentRequired")}>
                  <option value="yes">Required before review</option>
                  <option value="no">Start directly in review</option>
                </NativeSelect>
              )}
            </FormField>
            <FormField id="assignment-note" label="Assignment note" error={fieldErrors.assignmentNote?.message}>
              {(field) => <Textarea {...field} {...register("assignmentNote")} />}
            </FormField>
            <Button type="submit">
              <Route /> Assign stage
            </Button>
          </form>
        </section>
      </div>
    </ContentPanel>
  );
}

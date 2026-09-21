"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FilePlus2, Pencil, Save, Settings2, Trash2, Workflow } from "lucide-react";
import { useForm } from "react-hook-form";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import {
  ENGINEERING_OFFICE,
  HEALTH_OFFICE,
  LEGAL_OFFICE,
  MAYORS_OFFICE,
  RECORDS_OFFICE,
  TOURISM_OFFICE,
} from "../data/document-foundation-fixtures";
import { type RoutingTemplateStageValues, routingTemplateStageSchema } from "../schemas/routing-template-schema";
import { routingTemplateRepository } from "../services/routing-template-repository";
import type { RoutingTemplate, RoutingTemplateStage } from "../types/document-routing";

const OFFICES = [RECORDS_OFFICE, MAYORS_OFFICE, TOURISM_OFFICE, ENGINEERING_OFFICE, HEALTH_OFFICE, LEGAL_OFFICE];
const EMPTY_STAGE: RoutingTemplateStageValues = {
  title: "",
  officeId: RECORDS_OFFICE.id,
  assigneePersona: "",
  dueDays: 2,
  acknowledgmentRequired: false,
};

export function RoutingTemplateDetailView({ templateId }: { templateId: string }) {
  const router = useRouter();
  const { role } = useWorkspaceSession();
  const [draft, setDraft] = useState<RoutingTemplate | undefined>(() => routingTemplateRepository.read(templateId));
  const [editingStageId, setEditingStageId] = useState<string>();
  const [pendingStageDelete, setPendingStageDelete] = useState<RoutingTemplateStage>();
  const [confirmTemplateDelete, setConfirmTemplateDelete] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RoutingTemplateStageValues>({
    resolver: zodResolver(routingTemplateStageSchema),
    defaultValues: EMPTY_STAGE,
  });

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Routing templates are limited to municipal administrators"
        description="Barangay, partner, and Field Surveyor roles can use assigned tasks but cannot change routing configuration."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/routing/templates">Back to templates</Link>
          </Button>
        }
      />
    );
  }

  if (!draft) {
    return (
      <EmptyState
        icon={Workflow}
        title="Routing template unavailable"
        description="The requested template may have been deleted or its reference is invalid."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/routing/templates">Back to templates</Link>
          </Button>
        }
      />
    );
  }

  function markDraft(update: (current: RoutingTemplate) => RoutingTemplate) {
    setDraft((current) => (current ? { ...update(current), status: "draft" } : current));
    setNotice("");
    setSaveError("");
  }

  function clearStageForm() {
    setValue("title", EMPTY_STAGE.title);
    setValue("officeId", EMPTY_STAGE.officeId);
    setValue("assigneePersona", EMPTY_STAGE.assigneePersona);
    setValue("dueDays", EMPTY_STAGE.dueDays);
    setValue("acknowledgmentRequired", EMPTY_STAGE.acknowledgmentRequired);
  }

  function submitStage(values: RoutingTemplateStageValues) {
    if (!draft) return;
    const office = OFFICES.find((item) => item.id === values.officeId);
    if (!office) return;
    if (editingStageId) {
      markDraft((current) => ({
        ...current,
        stages: current.stages.map((stage) =>
          stage.id === editingStageId
            ? {
                ...stage,
                title: values.title.trim(),
                office,
                assigneePersona: values.assigneePersona.trim(),
                dueDays: values.dueDays,
                acknowledgmentRequired: values.acknowledgmentRequired,
              }
            : stage,
        ),
      }));
      setNotice("Stage changes are ready to save in a new version.");
    } else {
      const nextSequence = Math.max(0, ...draft.stages.map((stage) => stage.sequence)) + 1;
      const stage: RoutingTemplateStage = {
        id: `${draft.id}-S${String(draft.stages.length + 1).padStart(2, "0")}-${Date.now()}`,
        title: values.title.trim(),
        office,
        assigneePersona: values.assigneePersona.trim(),
        sequence: nextSequence,
        dueDays: values.dueDays,
        acknowledgmentRequired: values.acknowledgmentRequired,
      };
      markDraft((current) => ({ ...current, stages: [...current.stages, stage] }));
      setNotice("Stage added. Save a new version to publish the change.");
    }
    setEditingStageId(undefined);
    clearStageForm();
  }

  function editStage(stage: RoutingTemplateStage) {
    setEditingStageId(stage.id);
    setNotice("");
    setValue("title", stage.title);
    setValue("officeId", stage.office.id);
    setValue("assigneePersona", stage.assigneePersona);
    setValue("dueDays", stage.dueDays);
    setValue("acknowledgmentRequired", stage.acknowledgmentRequired);
  }

  function removeStage() {
    if (!pendingStageDelete) return;
    markDraft((current) => ({
      ...current,
      stages: current.stages
        .filter((stage) => stage.id !== pendingStageDelete.id)
        .map((stage, index) => ({ ...stage, sequence: index + 1 })),
    }));
    setNotice("Stage removed. Save a new version to publish the change.");
    if (editingStageId === pendingStageDelete.id) {
      setEditingStageId(undefined);
      clearStageForm();
    }
    setPendingStageDelete(undefined);
  }

  function saveVersion() {
    if (!draft) return;
    if (draft.name.trim().length < 5) {
      setSaveError("Name the routing template using at least five characters.");
      return;
    }
    if (draft.stages.length === 0) {
      setSaveError("Add at least one stage before saving a template version.");
      return;
    }
    const saved = routingTemplateRepository.saveVersion(draft.id, draft);
    if (!saved) {
      setSaveError("This routing template is no longer available.");
      return;
    }
    setDraft(saved);
    setNotice(`Version ${saved.version} is now active.`);
    setSaveError("");
  }

  function deleteTemplate() {
    if (!draft) return;
    routingTemplateRepository.delete(draft.id);
    router.push("/ops/routing/templates");
  }

  const orderedStages = [...draft.stages].sort((left, right) => left.sequence - right.sequence);

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/routing/templates">
            <ArrowLeft size={15} />
            Templates
          </Link>
          <h1>{draft.name}</h1>
          <p>Configure the offices, staff roles, target days, and acknowledgments used by this route.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setConfirmTemplateDelete(true)}>
            <Trash2 />
            Delete
          </Button>
          <Button onClick={saveVersion}>
            <Save />
            Save new version
          </Button>
        </div>
      </div>

      {notice && <NoticePanel className="mb-6">{notice}</NoticePanel>}
      {saveError && (
        <NoticePanel className="mb-6" icon={<Settings2 />}>
          {saveError}
        </NoticePanel>
      )}

      <div className="document-template-layout">
        <ContentPanel as="aside">
          <SectionHeading eyebrow="Template details" title="Routing configuration" />
          <dl className="document-facts mt-5">
            <div>
              <dt>Template ID</dt>
              <dd>{draft.id}</dd>
            </div>
            <div>
              <dt>Active version</dt>
              <dd>{draft.version > 0 ? `Version ${draft.version}` : "Not published"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge tone={draft.status === "active" ? "success" : "pending"}>{draft.status}</StatusBadge>
              </dd>
            </div>
            <div>
              <dt>Stage count</dt>
              <dd>{draft.stages.length}</dd>
            </div>
          </dl>
        </ContentPanel>

        <div className="document-template-editor">
          <ContentPanel as="section">
            <SectionHeading
              eyebrow="Template information"
              title="Name and routing mode"
              description="Saving creates a new active version. Existing document routes retain the version assigned to them."
            />
            <div className="document-template-basics">
              <label htmlFor="routing-template-name">
                Template name
                <Input
                  id="routing-template-name"
                  value={draft.name}
                  onChange={(event) => markDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label htmlFor="routing-template-mode">
                Routing mode
                <NativeSelect
                  id="routing-template-mode"
                  value={draft.mode}
                  onChange={(event) =>
                    markDraft((current) => ({
                      ...current,
                      mode: event.target.value as RoutingTemplate["mode"],
                    }))
                  }
                >
                  <option value="sequential">Sequential stages</option>
                  <option value="parallel">Parallel stages allowed</option>
                </NativeSelect>
              </label>
            </div>
          </ContentPanel>

          <ContentPanel as="section">
            <SectionHeading
              eyebrow={`${orderedStages.length} ${orderedStages.length === 1 ? "stage" : "stages"}`}
              title="Office routing stages"
              description="Stages run in the displayed order. Parallel templates may assign the same sequence to offices that review together."
            />
            {orderedStages.length ? (
              <ol className="document-template-stage-list">
                {orderedStages.map((stage) => (
                  <li key={stage.id}>
                    <span className="document-task-sequence">{stage.sequence}</span>
                    <div>
                      <strong>{stage.title}</strong>
                      <small>
                        {stage.office.label} · {stage.assigneePersona} · {stage.dueDays} day target
                      </small>
                      <small>
                        {stage.acknowledgmentRequired
                          ? "Receipt acknowledgment required"
                          : "No acknowledgment required"}
                      </small>
                    </div>
                    <div className="document-template-stage-actions">
                      <Button type="button" variant="ghost" size="sm" onClick={() => editStage(stage)}>
                        <Pencil /> Edit
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPendingStageDelete(stage)}>
                        <Trash2 /> Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="document-template-stage-empty">
                <Workflow size={28} />
                <strong>No stages configured</strong>
                <p>Add the first receiving office below.</p>
              </div>
            )}
          </ContentPanel>

          <ContentPanel as="section">
            <SectionHeading
              eyebrow={editingStageId ? "Edit stage" : "New stage"}
              title={editingStageId ? "Update office stage" : "Add an office stage"}
              description="Define the responsible office, staff role, target completion days, and receipt requirement."
            />
            <form className="document-template-stage-form" onSubmit={handleSubmit(submitStage)} noValidate>
              <FormField id="template-stage-title" label="Stage title" error={errors.title?.message}>
                {(field) => <Input {...field} {...register("title")} />}
              </FormField>
              <FormField id="template-office" label="Receiving office" error={errors.officeId?.message}>
                {(field) => (
                  <NativeSelect {...field} {...register("officeId")}>
                    {OFFICES.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.label}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="template-persona" label="Assigned staff role" error={errors.assigneePersona?.message}>
                {(field) => <Input {...field} {...register("assigneePersona")} />}
              </FormField>
              <FormField id="template-due-days" label="Target days" error={errors.dueDays?.message}>
                {(field) => (
                  <Input {...field} type="number" min={1} max={30} {...register("dueDays", { valueAsNumber: true })} />
                )}
              </FormField>
              <label className="document-template-check">
                <input type="checkbox" {...register("acknowledgmentRequired")} />
                Require receipt acknowledgment
              </label>
              <div className="document-template-form-actions">
                {editingStageId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingStageId(undefined);
                      clearStageForm();
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" variant="outline">
                  {editingStageId ? <Save /> : <FilePlus2 />}
                  {editingStageId ? "Update stage" : "Add stage"}
                </Button>
              </div>
            </form>
          </ContentPanel>
        </div>
      </div>

      <ConfirmationDialog
        open={Boolean(pendingStageDelete)}
        onOpenChange={(open) => !open && setPendingStageDelete(undefined)}
        title={`Remove ${pendingStageDelete?.title ?? "stage"}`}
        description="This stage will be removed from the draft. Save a new version to publish the change."
        confirmLabel="Remove stage"
        destructive
        onConfirm={removeStage}
      />
      <ConfirmationDialog
        open={confirmTemplateDelete}
        onOpenChange={setConfirmTemplateDelete}
        title={`Delete ${draft.name}`}
        description="This removes the routing template. Existing document routes retain their recorded stages and assignments."
        confirmLabel="Delete template"
        destructive
        onConfirm={deleteTemplate}
      />
    </>
  );
}

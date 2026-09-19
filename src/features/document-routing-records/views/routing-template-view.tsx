"use client";

import { useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { FilePlus2, Save, Settings2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { ContentPanel } from "@/shared/components/content-panel";
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
import { ROUTING_TEMPLATE_FIXTURES } from "../data/routing-template-fixtures";
import { type RoutingTemplateStageValues, routingTemplateStageSchema } from "../schemas/routing-template-schema";
import type { RoutingTemplate } from "../types/document-routing";

const OFFICES = [RECORDS_OFFICE, MAYORS_OFFICE, TOURISM_OFFICE, ENGINEERING_OFFICE, HEALTH_OFFICE, LEGAL_OFFICE];

function cloneTemplate(template: RoutingTemplate): RoutingTemplate {
  return structuredClone(template);
}

export function RoutingTemplateView() {
  const { role } = useWorkspaceSession();
  const [templates, setTemplates] = useState<RoutingTemplate[]>(() => ROUTING_TEMPLATE_FIXTURES.map(cloneTemplate));
  const [selectedId, setSelectedId] = useState(ROUTING_TEMPLATE_FIXTURES[0].id);
  const selected = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? templates[0],
    [selectedId, templates],
  );
  const [draft, setDraft] = useState<RoutingTemplate>(() => cloneTemplate(ROUTING_TEMPLATE_FIXTURES[0]));
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoutingTemplateStageValues>({
    resolver: zodResolver(routingTemplateStageSchema),
    defaultValues: {
      title: "",
      officeId: RECORDS_OFFICE.id,
      assigneePersona: "",
      dueDays: 2,
      acknowledgmentRequired: false,
    },
  });

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Routing templates are limited to municipal administrators"
        description="Barangay, partner, and enumerator roles can use assigned tasks but cannot change the sample routing configuration."
      />
    );
  }

  function selectTemplate(id: string) {
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    setSelectedId(id);
    setDraft(cloneTemplate(template));
    setNotice("");
    setSaveError("");
    reset();
  }

  function addStage(values: RoutingTemplateStageValues) {
    const office = OFFICES.find((item) => item.id === values.officeId);
    if (!office) return;
    setDraft((current) => ({
      ...current,
      status: "draft",
      stages: [
        ...current.stages,
        {
          id: `${current.id}-DRAFT-${current.stages.length + 1}`,
          title: values.title.trim(),
          office,
          assigneePersona: values.assigneePersona.trim(),
          sequence: Math.max(0, ...current.stages.map((stage) => stage.sequence)) + 1,
          dueDays: values.dueDays,
          acknowledgmentRequired: values.acknowledgmentRequired,
        },
      ],
    }));
    setNotice("Stage added to the unsaved sample version.");
    setSaveError("");
    reset({
      title: "",
      officeId: RECORDS_OFFICE.id,
      assigneePersona: "",
      dueDays: 2,
      acknowledgmentRequired: false,
    });
  }

  function saveVersion() {
    if (draft.name.trim().length < 5) {
      setSaveError("Name the routing template using at least five characters.");
      return;
    }
    if (draft.stages.length === 0) {
      setSaveError("Keep at least one stage before saving a template version.");
      return;
    }
    const saved = { ...draft, name: draft.name.trim(), version: selected.version + 1, status: "active" as const };
    setTemplates((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    setDraft(cloneTemplate(saved));
    setNotice(`Saved template version ${saved.version} in local memory.`);
    setSaveError("");
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M05 · Routing configuration</span>
          <h1>Routing templates</h1>
          <p>Review office stages, timing, and receipt acknowledgment before a template is used by a sample route.</p>
        </div>
        <Button onClick={saveVersion}>
          <Save /> Save sample version
        </Button>
      </div>
      <NoticePanel className="mb-6">
        Template edits stay in this browser view and do not change existing routes. Saving creates a version; it does
        not publish municipal policy.
      </NoticePanel>
      {notice && <NoticePanel className="mb-6">{notice}</NoticePanel>}
      {saveError && (
        <NoticePanel className="mb-6" icon={<Settings2 />}>
          {saveError}
        </NoticePanel>
      )}

      <div className="document-template-layout">
        <ContentPanel as="aside">
          <SectionHeading eyebrow="Available samples" title="Choose a template" />
          <label className="document-template-picker">
            Routing template
            <select value={selectedId} onChange={(event) => selectTemplate(event.target.value)}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · v{template.version}
                </option>
              ))}
            </select>
          </label>
          <dl className="document-facts mt-5">
            <div>
              <dt>Template ID</dt>
              <dd>{selected.id}</dd>
            </div>
            <div>
              <dt>Current saved version</dt>
              <dd>{selected.version}</dd>
            </div>
          </dl>
        </ContentPanel>

        <div className="document-template-editor">
          <ContentPanel as="section">
            <div className="document-workspace-section-heading">
              <SectionHeading eyebrow={`${draft.stages.length} stages`} title="Draft configuration" />
              <StatusBadge tone={draft.status === "active" ? "success" : "pending"}>{draft.status}</StatusBadge>
            </div>
            <div className="document-template-basics">
              <label htmlFor="routing-template-name">
                Template name
                <Input
                  id="routing-template-name"
                  value={draft.name}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, name: event.target.value, status: "draft" }));
                    setNotice("");
                  }}
                />
              </label>
              <label htmlFor="routing-template-mode">
                Routing mode
                <NativeSelect
                  id="routing-template-mode"
                  value={draft.mode}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      mode: event.target.value as RoutingTemplate["mode"],
                      status: "draft",
                    }))
                  }
                >
                  <option value="sequential">Sequential stages</option>
                  <option value="parallel">Parallel stages allowed</option>
                </NativeSelect>
              </label>
            </div>

            <ol className="document-template-stage-list">
              {draft.stages.map((stage) => (
                <li key={stage.id}>
                  <span className="document-task-sequence">{stage.sequence}</span>
                  <div>
                    <strong>{stage.title}</strong>
                    <small>
                      {stage.office.label} · {stage.assigneePersona} · {stage.dueDays} day target
                    </small>
                    <label className="document-template-check">
                      <input
                        type="checkbox"
                        checked={stage.acknowledgmentRequired}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            status: "draft",
                            stages: current.stages.map((item) =>
                              item.id === stage.id ? { ...item, acknowledgmentRequired: event.target.checked } : item,
                            ),
                          }))
                        }
                      />
                      Require receipt acknowledgment
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${stage.title}`}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        status: "draft",
                        stages: current.stages
                          .filter((item) => item.id !== stage.id)
                          .map((item, stageIndex) => ({ ...item, sequence: stageIndex + 1 })),
                      }))
                    }
                  >
                    <Trash2 /> Remove
                  </Button>
                </li>
              ))}
            </ol>
          </ContentPanel>

          <ContentPanel as="section">
            <SectionHeading
              eyebrow="Unsaved stage"
              title="Add an office stage"
              description="A new stage is appended to this local draft. Existing document routes remain unchanged."
            />
            <form className="document-template-stage-form" onSubmit={handleSubmit(addStage)} noValidate>
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
              <FormField id="template-persona" label="Assigned persona" error={errors.assigneePersona?.message}>
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
              <Button type="submit" variant="outline">
                <FilePlus2 /> Add stage
              </Button>
            </form>
          </ContentPanel>
        </div>
      </div>
    </>
  );
}

import { ROUTING_TEMPLATE_FIXTURES } from "../data/routing-template-fixtures";
import type { RoutingTemplate, RoutingTemplateStage } from "../types/document-routing";

export type RoutingTemplateDraft = Pick<RoutingTemplate, "name" | "mode" | "stages">;

let templates = structuredClone(ROUTING_TEMPLATE_FIXTURES) as RoutingTemplate[];
let templateSequence = templates.length + 1;

function cloneTemplate(template: RoutingTemplate) {
  return structuredClone(template);
}

function normalizeStages(stages: readonly RoutingTemplateStage[]) {
  return stages.map((stage) => ({ ...structuredClone(stage) }));
}

export const routingTemplateRepository = {
  list() {
    return templates.map(cloneTemplate);
  },

  read(id: string) {
    const template = templates.find((item) => item.id === id);
    return template ? cloneTemplate(template) : undefined;
  },

  create() {
    const created: RoutingTemplate = {
      id: `TPL-2026-${String(templateSequence++).padStart(3, "0")}`,
      name: "New routing template",
      version: 0,
      mode: "sequential",
      status: "draft",
      stages: [],
    };
    templates = [created, ...templates];
    return cloneTemplate(created);
  },

  saveVersion(id: string, draft: RoutingTemplateDraft) {
    const current = templates.find((item) => item.id === id);
    if (!current) return undefined;
    const saved: RoutingTemplate = {
      ...current,
      name: draft.name.trim(),
      mode: draft.mode,
      stages: normalizeStages(draft.stages),
      version: current.version + 1,
      status: "active",
    };
    templates = templates.map((item) => (item.id === id ? saved : item));
    return cloneTemplate(saved);
  },

  delete(id: string) {
    if (!templates.some((item) => item.id === id)) return false;
    templates = templates.filter((item) => item.id !== id);
    return true;
  },
};

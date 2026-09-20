import type { StatusTone } from "@/shared/components/status-badge";

import type { ProjectStage } from "../types/project-monitoring";

export function displayProjectReference(value: string | undefined) {
  if (!value) return "Not assigned";
  return value.replace(/^DEMO-/, "");
}

export function cleanProjectText(value: string) {
  return value.replaceAll("DEMO-", "").replaceAll("sample", "recorded").replaceAll("Sample", "Recorded");
}

export function formatProjectCurrency(minor: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function projectStageLabel(stage: ProjectStage) {
  const labels: Record<ProjectStage, string> = {
    readiness: "Readiness",
    procurement: "Procurement",
    execution: "In progress",
    suspended: "Suspended",
    completion: "For completion",
    accepted: "Completed",
    archived: "Archived",
  };
  return labels[stage];
}

export function projectStageTone(stage: ProjectStage): StatusTone {
  if (stage === "accepted") return "success";
  if (stage === "suspended" || stage === "readiness") return "warning";
  if (stage === "archived") return "neutral";
  return "pending";
}

export function splitProjectTags(value: string) {
  return value
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

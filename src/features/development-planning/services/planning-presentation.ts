import type { StatusTone } from "@/shared/components/status-badge";

import type { PlanningStatus } from "../types/development-planning";

export function displayPlanningReference(value: string | undefined) {
  if (!value) return "Not assigned";
  return value.replace(/^DEMO-/, "");
}

export function formatPlanningCurrency(minor: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function proposalStatusLabel(status: PlanningStatus) {
  const labels: Record<PlanningStatus, string> = {
    draft: "Draft",
    "for-correction": "For correction",
    "under-review": "Under review",
    prioritized: "Prioritized",
    deferred: "Deferred",
    "approved-unfunded": "Approved, unfunded",
    "project-linked": "Project linked",
    archived: "Archived",
  };
  return labels[status];
}

export function proposalStatusTone(status: PlanningStatus): StatusTone {
  if (status === "project-linked" || status === "prioritized") return "success";
  if (status === "for-correction" || status === "deferred") return "warning";
  if (status === "archived") return "neutral";
  return "pending";
}

export function planningStatusTone(status: string): StatusTone {
  const normalized = status.toLocaleLowerCase();
  if (normalized.includes("approved") || normalized.includes("reviewed")) return "success";
  if (normalized.includes("correction") || normalized.includes("deferred")) return "warning";
  if (normalized.includes("archived")) return "neutral";
  return "pending";
}

export function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

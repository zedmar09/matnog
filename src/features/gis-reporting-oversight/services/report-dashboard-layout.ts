import type { DashboardAudience, DashboardSource, DashboardWidget } from "../types/report-dashboard";

const KEY = "matnog-report-dashboard-v1";

function storageKey(role: DashboardAudience) {
  return `${KEY}-${role}`;
}

export function readDashboardLayout(
  role: DashboardAudience,
  sources: DashboardSource[],
): DashboardWidget[] | undefined {
  try {
    const stored = localStorage.getItem(storageKey(role));
    if (stored === null) return undefined;
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return undefined;
    const byId = new Map(sources.map((source) => [source.id, source]));
    const seen = new Set<string>();
    return parsed.flatMap((candidate): DashboardWidget[] => {
      if (!candidate || typeof candidate !== "object") return [];
      const item = candidate as Record<string, unknown>;
      if (typeof item.sourceId !== "string" || seen.has(item.sourceId)) return [];
      const source = byId.get(item.sourceId);
      if (!source) return [];
      seen.add(item.sourceId);
      return [
        {
          sourceId: item.sourceId,
          chartType: source.chartTypes.includes(item.chartType as DashboardWidget["chartType"])
            ? (item.chartType as DashboardWidget["chartType"])
            : source.chartTypes[0],
          width: item.width === "full" ? "full" : "half",
        },
      ];
    });
  } catch {
    return undefined;
  }
}

export function saveDashboardLayout(role: DashboardAudience, widgets: DashboardWidget[]) {
  try {
    localStorage.setItem(storageKey(role), JSON.stringify(widgets));
    return true;
  } catch {
    return false;
  }
}

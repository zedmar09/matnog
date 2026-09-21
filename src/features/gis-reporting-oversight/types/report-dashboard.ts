import type { WorkspaceRole } from "@/shared/providers/workspace-session-provider";

export type DashboardChartType = "bar" | "line" | "pie";
export type DashboardWidgetWidth = "half" | "full";

export type DashboardWidget = {
  sourceId: string;
  chartType: DashboardChartType;
  width: DashboardWidgetWidth;
};

export type DashboardPoint = { label: string; value: number };

export type DashboardSource = {
  id: string;
  title: string;
  description: string;
  section: string;
  unit: string;
  asOf: string;
  scope: string;
  href: string;
  points: DashboardPoint[];
  chartTypes: DashboardChartType[];
  reportId?: string;
  reportTitle?: string;
};

export type DashboardAudience = WorkspaceRole | "public";

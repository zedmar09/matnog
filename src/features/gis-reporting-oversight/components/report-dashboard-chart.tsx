"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardSource, DashboardWidget } from "../types/report-dashboard";

const COLORS = ["#087443", "#159867", "#50b68d", "#82cbb0", "#b4dfcd", "#d2ece0", "#0b5c39"];

function shortLabel(value: string) {
  return value.length > 18 ? `${value.slice(0, 17)}…` : value;
}

export function ReportDashboardChart({
  source,
  chartType,
}: {
  source: DashboardSource;
  chartType: DashboardWidget["chartType"];
}) {
  if (!source.points.length) {
    return (
      <div className="grid h-56 place-items-center rounded-xl border border-dashed bg-muted/20 text-center text-muted-foreground text-sm">
        No matching records in this report scope.
      </div>
    );
  }

  const height = Math.max(230, Math.min(390, source.points.length * 38 + 80));
  const commonTooltip = <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ${source.unit}`} />;

  return (
    <div
      className="w-full"
      role="img"
      aria-label={`${source.title}: ${source.points.map((point) => `${point.label} ${point.value} ${source.unit}`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        {chartType === "pie" ? (
          <PieChart>
            <Pie
              data={source.points}
              dataKey="value"
              nameKey="label"
              innerRadius={54}
              outerRadius={88}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {source.points.map((point, index) => (
                <Cell key={point.label} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            {commonTooltip}
            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        ) : chartType === "line" ? (
          <LineChart data={source.points} margin={{ top: 12, right: 18, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6ebe8" />
            <XAxis
              dataKey="label"
              tickFormatter={shortLabel}
              tick={{ fontSize: 11 }}
              angle={source.points.length > 4 ? -28 : 0}
              textAnchor={source.points.length > 4 ? "end" : "middle"}
              height={source.points.length > 4 ? 64 : 36}
              interval={0}
            />
            <YAxis tick={{ fontSize: 11 }} width={44} />
            {commonTooltip}
            <Line
              type="monotone"
              dataKey="value"
              stroke={COLORS[0]}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        ) : (
          <BarChart data={source.points} layout="vertical" margin={{ top: 5, right: 18, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6ebe8" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={source.unit === "days"} />
            <YAxis dataKey="label" type="category" width={135} tick={{ fontSize: 10 }} tickFormatter={shortLabel} />
            {commonTooltip}
            <Bar dataKey="value" radius={[0, 5, 5, 0]} fill={COLORS[0]} isAnimationActive={false} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

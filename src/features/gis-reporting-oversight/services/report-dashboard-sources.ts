import { businessRepository } from "@/features/business-permits-licensing/services/business-repository";
import { paymentLedgerRepository } from "@/features/payments-treasury/services/payment-ledger";
import { projectMonitoringRepository } from "@/features/projects-procurement-monitoring/services/project-monitoring-repository";
import { publicationRepository } from "@/features/public-information-transparency/services/publication-repository";
import { REGISTRY_ACTORS } from "@/features/resident-household-registry/services/registry-projections";
import { listSurveys } from "@/features/resident-household-registry/services/registry-repository";
import { readRegistryRollup } from "@/features/resident-household-registry/services/registry-rollup";
import type { SurveyAssignment } from "@/features/resident-household-registry/types/survey";
import { tourismRepository } from "@/features/tourism-maritime-operations/services/tourism-repository";

import type {
  DashboardAudience,
  DashboardChartType,
  DashboardPoint,
  DashboardSource,
  DashboardWidget,
} from "../types/report-dashboard";
import { analyticsRepository } from "./analytics-repository";

const CHART_TYPES: DashboardChartType[] = ["bar", "line", "pie"];

function tally(values: string[], order?: string[]): DashboardPoint[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const labels = order?.filter((value) => counts.has(value)) ?? [...counts.keys()].sort();
  return labels.map((label) => ({ label, value: counts.get(label) ?? 0 }));
}

function latest(values: string[]) {
  return values.filter(Boolean).sort().at(-1) ?? "Not recorded";
}

function surveySources(assignments: SurveyAssignment[], role: "barangay" | "enumerator"): DashboardSource[] {
  const scope = role === "enumerator" ? "Assigned households" : "Assigned barangay surveys";
  const asOf = latest(assignments.map((item) => item.envelope.updatedAt.slice(0, 10)));
  return [
    {
      id: "survey-status",
      title: "Survey assignments by status",
      description: "Assigned, in progress, queued, conflict, and accepted survey records.",
      section: "Field work",
      unit: "assignments",
      asOf,
      scope,
      href: "/ops/registry/surveys",
      points: tally(
        assignments.map((item) => item.state.replaceAll("-", " ")),
        ["assigned", "in progress", "queued", "conflict", "accepted"],
      ),
      chartTypes: CHART_TYPES,
    },
    {
      id: "survey-progress",
      title: "Survey section progress",
      description: "Completed sections for each visible household assignment.",
      section: "Field work",
      unit: "sections",
      asOf,
      scope,
      href: "/ops/registry/surveys",
      points: assignments.map((item) => ({
        label: item.envelope.id.replace("DEMO-SVY-", "Survey "),
        value: item.sections.filter((section) => section.complete).length,
      })),
      chartTypes: ["bar", "line"],
    },
  ];
}

export async function loadDashboardSources(role: DashboardAudience): Promise<DashboardSource[]> {
  if (role === "public") {
    const publications = publicationRepository.listPublic();
    const advisories = publications.filter((item) => item.kind === "advisory");
    const asOf = latest(publications.map((item) => item.updatedDate));
    return [
      {
        id: "public-publications",
        title: "Published information by type",
        description: "Publicly approved items available in Matnog's information pages.",
        section: "Transparency",
        unit: "items",
        asOf,
        scope: "Published public information",
        href: "/transparency",
        points: tally(
          publications.map((item) => item.kind),
          ["advisory", "project", "disclosure", "service"],
        ),
        chartTypes: CHART_TYPES,
      },
      {
        id: "public-advisories",
        title: "Public advisories by office",
        description: "Published and corrected public advisories grouped by issuing office.",
        section: "Public notices",
        unit: "advisories",
        asOf: latest(advisories.map((item) => item.updatedDate)),
        scope: "Published advisories only",
        href: "/advisories",
        points: tally(advisories.map((item) => item.issuingOffice)),
        chartTypes: CHART_TYPES,
      },
      {
        id: "public-publication-timeline",
        title: "Published items by month",
        description: "Monthly count based on the publication date of approved public items.",
        section: "Transparency",
        unit: "items",
        asOf,
        scope: "Published public information",
        href: "/transparency",
        points: tally(publications.map((item) => item.updatedDate.slice(0, 7))),
        chartTypes: ["bar", "line"],
      },
    ];
  }

  if (role === "enumerator") {
    const result = await listSurveys(REGISTRY_ACTORS.enumerator);
    return surveySources(result.kind === "success" ? result.data : [], "enumerator");
  }

  if (role === "partner") {
    const operator = tourismRepository.listOperators()[0];
    const trips = tourismRepository.list().filter((item) => item.operatorId === operator?.id);
    const advisories = tourismRepository.listAdvisories().filter((item) => item.status === "Active");
    const asOf = latest(trips.map((item) => item.scheduledDeparture.slice(0, 10)));
    return [
      {
        id: "partner-trip-status",
        title: "My trips by status",
        description: "Operational trip count for the selected tourism operator.",
        section: "Tourism operations",
        unit: "trips",
        asOf,
        scope: operator?.name ?? "Assigned operator",
        href: "/ops/tourism/trips",
        points: tally(trips.map((item) => item.status)),
        chartTypes: CHART_TYPES,
      },
      {
        id: "partner-passengers",
        title: "Passengers by destination",
        description: "Manifested passenger count across the operator's trips.",
        section: "Tourism operations",
        unit: "passengers",
        asOf,
        scope: operator?.name ?? "Assigned operator",
        href: "/ops/tourism/trips",
        points: [...new Set(trips.map((item) => item.destination))].map((label) => ({
          label,
          value: trips
            .filter((item) => item.destination === label)
            .reduce((sum, item) => sum + item.passengers.length, 0),
        })),
        chartTypes: CHART_TYPES,
      },
      {
        id: "partner-advisories",
        title: "Current advisory types",
        description: "Active tourism and maritime advisories by type.",
        section: "Tourism operations",
        unit: "advisories",
        asOf: latest(advisories.map((item) => item.updatedAt.slice(0, 10))),
        scope: "Published tourism advisories",
        href: "/ops/tourism/advisories",
        points: tally(advisories.map((item) => item.advisoryType)),
        chartTypes: CHART_TYPES,
      },
    ];
  }

  const profiles = analyticsRepository.listBarangays().filter((item) => item.status === "Active");
  const issues = analyticsRepository.listIssues().filter((item) => item.status !== "Resolved");
  const reports = analyticsRepository.listReports();
  const report = (category: string) => reports.find((item) => item.category === category && item.status !== "Archived");
  const definition = (category: string) => {
    const item = report(category);
    return item ? { reportId: item.id, reportTitle: item.title } : {};
  };

  if (role === "barangay") {
    const profile = profiles.find((item) => item.name === "Gadgaron") ?? profiles[0];
    const ownIssues = issues.filter((item) => item.barangay === profile?.name);
    const result = await listSurveys(REGISTRY_ACTORS["barangay-staff"]);
    const registryRollup = await readRegistryRollup(REGISTRY_ACTORS["barangay-staff"]);
    return [
      ...(registryRollup.kind === "success"
        ? [
            {
              id: "barangay-m01-residents",
              title: "Current M01 resident and household records",
              description: "Living residents and active households in the current registry snapshot.",
              section: "Residents and registry",
              unit: "records",
              asOf: registryRollup.data[0]?.asOf ?? "Not recorded",
              scope: registryRollup.data[0]?.barangay.label ?? "Assigned barangay",
              href: "/ops/residents",
              points: [
                { label: "Residents", value: registryRollup.data[0]?.residentCount ?? 0 },
                { label: "Households", value: registryRollup.data[0]?.householdCount ?? 0 },
              ],
              chartTypes: ["bar"] as DashboardChartType[],
            },
          ]
        : []),
      {
        id: "barangay-coverage",
        title: "Registry coverage against target",
        description: "Completeness and approved target for the assigned barangay profile.",
        section: "Registry",
        unit: "percent",
        asOf: profile?.lastSubmission ?? "Not recorded",
        scope: profile?.name ?? "Assigned barangay",
        href: profile ? `/ops/insights/barangays/${profile.id}` : "/ops/insights/barangays",
        points: profile
          ? [
              { label: "Current", value: profile.registryCompleteness },
              { label: "Target", value: profile.target },
            ]
          : [],
        chartTypes: ["bar", "line"],
        ...definition("Population"),
      },
      {
        id: "barangay-population",
        title: "Population and households",
        description: "Registered profile totals for the assigned barangay.",
        section: "Registry",
        unit: "records",
        asOf: profile?.lastSubmission ?? "Not recorded",
        scope: profile?.name ?? "Assigned barangay",
        href: profile ? `/ops/insights/barangays/${profile.id}` : "/ops/insights/barangays",
        points: profile
          ? [
              { label: "Residents", value: profile.population },
              { label: "Households", value: profile.households },
            ]
          : [],
        chartTypes: ["bar"],
      },
      {
        id: "barangay-issues",
        title: "Open data issues by severity",
        description: "Only quality issues tagged to the assigned barangay.",
        section: "Data quality",
        unit: "issues",
        asOf: latest(ownIssues.map((item) => item.detectedAt)),
        scope: profile?.name ?? "Assigned barangay",
        href: "/ops/insights/data-quality",
        points: tally(
          ownIssues.map((item) => item.severity),
          ["Critical", "High", "Medium", "Low"],
        ),
        chartTypes: CHART_TYPES,
        ...definition("Governance"),
      },
      ...surveySources(result.kind === "success" ? result.data : [], "barangay"),
    ];
  }

  const projects = projectMonitoringRepository.list().filter((item) => item.stage !== "archived");
  const registryRollup = await readRegistryRollup(REGISTRY_ACTORS["data-steward"]);
  const applications = businessRepository.list();
  const trips = tourismRepository.list();
  const assessments = paymentLedgerRepository.list().map((item) => item.lifecycle.assessment);
  const revenueByService = new Map<string, number>();
  for (const assessment of assessments) {
    revenueByService.set(
      assessment.serviceModule,
      (revenueByService.get(assessment.serviceModule) ?? 0) + assessment.total.minorUnits,
    );
  }
  return [
    ...(registryRollup.kind === "success"
      ? [
          {
            id: "municipal-m01-residents",
            title: "Current M01 residents by barangay",
            description:
              "Living residents in each barangay's current registry period. Captured from M01, separate from submitted population profiles.",
            section: "Residents and registry",
            unit: "residents",
            asOf: registryRollup.data[0]?.asOf ?? "Not recorded",
            scope: "Municipal M01 registry",
            href: "/ops/residents",
            points: registryRollup.data.map((row) => ({ label: row.barangay.label, value: row.residentCount })),
            chartTypes: ["bar", "line"] as DashboardChartType[],
          },
          {
            id: "municipal-m01-households",
            title: "Current M01 households by barangay",
            description: "Active household records by current structure barangay in the dated M01 snapshot.",
            section: "Residents and registry",
            unit: "households",
            asOf: registryRollup.data[0]?.asOf ?? "Not recorded",
            scope: "Municipal M01 registry",
            href: "/ops/households",
            points: registryRollup.data.map((row) => ({ label: row.barangay.label, value: row.householdCount })),
            chartTypes: ["bar", "line"] as DashboardChartType[],
          },
        ]
      : []),
    {
      id: "municipal-coverage",
      title: "Registry coverage by barangay",
      description: "Latest completeness percentage for active barangay profiles.",
      section: "Residents and registry",
      unit: "percent",
      asOf: latest(profiles.map((item) => item.lastSubmission)),
      scope: "Municipality",
      href: "/ops/insights/barangays",
      points: profiles.map((item) => ({ label: item.name, value: item.registryCompleteness })),
      chartTypes: CHART_TYPES,
      ...definition("Population"),
    },
    {
      id: "municipal-population",
      title: "Population by barangay",
      description: "Registered population in each active barangay profile.",
      section: "Residents and registry",
      unit: "residents",
      asOf: latest(profiles.map((item) => item.lastSubmission)),
      scope: "Municipality",
      href: "/ops/insights/barangays",
      points: profiles.map((item) => ({ label: item.name, value: item.population })),
      chartTypes: ["bar", "line"],
    },
    {
      id: "municipal-turnaround",
      title: "Service turnaround by barangay",
      description: "Average service completion time in days by barangay profile.",
      section: "Service performance",
      unit: "days",
      asOf: latest(profiles.map((item) => item.lastSubmission)),
      scope: "Municipality",
      href: "/ops/insights/barangays",
      points: profiles.map((item) => ({ label: item.name, value: item.serviceTurnaround })),
      chartTypes: ["bar", "line"],
      ...definition("Executive"),
    },
    {
      id: "municipal-business",
      title: "Business applications by status",
      description: "Current business permit application counts by workflow status.",
      section: "Service performance",
      unit: "applications",
      asOf: latest(applications.map((item) => item.filedAt.slice(0, 10))),
      scope: "Municipality",
      href: "/ops/bpls/applications",
      points: tally(applications.map((item) => item.status)),
      chartTypes: CHART_TYPES,
    },
    {
      id: "municipal-revenue",
      title: "Assessed revenue by service",
      description: "Total charges issued by service module, before collection or settlement.",
      section: "Treasury",
      unit: "PHP",
      asOf: latest(assessments.map((item) => item.envelope.updatedAt.slice(0, 10))),
      scope: "Municipal assessments",
      href: "/ops/treasury/assessments",
      points: [...revenueByService].map(([label, minorUnits]) => ({ label, value: minorUnits / 100 })),
      chartTypes: ["bar", "pie"],
      ...definition("Finance"),
    },
    {
      id: "municipal-projects",
      title: "Projects by delivery stage",
      description: "Active municipal project records grouped by delivery stage.",
      section: "Projects and delivery",
      unit: "projects",
      asOf: "2026 reporting period",
      scope: "Municipality",
      href: "/ops/projects",
      points: tally(projects.map((item) => item.stage)),
      chartTypes: CHART_TYPES,
      ...definition("Infrastructure"),
    },
    {
      id: "municipal-tourism",
      title: "Tourism trips by status",
      description: "Trip counts across all operators in the current local records.",
      section: "Tourism and maritime",
      unit: "trips",
      asOf: latest(trips.map((item) => item.scheduledDeparture.slice(0, 10))),
      scope: "Municipality",
      href: "/ops/tourism/trips",
      points: tally(trips.map((item) => item.status)),
      chartTypes: CHART_TYPES,
    },
    {
      id: "municipal-quality",
      title: "Open quality issues by severity",
      description: "Unresolved cross-module data quality issues, without protected case detail.",
      section: "Data quality",
      unit: "issues",
      asOf: latest(issues.map((item) => item.detectedAt)),
      scope: "Municipality",
      href: "/ops/insights/data-quality",
      points: tally(
        issues.map((item) => item.severity),
        ["Critical", "High", "Medium", "Low"],
      ),
      chartTypes: CHART_TYPES,
      ...definition("Governance"),
    },
  ];
}

export function defaultDashboardWidgets(role: DashboardAudience, sources: DashboardSource[]): DashboardWidget[] {
  const defaults: Record<DashboardAudience, string[]> = {
    public: ["public-publications", "public-advisories"],
    municipal: ["municipal-coverage", "municipal-projects", "municipal-business", "municipal-quality"],
    barangay: ["barangay-coverage", "survey-status", "barangay-population"],
    partner: ["partner-trip-status", "partner-passengers"],
    enumerator: ["survey-status", "survey-progress"],
  };
  return defaults[role]
    .filter((id) => sources.some((source) => source.id === id))
    .map((sourceId) => ({
      sourceId,
      chartType: sources.find((source) => source.id === sourceId)?.chartTypes[0] ?? "bar",
      width: "half",
    }));
}

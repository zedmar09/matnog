"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { certificateRepository } from "@/features/barangay-certifications/services/certificate-repository";
import { localDisasterRepository } from "@/features/disaster-evacuation-relief/services/local-disaster-repository";
import { localSectoralAssistanceRepository } from "@/features/sectoral-assistance/services/local-sectoral-assistance-repository";
import { ContentPanel } from "@/shared/components/content-panel";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import type { Person } from "../types/registry";

type ServiceLink = { id: string; title: string; status: string; href: string };
type ServiceSummary = {
  certificates: ServiceLink[];
  sectors: ServiceLink[];
  assistance: ServiceLink[];
  releases: ServiceLink[];
  assessments: ServiceLink[];
};

/** Only ordinary service references cross into the resident workspace. Protected
 * KP/VAWC/BCPC records remain in M10 and never appear in this summary. */
export function ResidentServiceSummary({ person }: { person: Person }) {
  const { role, generation } = useWorkspaceSession();
  const [summary, setSummary] = useState<ServiceSummary | null>(null);
  const currentBarangay = person.residency.find((period) => !period.to)?.barangay.id;
  const householdId = person.memberships.find((membership) => !membership.to)?.householdId;
  const allowed =
    (role === "municipal" || role === "barangay") && (role !== "barangay" || currentBarangay === "DEMO-BRGY-A");

  // A workspace fixture reset can change repository data without changing the person ID.
  // biome-ignore lint/correctness/useExhaustiveDependencies: generation intentionally refreshes linked records after reset.
  useEffect(() => {
    if (!allowed) return;
    const certificates = certificateRepository.listForStaff(role, currentBarangay);
    setSummary({
      certificates:
        certificates.kind === "success"
          ? certificates.data
              .filter((item) => item.request.subjectId === person.envelope.id)
              .map((item) => ({
                id: item.request.envelope.id,
                title: item.request.certificateTypeLabel,
                status: item.request.status,
                href: `/ops/certificates/requests/${item.request.envelope.id}`,
              }))
          : [],
      sectors: localSectoralAssistanceRepository.sectorRecords
        .filter((item) => item.personId === person.envelope.id)
        .map((item) => ({
          id: item.id,
          title: `${item.category} status`,
          status: item.status,
          href: `/ops/sectors/${item.id}`,
        })),
      assistance: localSectoralAssistanceRepository.requests
        .filter((item) => item.personId === person.envelope.id)
        .map((item) => ({
          id: item.id,
          title: item.programName,
          status: item.status,
          href: `/ops/assistance/requests/${item.id}`,
        })),
      releases: localSectoralAssistanceRepository.ledger
        .filter((item) => item.recipient === person.envelope.id || item.recipient === householdId)
        .map((item) => ({
          id: item.id,
          title: item.program,
          status: item.status,
          href: `/ops/assistance/ledger/${item.id}`,
        })),
      assessments: householdId
        ? localDisasterRepository.assessments
            .filter((item) => item.householdId === householdId)
            .map((item) => ({
              id: item.id,
              title: "Household damage assessment",
              status: item.status,
              href: `/ops/disaster/assessments/${item.id}`,
            }))
        : [],
    });
  }, [allowed, currentBarangay, generation, householdId, person.envelope.id, role]);

  if (!allowed)
    return (
      <ContentPanel>
        <p className="muted">
          Service links are available to municipal staff and the resident’s current barangay staff.
        </p>
      </ContentPanel>
    );
  if (!summary)
    return (
      <ContentPanel>
        <p className="muted">Loading linked services…</p>
      </ContentPanel>
    );

  const groups = [
    { title: "Certifications", records: summary.certificates },
    { title: "Sectoral status", records: summary.sectors },
    { title: "Assistance requests", records: summary.assistance },
    { title: "Assistance releases", records: summary.releases },
    { title: "Disaster assessments", records: summary.assessments },
  ];
  return (
    <ContentPanel>
      <SectionHeading
        title="Linked services"
        description="Records that reference this permanent person or current household. Open a module to review its own details and actions."
      />
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 font-semibold">{group.title}</h3>
            {group.records.length === 0 ? (
              <p className="muted text-sm">No linked records.</p>
            ) : (
              <ul className="space-y-2">
                {group.records.map((record) => (
                  <li key={record.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <Link className="font-medium text-link" href={record.href}>
                        {record.title}
                      </Link>
                      <p className="muted text-xs">{record.id}</p>
                    </div>
                    <StatusBadge tone="neutral">{record.status}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </ContentPanel>
  );
}

"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowLeft, Pencil } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { LoadingState } from "@/shared/components/loading-state";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { formatDemoDate } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { CertificateBodyEditor } from "../components/certificate-body-editor";
import { TEMPLATE_STATUS } from "../components/certificate-template-table";
import { certificateRepository } from "../services/certificate-repository";
import type { CertificateTemplateVersion } from "../types/certificate-records";

export function CertificateTemplateDetailView({ templateVersionId }: { templateVersionId: string }) {
  const { role } = useWorkspaceSession();
  const [template, setTemplate] = useState<CertificateTemplateVersion | null>();

  // The repository holds templates in memory and the React Compiler would cache
  // a read taken during render, so the read happens in an effect and lands in
  // state. Every screen here does the same.
  useEffect(() => {
    if (role !== "barangay" && role !== "municipal") return;
    const listed = certificateRepository.listTemplates(role);
    setTemplate(
      listed.kind === "success"
        ? (listed.data.find((item) => item.envelope.id === templateVersionId.toUpperCase()) ?? null)
        : null,
    );
  }, [role, templateVersionId]);

  if (role !== "barangay" && role !== "municipal")
    return (
      <PermissionState
        title="Certificate templates are unavailable"
        description="Choose a barangay or municipal role. No signatory or serial configuration is exposed."
      />
    );

  if (template === undefined) return <LoadingState label="Loading template" message="Opening the template…" />;
  if (template === null)
    return (
      <PermissionState
        title="Template unavailable"
        description="That template version was not found in your scope."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/certificates/templates">Back to templates</Link>
          </Button>
        }
      />
    );

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link href="/ops/certificates/templates" className="text-link">
            <ArrowLeft size={15} />
            Templates
          </Link>
          <h1>{template.certificateTypeLabel}</h1>
          <p>
            {template.envelope.id} · version {template.version}
          </p>
          <div className="registry-badge-stack mt-3">
            <StatusBadge tone={TEMPLATE_STATUS[template.status].tone}>
              {TEMPLATE_STATUS[template.status].label}
            </StatusBadge>
          </div>
        </div>
        <div className="ops-topline-actions">
          <Button asChild>
            <Link href={`/ops/certificates/templates/${template.envelope.id}/edit`}>
              <Pencil size={14} />
              Update template
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,.6fr)]">
        <ContentPanel as="section">
          <SectionHeading
            title="Printable layout"
            description="What is frozen into an issuance. Placeholders in double braces are filled from the approved request."
          />
          <div className="mt-6">
            <CertificateBodyEditor value={template.body} readOnly />
          </div>
        </ContentPanel>

        <aside>
          <ContentPanel className="service-aside">
            <h2>Configuration</h2>
            <dl className="registry-facts mt-4">
              <div>
                <dt>Barangay scope</dt>
                <dd>{template.barangayLabel}</dd>
              </div>
              <div>
                <dt>Signatory role</dt>
                <dd>{template.signatoryRole}</dd>
              </div>
              <div>
                <dt>Effective from</dt>
                <dd>{formatDemoDate(`${template.effectiveFrom}T00:00:00+08:00`)}</dd>
              </div>
              <div>
                <dt>Next serial</dt>
                <dd>
                  {template.serialPrefix}-2026-{String(template.nextSerialSequence).padStart(4, "0")}
                </dd>
              </div>
            </dl>
            <p className="muted mt-4 text-sm">Fields: {template.fields.join(" · ")}</p>
          </ContentPanel>
        </aside>
      </div>
    </>
  );
}

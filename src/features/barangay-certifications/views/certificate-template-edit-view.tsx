"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { LoadingState } from "@/shared/components/loading-state";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { CertificateTemplateForm } from "../components/certificate-template-form";
import type { CertificateTemplateValues } from "../schemas/certificate-lifecycle-schema";
import { certificateRepository } from "../services/certificate-repository";

export function CertificateTemplateEditView({ templateVersionId }: { templateVersionId: string }) {
  const { role } = useWorkspaceSession();
  const [initial, setInitial] = useState<CertificateTemplateValues | null>();
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (role !== "barangay" && role !== "municipal") return;
    const listed = certificateRepository.listTemplates(role);
    const found =
      listed.kind === "success"
        ? listed.data.find((item) => item.envelope.id === templateVersionId.toUpperCase())
        : undefined;
    if (!found) return setInitial(null);
    setLabel(found.envelope.id);
    setInitial({
      certificateTypeId: found.certificateTypeId,
      certificateTypeLabel: found.certificateTypeLabel,
      status: found.status,
      signatoryRole: found.signatoryRole,
      serialPrefix: found.serialPrefix,
      effectiveFrom: found.effectiveFrom,
      body: found.body,
    });
  }, [role, templateVersionId]);

  if (role !== "barangay" && role !== "municipal")
    return (
      <PermissionState
        title="Certificate templates are unavailable"
        description="Choose a barangay or municipal role. No signatory or serial configuration is exposed."
      />
    );

  if (initial === undefined) return <LoadingState label="Loading template" message="Opening the template…" />;
  if (initial === null)
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
    <CertificateTemplateForm
      mode="update"
      role={role}
      templateVersionId={templateVersionId.toUpperCase()}
      initial={initial}
      heading="Update template"
      description={`Correcting ${label}. A version already frozen into an issued certificate keeps its own copy of the layout.`}
    />
  );
}

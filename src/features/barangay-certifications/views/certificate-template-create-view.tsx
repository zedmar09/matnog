"use client";

import { useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import { PermissionState } from "@/shared/components/permission-state";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { CertificateTemplateForm } from "../components/certificate-template-form";
import type { CertificateTemplateValues } from "../schemas/certificate-lifecycle-schema";
import { certificateRepository } from "../services/certificate-repository";

const STARTER_BODY =
  '<p style="text-align:center"><strong>Republic of the Philippines</strong><br>Province of Sorsogon<br>Municipality of Matnog<br><strong>{{barangay.label}}</strong></p><h2 style="text-align:center">Certificate</h2><p>TO WHOM IT MAY CONCERN:</p><p>This is to certify that <strong>{{subject.fullName}}</strong> is a bona fide resident of {{barangay.label}}, Matnog, Sorsogon.</p><p>Issued this {{issuance.issuedOn}}.</p><p style="text-align:right"><strong>{{signatory.role}}</strong></p>';

export function CertificateTemplateCreateView() {
  const { role } = useWorkspaceSession();
  // The list links here with the open tab's type, so a new version starts in
  // the right family rather than making the clerk choose it again.
  const typeId = useSearchParams().get("type") ?? "";
  const [initial, setInitial] = useState<CertificateTemplateValues>();

  useEffect(() => {
    if (role !== "barangay" && role !== "municipal") return;
    const listed = certificateRepository.listTemplates(role);
    const siblings = listed.kind === "success" ? listed.data.filter((item) => item.certificateTypeId === typeId) : [];
    const latest = siblings.at(-1);
    setInitial({
      certificateTypeId: typeId || (listed.kind === "success" ? (listed.data[0]?.certificateTypeId ?? "") : ""),
      certificateTypeLabel: latest?.certificateTypeLabel ?? "",
      status: "active",
      signatoryRole: latest?.signatoryRole ?? "Authorized Punong Barangay",
      serialPrefix: latest?.serialPrefix ?? "BRGY-CERT",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      body: latest?.body ?? STARTER_BODY,
    });
  }, [role, typeId]);

  if (role !== "barangay" && role !== "municipal")
    return (
      <PermissionState
        title="Certificate templates are unavailable"
        description="Choose a barangay or municipal role. No signatory or serial configuration is exposed."
      />
    );

  if (!initial) return null;

  return (
    <CertificateTemplateForm
      mode="create"
      role={role}
      initial={initial}
      heading="New template version"
      description="A new version starts from the latest one in this certificate type. The version number is assigned on save."
    />
  );
}

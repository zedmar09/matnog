"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { FilePlus2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { CertificateTemplateTable } from "../components/certificate-template-table";
import { certificateRepository } from "../services/certificate-repository";
import type { CertificateTemplateVersion } from "../types/certificate-records";

export function CertificateTemplateWireframeView() {
  const { role } = useWorkspaceSession();
  const [templates, setTemplates] = useState<CertificateTemplateVersion[]>([]);
  const [inUse, setInUse] = useState<string[]>([]);
  const [removing, setRemoving] = useState<CertificateTemplateVersion>();
  const [notice, setNotice] = useState<string>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [tab, setTab] = useState<string>();

  // The repository holds templates in memory and the React Compiler would cache
  // a read taken during render, so the read happens in an effect and lands in
  // state. Returning here from the add or edit page remounts and re-reads.
  useEffect(() => {
    if (role !== "barangay" && role !== "municipal") return;
    const listed = certificateRepository.listTemplates(role);
    setTemplates(listed.kind === "success" ? [...listed.data] : []);
    setInUse(certificateRepository.templateVersionsInUse());
  }, [role]);

  if (role !== "barangay" && role !== "municipal")
    return (
      <PermissionState
        title="Certificate templates are unavailable"
        description="Choose a barangay or municipal role. No signatory or serial configuration is exposed."
      />
    );

  // One tab per certificate type, in the order the types first appear.
  const types = [
    ...new Map(templates.map((item) => [item.certificateTypeId, item.certificateTypeLabel])).entries(),
  ].map(([id, label]) => ({ id, label }));
  const active = tab && types.some((type) => type.id === tab) ? tab : (types[0]?.id ?? "");

  function remove() {
    if (!removing) return;
    const id = removing.envelope.id;
    const done = certificateRepository.deleteTemplate(id, role as "barangay" | "municipal");
    setRemoving(undefined);
    if (done.kind === "success") {
      setTemplates((prev) => prev.filter((item) => item.envelope.id !== id));
      setErrors([]);
      setNotice(`${id} was deleted.`);
      return;
    }
    setNotice(undefined);
    setErrors(
      done.kind === "invalid"
        ? done.errors
        : [{ id: "delete", message: done.kind === "denied" ? done.message : "The template could not be deleted." }],
    );
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Certificate templates</h1>
          <p>
            One tab per certificate type. Each version carries its own signatory, serial sequence and printable layout.
          </p>
        </div>
        {active && (
          <Button asChild>
            <Link href={`/ops/certificates/templates/new?type=${encodeURIComponent(active)}`}>
              <FilePlus2 />
              New version
            </Link>
          </Button>
        )}
      </div>

      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This template could not be changed" />

      {types.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title="No certificate templates in scope."
          description="This role has no template configuration assigned."
        />
      ) : (
        <Tabs value={active} onValueChange={setTab} className="registry-tabs">
          <TabsList>
            {types.map((type) => (
              <TabsTrigger key={type.id} value={type.id}>
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {types.map((type) => (
            <TabsContent key={type.id} value={type.id}>
              <CertificateTemplateTable
                templates={templates.filter((item) => item.certificateTypeId === type.id)}
                inUse={inUse}
                onDelete={setRemoving}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <ConfirmationDialog
        open={removing !== undefined}
        onOpenChange={(next) => !next && setRemoving(undefined)}
        title={`Delete ${removing?.envelope.id ?? "template"}`}
        description="The version is removed from this barangay's configuration. A version already frozen into an issued certificate cannot be deleted."
        confirmLabel="Delete template"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

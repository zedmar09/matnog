"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { projectMonitoringRepository as repository } from "../services/project-monitoring-repository";
import { displayProjectReference } from "../services/project-presentation";

export function ProjectProcurementFormView({ projectId }: { projectId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const record = repository.find(projectId);
  const [mode, setMode] = useState(record?.procurementMode ?? "Public bidding");
  const [posting, setPosting] = useState(record?.postingReference ?? "");
  const [contract, setContract] = useState(record?.contractReference ?? "");
  const [contractor, setContractor] = useState(record?.contractor ?? "");
  const [securityExpiry, setSecurityExpiry] = useState(record?.securityExpiry ?? "");
  const [gates, setGates] = useState(
    () => record?.readiness.map((gate) => ({ ...gate, evidenceReference: gate.evidenceReference ?? "" })) ?? [],
  );
  const [error, setError] = useState("");
  if (role !== "municipal")
    return (
      <PermissionState
        title="Procurement maintenance requires municipal access"
        description="Authorized municipal staff can maintain readiness and contract records."
      />
    );
  if (!record)
    return (
      <EmptyState
        icon={Save}
        headingLevel="h1"
        title="Project unavailable"
        description="The requested project could not be found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/projects/procurement">Back to procurement</Link>
          </Button>
        }
      />
    );
  const reference = displayProjectReference(record.id);
  const resolvedProjectId = record.id;
  function submit(event: FormEvent) {
    event.preventDefault();
    for (const gate of gates)
      repository.updateReadiness(
        resolvedProjectId,
        gate.id,
        gate.state === "complete" ? "complete" : "missing",
        gate.evidenceReference,
      );
    const saved = repository.updateProcurement(resolvedProjectId, {
      procurementMode: mode,
      postingReference: posting,
      contractReference: contract,
      contractor,
      securityExpiry,
    });
    if (!saved) {
      setError("Select a procurement mode before saving the record.");
      return;
    }
    router.push(`/ops/projects/${reference}/procurement`);
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href={`/ops/projects/${reference}/procurement`}>
            <ArrowLeft size={15} /> Procurement
          </Link>
          <h1>Edit procurement record</h1>
          <p>
            {reference} · {record.title}
          </p>
        </div>
      </div>
      <form className="grid gap-6" onSubmit={submit}>
        <ContentPanel as="section">
          <h2>Readiness requirements</h2>
          <p className="muted mt-2">Mandatory requirements must be complete before procurement can begin.</p>
          <div className="mt-5 grid gap-4">
            {gates.map((gate, index) => (
              <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_180px_1fr]" key={gate.id}>
                <div>
                  <strong>{gate.label}</strong>
                  <p className="muted text-sm">
                    {gate.owner}
                    {gate.mandatory ? " · Required" : ""}
                  </p>
                </div>
                <select
                  className="h-10 rounded-lg border bg-background px-3"
                  value={gate.state}
                  onChange={(event) =>
                    setGates((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, state: event.target.value as typeof item.state } : item,
                      ),
                    )
                  }
                >
                  <option value="complete">Complete</option>
                  <option value="missing">Missing</option>
                </select>
                <Input
                  value={gate.evidenceReference}
                  onChange={(event) =>
                    setGates((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, evidenceReference: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Evidence reference"
                />
              </div>
            ))}
          </div>
        </ContentPanel>
        <ContentPanel as="section">
          <h2>Procurement and contract</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FormField id="procurement-mode" label="Procurement mode" required>
              {(props) => <Input {...props} value={mode} onChange={(event) => setMode(event.target.value)} />}
            </FormField>
            <FormField id="posting-reference" label="Posting reference">
              {(props) => <Input {...props} value={posting} onChange={(event) => setPosting(event.target.value)} />}
            </FormField>
            <FormField id="contract-reference" label="Contract reference">
              {(props) => <Input {...props} value={contract} onChange={(event) => setContract(event.target.value)} />}
            </FormField>
            <FormField id="contractor" label="Contractor">
              {(props) => (
                <Input {...props} value={contractor} onChange={(event) => setContractor(event.target.value)} />
              )}
            </FormField>
            <FormField id="security-expiry" label="Security expiry">
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={securityExpiry}
                  onChange={(event) => setSecurityExpiry(event.target.value)}
                />
              )}
            </FormField>
          </div>
          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
        </ContentPanel>
        <div className="flex justify-end gap-3">
          <Button asChild type="button" variant="outline">
            <Link href={`/ops/projects/${reference}/procurement`}>Cancel</Link>
          </Button>
          <Button type="submit">
            <Save /> Save procurement
          </Button>
        </div>
      </form>
    </>
  );
}

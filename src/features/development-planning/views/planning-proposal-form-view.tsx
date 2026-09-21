"use client";

import { type FormEvent, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Plus, Save } from "lucide-react";

import { REGISTRY_ACTORS } from "@/features/resident-household-registry/services/registry-projections";
import {
  type RegistryRollupRow,
  readRegistryRollup,
} from "@/features/resident-household-registry/services/registry-rollup";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { developmentPlanningRepository as repository } from "../services/development-planning-repository";
import { displayPlanningReference, splitLines } from "../services/planning-presentation";
import type { EvidenceCoverage } from "../types/development-planning";

export function PlanningProposalFormView({ proposalId }: { proposalId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const record = proposalId ? repository.findProposal(proposalId) : undefined;
  const editing = Boolean(proposalId);
  const [problem, setProblem] = useState(record?.problem ?? "");
  const [location, setLocation] = useState(record?.location ?? "");
  const [outcome, setOutcome] = useState(record?.outcome ?? "");
  const [cost, setCost] = useState(record ? String(record.estimateMinor / 100) : "");
  const [beneficiaries, setBeneficiaries] = useState(record ? String(record.beneficiaries) : "");
  const [sourceOffice, setSourceOffice] = useState(record?.sourceOffice ?? "");
  const [barangay, setBarangay] = useState(record?.barangay ?? "");
  const [tags, setTags] = useState(record?.tags.join(", ") ?? "");
  const [evidence, setEvidence] = useState(record?.evidence.snapshotId ?? "");
  const [rollups, setRollups] = useState<RegistryRollupRow[]>([]);
  const [selectedRollup, setSelectedRollup] = useState("");
  const [registryEvidence, setRegistryEvidence] = useState<EvidenceCoverage>();
  const [error, setError] = useState("");

  useEffect(() => {
    const actor =
      role === "municipal"
        ? REGISTRY_ACTORS["data-steward"]
        : role === "barangay"
          ? REGISTRY_ACTORS["barangay-staff"]
          : null;
    if (!actor) return;
    let active = true;
    void readRegistryRollup(actor).then((result) => {
      if (!active || result.kind !== "success") return;
      setRollups(result.data.filter((row) => row.residentCount > 0));
    });
    return () => {
      active = false;
    };
  }, [role]);
  if (!role || !["municipal", "barangay"].includes(role))
    return (
      <PermissionState
        title="Planning access required"
        description="Authorized planning staff can maintain proposals."
      />
    );
  if (editing && !record)
    return (
      <EmptyState
        icon={Plus}
        headingLevel="h1"
        title="Proposal unavailable"
        description="The requested proposal could not be found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/planning/proposals">Back to proposals</Link>
          </Button>
        }
      />
    );
  function submit(event: FormEvent) {
    event.preventDefault();
    const input = {
      problem,
      location,
      outcome,
      costPesos: Number(cost),
      beneficiaries: Number(beneficiaries),
      sourceOffice,
      barangay,
      tags: splitLines(tags),
      evidenceSnapshotId: evidence,
      evidenceSnapshot:
        registryEvidence?.snapshotId === evidence &&
        registryEvidence.source === "M01 municipal resident registry" &&
        rollups.some((row) => row.barangay.label === barangay && row.snapshotId === evidence)
          ? registryEvidence
          : undefined,
    };
    const saved = record ? repository.updateProposal(record.id, input) : repository.createProposal(input);
    if (!saved) {
      setError(
        "Complete the problem, location, outcome, cost, beneficiaries, source office, barangay, and evidence reference.",
      );
      return;
    }
    router.push(`/ops/planning/proposals/${displayPlanningReference(saved.id)}`);
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link
            className="ops-back-link"
            href={record ? `/ops/planning/proposals/${displayPlanningReference(record.id)}` : "/ops/planning/proposals"}
          >
            <ArrowLeft size={15} /> Proposals
          </Link>
          <h1>{record ? "Edit proposal" : "New proposal"}</h1>
          <p>Record the development need, intended outcome, evidence, estimated cost, and service reach.</p>
        </div>
      </div>
      <ContentPanel as="section">
        {rollups.length > 0 && (
          <div className="mb-5 rounded-xl border p-4">
            <h2 className="font-semibold">Resident registry evidence</h2>
            <p className="text-muted-foreground text-sm">
              Use a dated M01 aggregate as planning evidence. The selected counts are copied into this proposal and do
              not change when the registry changes later.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="form-field min-w-64 flex-1">
                <span className="form-label">Barangay snapshot</span>
                <NativeSelect value={selectedRollup} onChange={(event) => setSelectedRollup(event.target.value)}>
                  <option value="">Select a barangay</option>
                  {rollups.map((row) => (
                    <option key={row.snapshotId} value={row.snapshotId}>
                      {row.barangay.label} · {row.residentCount} residents · {row.asOf}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedRollup}
                onClick={() => {
                  const row = rollups.find((item) => item.snapshotId === selectedRollup);
                  if (!row) return;
                  setBarangay(row.barangay.label);
                  setBeneficiaries(String(row.residentCount));
                  setEvidence(row.snapshotId);
                  setRegistryEvidence({
                    snapshotId: row.snapshotId,
                    source: "M01 municipal resident registry",
                    collectedAt: row.asOf,
                    reportedAt: row.asOf,
                    coverage: `${row.residentCount} current residents in ${row.householdCount} active households; ${row.verifiedResidents} verified resident records`,
                    beneficiaries: row.residentCount,
                    denominator: row.residentCount,
                    caveat: "Fictional local registry snapshot; not an official RBI or CBMS submission.",
                  });
                }}
              >
                Use snapshot
              </Button>
            </div>
          </div>
        )}
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <label className="form-field sm:col-span-2">
            <span className="form-label">Development problem</span>
            <Textarea value={problem} onChange={(event) => setProblem(event.target.value)} />
          </label>
          <FormField id="proposal-location" label="Location" required>
            {(props) => <Input {...props} value={location} onChange={(event) => setLocation(event.target.value)} />}
          </FormField>
          <FormField id="proposal-barangay" label="Barangay" required>
            {(props) => <Input {...props} value={barangay} onChange={(event) => setBarangay(event.target.value)} />}
          </FormField>
          <label className="form-field sm:col-span-2">
            <span className="form-label">Intended outcome</span>
            <Textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} />
          </label>
          <FormField id="proposal-cost" label="Estimated cost (PHP)" required>
            {(props) => (
              <Input {...props} type="number" min="1" value={cost} onChange={(event) => setCost(event.target.value)} />
            )}
          </FormField>
          <FormField id="proposal-beneficiaries" label="Estimated beneficiaries" required>
            {(props) => (
              <Input
                {...props}
                type="number"
                min="1"
                value={beneficiaries}
                onChange={(event) => setBeneficiaries(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="proposal-source" label="Source office or council" required>
            {(props) => (
              <Input {...props} value={sourceOffice} onChange={(event) => setSourceOffice(event.target.value)} />
            )}
          </FormField>
          <FormField id="proposal-evidence" label="Evidence reference" required>
            {(props) => <Input {...props} value={evidence} onChange={(event) => setEvidence(event.target.value)} />}
          </FormField>
          <FormField id="proposal-tags" label="Development tags" hint="Separate tags with commas or new lines">
            {(props) => <Input {...props} value={tags} onChange={(event) => setTags(event.target.value)} />}
          </FormField>
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
            <Button asChild type="button" variant="outline">
              <Link
                href={
                  record ? `/ops/planning/proposals/${displayPlanningReference(record.id)}` : "/ops/planning/proposals"
                }
              >
                Cancel
              </Link>
            </Button>
            <Button type="submit">
              {record ? <Save /> : <Plus />}
              {record ? "Save changes" : "Create proposal"}
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}

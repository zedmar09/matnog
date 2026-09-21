"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import { Mars, SearchX, UserPlus, UsersRound, Venus } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useDemoNow } from "@/shared/hooks/use-demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { ResidentTable } from "../components/resident-table";
import { BARANGAYS } from "../data/barangays";
import { useRegistryActor } from "../hooks/use-registry-actor";
import { listResidents, type RegistryDirectoryRow } from "../services/registry-repository";

const VERIFICATION_OPTIONS = [
  { value: "", label: "Any verification state" },
  { value: "verified", label: "Verified" },
  { value: "stale", label: "Verification overdue" },
  { value: "unverified", label: "Unverified" },
];
const LIFE_OPTIONS = [
  { value: "", label: "Any record status" },
  { value: "living", label: "Living" },
  { value: "deceased", label: "Deceased" },
  { value: "moved-out", label: "Moved out" },
];

export function ResidentDirectoryView() {
  const actor = useRegistryActor();
  const { scenario, generation } = useWorkspaceSession();
  const now = new Date(useDemoNow()).toISOString();
  const [search, setSearch] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [verification, setVerification] = useState("");
  const [lifeStatus, setLifeStatus] = useState("");
  const [sex, setSex] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [result, setResult] = useState<RepositoryResult<RegistryDirectoryRow[]> | null>(null);

  // A reset can leave the role (and therefore the actor) unchanged while the
  // fixtures and demo clock have been restored, so `generation` is carried as
  // an explicit refetch trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate refetch trigger.
  useEffect(() => {
    if (!actor) return;
    let active = true;
    setResult(null);
    void listResidents(actor, { search, barangayId, verification, lifeStatus, sex, ageBand }, scenario).then((next) => {
      if (active) setResult(next);
    });
    return () => {
      active = false;
    };
  }, [actor, search, barangayId, verification, lifeStatus, sex, ageBand, scenario, generation]);

  function reset() {
    setSearch("");
    setBarangayId("");
    setVerification("");
    setLifeStatus("");
    setSex("");
    setAgeBand("");
  }

  if (!actor) {
    return (
      <PermissionState
        title="The registry is not part of this workspace"
        description="The tourism partner role has no resident registry access. Switch to a municipal, barangay, or Field Surveyor role from the workspace overview."
        action={
          <Button asChild variant="outline">
            <Link href="/ops">Back to workspace overview</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Residents</h1>
          <p>
            Search the people in your assigned scope. One person keeps one permanent record; barangay is a property of a
            residency period, not of the person.
          </p>
        </div>
        <Button asChild>
          <Link href="/ops/residents/new">
            <UserPlus />
            Register a resident
          </Link>
        </Button>
      </div>

      <div className="ops-controls">
        <OpsSearch value={search} onChange={setSearch} placeholder="Name, alias, or person ID…" />
        <OpsFilter
          label="Barangay"
          value={barangayId}
          onChange={setBarangayId}
          anyLabel="All assigned barangays"
          width={210}
          options={BARANGAYS.map((barangay) => ({ value: barangay.id, label: barangay.label }))}
        />
        <OpsFilter
          label="Verification"
          value={verification}
          onChange={setVerification}
          anyLabel="Any verification state"
          options={VERIFICATION_OPTIONS.filter((option) => option.value !== "").map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
        <OpsFilter
          label="Record status"
          value={lifeStatus}
          onChange={setLifeStatus}
          anyLabel="Any record status"
          options={LIFE_OPTIONS.filter((option) => option.value !== "").map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
        <OpsFilter
          label="Gender"
          value={sex}
          onChange={setSex}
          anyLabel="Any gender"
          width={150}
          options={[
            { value: "female", label: "Female", icon: <Venus size={14} aria-hidden="true" /> },
            { value: "male", label: "Male", icon: <Mars size={14} aria-hidden="true" /> },
          ]}
        />
        <OpsFilter
          label="Age"
          value={ageBand}
          onChange={setAgeBand}
          anyLabel="Any age"
          width={150}
          options={[
            { value: "0-17", label: "Under 18" },
            { value: "18-59", label: "18 to 59" },
            { value: "60-", label: "60 and over" },
          ]}
        />
      </div>

      {result === null ? (
        <LoadingState label="Loading residents" message="Loading the resident directory…" />
      ) : result.kind === "denied" ? (
        <PermissionState description={result.message} />
      ) : result.kind === "failure" ? (
        <ErrorState onRetry={() => setSearch((value) => value)} />
      ) : result.kind !== "success" || result.data.length === 0 ? (
        <EmptyState
          icon={search || barangayId || verification || lifeStatus || sex || ageBand ? SearchX : UsersRound}
          title={
            search || barangayId || verification || lifeStatus || sex || ageBand
              ? "No residents match your filters."
              : "No residents in scope."
          }
          description={
            search || barangayId || verification || lifeStatus || sex || ageBand
              ? "Adjust the search or filters. A restricted record is never revealed by a filtered search."
              : "This demo role has no assigned resident records."
          }
          action={
            <Button variant="outline" onClick={reset}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <ResidentTable rows={result.data} now={now} />
      )}
    </>
  );
}

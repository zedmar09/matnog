"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { PackageOpen, Plus, SearchX } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { DistributionTable } from "../components/distribution-table";
import { localDisasterRepository as repository } from "../services/local-disaster-repository";
import type { DistributionStatus, ReliefDistribution } from "../types/disaster-records";

const STATUSES: DistributionStatus[] = ["Released", "Pending confirmation", "Duplicate review", "Cancelled"];

export function DistributionListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<ReliefDistribution[]>([]);
  const [search, setSearch] = useState("");
  const [activity, setActivity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState<ReliefDistribution>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  useEffect(() => setRecords([...repository.distributions]), []);

  if (role !== "municipal" && role !== "barangay") {
    return (
      <PermissionState
        title="Relief distributions are not assigned to this role"
        description="Choose the municipal or barangay role."
      />
    );
  }

  const barangays = [...new Set(records.map((item) => item.barangay))];
  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const haystack =
      `${row.id} ${row.activityId} ${row.round} ${row.recipientId} ${row.recipientName} ${row.items} ${row.distributionSite} ${row.acknowledgment}`.toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!activity || row.activityId === activity) &&
      (!barangay || row.barangay === barangay) &&
      (!status || row.status === status)
    );
  });
  const filtering = Boolean(search || activity || barangay || status);

  function reset() {
    setSearch("");
    setActivity("");
    setBarangay("");
    setStatus("");
  }

  function remove() {
    if (!deleting) return;
    if (!repository.deleteDistribution(deleting.id)) {
      setErrors([{ id: "form", message: "That distribution could not be deleted." }]);
      setDeleting(undefined);
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== deleting.id));
    setNotice(`${deleting.id} was deleted.`);
    setErrors([]);
    setDeleting(undefined);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Distributions</h1>
          <p>Record relief releases by activity, recipient, barangay, round, acknowledgment, and status.</p>
        </div>
        <Button asChild>
          <Link href="/ops/disaster/distributions/new">
            <Plus />
            New distribution
          </Link>
        </Button>
      </div>

      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This distribution could not be changed" />

      <div className="ops-controls">
        <OpsSearch
          value={search}
          onChange={setSearch}
          placeholder="Distribution, recipient, items, site, or acknowledgment…"
        />
        <OpsFilter
          label="Activity"
          value={activity}
          onChange={setActivity}
          anyLabel="Any activity"
          width={230}
          options={repository.activities.map((item) => ({ value: item.id, label: item.name }))}
        />
        <OpsFilter
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          anyLabel="Any barangay"
          options={barangays.map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          width={220}
          options={STATUSES.map((value) => ({ value, label: value }))}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={filtering ? SearchX : PackageOpen}
          title={filtering ? "No distributions match your filters." : "No relief distributions in scope."}
          description={filtering ? "Adjust the search or clear the filters." : "Record the first relief distribution."}
          action={
            filtering ? (
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/ops/disaster/distributions/new">New distribution</Link>
              </Button>
            )
          }
        />
      ) : (
        <DistributionTable records={rows} onDelete={setDeleting} />
      )}

      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title={`Delete ${deleting?.id ?? "distribution"}`}
        description="This removes the relief distribution record from the current workspace."
        confirmLabel="Delete distribution"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

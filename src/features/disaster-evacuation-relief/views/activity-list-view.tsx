"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ClipboardList, Plus, SearchX } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { ActivityTable } from "../components/activity-table";
import { localDisasterRepository as repository } from "../services/local-disaster-repository";
import type { ActivityPriority, ActivityStatus, ActivityType, DisasterActivity } from "../types/disaster-records";

const STATUSES: ActivityStatus[] = ["Monitoring", "Active response", "Contained", "Closed"];
const PRIORITIES: ActivityPriority[] = ["Low", "Moderate", "High", "Critical"];
const TYPES: ActivityType[] = [
  "Typhoon",
  "Flood",
  "Storm surge",
  "Tsunami",
  "Landslide",
  "Fire",
  "Earthquake",
  "Volcanic activity",
  "Maritime incident",
];

export function ActivityListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<DisasterActivity[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState<DisasterActivity>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  useEffect(() => setRecords([...repository.activities]), []);

  if (role !== "municipal" && role !== "barangay") {
    return (
      <PermissionState
        title="Disaster response activities are not assigned to this role"
        description="Choose the municipal or barangay role to open MDRRMO operational records."
        action={
          <Button asChild variant="outline">
            <Link href="/ops">Back to workspace overview</Link>
          </Button>
        }
      />
    );
  }

  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const haystack =
      `${row.id} ${row.name} ${row.type} ${row.leadOffice} ${row.incidentCommander} ${row.affectedBarangays.join(" ")} ${row.advisoryReference}`.toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!type || row.type === type) &&
      (!priority || row.priority === priority) &&
      (!status || row.status === status)
    );
  });
  const filtering = Boolean(search || type || priority || status);

  function reset() {
    setSearch("");
    setType("");
    setPriority("");
    setStatus("");
  }

  function deleteActivity() {
    if (!deleting) return;
    if (!repository.deleteActivity(deleting.id)) {
      setErrors([{ id: "form", message: "That activity could not be deleted." }]);
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
          <h1>Activities</h1>
          <p>Manage hazard monitoring, emergency response, evacuation coordination, and recovery activities.</p>
        </div>
        <Button asChild>
          <Link href="/ops/disaster/events/new">
            <Plus />
            New activity
          </Link>
        </Button>
      </div>

      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This activity could not be changed" />

      <div className="ops-controls">
        <OpsSearch
          value={search}
          onChange={setSearch}
          placeholder="Reference, activity, barangay, office, or advisory…"
        />
        <OpsFilter
          label="Type"
          value={type}
          onChange={setType}
          anyLabel="Any type"
          options={TYPES.map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Priority"
          value={priority}
          onChange={setPriority}
          anyLabel="Any priority"
          options={PRIORITIES.map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={STATUSES.map((value) => ({ value, label: value }))}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={filtering ? SearchX : ClipboardList}
          title={filtering ? "No activities match your filters." : "No disaster response activities in scope."}
          description={filtering ? "Adjust the search or clear the filters." : "Create the first operational activity."}
          action={
            filtering ? (
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/ops/disaster/events/new">New activity</Link>
              </Button>
            )
          }
        />
      ) : (
        <ActivityTable records={rows} onDelete={setDeleting} />
      )}

      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title={`Delete ${deleting?.id ?? "activity"}`}
        description="This also removes its linked evacuation centers, distributions, and damage assessments from the current workspace."
        confirmLabel="Delete activity"
        destructive
        onConfirm={deleteActivity}
      />
    </>
  );
}

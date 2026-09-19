"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Megaphone, Plus, SearchX } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { AdvisoryTable } from "../components/advisory-table";
import { tourismRepository as repository } from "../services/tourism-repository";
import type { TourismAdvisory } from "../types/tourism-records";

export function AdvisoryListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<TourismAdvisory[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState<TourismAdvisory>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();
  useEffect(() => setRecords([...repository.listAdvisories()]), []);
  if (role !== "municipal")
    return (
      <PermissionState
        title="Tourism advisories are not assigned to this role"
        description="Choose the municipal staff role."
      />
    );
  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const haystack =
      `${row.id} ${row.title} ${row.issuingAuthority} ${row.affectedDestinations.join(" ")} ${row.affectedOperators.join(" ")}`.toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!type || row.advisoryType === type) &&
      (!severity || row.severity === severity) &&
      (!status || row.status === status)
    );
  });
  const filtering = Boolean(search || type || severity || status);
  function remove() {
    if (!deleting) return;
    if (!repository.deleteAdvisory(deleting.id))
      setErrors([{ id: "form", message: "That advisory could not be deleted." }]);
    else {
      setRecords((current) => current.filter((item) => item.id !== deleting.id));
      setNotice(`${deleting.id} was deleted.`);
      setErrors([]);
    }
    setDeleting(undefined);
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Advisories</h1>
          <p>Manage tourism notices, maritime restrictions, affected routes, and operational guidance.</p>
        </div>
        <Button asChild>
          <Link href="/ops/tourism/advisories/new">
            <Plus />
            New advisory
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This advisory could not be changed" />
      <div className="ops-controls">
        <OpsSearch
          value={search}
          onChange={setSearch}
          placeholder="Reference, title, authority, destination, or operator…"
        />
        <OpsFilter
          label="Type"
          value={type}
          onChange={setType}
          anyLabel="Any type"
          options={["Weather", "Sea condition", "Port operation", "Destination", "Safety"].map((value) => ({
            value,
            label: value,
          }))}
        />
        <OpsFilter
          label="Severity"
          value={severity}
          onChange={setSeverity}
          anyLabel="Any severity"
          options={["Information", "Caution", "Restricted", "Closed"].map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={["Draft", "Active", "Resolved", "Cancelled"].map((value) => ({ value, label: value }))}
        />
      </div>
      {rows.length ? (
        <AdvisoryTable records={rows} onDelete={setDeleting} />
      ) : (
        <EmptyState
          icon={filtering ? SearchX : Megaphone}
          title={filtering ? "No advisories match your filters." : "No tourism advisories in scope."}
          description={filtering ? "Adjust the search or clear the filters." : "Create the first advisory."}
          action={
            filtering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setType("");
                  setSeverity("");
                  setStatus("");
                }}
              >
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/ops/tourism/advisories/new">New advisory</Link>
              </Button>
            )
          }
        />
      )}
      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title={`Delete ${deleting?.id ?? "advisory"}`}
        description="This removes the advisory and its affected-route record from the current workspace."
        confirmLabel="Delete advisory"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { FileCheck2, Plus, SearchX } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { ApplicationTable } from "../components/application-table";
import { businessRepository as repository } from "../services/business-repository";
import type { BusinessApplicationPathId } from "../types/business-journey";
import type { BusinessApplicationRecord, BusinessApplicationStatus } from "../types/business-records";

const TYPES: BusinessApplicationPathId[] = ["new", "renewal", "amendment", "closure"];
const STATUSES: BusinessApplicationStatus[] = [
  "draft",
  "submitted",
  "for-correction",
  "under-review",
  "ready-to-issue",
  "issued",
  "closed",
];
const label = (value: string) => value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());

export function BplsApplicationsWireframeView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<BusinessApplicationRecord[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [barangay, setBarangay] = useState("");
  const [deleting, setDeleting] = useState<BusinessApplicationRecord>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  useEffect(() => setRecords([...repository.list()]), []);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Business permit applications are not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );

  const barangays = [
    ...new Set(records.map((record) => repository.readBusiness(record.businessId)?.barangay).filter(Boolean)),
  ] as string[];
  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const rowBarangay = repository.readBusiness(row.businessId)?.barangay ?? "";
    const haystack =
      `${row.id} ${row.businessName} ${row.establishmentName} ${row.assignedOfficer} ${row.representativeLabel} ${row.location}`.toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!type || row.path === type) &&
      (!status || row.status === status) &&
      (!barangay || rowBarangay === barangay)
    );
  });
  const filtering = Boolean(search || type || status || barangay);

  function reset() {
    setSearch("");
    setType("");
    setStatus("");
    setBarangay("");
  }

  function remove() {
    if (!deleting) return;
    if (!repository.deleteApplication(deleting.id)) {
      setErrors([{ id: "form", message: "That application could not be deleted." }]);
      setDeleting(undefined);
      return;
    }
    setRecords((current) => current.filter((record) => record.id !== deleting.id));
    setNotice(`${deleting.id} was deleted.`);
    setErrors([]);
    setDeleting(undefined);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Applications</h1>
          <p>Manage new permits, renewals, amendments, and business closures from filing through release.</p>
        </div>
        <Button asChild>
          <Link href="/ops/bpls/applications/new">
            <Plus />
            New application
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This application could not be changed" />
      <div className="ops-controls">
        <OpsSearch
          value={search}
          onChange={setSearch}
          placeholder="Reference, business, applicant, officer, or location…"
        />
        <OpsFilter
          label="Type"
          value={type}
          onChange={setType}
          anyLabel="Any type"
          options={TYPES.map((value) => ({ value, label: label(value) }))}
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          width={200}
          options={STATUSES.map((value) => ({ value, label: label(value) }))}
        />
        <OpsFilter
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          anyLabel="Any barangay"
          options={barangays.map((value) => ({ value, label: value }))}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={filtering ? SearchX : FileCheck2}
          title={filtering ? "No applications match your filters." : "No business permit applications in scope."}
          description={
            filtering ? "Adjust the search or clear the filters." : "Create the first business permit application."
          }
          action={
            filtering ? (
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/ops/bpls/applications/new">New application</Link>
              </Button>
            )
          }
        />
      ) : (
        <ApplicationTable records={rows} onDelete={setDeleting} />
      )}
      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title={`Delete ${deleting?.id ?? "application"}`}
        description="This removes the application, its requirements, office reviews, assessment, and timeline from the current workspace."
        confirmLabel="Delete application"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

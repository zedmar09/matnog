"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Building2, Plus, SearchX } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { BusinessTable } from "../components/business-table";
import { businessRepository as repository } from "../services/business-repository";
import type {
  BusinessOrganizationType,
  BusinessRegistryRecord,
  BusinessRegistryStatus,
} from "../types/business-records";

const STATUSES: BusinessRegistryStatus[] = ["Active", "Expiring soon", "Expired", "Closed"];
const ORGANIZATIONS: BusinessOrganizationType[] = ["Sole proprietorship", "Partnership", "Corporation", "Cooperative"];

export function BusinessListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<BusinessRegistryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [barangay, setBarangay] = useState("");
  const [organization, setOrganization] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState<BusinessRegistryRecord>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  useEffect(() => setRecords([...repository.listBusinesses()]), []);
  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Business records are not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );

  const barangays = [...new Set(records.map((record) => record.barangay))];
  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const haystack =
      `${row.id} ${row.registeredName} ${row.tradeName} ${row.ownerName} ${row.permitNumber} ${row.activity} ${row.address}`.toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!barangay || row.barangay === barangay) &&
      (!organization || row.organizationType === organization) &&
      (!status || row.status === status)
    );
  });
  const filtering = Boolean(search || barangay || organization || status);

  function reset() {
    setSearch("");
    setBarangay("");
    setOrganization("");
    setStatus("");
  }

  function remove() {
    if (!deleting) return;
    if (!repository.deleteBusiness(deleting.id)) {
      setErrors([{ id: "form", message: "That business could not be deleted." }]);
      setDeleting(undefined);
      return;
    }
    setRecords((current) => current.filter((record) => record.id !== deleting.id));
    setNotice(`${deleting.id} and its related applications were deleted.`);
    setErrors([]);
    setDeleting(undefined);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Businesses</h1>
          <p>Maintain registered businesses, establishments, owners, permit validity, and contact information.</p>
        </div>
        <Button asChild>
          <Link href="/ops/bpls/businesses/new">
            <Plus />
            New business
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This business could not be changed" />
      <div className="ops-controls">
        <OpsSearch value={search} onChange={setSearch} placeholder="Business, owner, permit, activity, or address…" />
        <OpsFilter
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          anyLabel="Any barangay"
          options={barangays.map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Organization"
          value={organization}
          onChange={setOrganization}
          anyLabel="Any organization"
          width={210}
          options={ORGANIZATIONS.map((value) => ({ value, label: value }))}
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
          icon={filtering ? SearchX : Building2}
          title={filtering ? "No businesses match your filters." : "No businesses in the registry."}
          description={filtering ? "Adjust the search or clear the filters." : "Create the first business record."}
          action={
            filtering ? (
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/ops/bpls/businesses/new">New business</Link>
              </Button>
            )
          }
        />
      ) : (
        <BusinessTable records={rows} onDelete={setDeleting} />
      )}
      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title={`Delete ${deleting?.tradeName ?? "business"}`}
        description="This removes the business record and all related permit applications from the current workspace."
        confirmLabel="Delete business"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

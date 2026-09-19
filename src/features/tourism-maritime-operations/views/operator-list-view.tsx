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

import { OperatorTable } from "../components/operator-table";
import { tourismRepository as repository } from "../services/tourism-repository";
import type { TourismOperator } from "../types/tourism-records";

export function OperatorListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<TourismOperator[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [document, setDocument] = useState("");
  const [deleting, setDeleting] = useState<TourismOperator>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();
  useEffect(() => setRecords([...repository.listOperators()]), []);
  if (role !== "municipal")
    return (
      <PermissionState
        title="Tourism operators are not assigned to this role"
        description="Choose the municipal staff role."
      />
    );
  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const haystack =
      `${row.id} ${row.name} ${row.contactPerson} ${row.businessPermit} ${row.accreditationNumber} ${row.address}`.toLocaleLowerCase();
    const documentMatch =
      !document ||
      row.vessels.some((vessel) => vessel.documentStatus === document) ||
      row.crew.some((member) => member.credentialStatus === document);
    return (!query || haystack.includes(query)) && (!status || row.status === status) && documentMatch;
  });
  const filtering = Boolean(search || status || document);
  function remove() {
    if (!deleting) return;
    if (!repository.deleteOperator(deleting.id))
      setErrors([{ id: "form", message: "That operator could not be deleted." }]);
    else {
      setRecords((current) => current.filter((item) => item.id !== deleting.id));
      setNotice(`${deleting.id} and its related trips were deleted.`);
      setErrors([]);
    }
    setDeleting(undefined);
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Operators</h1>
          <p>Maintain accredited tourism operators, vessels, crew, permits, and credential validity.</p>
        </div>
        <Button asChild>
          <Link href="/ops/tourism/operators/new">
            <Plus />
            New operator
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This operator could not be changed" />
      <div className="ops-controls">
        <OpsSearch
          value={search}
          onChange={setSearch}
          placeholder="Operator, contact, permit, accreditation, or address…"
        />
        <OpsFilter
          label="Eligibility"
          value={status}
          onChange={setStatus}
          anyLabel="Any eligibility"
          options={[
            { value: "eligible", label: "Eligible" },
            { value: "attention", label: "Needs attention" },
          ]}
        />
        <OpsFilter
          label="Credentials"
          value={document}
          onChange={setDocument}
          anyLabel="Any validity"
          options={[
            { value: "valid", label: "Valid" },
            { value: "expiring", label: "Expiring" },
            { value: "expired", label: "Expired" },
          ]}
        />
      </div>
      {rows.length ? (
        <OperatorTable records={rows} onDelete={setDeleting} />
      ) : (
        <EmptyState
          icon={filtering ? SearchX : Building2}
          title={filtering ? "No operators match your filters." : "No tourism operators in the registry."}
          description={filtering ? "Adjust the search or clear the filters." : "Create the first operator record."}
          action={
            filtering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setDocument("");
                }}
              >
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/ops/tourism/operators/new">New operator</Link>
              </Button>
            )
          }
        />
      )}
      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title={`Delete ${deleting?.name ?? "operator"}`}
        description="This removes the operator, vessels, crew, and related trips from the current workspace."
        confirmLabel="Delete operator"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

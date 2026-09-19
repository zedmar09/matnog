"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { KeyRound, Plus, SearchX } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { AccessTable } from "../components/access-table";
import { localRestrictedCaseRepository as repository } from "../services/local-restricted-case-repository";
import type { AccessStatus, CaseAccessAssignment, CaseClass } from "../types/restricted-case";

const CLASSES: CaseClass[] = ["Barangay justice", "VAWC referral", "Child protection", "Blotter record"];
const STATUSES: AccessStatus[] = ["Active", "Revoked", "Expired"];

export function AccessListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<CaseAccessAssignment[]>([]);
  const [search, setSearch] = useState("");
  const [caseClass, setCaseClass] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState<CaseAccessAssignment>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  useEffect(() => setRecords([...repository.assignments]), []);
  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Case access management is not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );
  const roles = [...new Set(records.map((item) => item.staffRole))];
  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const haystack =
      `${row.id} ${row.staffName} ${row.staffRole} ${row.caseClass} ${row.scope} ${row.purpose}`.toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!caseClass || row.caseClass === caseClass) &&
      (!staffRole || row.staffRole === staffRole) &&
      (!status || row.status === status)
    );
  });
  const filtering = Boolean(search || caseClass || staffRole || status);
  function reset() {
    setSearch("");
    setCaseClass("");
    setStaffRole("");
    setStatus("");
  }
  function remove() {
    if (!deleting) return;
    if (!repository.deleteAssignment(deleting.id)) {
      setErrors([{ id: "form", message: "That access assignment could not be deleted." }]);
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
          <h1>Access</h1>
          <p>Manage staff case-class assignments, barangay scope, access purpose, validity, and status.</p>
        </div>
        <Button asChild>
          <Link href="/ops/cases/access/new">
            <Plus />
            New assignment
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This access assignment could not be changed" />
      <div className="ops-controls">
        <OpsSearch
          value={search}
          onChange={setSearch}
          placeholder="Assignment, staff member, role, scope, or purpose…"
        />
        <OpsFilter
          label="Case class"
          value={caseClass}
          onChange={setCaseClass}
          anyLabel="Any class"
          width={220}
          options={CLASSES.map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Staff role"
          value={staffRole}
          onChange={setStaffRole}
          anyLabel="Any staff role"
          options={roles.map((value) => ({ value, label: value }))}
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
          icon={filtering ? SearchX : KeyRound}
          title={filtering ? "No access assignments match your filters." : "No case access assignments in scope."}
          description={filtering ? "Adjust the search or clear the filters." : "Create the first access assignment."}
          action={
            filtering ? (
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/ops/cases/access/new">New assignment</Link>
              </Button>
            )
          }
        />
      ) : (
        <AccessTable records={rows} onDelete={setDeleting} />
      )}
      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title={`Delete ${deleting?.id ?? "access assignment"}`}
        description="This removes the staff access assignment from the current workspace."
        confirmLabel="Delete assignment"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

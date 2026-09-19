"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { FolderLock, Plus, SearchX } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { CaseTable } from "../components/case-table";
import { localRestrictedCaseRepository as repository } from "../services/local-restricted-case-repository";
import type { CaseClass, CasePriority, CaseRecord, CaseStatus } from "../types/restricted-case";

const CLASSES: CaseClass[] = ["Barangay justice", "VAWC referral", "Child protection", "Blotter record"];
const PRIORITIES: CasePriority[] = ["Routine", "Priority", "Urgent"];
const STATUSES: CaseStatus[] = ["New", "Under review", "Scheduled", "Referred", "Resolved", "Closed"];

export function CaseListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<CaseRecord[]>([]);
  const [search, setSearch] = useState("");
  const [caseClass, setCaseClass] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState<CaseRecord>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  useEffect(() => setRecords([...repository.cases]), []);
  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Case management is not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );

  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const haystack =
      `${row.id} ${row.discreetLabel} ${row.caseClass} ${row.scope} ${row.assignedDesk} ${row.assignedOfficer} ${row.schedule} ${row.referral}`.toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!caseClass || row.caseClass === caseClass) &&
      (!priority || row.priority === priority) &&
      (!status || row.status === status)
    );
  });
  const filtering = Boolean(search || caseClass || priority || status);
  function reset() {
    setSearch("");
    setCaseClass("");
    setPriority("");
    setStatus("");
  }
  function remove() {
    if (!deleting) return;
    if (!repository.deleteCase(deleting.id)) {
      setErrors([{ id: "form", message: "That case could not be deleted." }]);
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
          <h1>Cases</h1>
          <p>Manage barangay justice, protection, child protection, and blotter records by assignment and scope.</p>
        </div>
        <Button asChild>
          <Link href="/ops/cases/new">
            <Plus />
            New case
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This case could not be changed" />
      <div className="ops-controls">
        <OpsSearch
          value={search}
          onChange={setSearch}
          placeholder="Reference, label, barangay, desk, officer, or referral…"
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
          width={200}
          options={STATUSES.map((value) => ({ value, label: value }))}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={filtering ? SearchX : FolderLock}
          title={filtering ? "No cases match your filters." : "No case records in scope."}
          description={filtering ? "Adjust the search or clear the filters." : "Create the first case record."}
          action={
            filtering ? (
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/ops/cases/new">New case</Link>
              </Button>
            )
          }
        />
      ) : (
        <CaseTable records={rows} onDelete={setDeleting} />
      )}
      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title={`Delete ${deleting?.id ?? "case"}`}
        description="This removes the case record, its timeline, and its disclosure decisions from the current workspace."
        confirmLabel="Delete case"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

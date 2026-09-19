"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Plus, SearchX, WalletCards } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { LedgerTable } from "../components/ledger-table";
import { localSectoralAssistanceRepository as repository } from "../services/local-sectoral-assistance-repository";
import type { BenefitLedgerEntry, BenefitLedgerStatus } from "../types/sectoral-assistance";

const STATUSES: BenefitLedgerStatus[] = ["Released", "Pending confirmation", "Cancelled"];

export function LedgerQueueView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<BenefitLedgerEntry[]>([]);
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("");
  const [fund, setFund] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState<BenefitLedgerEntry>();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    setRecords([...repository.ledger]);
  }, []);

  if (role !== "municipal" && role !== "barangay") {
    return (
      <PermissionState
        title="The assistance ledger is not assigned to this role"
        description="Choose the municipal or barangay role to review assistance release records."
        action={
          <Button asChild variant="outline">
            <Link href="/ops">Back to workspace overview</Link>
          </Button>
        }
      />
    );
  }

  const programs = [...new Set(records.map((item) => item.program))];
  const funds = [...new Set(records.map((item) => item.fundSource))];
  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const haystack = `${row.id} ${row.requestId} ${row.recipient} ${row.recipientName} ${row.program} ${row.period} ${row.value} ${row.fundSource} ${row.acknowledgment}`.toLocaleLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (program && row.program !== program) return false;
    if (fund && row.fundSource !== fund) return false;
    if (status && row.status !== status) return false;
    return true;
  });
  const filtering = Boolean(search || program || fund || status);

  function reset() {
    setSearch("");
    setProgram("");
    setFund("");
    setStatus("");
  }

  function deleteEntry() {
    if (!deleting) return;
    const removed = repository.deleteLedgerEntry(deleting.id);
    if (!removed) {
      setErrors([{ id: "form", message: "That ledger entry could not be deleted." }]);
      setDeleting(undefined);
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== deleting.id));
    setNotice(`${deleting.id} was deleted from this local UI demo.`);
    setErrors([]);
    setDeleting(undefined);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Ledger</h1>
          <p>Review assistance releases by recipient, program, benefit period, fund source, and acknowledgment.</p>
        </div>
        <Button asChild>
          <Link href="/ops/assistance/ledger/new">
            <Plus />
            New ledger entry
          </Link>
        </Button>
      </div>

      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This ledger entry could not be changed" />

      <div className="ops-controls">
        <OpsSearch
          value={search}
          onChange={setSearch}
          placeholder="Entry, recipient, program, request, or acknowledgment…"
        />
        <OpsFilter
          label="Program"
          value={program}
          onChange={setProgram}
          anyLabel="Any program"
          width={250}
          options={programs.map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Fund source"
          value={fund}
          onChange={setFund}
          anyLabel="Any fund source"
          width={260}
          options={funds.map((value) => ({ value, label: value }))}
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
          icon={filtering ? SearchX : WalletCards}
          title={filtering ? "No ledger entries match your filters." : "No assistance ledger entries in scope."}
          description={filtering ? "Adjust the search or clear the filters." : "Create the first assistance release entry."}
          action={
            filtering ? (
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/ops/assistance/ledger/new">New ledger entry</Link>
              </Button>
            )
          }
        />
      ) : (
        <LedgerTable records={rows} onDelete={setDeleting} />
      )}

      <ConfirmationDialog
        open={deleting !== undefined}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title={`Delete ${deleting?.id ?? "ledger entry"}`}
        description="This removes the entry from the local UI demo. The related beneficiary and assistance request remain unchanged."
        confirmLabel="Delete entry"
        destructive
        onConfirm={deleteEntry}
      />
    </>
  );
}

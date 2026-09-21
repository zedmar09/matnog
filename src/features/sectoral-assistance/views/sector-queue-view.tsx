"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { SearchX, ShieldPlus, UsersRound } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { SectorTable } from "../components/sector-table";
import { sectorDeactivationSchema } from "../schemas/sector-schema";
import { localSectoralAssistanceRepository as repository } from "../services/local-sectoral-assistance-repository";
import type { SectorDeactivation, SectorRecord } from "../types/sectoral-assistance";

const CATEGORIES = ["Senior", "PWD", "Solo parent", "Youth", "4Ps", "IP", "OSY"] as const;
const STATUSES = ["Active", "Evidence review", "Expired", "Deactivated"] as const;

const DEACTIVATION_REASONS: { value: SectorDeactivation["reason"]; label: string; note: string }[] = [
  {
    value: "no-longer-qualified",
    label: "No longer qualified",
    note: "The circumstances behind the status changed. The period up to today stays on file.",
  },
  {
    value: "moved-out",
    label: "Moved out of the municipality",
    note: "The resident left Matnog. The status and its evidence stay on file.",
  },
  { value: "deceased", label: "Deceased", note: "Ends the status on the recorded date." },
  {
    value: "recorded-in-error",
    label: "Recorded in error",
    note: "The registration should not have been made. Deactivating keeps the audit trail.",
  },
];

export function SectorQueueView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState<SectorRecord[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [authority, setAuthority] = useState("");
  const [ending, setEnding] = useState<SectorRecord>();
  const [reason, setReason] = useState<SectorDeactivation["reason"]>("no-longer-qualified");
  const [note, setNote] = useState("");
  const [on, setOn] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  // These records live in memory and the React Compiler would cache a read
  // taken during render, so the read happens in an effect and lands in state.
  useEffect(() => {
    setRecords([...repository.sectorRecords]);
  }, []);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Sector registrations are not assigned to this role"
        description="Choose the municipal or barangay role. Applicant and caseworker information is not exposed here."
        action={
          <Button asChild variant="outline">
            <Link href="/ops">Back to workspace overview</Link>
          </Button>
        }
      />
    );

  const authorities = [...new Set(records.map((item) => item.authority))];
  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const haystack = `${row.id} ${row.personId} ${row.personLabel} ${row.credential}`.toLocaleLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (category && row.category !== category) return false;
    if (status && row.status !== status) return false;
    if (authority && row.authority !== authority) return false;
    return true;
  });
  const filtering = Boolean(search || category || status || authority);

  function reset() {
    setSearch("");
    setCategory("");
    setStatus("");
    setAuthority("");
  }

  function apply(next: SectorRecord, message: string) {
    setRecords((prev) => prev.map((item) => (item.id === next.id ? next : item)));
    setErrors([]);
    setNotice(message);
  }

  function deactivate() {
    if (!ending) return;
    const parsed = sectorDeactivationSchema.safeParse({ reason, note, on: on || "2026-09-19" });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => ({ id: String(issue.path[0] ?? "form"), message: issue.message })));
      return;
    }
    const done = repository.deactivateSectorRecord(ending.id, parsed.data, "MSWDO records officer");
    setEnding(undefined);
    setNote("");
    if (!done) return setErrors([{ id: "form", message: "That status could not be deactivated." }]);
    apply(done, `${done.id} was deactivated.`);
  }

  function reactivate(record: SectorRecord) {
    const done = repository.reactivateSectorRecord(record.id);
    if (!done) return setErrors([{ id: "form", message: "That status is not deactivated." }]);
    apply(done, `${done.id} was reactivated.`);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Beneficiaries</h1>
          <p>
            Senior, PWD, solo parent and youth status by dated period. An age alert opens a review; it never grants a
            status on its own.
          </p>
        </div>
        <Button asChild>
          <Link href="/ops/sectors/new">
            <ShieldPlus />
            New registration
          </Link>
        </Button>
      </div>

      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This registration could not be changed" />

      <div className="ops-controls">
        <OpsSearch value={search} onChange={setSearch} placeholder="Record, resident, ID, or credential…" />
        <OpsFilter
          label="Category"
          value={category}
          onChange={setCategory}
          anyLabel="Any category"
          options={CATEGORIES.map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={STATUSES.map((value) => ({ value, label: value }))}
        />
        <OpsFilter
          label="Issuing office"
          value={authority}
          onChange={setAuthority}
          anyLabel="Any office"
          width={260}
          options={authorities.map((value) => ({ value, label: value }))}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={filtering ? SearchX : UsersRound}
          title={filtering ? "No registrations match your filters." : "No sector registrations in scope."}
          description={
            filtering ? "Adjust the search or clear the filters." : "This role has no assigned sector registrations."
          }
          action={
            filtering ? (
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <SectorTable records={rows} onDeactivate={setEnding} onReactivate={reactivate} />
      )}

      <ConfirmationDialog
        open={ending !== undefined}
        onOpenChange={(next) => !next && setEnding(undefined)}
        title={`Deactivate ${ending?.id ?? "registration"}`}
        description="The status stops applying from the date you give. The record, its period and its evidence stay on file, because a released benefit may have rested on it."
        confirmLabel="Deactivate status"
        destructive
        onConfirm={deactivate}
      >
        <FormField
          id="sectorReason"
          label="Reason"
          required
          hint={DEACTIVATION_REASONS.find((item) => item.value === reason)?.note}
        >
          {(field) => (
            <Select value={reason} onValueChange={(next) => setReason(next as SectorDeactivation["reason"])}>
              <SelectTrigger id={field.id} className="form-select-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEACTIVATION_REASONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField id="sectorOn" label="Effective date" hint="Leave empty to use today's date.">
          {(field) => <Input {...field} type="date" value={on} onChange={(event) => setOn(event.target.value)} />}
        </FormField>
        <FormField id="sectorNote" label="Note" required hint="Recorded on the registration with your office.">
          {(field) => (
            <Textarea
              {...field}
              rows={2}
              placeholder="For example: marriage recorded, the household no longer meets the criteria."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </FormField>
      </ConfirmationDialog>
    </>
  );
}

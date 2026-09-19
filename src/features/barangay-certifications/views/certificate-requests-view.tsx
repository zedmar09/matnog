"use client";

import { useMemo, useState } from "react";

import { SearchX } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { OpsDateFilter, OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { formatStatusLabel } from "@/shared/lib/utils";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { CertificateRequestTable } from "../components/certificate-request-table";
import { certificateRepository } from "../services/certificate-repository";
import type { CertificateWorkspaceRecord } from "../types/certificate-records";

export function CertificateRequestsView() {
  const { role } = useWorkspaceSession();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  // Records changed by a row action, applied over the listed set. The action
  // returns the updated record, so the queue never has to re-read for it.
  const [applied, setApplied] = useState<Record<string, CertificateWorkspaceRecord>>({});
  const [notice, setNotice] = useState<string>();
  const [errors, setErrors] = useState<FieldError[]>([]);

  function reset() {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setDateFilter("");
  }

  const result = useMemo(() => certificateRepository.listForStaff(role), [role]);

  if (role !== "barangay" && role !== "municipal") {
    return (
      <PermissionState
        title="No certificate review queue is assigned"
        description="Choose the barangay or municipal demo role. No request metadata is exposed to this role."
      />
    );
  }

  if (result.kind === "denied") return <PermissionState description={result.message} />;
  if (result.kind !== "success") return <ErrorState onRetry={reset} />;

  const records = result.data.map((item) => applied[item.request.envelope.id] ?? item);
  const normalizedQuery = search.trim().toLocaleLowerCase();
  const filtered = records.filter(({ request }) => {
    const matchesQuery =
      !normalizedQuery ||
      [request.envelope.id, request.subjectLabel, request.certificateTypeLabel, request.purpose].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery),
      );
    return (
      matchesQuery &&
      (!typeFilter || request.certificateTypeId === typeFilter) &&
      (!statusFilter || request.status === statusFilter) &&
      (!dateFilter || request.envelope.createdAt.slice(0, 10) === dateFilter)
    );
  });
  const filtering = Boolean(search || typeFilter || statusFilter || dateFilter);

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Certificate request queue</h1>
          <p>Review requirements, record fee decisions, sign certificates and inspect retained history.</p>
        </div>
      </div>

      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ErrorSummary errors={errors} title="This action needs attention" />

      <div className="ops-controls">
        <OpsSearch value={search} onChange={setSearch} placeholder="Reference, subject, type, or purpose…" />
        <OpsFilter
          label="Document type"
          value={typeFilter}
          onChange={setTypeFilter}
          anyLabel="All document types"
          width={210}
          options={[
            ...new Map(
              records.map(({ request }) => [request.certificateTypeId, request.certificateTypeLabel]),
            ).entries(),
          ].map(([value, label]) => ({ value, label }))}
        />
        <OpsFilter
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          anyLabel="Any status"
          options={[...new Set(records.map(({ request }) => request.status))].map((status) => ({
            value: status,
            label: formatStatusLabel(status),
          }))}
        />
        <OpsDateFilter label="Submitted" value={dateFilter} onChange={setDateFilter} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={filtering ? "No certificate requests match your filters." : "No certificate requests in scope."}
          description={
            filtering
              ? "Adjust the search or filters. A restricted record is never revealed by a filtered search."
              : "This demo role has no assigned certificate requests."
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
        <CertificateRequestTable
          records={filtered}
          role={role}
          onUpdated={(record, message) => {
            setErrors([]);
            setNotice(message);
            setApplied((prev) => ({ ...prev, [record.request.envelope.id]: record }));
          }}
          onFailed={(next) => {
            setNotice(undefined);
            setErrors(next);
          }}
        />
      )}
    </>
  );
}

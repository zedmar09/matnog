"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Archive,
  CheckCircle2,
  Clock3,
  EllipsisVertical,
  Eye,
  Inbox,
  Pencil,
  Plus,
  SearchX,
  UserRoundCheck,
} from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { ServiceDeskSummaryCards } from "../components/service-desk-summary-cards";
import { localServiceDeskRepository as repository } from "../services/local-service-desk-repository";
import type { CitizenRequestStatus, ServiceDeskRequest } from "../types/service-desk";

function displayReference(id: string) {
  return id.replace(/^DEMO-/, "");
}

function statusTone(status: CitizenRequestStatus): StatusTone {
  if (status === "Resolved pending feedback") return "success";
  if (status === "Reopened") return "warning";
  if (status === "Restricted referral") return "destructive";
  if (status === "Archived") return "neutral";
  return "pending";
}

export function ServiceRequestListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => [...repository.requests]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [archiving, setArchiving] = useState<ServiceDeskRequest>();
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter((record) => {
      const haystack =
        `${record.id} ${record.serviceName} ${record.category} ${record.requesterContext} ${record.owner} ${record.location}`.toLocaleLowerCase();
      return (
        (!status || record.status === status) &&
        (!priority || record.priority === priority) &&
        (!normalized || haystack.includes(normalized))
      );
    });
  }, [priority, query, records, status]);

  const totals = records.reduce(
    (sum, record) => ({
      open: sum.open + (["Submitted", "Assigned", "Reopened"].includes(record.status) ? 1 : 0),
      unassigned: sum.unassigned + (record.owner === "Unassigned" ? 1 : 0),
      high: sum.high + (["High", "Urgent"].includes(record.priority) ? 1 : 0),
      resolved: sum.resolved + (record.status === "Resolved pending feedback" ? 1 : 0),
    }),
    { open: 0, unassigned: 0, high: 0, resolved: 0 },
  );

  const columns: DataTableColumn<ServiceDeskRequest>[] = [
    {
      key: "reference",
      header: "Request",
      sortValue: (row) => row.createdAt,
      cell: (row) => (
        <>
          <Link className="registry-member-link" href={`/ops/service-desk/requests/${row.id}`}>
            {displayReference(row.id)}
          </Link>
          <small>{formatDemoDateTime(row.createdAt)}</small>
        </>
      ),
    },
    {
      key: "requester",
      header: "Requester and concern",
      className: "ops-wide-cell",
      sortValue: (row) => row.requesterContext,
      cell: (row) => (
        <>
          <strong>{row.requesterContext}</strong>
          <small>
            {row.serviceName} · {row.category}
          </small>
        </>
      ),
    },
    {
      key: "assignment",
      header: "Assignment and due",
      className: "ops-wide-cell",
      sortValue: (row) => row.owner,
      cell: (row) => (
        <>
          <strong>{row.owner}</strong>
          <small>{row.due}</small>
        </>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortValue: (row) => row.priority,
      cell: (row) => (
        <StatusBadge tone={row.priority === "Urgent" ? "destructive" : row.priority === "High" ? "warning" : "neutral"}>
          {row.priority}
        </StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${displayReference(row.id)}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/service-desk/requests/${row.id}`}>
                <Eye size={14} /> Open request
              </Link>
            </DropdownMenuItem>
            {!["Restricted referral", "Archived"].includes(row.status) && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/service-desk/requests/${row.id}/edit`}>
                  <Pencil size={14} /> Edit request
                </Link>
              </DropdownMenuItem>
            )}
            {!["Restricted referral", "Archived"].includes(row.status) && (
              <DropdownMenuItem onSelect={() => setArchiving(row)}>
                <Archive size={14} /> Archive request
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (role !== "municipal")
    return (
      <PermissionState
        title="Citizen support requires municipal access"
        description="Request records are available to authorized municipal staff."
      />
    );

  function confirmArchive() {
    if (!archiving) return;
    const saved = repository.archiveRequest(archiving.id);
    setArchiving(undefined);
    if (!saved) {
      setNotice("The request could not be archived.");
      return;
    }
    setRecords([...repository.requests]);
    setNotice(`${displayReference(archiving.id)} was archived.`);
  }

  const filtering = Boolean(query || status || priority);
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Requests</h1>
          <p>Manage citizen concerns, assignments, due dates, responses, and resolution status.</p>
        </div>
        <Button asChild>
          <Link href="/ops/service-desk/requests/new">
            <Plus /> New request
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ServiceDeskSummaryCards
        label="Request totals"
        items={[
          { label: "Open requests", value: totals.open, detail: `${records.length} total`, icon: Inbox },
          { label: "Unassigned", value: totals.unassigned, detail: "requires triage", icon: UserRoundCheck },
          { label: "High priority", value: totals.high, detail: "high or urgent", icon: Clock3 },
          { label: "Resolved", value: totals.resolved, detail: "awaiting feedback", icon: CheckCircle2 },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Reference, requester, concern, or office…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          width={220}
          options={[
            { value: "Submitted", label: "Submitted" },
            { value: "Assigned", label: "Assigned" },
            { value: "Resolved pending feedback", label: "Resolved" },
            { value: "Reopened", label: "Reopened" },
            { value: "Archived", label: "Archived" },
          ]}
        />
        <OpsFilter
          label="Priority"
          value={priority}
          onChange={setPriority}
          anyLabel="Any priority"
          options={[
            { value: "Low", label: "Low" },
            { value: "Normal", label: "Normal" },
            { value: "High", label: "High" },
            { value: "Urgent", label: "Urgent" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          initialSort={{ key: "reference", direction: "desc" }}
          summary={`${rows.length} request records`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title={filtering ? "No requests match these filters" : "No requests recorded"}
          description={
            filtering
              ? "Change the search or filters to return to the request register."
              : "Citizen requests will appear here after intake."
          }
        />
      )}
      <ConfirmationDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this request?"
        description="The request remains in history and is removed from active work."
        confirmLabel="Archive request"
        destructive
        onConfirm={confirmArchive}
      />
    </>
  );
}

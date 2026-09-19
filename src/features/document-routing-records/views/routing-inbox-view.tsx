"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { ArrowRight, Inbox, SearchX } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { listDocumentTasks, readDocumentFoundation, taskDueState } from "../services/document-foundation";
import type { RouteTask } from "../types/document-routing";

type InboxRow = { task: RouteTask; reference: string; subject: string };

const tone = (task: RouteTask): StatusTone => {
  if (["approved", "endorsed", "released"].includes(task.state)) return "success";
  if (task.state === "returned") return "destructive";
  if (taskDueState(task) === "overdue") return "warning";
  return task.state === "pending-acknowledgment" ? "pending" : "neutral";
};

export function RoutingInboxView() {
  const { role } = useWorkspaceSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [due, setDue] = useState("");

  const records = useMemo<InboxRow[]>(
    () =>
      listDocumentTasks(role).map((task) => {
        const document = readDocumentFoundation(role, task.documentId);
        return {
          task,
          reference: document?.document.envelope.reference ?? task.documentId,
          subject: document?.document.subject ?? "Document unavailable",
        };
      }),
    [role],
  );

  if (role !== "municipal")
    return (
      <PermissionState
        title="Routing inbox unavailable"
        description="Routing task management is assigned to municipal staff."
      />
    );

  const query = search.trim().toLocaleLowerCase();
  const rows = records.filter((row) => {
    const haystack =
      `${row.task.id} ${row.task.title} ${row.reference} ${row.subject} ${row.task.office.label} ${row.task.assigneePersona}`.toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!status || row.task.state === status) &&
      (!due || taskDueState(row.task) === due)
    );
  });
  const filtering = Boolean(search || status || due);

  const columns: DataTableColumn<InboxRow>[] = [
    {
      key: "task",
      header: "Task and document",
      className: "ops-wide-cell",
      sortValue: (row) => row.task.title,
      cell: (row) => (
        <>
          <strong>{row.task.title}</strong>
          <small>
            {row.task.id} · Stage {row.task.sequence}
          </small>
          <Link className="registry-member-link mt-2" href={`/ops/documents/${row.task.documentId}`}>
            {row.reference} · {row.subject}
          </Link>
        </>
      ),
    },
    {
      key: "office",
      header: "Assignment",
      className: "ops-wide-cell",
      sortValue: (row) => row.task.office.label,
      cell: (row) => (
        <>
          <strong>{row.task.office.label}</strong>
          <small>{row.task.assigneePersona}</small>
        </>
      ),
    },
    {
      key: "due",
      header: "Due and status",
      sortValue: (row) => row.task.dueAt,
      cell: (row) => (
        <>
          <strong>{formatDemoDateTime(row.task.dueAt)}</strong>
          {taskDueState(row.task) === "overdue" && <small className="text-destructive">Overdue</small>}
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge tone={tone(row.task)}>{row.task.state.replaceAll("-", " ")}</StatusBadge>
            {row.task.delegationId && <StatusBadge tone="warning">Delegated</StatusBadge>}
          </div>
        </>
      ),
    },
    {
      key: "action",
      header: "Action",
      headerHidden: true,
      cell: (row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/ops/documents/${row.task.documentId}`}>
            Open task <ArrowRight />
          </Link>
        </Button>
      ),
    },
  ];

  function resetFilters() {
    setSearch("");
    setStatus("");
    setDue("");
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Routing inbox</h1>
          <p>Review assigned document tasks, receiving offices, due dates, and routing decisions.</p>
        </div>
      </div>
      <div className="ops-controls">
        <OpsSearch value={search} onChange={setSearch} placeholder="Task, document, office, or assignee…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={[
            "pending-acknowledgment",
            "received",
            "in-review",
            "returned",
            "endorsed",
            "approved",
            "released",
          ].map((value) => ({
            value,
            label: value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase()),
          }))}
        />
        <OpsFilter
          label="Due state"
          value={due}
          onChange={setDue}
          anyLabel="Any due state"
          options={[
            { value: "open", label: "Open" },
            { value: "overdue", label: "Overdue" },
            { value: "complete", label: "Complete" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.task.id}
          initialSort={{ key: "due", direction: "asc" }}
          summary={`${rows.length} routing ${rows.length === 1 ? "task" : "tasks"}`}
        />
      ) : (
        <EmptyState
          icon={filtering ? SearchX : Inbox}
          title={filtering ? "No tasks match your filters." : "The routing inbox is clear."}
          description={
            filtering ? "Adjust the search or clear the filters." : "Assigned routing tasks will appear here."
          }
          action={
            filtering ? (
              <Button variant="outline" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : undefined
          }
        />
      )}
    </>
  );
}

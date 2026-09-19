"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowRight, Clock3, Inbox, ListChecks, UserRoundCog } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { listDocumentTasks, readDocumentFoundation, taskDueState } from "../services/document-foundation";

type InboxFilter = "all" | "open" | "overdue" | "delegated";

const FILTERS: { id: InboxFilter; label: string }[] = [
  { id: "all", label: "All assigned" },
  { id: "open", label: "Open" },
  { id: "overdue", label: "Overdue" },
  { id: "delegated", label: "Delegated" },
];

export function RoutingInboxView() {
  const { role } = useWorkspaceSession();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const tasks = listDocumentTasks(role);
  if (role !== "municipal") {
    return (
      <PermissionState
        title="No routing inbox for this demo role"
        description="Choose Municipal staff to review the complete S11 routing fixture set."
      />
    );
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "overdue") return taskDueState(task) === "overdue";
    if (filter === "delegated") return !!task.delegationId;
    if (filter === "open") return !["approved", "endorsed", "released", "returned"].includes(task.state);
    return true;
  });
  const overdueCount = tasks.filter((task) => taskDueState(task) === "overdue").length;
  const openCount = tasks.filter(
    (task) => !["approved", "endorsed", "released", "returned"].includes(task.state),
  ).length;
  const delegatedCount = tasks.filter((task) => task.delegationId).length;

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M05 · Document routing</span>
          <h1>Routing inbox</h1>
          <p>Review assigned office tasks without treating the task as the document file or its physical custody.</p>
        </div>
      </div>
      <NoticePanel className="mb-6">
        Due states use the fixed demo clock. Open a task to acknowledge it, record a return or endorsement, or assign
        another stage using local sample data.
      </NoticePanel>

      <section className="document-inbox-summary" aria-labelledby="routing-summary-title">
        <h2 id="routing-summary-title" className="sr-only">
          Routing task summary
        </h2>
        <ContentPanel as="section">
          <ListChecks />
          <div>
            <small>Open work</small>
            <strong>{openCount}</strong>
          </div>
        </ContentPanel>
        <ContentPanel as="section">
          <Clock3 />
          <div>
            <small>Overdue</small>
            <strong>{overdueCount}</strong>
          </div>
        </ContentPanel>
        <ContentPanel as="section">
          <UserRoundCog />
          <div>
            <small>Delegated</small>
            <strong>{delegatedCount}</strong>
          </div>
        </ContentPanel>
      </section>

      <fieldset className="document-inbox-filters">
        <legend className="sr-only">Filter routing tasks</legend>
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </fieldset>

      {filteredTasks.length ? (
        <div className="document-inbox-list">
          {filteredTasks.map((task) => (
            <ContentPanel as="article" key={task.id}>
              <div>
                <small>
                  {task.id} · Stage {task.sequence}
                </small>
                <h2>{task.title}</h2>
                <p>{readDocumentFoundation(role, task.documentId)?.document.subject ?? "Document unavailable"}</p>
                <p className="small-note">
                  {task.office.label} · {task.assigneePersona} · Due {formatDemoDateTime(task.dueAt)}
                </p>
              </div>
              <div className="document-route-badges">
                {taskDueState(task) === "overdue" && <StatusBadge tone="warning">overdue</StatusBadge>}
                {task.delegationId && <StatusBadge tone="destructive">delegation check</StatusBadge>}
                <StatusBadge tone={task.state === "pending-acknowledgment" ? "pending" : "neutral"}>
                  {task.state.replaceAll("-", " ")}
                </StatusBadge>
              </div>
              <Button asChild variant="outline">
                <Link href={`/ops/documents/${task.documentId}`}>
                  Open task <ArrowRight />
                </Link>
              </Button>
            </ContentPanel>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Inbox}
          title={tasks.length ? "No tasks match this filter" : "Inbox is clear"}
          description={tasks.length ? "Choose another task filter." : "No document tasks are assigned in this sample."}
        />
      )}
    </>
  );
}

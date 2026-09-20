"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  Copy,
  FileClock,
  FileText,
  KeyRound,
  Pencil,
  RefreshCcw,
  Send,
  ShieldCheck,
  Tags,
  Waypoints,
} from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { AdministrationTabs } from "../components/admin-ui";
import { ADMIN_SECTION_META, type AdminRecord, type AdminSection } from "../data/admin-fixtures";
import { type AdminAction, adminRepository as repository } from "../services/admin-repository";

type RecordTab = "overview" | "details" | "activity";

function tone(status: string): StatusTone {
  if (
    [
      "Active",
      "Applied",
      "Approved",
      "Completed",
      "Delivered",
      "Healthy",
      "Recorded",
      "Resolved",
      "Validated",
    ].includes(status)
  )
    return "success";
  if (["Cancelled", "Deactivated", "Rejected", "Revoked"].includes(status)) return "destructive";
  if (["Critical", "Degraded", "Delivery failed", "On hold", "Validation failed"].includes(status)) return "warning";
  return "neutral";
}

function availableActions(record: AdminRecord): { action: AdminAction; label: string; icon: typeof CheckCircle2 }[] {
  if (record.section === "users") {
    return record.status === "Active"
      ? [
          { action: "suspend", label: "Suspend account", icon: ShieldCheck },
          { action: "deactivate", label: "Deactivate account", icon: KeyRound },
        ]
      : [{ action: "activate", label: "Activate account", icon: CheckCircle2 }];
  }
  if (record.section === "access") {
    if (record.status === "Requested")
      return [
        { action: "approve", label: "Approve access", icon: CheckCircle2 },
        { action: "reject", label: "Reject request", icon: ShieldCheck },
      ];
    if (["Active", "Approved"].includes(record.status))
      return [{ action: "revoke", label: "Revoke access", icon: KeyRound }];
  }
  if (record.section === "settings") {
    if (["Draft", "Returned", "Validation failed"].includes(record.status))
      return [{ action: "validate", label: "Validate version", icon: CheckCircle2 }];
    if (record.status === "Validated")
      return [
        { action: "approve", label: "Approve version", icon: BadgeCheck },
        { action: "return", label: "Return version", icon: RefreshCcw },
      ];
    if (record.status === "Approved") return [{ action: "activate", label: "Activate version", icon: CheckCircle2 }];
  }
  if (record.section === "privacy") {
    if (record.status === "Received")
      return [
        { action: "assign", label: "Assign review", icon: CircleUserRound },
        { action: "hold", label: "Place on hold", icon: ShieldCheck },
      ];
    if (record.status === "On hold") return [{ action: "release", label: "Release hold", icon: RefreshCcw }];
    if (["Assigned", "In review"].includes(record.status))
      return [
        { action: "complete", label: "Complete review", icon: CheckCircle2 },
        { action: "hold", label: "Place on hold", icon: ShieldCheck },
      ];
  }
  if (record.section === "messages") {
    if (record.status === "Delivery failed") return [{ action: "retry", label: "Retry delivery", icon: RefreshCcw }];
    if (["Draft", "Queued"].includes(record.status))
      return [
        { action: "send", label: "Send message", icon: Send },
        { action: "cancel", label: "Cancel message", icon: ShieldCheck },
      ];
  }
  if (record.section === "integrations") {
    return record.status === "Disabled"
      ? [{ action: "enable", label: "Enable integration", icon: CheckCircle2 }]
      : [
          { action: "verify", label: "Verify health", icon: Activity },
          { action: "disable", label: "Disable integration", icon: ShieldCheck },
        ];
  }
  if (record.section === "operations") {
    if (record.status === "Resolved") return [{ action: "reopen", label: "Reopen record", icon: RefreshCcw }];
    return [
      { action: "assign", label: "Assign owner", icon: CircleUserRound },
      { action: "resolve", label: "Resolve record", icon: CheckCircle2 },
    ];
  }
  if (record.section === "imports") {
    if (record.status === "Needs review")
      return [
        { action: "validate", label: "Validate batch", icon: CheckCircle2 },
        { action: "cancel", label: "Cancel batch", icon: ShieldCheck },
      ];
    if (record.status === "Validated")
      return [
        { action: "apply", label: "Apply batch", icon: BadgeCheck },
        { action: "cancel", label: "Cancel batch", icon: ShieldCheck },
      ];
  }
  return [];
}

function FactGrid({ items }: { items: { label: string; value: React.ReactNode; icon: typeof FileText }[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div className="flex gap-3 rounded-xl border bg-muted/20 p-4" key={item.label}>
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <item.icon size={17} />
          </span>
          <div className="min-w-0">
            <dt className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{item.label}</dt>
            <dd className="mt-1 break-words font-semibold">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function AdminRecordView({ section, recordId }: { section: AdminSection; recordId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [record, setRecord] = useState(() => repository.find(section, recordId));
  const [tab, setTab] = useState<RecordTab>("overview");
  const [notice, setNotice] = useState("");
  const meta = ADMIN_SECTION_META[section];
  if (role !== "municipal")
    return (
      <PermissionState
        title="Administration requires municipal access"
        description="Authorized municipal staff can review administration records."
      />
    );
  if (!record)
    return (
      <EmptyState
        icon={FileText}
        headingLevel="h1"
        title={`${meta.singular} unavailable`}
        description="The requested administration record could not be found."
        action={
          <Button asChild variant="outline">
            <Link href={`/ops/admin/${section}`}>Return to {meta.title.toLocaleLowerCase()}</Link>
          </Button>
        }
      />
    );
  const refresh = (message: string) => {
    setRecord(repository.find(section, recordId));
    setNotice(message);
  };
  const actions = availableActions(record);
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href={`/ops/admin/${section}`}>
            <ArrowLeft size={15} /> {meta.title}
          </Link>
          <h1>{record.title}</h1>
          <p>
            {record.id} · {record.office}
          </p>
        </div>
        {!record.immutable && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/ops/admin/${section}/${record.id}/edit`}>
                <Pencil /> Edit record
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const copy = repository.duplicate(section, record.id);
                if (copy) router.push(`/ops/admin/${section}/${copy.id}`);
              }}
            >
              <Copy /> Duplicate
            </Button>
          </div>
        )}
      </div>
      <AdministrationTabs active={section} />
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <nav className="ops-area-tabs" aria-label={`${meta.singular} record sections`}>
        {(["overview", "details", "activity"] as const).map((item) => (
          <button type="button" data-state={tab === item ? "on" : "off"} onClick={() => setTab(item)} key={item}>
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>
      {tab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,.7fr)]">
          <ContentPanel as="section">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="eyebrow">{record.subtitle}</span>
                <h2>Record overview</h2>
              </div>
              <StatusBadge tone={tone(record.status)}>{record.status}</StatusBadge>
            </div>
            <p className="mt-4 text-muted-foreground leading-7">{record.description}</p>
            <div className="mt-5">
              <FactGrid
                items={[
                  { label: "Responsible office", value: record.office, icon: Building2 },
                  { label: "Accountable owner", value: record.owner, icon: CircleUserRound },
                  { label: "Reference", value: record.reference, icon: FileText },
                  { label: "Priority", value: record.priority, icon: BadgeCheck },
                  { label: "Scope", value: record.scope, icon: ShieldCheck },
                  { label: "Target", value: record.target, icon: Waypoints },
                ]}
              />
            </div>
          </ContentPanel>
          <div className="grid content-start gap-6">
            <ContentPanel as="aside">
              <span className="eyebrow">Record control</span>
              <h2>Available actions</h2>
              {record.immutable ? (
                <div className="mt-4 rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="text-primary" size={18} /> Immutable audit event
                  </div>
                  <p className="mt-2 text-muted-foreground text-sm">
                    This event is retained as recorded and cannot be changed.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-2">
                  {actions.length ? (
                    actions.map((item) => (
                      <Button
                        variant={
                          item.action === "deactivate" ||
                          item.action === "reject" ||
                          item.action === "revoke" ||
                          item.action === "disable" ||
                          item.action === "cancel"
                            ? "outline"
                            : "default"
                        }
                        onClick={() => {
                          const updated = repository.transition(
                            section,
                            record.id,
                            item.action,
                            `Action completed by ${record.owner} after administrative review.`,
                          );
                          if (updated) refresh(`${record.id} is now ${updated.status}.`);
                        }}
                        key={item.action}
                      >
                        <item.icon /> {item.label}
                      </Button>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No status action is required for this record.</p>
                  )}
                </div>
              )}
            </ContentPanel>
            <ContentPanel as="aside">
              <span className="eyebrow">Dates</span>
              <h2>Record timeline</h2>
              <FactGrid
                items={[
                  { label: "Created", value: record.createdAt, icon: CalendarDays },
                  { label: "Updated", value: record.updatedAt, icon: FileClock },
                  { label: "Effective", value: record.effectiveDate || "Upon approval", icon: CalendarDays },
                  { label: "Expires", value: record.expiresAt || "No expiry", icon: CalendarDays },
                ]}
              />
            </ContentPanel>
          </div>
        </div>
      )}
      {tab === "details" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ContentPanel as="section">
            <span className="eyebrow">Operational boundary</span>
            <h2>Scope and destination</h2>
            <div className="mt-5">
              <FactGrid
                items={[
                  { label: "Scope", value: record.scope, icon: ShieldCheck },
                  { label: "Channel", value: record.channel, icon: Waypoints },
                  { label: "Target", value: record.target, icon: Send },
                  { label: "Reference", value: record.reference, icon: FileText },
                ]}
              />
            </div>
          </ContentPanel>
          <ContentPanel as="section">
            <span className="eyebrow">Classification</span>
            <h2>Record tags</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {record.tags.map((tag) => (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 font-semibold text-primary text-sm"
                  key={tag}
                >
                  <Tags size={14} /> {tag}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-xl border bg-muted/20 p-4">
              <strong>{record.subtitle}</strong>
              <p className="mt-2 text-muted-foreground leading-7">{record.description}</p>
            </div>
          </ContentPanel>
        </div>
      )}
      {tab === "activity" && (
        <ContentPanel as="section">
          <span className="eyebrow">Accountability</span>
          <h2>Record history</h2>
          <div className="mt-5 grid gap-3">
            {record.history.map((entry, index) => (
              <div className="flex gap-3 rounded-xl border bg-muted/20 p-4" key={entry}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                  {record.history.length - index}
                </span>
                <div>
                  <strong>{entry}</strong>
                  <p className="mt-1 text-muted-foreground text-sm">Recorded against {record.id}</p>
                </div>
              </div>
            ))}
          </div>
        </ContentPanel>
      )}
    </>
  );
}

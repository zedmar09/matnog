"use client";

import { type ReactNode, useMemo, useState } from "react";

import Link from "next/link";

import {
  Activity,
  BellRing,
  DatabaseBackup,
  FileClock,
  FileUp,
  KeyRound,
  Settings2,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { DataTable } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { DemoClockControl } from "@/shared/components/scenario-panel";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatDemoDate } from "@/shared/data/demo-clock";
import { useDemoNow } from "@/shared/hooks/use-demo-clock";
import {
  useWorkspaceSession,
  type WorkspaceRole,
  type WorkspaceScenario,
} from "@/shared/providers/workspace-session-provider";

import { ACCESS_ROWS, type AdminWorkspaceKind, AUDIT_EVENTS } from "../data/admin-fixtures";
import { adminRepository } from "../services/admin-repository";

const META: Record<AdminWorkspaceKind, { eyebrow: string; title: string; description: string; icon: typeof UserCog }> =
  {
    users: {
      eyebrow: "M17 · Joiner, mover, leaver",
      title: "Demo identities and assignments",
      description: "Review office assignments without managing real accounts.",
      icon: UserCog,
    },
    access: {
      eyebrow: "M17 · Purpose and scope",
      title: "Access review",
      description: "Explain role, field, scope, and purpose boundaries with safe local decisions.",
      icon: KeyRound,
    },
    configuration: {
      eyebrow: "M17 · Versioned rules",
      title: "Configuration versions",
      description: "Compare planned forms and workflow versions before an effective date.",
      icon: Settings2,
    },
    audit: {
      eyebrow: "M17 · Redacted evidence",
      title: "Audit activity",
      description: "Review a nonrevealing action and read-log projection.",
      icon: FileClock,
    },
    privacy: {
      eyebrow: "M17 · Purpose and retention",
      title: "Privacy work queue",
      description: "Review correction, purpose, retention, hold, and disposition previews.",
      icon: ShieldCheck,
    },
    notifications: {
      eyebrow: "M17 · Local outbox",
      title: "Notification operations",
      description: "Inspect delivery states, preferences, and retry behavior.",
      icon: BellRing,
    },
    integrations: {
      eyebrow: "M17 · Provider simulations",
      title: "Integration status",
      description: "Review minimum data purpose, masked placeholders, errors, and reconciliation.",
      icon: Activity,
    },
    operations: {
      eyebrow: "M17 · Recovery exercises",
      title: "Platform operations",
      description: "Walk through device, sync, incident, and restore states using local fixtures.",
      icon: DatabaseBackup,
    },
    imports: {
      eyebrow: "M17 · Source validation",
      title: "Import preview",
      description: "Resolve invalid rows and possible duplicates before a local apply simulation.",
      icon: FileUp,
    },
  };

const ADMIN_LINKS: readonly { kind: AdminWorkspaceKind; label: string; href: string }[] = [
  { kind: "users", label: "Users", href: "/ops/admin/users" },
  { kind: "access", label: "Access", href: "/ops/admin/access" },
  { kind: "configuration", label: "Configuration", href: "/ops/admin/configuration" },
  { kind: "audit", label: "Audit", href: "/ops/admin/audit" },
  { kind: "privacy", label: "Privacy", href: "/ops/admin/privacy" },
  { kind: "notifications", label: "Notifications", href: "/ops/admin/notifications" },
  { kind: "integrations", label: "Integrations", href: "/ops/admin/integrations" },
  { kind: "operations", label: "Operations", href: "/ops/admin/operations" },
  { kind: "imports", label: "Imports", href: "/ops/admin/imports" },
];

function AdminBoundary({ children }: { children: ReactNode }) {
  const { role, scenario, setScenario } = useWorkspaceSession();
  if (role !== "municipal" || scenario === "denied")
    return (
      <PermissionState
        title="Administration workspace unavailable"
        description="Choose the Municipal staff demo role. Administrative projections and review notes are scoped away from other personas."
      />
    );
  if (scenario === "slow") return <LoadingState label="Loading administration projection…" />;
  if (scenario === "error")
    return (
      <ErrorState
        title="Administration projection unavailable"
        description="The local fixture failed. No identity, provider, backup, or integration system was contacted."
        onRetry={() => setScenario("normal")}
      />
    );
  if (scenario === "empty")
    return (
      <EmptyState
        icon={UserCog}
        headingLevel="h1"
        title="No administration tasks"
        description="The selected local scenario contains no assigned platform records."
      />
    );
  return children;
}

function WorkspaceHeader({ kind }: { kind: AdminWorkspaceKind }) {
  const meta = META[kind];
  const Icon = meta.icon;
  return (
    <div className="ops-topline">
      <div>
        <span className="eyebrow">{meta.eyebrow}</span>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
      </div>
      <Icon className="text-primary" size={32} aria-hidden="true" />
    </div>
  );
}

function UsersWorkspace() {
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState<string>();
  const [reason, setReason] = useState("Reviewed for the stated office purpose and validity.");
  const [name, setName] = useState("Sample Incoming Staff");
  const [office, setOffice] = useState("Municipal Treasurer's Office");
  const [assignment, setAssignment] = useState("Collections observer");
  const [change, setChange] = useState("Joiner simulation");
  const identities = adminRepository.listIdentities();
  const refresh = () => setRevision((value) => value + 1);
  const requestAssignment = () => {
    const updated = adminRepository.requestAssignment({ name, office, assignment, change, reason });
    setNotice(
      updated
        ? `${updated.id} created as a pending local assignment request.`
        : "Complete the identity, office, assignment, and reason before creating the request.",
    );
    if (updated) refresh();
  };
  const decide = (id: string, decision: "approve" | "reject" | "deactivate") => {
    const updated = adminRepository.decideIdentity(id, decision, reason);
    setNotice(
      updated
        ? `${updated.id} is now ${updated.state}. Current UI context would be cleared when access ends.`
        : "The transition is unavailable. Check the current state, reason, and self-approval rule.",
    );
    if (updated) refresh();
  };
  return (
    <>
      <ContentPanel className="mb-6">
        <h2 className="text-base">Create joiner, mover, or leaver request</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input aria-label="Identity name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input aria-label="Office assignment" value={office} onChange={(event) => setOffice(event.target.value)} />
          <Input
            aria-label="Role assignment"
            value={assignment}
            onChange={(event) => setAssignment(event.target.value)}
          />
          <NativeSelect
            aria-label="Assignment change type"
            value={change}
            onChange={(event) => setChange(event.target.value)}
          >
            <option>Joiner simulation</option>
            <option>Mover simulation</option>
            <option>Leaver simulation</option>
          </NativeSelect>
        </div>
        <Textarea
          className="mt-3"
          aria-label="Assignment reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button type="button" className="mt-3" onClick={requestAssignment}>
          Create local request
        </Button>
      </ContentPanel>
      {notice && (
        <div className="registry-save-notice mb-4" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-4" data-revision={revision}>
        {identities.map((item) => (
          <ContentPanel as="article" key={item.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="eyebrow">
                  {item.id} · {item.office}
                </span>
                <h2 className="mt-1 text-base">{item.name}</h2>
              </div>
              <StatusBadge
                tone={
                  item.state.includes("Active") ? "success" : item.state.includes("Rejected") ? "warning" : "neutral"
                }
              >
                {item.state}
              </StatusBadge>
            </div>
            <p className="muted mt-3">
              {item.assignment} · {item.requestedChange}
            </p>
            <PanelDivider />
            <p className="text-sm">
              Requester {item.requester} · reviewer {item.reviewer}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={item.state !== "Pending owner review"}
                onClick={() => decide(item.id, "approve")}
              >
                Approve assignment
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={item.state !== "Pending owner review"}
                onClick={() => decide(item.id, "reject")}
              >
                Reject
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!item.state.includes("Active")}
                onClick={() => decide(item.id, "deactivate")}
              >
                Deactivate access
              </Button>
            </div>
            <PanelDivider />
            <div className="grid gap-1 text-sm">
              {item.history.map((entry) => (
                <p key={entry}>• {entry}</p>
              ))}
            </div>
          </ContentPanel>
        ))}
      </div>
    </>
  );
}

function AccessWorkspace() {
  const { setRole } = useWorkspaceSession();
  const [scopeRemoved, setScopeRemoved] = useState(false);
  const [revision, setRevision] = useState(0);
  const [reason, setReason] = useState("Confirmed office ownership, minimum fields, purpose, and validity.");
  const [notice, setNotice] = useState<string>();
  const reviews = adminRepository.listAccessReviews();
  const decide = (id: string, decision: "approve" | "reject" | "deactivate") => {
    const updated = adminRepository.decideAccess(id, decision, reason);
    setNotice(
      updated
        ? `${updated.id} is now ${updated.state}. The local capability projection and history were updated together.`
        : "The decision is blocked by state, expiry, self-approval, or an incomplete reason.",
    );
    if (updated) setRevision((value) => value + 1);
  };
  return (
    <>
      <NoticePanel className="mb-6">
        System administration does not grant M10 narrative access. Removing scope clears the current local selection.
      </NoticePanel>
      <DataTable
        columns={[
          {
            key: "capability",
            header: "Capability",
            sortValue: (row) => row.capability,
            cell: (row) => row.capability,
          },
          { key: "municipal", header: "Municipal", cell: (row) => row.municipal },
          { key: "barangay", header: "Barangay", cell: (row) => row.barangay },
          { key: "partner", header: "Partner", cell: (row) => row.partner },
          { key: "purpose", header: "Purpose", cell: (row) => row.purpose },
        ]}
        rows={ACCESS_ROWS}
        getRowKey={(row) => row.capability}
      />
      <div className="mt-5">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setScopeRemoved(true);
            setRole("municipal");
          }}
        >
          Simulate scope removal
        </Button>
        {scopeRemoved && (
          <div className="registry-save-notice mt-3" role="status">
            Scope removed locally. Open record context and cached selections were cleared.
          </div>
        )}
      </div>
      <ContentPanel className="my-6">
        <label className="grid gap-2 font-medium text-sm">
          Access decision reason
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
      </ContentPanel>
      {notice && (
        <div className="registry-save-notice mb-4" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-4" data-revision={revision}>
        {reviews.map((item) => (
          <ContentPanel as="article" key={item.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="eyebrow">
                  {item.id} · {item.account}
                </span>
                <h2 className="mt-1 text-base">{item.role}</h2>
              </div>
              <StatusBadge
                tone={
                  item.state.includes("Active")
                    ? "success"
                    : item.state.includes("conflict") || item.state === "Expired"
                      ? "warning"
                      : "neutral"
                }
              >
                {item.state}
              </StatusBadge>
            </div>
            <dl className="registry-facts mt-4">
              <div>
                <dt>Scope and fields</dt>
                <dd>
                  {item.scope} · {item.fields}
                </dd>
              </div>
              <div>
                <dt>Purpose</dt>
                <dd>{item.purpose}</dd>
              </div>
              <div>
                <dt>Validity</dt>
                <dd>Until {item.validUntil}</dd>
              </div>
              <div>
                <dt>Review separation</dt>
                <dd>
                  {item.requester} → {item.reviewer}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                disabled={item.state !== "Requested"}
                onClick={() => decide(item.id, "approve")}
              >
                Approve capability
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={!["Requested", "Self-approval conflict", "Expired"].includes(item.state)}
                onClick={() => decide(item.id, "reject")}
              >
                Reject request
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={item.state !== "Active demo capability"}
                onClick={() => decide(item.id, "deactivate")}
              >
                Deactivate and clear context
              </Button>
            </div>
            <PanelDivider />
            <div className="grid gap-1 text-sm">
              {item.history.map((entry) => (
                <p key={entry}>• {entry}</p>
              ))}
            </div>
          </ContentPanel>
        ))}
      </div>
    </>
  );
}

function ConfigurationWorkspace() {
  const now = useDemoNow();
  const [revision, setRevision] = useState(0);
  const [reason, setReason] = useState("Dependencies, sample values, and effective date were reviewed.");
  const [notice, setNotice] = useState<string>();
  const configs = adminRepository.listConfigs();
  const decide = (id: string, decision: "validate" | "approve" | "activate" | "return") => {
    const updated = adminRepository.transitionConfig(id, decision, reason);
    setNotice(
      updated
        ? `${updated.id} is now ${updated.state}. Existing records keep their original version snapshot.`
        : "That transition is not available. Check validation, review state, effective date, and reason.",
    );
    if (updated) setRevision((value) => value + 1);
  };
  return (
    <>
      <ContentPanel className="mb-6">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <label className="grid gap-2 font-medium text-sm">
            Configuration review reason
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <DemoClockControl />
        </div>
        <p className="muted mt-3 text-sm">Effective-date preview: {formatDemoDate(new Date(now).toISOString())}</p>
      </ContentPanel>
      {notice && (
        <div className="registry-save-notice mb-4" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-4" data-revision={revision}>
        {configs.map((item) => (
          <ContentPanel as="article" key={item.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="eyebrow">{item.id}</span>
                <h2 className="mt-1 text-base">{item.name}</h2>
              </div>
              <StatusBadge
                tone={item.state === "Active" ? "success" : item.state.includes("failed") ? "warning" : "neutral"}
              >
                {item.state}
              </StatusBadge>
            </div>
            <dl className="registry-facts mt-4">
              <div>
                <dt>Current snapshot</dt>
                <dd>{item.current}</dd>
              </div>
              <div>
                <dt>Proposed version</dt>
                <dd>{item.proposed}</dd>
              </div>
              <div>
                <dt>Impact</dt>
                <dd>{item.impact}</dd>
              </div>
              <div>
                <dt>Effective date</dt>
                <dd>{item.effectiveDate}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={!["Draft", "Returned"].includes(item.state)}
                onClick={() => decide(item.id, "validate")}
              >
                Validate dependencies
              </Button>
              <Button
                size="sm"
                type="button"
                disabled={item.state !== "Validated"}
                onClick={() => decide(item.id, "approve")}
              >
                Approve / schedule
              </Button>
              <Button
                size="sm"
                type="button"
                disabled={
                  !["Scheduled", "Approved"].includes(item.state) ||
                  Date.parse(`${item.effectiveDate}T00:00:00+08:00`) > now
                }
                onClick={() => decide(item.id, "activate")}
              >
                Activate through demo clock
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={item.state === "Active"}
                onClick={() => decide(item.id, "return")}
              >
                Return with reason
              </Button>
            </div>
            <PanelDivider />
            <div className="grid gap-1 text-sm">
              {item.history.map((entry) => (
                <p key={entry}>• {entry}</p>
              ))}
            </div>
          </ContentPanel>
        ))}
      </div>
    </>
  );
}

function AuditWorkspace() {
  const [prepared, setPrepared] = useState(false);
  const [actor, setActor] = useState("all");
  const [action, setAction] = useState("all");
  const events = AUDIT_EVENTS.filter(
    (item) => (actor === "all" || item.actor === actor) && (action === "all" || item.action === action),
  );
  return (
    <>
      <NoticePanel className="mb-6">
        Sensitive narratives, attachment details, and hidden M10 record bodies are excluded from this projection and its
        sample export.
      </NoticePanel>
      <ContentPanel className="mb-5">
        <div className="grid gap-3 md:grid-cols-2">
          <NativeSelect aria-label="Audit actor" value={actor} onChange={(event) => setActor(event.target.value)}>
            <option value="all">All permitted actors</option>
            {[...new Set(AUDIT_EVENTS.map((item) => item.actor))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Audit action" value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="all">All permitted actions</option>
            {[...new Set(AUDIT_EVENTS.map((item) => item.action))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </NativeSelect>
        </div>
      </ContentPanel>
      {events.length === 0 ? (
        <EmptyState
          icon={FileClock}
          title="No audit events match"
          description="Change the safe actor or action filter."
        />
      ) : (
        <div className="grid gap-4">
          {events.map((item) => (
            <ContentPanel as="article" key={item.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <strong>{item.action}</strong>
                <StatusBadge tone="neutral">{item.time}</StatusBadge>
              </div>
              <p className="muted mt-2 text-sm">
                {item.actor} · {item.record} · {item.purpose}
              </p>
              <p className="muted mt-2 text-sm">
                {item.version} · reason: {item.reason}
              </p>
            </ContentPanel>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" className="mt-5" onClick={() => setPrepared(true)}>
        Prepare watermarked sample export
      </Button>
      {prepared && (
        <div className="registry-save-notice mt-3" role="status">
          Redacted export preview prepared locally. No file left the prototype.
        </div>
      )}
    </>
  );
}

function PrivacyWorkspace() {
  const [revision, setRevision] = useState(0);
  const [reason, setReason] = useState(
    "Reviewed against the purpose register, notice, retention rule, and legal hold.",
  );
  const [notice, setNotice] = useState<string>();
  const tasks = adminRepository.listPrivacyTasks();
  const decide = (id: string, decision: "review" | "request-hold-release" | "dispose") => {
    const updated = adminRepository.transitionPrivacy(id, decision, reason);
    setNotice(
      updated
        ? `${updated.id} is now ${updated.state}; its local privacy history was retained.`
        : "The transition is blocked by the legal hold, current review state, or reason requirement.",
    );
    if (updated) setRevision((value) => value + 1);
  };
  return (
    <>
      <ContentPanel className="mb-6">
        <h2 className="text-base">Privacy notice and purpose register</h2>
        <p className="muted mt-2 text-sm">
          Service delivery, legal obligation, and approved program purposes remain distinct sample entries. A
          disposition preview never deletes a file.
        </p>
        <Textarea
          className="mt-3"
          aria-label="Privacy decision reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </ContentPanel>
      {notice && (
        <div className="registry-save-notice mb-4" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-4" data-revision={revision}>
        {tasks.map((item) => (
          <ContentPanel as="article" key={item.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="eyebrow">{item.id}</span>
                <h2 className="mt-1 text-base">{item.title}</h2>
              </div>
              <StatusBadge tone={item.state.includes("Blocked") ? "warning" : "neutral"}>{item.state}</StatusBadge>
            </div>
            <p className="muted mt-3">{item.detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" type="button" disabled={item.hold} onClick={() => decide(item.id, "review")}>
                Record local review
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={!item.hold || item.state === "Hold release review requested"}
                onClick={() => decide(item.id, "request-hold-release")}
              >
                Request hold-release review
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={item.hold || item.state !== "Reviewed locally"}
                onClick={() => decide(item.id, "dispose")}
              >
                Preview disposition
              </Button>
            </div>
            <PanelDivider />
            <div className="grid gap-1 text-sm">
              {item.history.map((entry) => (
                <p key={entry}>• {entry}</p>
              ))}
            </div>
          </ContentPanel>
        ))}
      </div>
    </>
  );
}

function NotificationsWorkspace() {
  const [revision, setRevision] = useState(0);
  const [serviceUpdates, setServiceUpdates] = useState(true);
  const [emergencyNotices, setEmergencyNotices] = useState(true);
  const [reason, setReason] = useState("Retry requested after reviewing the masked local provider error.");
  const [notice, setNotice] = useState<string>();
  const items = adminRepository.listOutbox();
  const retry = (id: string) => {
    const updated = adminRepository.retryMessage(id, reason);
    setNotice(
      updated ? `${updated.id} is now ${updated.state}; no provider was contacted.` : "Add a complete retry reason.",
    );
    if (updated) setRevision((value) => value + 1);
  };
  return (
    <>
      <NoticePanel className="mb-6">
        Recipients are masked and no SMS, email, or push provider is contacted.
      </NoticePanel>
      <ContentPanel className="mb-6">
        <h2 className="text-base">Preference and sample-cost separation</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={serviceUpdates}
              onChange={(event) => setServiceUpdates(event.target.checked)}
            />
            Opted-in service updates
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emergencyNotices}
              onChange={(event) => setEmergencyNotices(event.target.checked)}
            />
            Emergency notice preference
          </label>
        </div>
        <p className="muted mt-3 text-sm">
          Sample cost dashboard: PHP 0.00 · local preview only · preferences do not send messages.
        </p>
        <Textarea
          className="mt-3"
          aria-label="Notification retry reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </ContentPanel>
      {notice && (
        <div className="registry-save-notice mb-4" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-4" data-revision={revision}>
        {items.map((item) => (
          <ContentPanel as="article" key={item.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="eyebrow">
                  {item.id} · {item.direction} · {item.channel}
                </span>
                <h2 className="mt-1 text-base">{item.purpose}</h2>
              </div>
              <StatusBadge
                tone={
                  item.state.includes("Delivered") ? "success" : item.state.includes("failure") ? "warning" : "neutral"
                }
              >
                {item.state}
              </StatusBadge>
            </div>
            <p className="muted mt-3">
              {item.recipient} · {item.attempts} sample attempts
            </p>
            <p className="muted mt-2 text-sm">
              {item.correlationId} · {item.cost}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              disabled={item.state.includes("Delivered")}
              onClick={() => retry(item.id)}
            >
              Retry local simulation
            </Button>
            <PanelDivider />
            <div className="grid gap-1 text-sm">
              {item.history.map((entry) => (
                <p key={entry}>• {entry}</p>
              ))}
            </div>
          </ContentPanel>
        ))}
      </div>
    </>
  );
}

function IntegrationsWorkspace() {
  const [revision, setRevision] = useState(0);
  const [reason, setReason] = useState("Reviewed masked evidence and replayed the local correlation event.");
  const [notice, setNotice] = useState<string>();
  const integrations = adminRepository.listIntegrations();
  const retry = (id: string) => {
    const updated = adminRepository.retryIntegration(id, reason);
    setNotice(
      updated
        ? `${updated.id} is now ${updated.status}. Payment remains subject to M06 confirmation.`
        : "Add a complete reconciliation reason.",
    );
    if (updated) setRevision((value) => value + 1);
  };
  return (
    <>
      <NoticePanel className="mb-6">
        Credentials are masked placeholders. A retry cannot create payment, departure, receipt, or publication
        authority.
      </NoticePanel>
      <Textarea
        className="mb-6"
        aria-label="Integration retry reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {notice && (
        <div className="registry-save-notice mb-4" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-4" data-revision={revision}>
        {integrations.map((item) => (
          <ContentPanel as="article" key={item.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="eyebrow">
                  {item.id} · {item.owner}
                </span>
                <h2 className="mt-1 text-base">{item.name}</h2>
              </div>
              <StatusBadge
                tone={
                  item.status === "Reconciled locally"
                    ? "success"
                    : item.status.includes("Failure") || item.status === "Retryable"
                      ? "warning"
                      : "neutral"
                }
              >
                {item.status}
              </StatusBadge>
            </div>
            <dl className="registry-facts mt-4">
              <div>
                <dt>Minimum data purpose</dt>
                <dd>{item.purpose}</dd>
              </div>
              <div>
                <dt>Credential projection</dt>
                <dd>{item.credential}</dd>
              </div>
              <div>
                <dt>Correlation reference</dt>
                <dd>{item.correlationId}</dd>
              </div>
            </dl>
            <Button type="button" variant="outline" className="mt-4" onClick={() => retry(item.id)}>
              Retry and reconcile locally
            </Button>
            <PanelDivider />
            <div className="grid gap-1 text-sm">
              {item.history.map((entry) => (
                <p key={entry}>• {entry}</p>
              ))}
            </div>
          </ContentPanel>
        ))}
      </div>
    </>
  );
}

function OperationsWorkspace() {
  const [revision, setRevision] = useState(0);
  const [reason, setReason] = useState("Completed the local recovery checklist and reviewed affected sample queues.");
  const [snapshotChecked, setSnapshotChecked] = useState(false);
  const [impactChecked, setImpactChecked] = useState(false);
  const [notice, setNotice] = useState<string>();
  const items = adminRepository.listOperations();
  const decide = (id: string, decision: "assign" | "retry-sync" | "restore") => {
    if (decision === "restore" && (!snapshotChecked || !impactChecked)) {
      setNotice("Complete both recovery checklist items before the local restore exercise.");
      return;
    }
    const updated = adminRepository.transitionOperation(id, decision, reason);
    setNotice(
      updated
        ? `${updated.id} is now ${updated.state}. No production device or backup changed.`
        : "The action is unavailable for this item or reason.",
    );
    if (updated) setRevision((value) => value + 1);
  };
  return (
    <>
      <ContentPanel className="mb-6">
        <h2 className="text-base">Restore and incident checklist</h2>
        <div className="mt-3 grid gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={snapshotChecked}
              onChange={(event) => setSnapshotChecked(event.target.checked)}
            />
            Selected backup timestamp and result
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={impactChecked}
              onChange={(event) => setImpactChecked(event.target.checked)}
            />
            Reviewed devices, unsynced drafts, and incident impact
          </label>
          <Textarea
            aria-label="Operations action reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      </ContentPanel>
      {notice && (
        <div className="registry-save-notice mb-4" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-4" data-revision={revision}>
        {items.map((item) => (
          <ContentPanel as="article" key={item.id}>
            <span className="eyebrow">{item.id}</span>
            <div className="mt-1 flex flex-wrap justify-between gap-3">
              <h2 className="text-base">{item.name}</h2>
              <StatusBadge tone="neutral">{item.state}</StatusBadge>
            </div>
            <p className="muted mt-3">{item.detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.id === "DEMO-OPS-004" && (
                <Button size="sm" type="button" variant="outline" onClick={() => decide(item.id, "assign")}>
                  Acknowledge incident
                </Button>
              )}
              {["DEMO-OPS-002", "DEMO-OPS-003"].includes(item.id) && (
                <Button size="sm" type="button" variant="outline" onClick={() => decide(item.id, "retry-sync")}>
                  Stage local sync retry
                </Button>
              )}
              {item.id === "DEMO-OPS-001" && (
                <Button
                  size="sm"
                  type="button"
                  disabled={!snapshotChecked || !impactChecked}
                  onClick={() => decide(item.id, "restore")}
                >
                  Run local restore exercise
                </Button>
              )}
            </div>
            <PanelDivider />
            <div className="grid gap-1 text-sm">
              {item.history.map((entry) => (
                <p key={entry}>• {entry}</p>
              ))}
            </div>
          </ContentPanel>
        ))}
      </div>
    </>
  );
}

function ImportsWorkspace() {
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState<string>();
  const rows = adminRepository.listImportRows();
  const unresolved = rows.some((row) => row.decision === "Human review");
  const decide = (row: number, decision: "Include" | "Merge reviewed duplicate" | "Exclude") => {
    const updated = adminRepository.decideImportRow(row, decision);
    setNotice(
      updated
        ? `Row ${row} is now ${updated.decision}.`
        : "Invalid rows can only be excluded from this local apply preview.",
    );
    if (updated) setRevision((value) => value + 1);
  };
  const apply = () => {
    const result = adminRepository.applyImport();
    setNotice(
      result
        ? `Local import preview: ${result.included} included, ${result.merged} merged after review, ${result.excluded} excluded.`
        : "Resolve every possible duplicate before applying the local preview.",
    );
  };
  return (
    <>
      <NoticePanel className="mb-6">
        Source provenance remains attached to every row. Apply stays unavailable while a possible duplicate needs a
        human decision.
      </NoticePanel>
      {notice && (
        <div className="registry-save-notice mb-4" role="status">
          {notice}
        </div>
      )}
      <div data-revision={revision}>
        <DataTable
          columns={[
            { key: "row", header: "Row", sortValue: (row) => row.row, cell: (row) => row.row },
            { key: "source", header: "Source", sortValue: (row) => row.source, cell: (row) => row.source },
            { key: "target", header: "Target", cell: (row) => row.target },
            { key: "finding", header: "Finding", sortValue: (row) => row.finding, cell: (row) => row.finding },
            {
              key: "decision",
              header: "Decision",
              cell: (row) => (
                <NativeSelect
                  aria-label={`Decision for import row ${row.row}`}
                  value={row.decision}
                  onChange={(event) =>
                    decide(row.row, event.target.value as "Include" | "Merge reviewed duplicate" | "Exclude")
                  }
                >
                  {row.decision === "Human review" && <option>Human review</option>}
                  <option>Include</option>
                  <option>Merge reviewed duplicate</option>
                  <option>Exclude</option>
                </NativeSelect>
              ),
            },
          ]}
          rows={rows}
          getRowKey={(row) => String(row.row)}
        />
      </div>
      <Button type="button" className="mt-5" disabled={unresolved} onClick={apply}>
        Apply validated rows locally
      </Button>
    </>
  );
}

export function AdminWorkspaceView({ kind }: { kind: AdminWorkspaceKind }) {
  const body = useMemo(() => {
    // biome-ignore lint/nursery/noUnnecessaryConditions: exhaustive switch over a literal union.
    switch (kind) {
      case "users":
        return <UsersWorkspace />;
      case "access":
        return <AccessWorkspace />;
      case "configuration":
        return <ConfigurationWorkspace />;
      case "audit":
        return <AuditWorkspace />;
      case "privacy":
        return <PrivacyWorkspace />;
      case "notifications":
        return <NotificationsWorkspace />;
      case "integrations":
        return <IntegrationsWorkspace />;
      case "operations":
        return <OperationsWorkspace />;
      case "imports":
        return <ImportsWorkspace />;
    }
  }, [kind]);
  return (
    <AdminBoundary>
      <WorkspaceHeader kind={kind} />
      <nav aria-label="Administration workspaces" className="mb-6 flex flex-wrap gap-2">
        {ADMIN_LINKS.map((item) => (
          <Button asChild key={item.kind} size="sm" variant={item.kind === kind ? "default" : "outline"}>
            <Link href={item.href}>{item.label}</Link>
          </Button>
        ))}
      </nav>
      <NoticePanel className="mb-6">
        All records, controls, credentials, provider states, and recovery results on this page are local UI
        demonstrations.
      </NoticePanel>
      {body}
    </AdminBoundary>
  );
}

export function ScenarioWorkspaceView() {
  const { role, scenario, setRole, setScenario, reset, generation } = useWorkspaceSession();
  const [latency, setLatency] = useState("0");
  const [replays, setReplays] = useState(0);
  const resetAll = () => {
    adminRepository.reset();
    setLatency("0");
    setReplays(0);
    reset();
  };
  return (
    <div className="site-container page-content">
      <div className="max-w-3xl">
        <span className="eyebrow">M17 · Presenter controls</span>
        <h1 className="mt-2">Preview scenarios</h1>
        <p className="muted mt-2">
          Choose a persona and repository response for review. These controls are separate from service forms.
        </p>
        <NoticePanel className="my-6">
          Changing persona clears incompatible local context. Reset returns the deterministic fixtures and demo clock to
          their default state.
        </NoticePanel>
        <ContentPanel>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 font-medium text-sm" htmlFor="preview-role">
              Demo persona
              <NativeSelect
                id="preview-role"
                className="w-full"
                value={role}
                onChange={(event) => setRole(event.target.value as WorkspaceRole)}
              >
                <option value="municipal">Municipal staff</option>
                <option value="barangay">Barangay staff</option>
                <option value="partner">Tourism partner</option>
                <option value="enumerator">Enumerator</option>
              </NativeSelect>
            </label>
            <label className="grid gap-2 font-medium text-sm" htmlFor="preview-scenario">
              Repository scenario
              <NativeSelect
                id="preview-scenario"
                className="w-full"
                value={scenario}
                onChange={(event) => setScenario(event.target.value as WorkspaceScenario)}
              >
                <option value="normal">Normal sample data</option>
                <option value="empty">Empty result</option>
                <option value="error">Local failure</option>
                <option value="denied">Permission denied</option>
                <option value="slow">Simulated latency</option>
              </NativeSelect>
            </label>
            <label className="grid gap-2 font-medium text-sm" htmlFor="preview-latency">
              Local latency
              <NativeSelect id="preview-latency" value={latency} onChange={(event) => setLatency(event.target.value)}>
                <option value="0">No added latency</option>
                <option value="600">600 ms sample delay</option>
                <option value="1500">1,500 ms sample delay</option>
              </NativeSelect>
            </label>
          </div>
          <PanelDivider />
          <DemoClockControl />
          <PanelDivider />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => setReplays((value) => value + 1)}>
              Replay local sample event
            </Button>
            <Button type="button" onClick={resetAll}>
              Reset prototype
            </Button>
            <StatusBadge tone="neutral">Context generation {generation}</StatusBadge>
            <StatusBadge tone="neutral">Latency {latency} ms</StatusBadge>
            <StatusBadge tone="success">Event replays {replays}</StatusBadge>
          </div>
        </ContentPanel>
      </div>
    </div>
  );
}

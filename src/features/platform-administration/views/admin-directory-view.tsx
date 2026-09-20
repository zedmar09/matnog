"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { Copy, EllipsisVertical, Eye, Pencil, Plus, RefreshCcw, SearchX } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsDateFilter, OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { AdministrationTabs, AdminSummary } from "../components/admin-ui";
import { ADMIN_SECTION_META, type AdminRecord, type AdminSection } from "../data/admin-fixtures";
import { type AdminAction, adminRepository as repository } from "../services/admin-repository";

const options = (values: string[]) => [...new Set(values)].sort().map((value) => ({ value, label: value }));

function tone(status: string): StatusTone {
  if (["Active", "Applied", "Approved", "Delivered", "Healthy", "Recorded", "Resolved", "Validated"].includes(status))
    return "success";
  if (["Cancelled", "Deactivated", "Rejected", "Revoked"].includes(status)) return "destructive";
  if (["Critical", "Degraded", "Delivery failed", "On hold", "Validation failed"].includes(status)) return "warning";
  return "neutral";
}

function quickAction(record: AdminRecord): { action: AdminAction; label: string } | undefined {
  if (record.section === "users")
    return record.status === "Active"
      ? { action: "suspend", label: "Suspend user" }
      : { action: "activate", label: "Activate user" };
  if (record.section === "access")
    return record.status === "Requested"
      ? { action: "approve", label: "Approve access" }
      : ["Active", "Approved"].includes(record.status)
        ? { action: "revoke", label: "Revoke access" }
        : undefined;
  if (record.section === "settings")
    return record.status === "Validated"
      ? { action: "approve", label: "Approve version" }
      : record.status === "Approved"
        ? { action: "activate", label: "Activate version" }
        : ["Draft", "Returned", "Validation failed"].includes(record.status)
          ? { action: "validate", label: "Validate version" }
          : undefined;
  if (record.section === "privacy")
    return record.status === "On hold"
      ? { action: "release", label: "Release hold" }
      : ["Assigned", "In review"].includes(record.status)
        ? { action: "complete", label: "Complete review" }
        : undefined;
  if (record.section === "messages")
    return record.status === "Delivery failed"
      ? { action: "retry", label: "Retry delivery" }
      : ["Draft", "Queued"].includes(record.status)
        ? { action: "send", label: "Send message" }
        : undefined;
  if (record.section === "integrations")
    return record.status === "Disabled"
      ? { action: "enable", label: "Enable integration" }
      : { action: "verify", label: "Verify health" };
  if (record.section === "operations")
    return record.status === "Resolved"
      ? { action: "reopen", label: "Reopen record" }
      : ["Investigating", "Assigned", "Open"].includes(record.status)
        ? { action: "resolve", label: "Resolve record" }
        : undefined;
  if (record.section === "imports")
    return record.status === "Needs review"
      ? { action: "validate", label: "Validate batch" }
      : record.status === "Validated"
        ? { action: "apply", label: "Apply batch" }
        : undefined;
  return undefined;
}

export function AdminDirectoryView({ section }: { section: AdminSection }) {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => repository.list(section));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [office, setOffice] = useState("");
  const [priority, setPriority] = useState("");
  const [date, setDate] = useState("");
  const [notice, setNotice] = useState("");
  const meta = ADMIN_SECTION_META[section];
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (item) =>
        (!status || item.status === status) &&
        (!office || item.office === office) &&
        (!priority || item.priority === priority) &&
        (!date || item.createdAt.startsWith(date)) &&
        (!q ||
          `${item.id} ${item.title} ${item.subtitle} ${item.reference} ${item.owner} ${item.scope} ${item.tags.join(" ")}`
            .toLocaleLowerCase()
            .includes(q)),
    );
  }, [date, office, priority, query, records, status]);

  if (role !== "municipal")
    return (
      <PermissionState
        title="Administration requires municipal access"
        description="Authorized municipal staff can manage platform administration records."
      />
    );
  const refresh = (message: string) => {
    setRecords(repository.list(section));
    setNotice(message);
  };
  const columns: DataTableColumn<AdminRecord>[] = [
    {
      key: "record",
      header: meta.singular,
      className: "ops-wide-cell",
      sortValue: (item) => item.title,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/admin/${section}/${item.id}`}>
            {item.title}
          </Link>
          <strong>{item.id}</strong>
          <small>
            {item.subtitle} · {item.reference}
          </small>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Office and owner",
      sortValue: (item) => item.office,
      cell: (item) => (
        <>
          <strong>{item.office}</strong>
          <small>{item.owner}</small>
        </>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      className: "ops-clamp-cell",
      sortValue: (item) => item.scope,
      cell: (item) => (
        <>
          <strong>{item.scope}</strong>
          <small>{item.target}</small>
        </>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      className: "ops-nowrap-cell",
      sortValue: (item) => item.updatedAt,
      cell: (item) => (
        <>
          <strong>{item.updatedAt}</strong>
          <small>{item.priority}</small>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (item) => item.status,
      cell: (item) => <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => {
        const next = quickAction(item);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.title}`}>
              <EllipsisVertical size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ops-row-menu-content">
              <DropdownMenuItem asChild>
                <Link href={`/ops/admin/${section}/${item.id}`}>
                  <Eye /> View record
                </Link>
              </DropdownMenuItem>
              {!item.immutable && (
                <DropdownMenuItem asChild>
                  <Link href={`/ops/admin/${section}/${item.id}/edit`}>
                    <Pencil /> Edit record
                  </Link>
                </DropdownMenuItem>
              )}
              {!item.immutable && (
                <DropdownMenuItem
                  onSelect={() => {
                    const copy = repository.duplicate(section, item.id);
                    if (copy) refresh(`${copy.id} was created from ${item.id}.`);
                  }}
                >
                  <Copy /> Duplicate record
                </DropdownMenuItem>
              )}
              {next && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      const updated = repository.transition(
                        section,
                        item.id,
                        next.action,
                        "Action completed by an authorized municipal administrator.",
                      );
                      if (updated) refresh(`${item.id} is now ${updated.status}.`);
                    }}
                  >
                    <RefreshCcw /> {next.label}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
        {section !== "audit" && (
          <Button asChild>
            <Link href={`/ops/admin/${section}/new`}>
              <Plus /> New {meta.singular}
            </Link>
          </Button>
        )}
      </div>
      <AdministrationTabs active={section} />
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <AdminSummary records={records} />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder={`Search ${meta.title.toLocaleLowerCase()}…`} />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          options={options(records.map((item) => item.status))}
        />
        <OpsFilter
          label="Office"
          value={office}
          onChange={setOffice}
          options={options(records.map((item) => item.office))}
          width={240}
        />
        <OpsFilter
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={options(records.map((item) => item.priority))}
        />
        <OpsDateFilter label="Created" value={date} onChange={setDate} />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          summary={`${rows.length} ${meta.title.toLocaleLowerCase()} records`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title={`No ${meta.title.toLocaleLowerCase()} records match`}
          description="Change one or more filters to see other records."
        />
      )}
    </>
  );
}

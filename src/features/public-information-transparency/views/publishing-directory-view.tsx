"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Archive,
  BadgeCheck,
  Copy,
  EllipsisVertical,
  Eye,
  FilePenLine,
  Pencil,
  Plus,
  RotateCcw,
  SearchX,
  Send,
} from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
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

import { PublishingSummary, publicationStatusLabel } from "../components/publishing-ui";
import { publicationRepository as repository } from "../services/publication-repository";
import type { PublicationOperationsRecord, PublicationScope } from "../types/publication-operations";

const scopeCopy: Record<PublicationScope, { title: string; description: string; empty: string }> = {
  all: {
    title: "Publications",
    description: "Manage every public notice, project update, disclosure, and service guide from one directory.",
    empty: "publications",
  },
  advisory: {
    title: "Advisories",
    description: "Manage time-sensitive notices, community announcements, schedules, and public safety information.",
    empty: "advisories",
  },
  project: {
    title: "Projects",
    description: "Publish approved project profiles, progress updates, funding information, and completion notices.",
    empty: "project updates",
  },
  disclosure: {
    title: "Disclosures",
    description: "Maintain transparency records, ordinances, procurement references, and statutory publications.",
    empty: "disclosures",
  },
  service: {
    title: "Service guides",
    description: "Maintain public service instructions, requirements, fees, office ownership, and processing guidance.",
    empty: "service guides",
  },
  review: {
    title: "Reviews",
    description: "Review submitted publications, accessibility checks, protected fields, and publication readiness.",
    empty: "review records",
  },
};

const options = (values: string[]) =>
  [...new Set(values)]
    .sort()
    .map((value) => ({ value, label: publicationStatusLabel[value as keyof typeof publicationStatusLabel] ?? value }));

function tone(status: string): StatusTone {
  if (["published", "corrected"].includes(status)) return "success";
  if (status === "archived") return "neutral";
  if (["returned", "in-review"].includes(status)) return "warning";
  return "neutral";
}

function newHref(scope: PublicationScope) {
  if (["advisory", "project", "disclosure", "service"].includes(scope)) {
    return `/ops/content/publications/new?kind=${scope}`;
  }
  return "/ops/content/publications/new";
}

export function PublishingDirectoryView({ scope }: { scope: PublicationScope }) {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => repository.listEditorial());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [office, setOffice] = useState("");
  const [language, setLanguage] = useState("");
  const [date, setDate] = useState("");
  const [notice, setNotice] = useState("");
  const [archiving, setArchiving] = useState<PublicationOperationsRecord>();
  const scoped = useMemo(
    () =>
      records.filter((item) =>
        scope === "all"
          ? true
          : scope === "review"
            ? ["in-review", "returned"].includes(item.status)
            : item.kind === scope,
      ),
    [records, scope],
  );
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return scoped.filter(
      (item) =>
        (!status || item.status === status) &&
        (!office || item.issuingOffice === office) &&
        (!language || item.language === language) &&
        (!date || item.issueDate === date) &&
        (!q ||
          `${item.id} ${item.title} ${item.summary} ${item.issuingOffice} ${item.sourceReference} ${item.topics.join(" ")}`
            .toLocaleLowerCase()
            .includes(q)),
    );
  }, [date, language, office, query, scoped, status]);

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Publishing requires municipal access"
        description="Authorized municipal staff can manage public information and publication approvals."
      />
    );
  }

  const refresh = (message: string) => {
    setRecords(repository.listEditorial());
    setNotice(message);
  };
  const columns: DataTableColumn<PublicationOperationsRecord>[] = [
    {
      key: "publication",
      header: "Publication",
      className: "ops-wide-cell",
      sortValue: (item) => item.title,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/content/publications/${item.id}`}>
            {item.title}
          </Link>
          <strong>{item.id}</strong>
          <small>
            {item.kind} · {item.topics.join(" · ")}
          </small>
        </div>
      ),
    },
    {
      key: "office",
      header: "Issuing office",
      sortValue: (item) => item.issuingOffice,
      cell: (item) => (
        <>
          <strong>{item.issuingOffice}</strong>
          <small>{item.owner}</small>
        </>
      ),
    },
    {
      key: "schedule",
      header: "Publication date",
      className: "ops-nowrap-cell",
      sortValue: (item) => item.issueDate,
      cell: (item) => (
        <>
          <strong>{item.issueDate}</strong>
          <small>{item.effectiveUntil ? `Until ${item.effectiveUntil}` : "No expiry"}</small>
        </>
      ),
    },
    {
      key: "readiness",
      header: "Readiness",
      sortValue: (item) => Number(item.altTextReady) + Number(item.redactionReady),
      cell: (item) => (
        <>
          <strong>{item.altTextReady && item.redactionReady ? "Ready" : "Needs review"}</strong>
          <small>{item.reviewer}</small>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (item) => item.status,
      cell: (item) => <StatusBadge tone={tone(item.status)}>{publicationStatusLabel[item.status]}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.title}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/content/publications/${item.id}`}>
                <Eye /> View publication
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/content/publications/${item.id}/edit`}>
                <Pencil /> Edit publication
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                const copy = repository.duplicate(item.id);
                if (copy) refresh(`${copy.id} was created from ${item.id}.`);
              }}
            >
              <Copy /> Duplicate as draft
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {["draft", "returned"].includes(item.status) && (
              <DropdownMenuItem
                onSelect={() => {
                  repository.decide(item.id, "submit", "Content completed and submitted for editorial review.");
                  refresh(`${item.id} was submitted for review.`);
                }}
              >
                <FilePenLine /> Submit for review
              </DropdownMenuItem>
            )}
            {item.status === "in-review" && (
              <DropdownMenuItem
                disabled={!item.altTextReady || !item.redactionReady}
                onSelect={() => {
                  repository.decide(item.id, "publish", "Accessibility, redaction, and source checks approved.");
                  refresh(`${item.id} was published.`);
                }}
              >
                <Send /> Publish
              </DropdownMenuItem>
            )}
            {item.status === "archived" ? (
              <DropdownMenuItem
                onSelect={() => {
                  repository.decide(item.id, "restore", "Restored for editorial revision and future publication.");
                  refresh(`${item.id} was restored as a draft.`);
                }}
              >
                <RotateCcw /> Restore as draft
              </DropdownMenuItem>
            ) : (
              ["published", "corrected"].includes(item.status) && (
                <DropdownMenuItem variant="destructive" onSelect={() => setArchiving(item)}>
                  <Archive /> Archive publication
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  const copy = scopeCopy[scope];
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <Button asChild>
          <Link href={newHref(scope)}>
            <Plus /> New publication
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <PublishingSummary records={scoped} />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Title, reference, office, or topic…" />
        <OpsFilter label="Status" value={status} onChange={setStatus} options={options(scoped.map((i) => i.status))} />
        <OpsFilter
          label="Office"
          value={office}
          onChange={setOffice}
          options={options(scoped.map((i) => i.issuingOffice))}
          width={230}
        />
        <OpsFilter
          label="Language"
          value={language}
          onChange={setLanguage}
          options={options(scoped.map((i) => i.language))}
        />
        <OpsDateFilter label="Issue date" value={date} onChange={setDate} />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          summary={`${rows.length} ${copy.empty}`}
        />
      ) : (
        <EmptyState
          icon={scope === "review" ? BadgeCheck : SearchX}
          title={`No ${copy.empty} match`}
          description="Change one or more filters to see other records."
        />
      )}
      <ConfirmationDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive publication?"
        description="The publication will be removed from public listings and retained in the editorial archive."
        confirmLabel="Archive publication"
        destructive
        onConfirm={() => {
          if (!archiving) return;
          repository.decide(archiving.id, "archive", "Publication retired from the active public information library.");
          refresh(`${archiving.id} was archived.`);
          setArchiving(undefined);
        }}
      />
    </>
  );
}

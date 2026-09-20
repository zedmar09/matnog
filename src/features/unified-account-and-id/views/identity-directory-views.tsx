"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Archive,
  BadgeCheck,
  Ban,
  CircleAlert,
  Copy,
  CreditCard,
  EllipsisVertical,
  Eye,
  FileCheck2,
  FileText,
  Link2,
  Palette,
  Pencil,
  Plus,
  RefreshCcw,
  SearchX,
  ShieldCheck,
  UserCheck,
  UsersRound,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { IdentitySummary } from "../components/identity-operations-ui";
import { identityOperationsRepository as repository } from "../services/identity-operations-repository";
import type {
  Credential,
  IdApplication,
  IdentityAccount,
  IdTemplate,
  ResidentLink,
} from "../types/identity-operations";

function Access({ children }: { children: React.ReactNode }) {
  const { role } = useWorkspaceSession();
  return role === "municipal" ? (
    children
  ) : (
    <PermissionState
      title="Identity operations require municipal access"
      description="Authorized municipal staff can manage accounts, resident links, applications, credentials, and ID templates."
    />
  );
}
function options(values: string[]) {
  return [...new Set(values)].sort().map((value) => ({ value, label: value }));
}
function tone(value: string): StatusTone {
  if (["Active", "Approved", "Verified"].includes(value)) return "success";
  if (["Rejected", "Revoked", "Deactivated"].includes(value)) return "destructive";
  if (["Pending", "Submitted", "Under review", "Correction", "Suspended", "Draft"].includes(value)) return "warning";
  return "neutral";
}
function Empty({ noun }: { noun: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title={`No ${noun} match`}
      description="Change one or more filters to see other records."
    />
  );
}
function Notice({ text }: { text: string }) {
  return text ? (
    <div className="registry-save-notice mb-6" role="status">
      {text}
    </div>
  ) : null;
}

export function AccountDirectoryView() {
  const [records, setRecords] = useState(() => repository.listAccounts());
  const [query, setQuery] = useState("");
  const [barangay, setBarangay] = useState("");
  const [verification, setVerification] = useState("");
  const [status, setStatus] = useState("");
  const [changing, setChanging] = useState<IdentityAccount>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (i) =>
        (!barangay || i.barangay === barangay) &&
        (!verification || i.verification === verification) &&
        (!status || i.status === status) &&
        (!q || `${i.id} ${i.name} ${i.phone} ${i.email} ${i.personId} ${i.barangay}`.toLocaleLowerCase().includes(q)),
    );
  }, [barangay, query, records, status, verification]);
  const columns: DataTableColumn<IdentityAccount>[] = [
    {
      key: "account",
      header: "Account",
      className: "ops-wide-cell",
      sortValue: (i) => i.name,
      cell: (i) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/identity/accounts/${i.id}`}>
            {i.name}
          </Link>
          <strong>{i.id}</strong>
          <small>
            {i.personId} · {i.barangay}
          </small>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      sortValue: (i) => i.phone,
      cell: (i) => (
        <>
          <strong>{i.phone}</strong>
          <small>{i.email}</small>
        </>
      ),
    },
    {
      key: "verification",
      header: "Verification",
      sortValue: (i) => i.verification,
      cell: (i) => <StatusBadge tone={tone(i.verification)}>{i.verification}</StatusBadge>,
    },
    {
      key: "activity",
      header: "Last access",
      sortValue: (i) => i.lastAccess,
      cell: (i) => (
        <>
          <strong>{i.lastAccess}</strong>
          <small>Created {i.createdAt}</small>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (i) => i.status,
      cell: (i) => <StatusBadge tone={tone(i.status)}>{i.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (i) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${i.name}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/identity/accounts/${i.id}`}>
                <Eye /> View account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/identity/accounts/${i.id}/edit`}>
                <Pencil /> Edit account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/identity/links/new?account=${i.id}`}>
                <Link2 /> Link resident
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {i.status === "Deactivated" ? (
              <DropdownMenuItem
                onSelect={() => {
                  repository.setAccountStatus(i.id, "Active");
                  setRecords(repository.listAccounts());
                  setNotice(`${i.name} was restored.`);
                }}
              >
                <RefreshCcw /> Restore account
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onSelect={() => setChanging(i)}>
                <Ban /> Deactivate account
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Accounts</h1>
          <p>
            Manage resident accounts, verified contact details, registry associations, access status, and account
            activity.
          </p>
        </div>
        <Button asChild>
          <Link href="/ops/identity/accounts/new">
            <Plus /> New account
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <IdentitySummary
        items={[
          { label: "Total accounts", value: records.length, detail: "registered residents", icon: UsersRound },
          {
            label: "Active",
            value: records.filter((i) => i.status === "Active").length,
            detail: "available accounts",
            icon: UserCheck,
          },
          {
            label: "Verified",
            value: records.filter((i) => i.verification === "Verified").length,
            detail: "confirmed contacts",
            icon: ShieldCheck,
          },
          {
            label: "Needs review",
            value: records.filter((i) => i.verification === "Pending" || i.status === "Suspended").length,
            detail: "account issues",
            icon: CircleAlert,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Account, resident, phone, email, or person ID…" />
        <OpsFilter
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          options={options(records.map((i) => i.barangay))}
        />
        <OpsFilter
          label="Verification"
          value={verification}
          onChange={setVerification}
          options={options(records.map((i) => i.verification))}
        />
        <OpsFilter label="Status" value={status} onChange={setStatus} options={options(records.map((i) => i.status))} />
      </div>
      {rows.length ? (
        <DataTable columns={columns} rows={rows} getRowKey={(i) => i.id} summary={`${rows.length} resident accounts`} />
      ) : (
        <Empty noun="accounts" />
      )}
      <ConfirmationDialog
        open={Boolean(changing)}
        onOpenChange={(open) => !open && setChanging(undefined)}
        title="Deactivate account?"
        description="The resident will lose account access until an authorized staff member restores it."
        confirmLabel="Deactivate account"
        destructive
        onConfirm={() => {
          if (!changing) return;
          repository.setAccountStatus(changing.id, "Deactivated");
          setNotice(`${changing.name} was deactivated.`);
          setChanging(undefined);
          setRecords(repository.listAccounts());
        }}
      />
    </Access>
  );
}

export function LinkDirectoryView() {
  const [records, setRecords] = useState(() => repository.listLinks());
  const [query, setQuery] = useState("");
  const [barangay, setBarangay] = useState("");
  const [status, setStatus] = useState("");
  const [match, setMatch] = useState("");
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (i) =>
        (!barangay || i.barangay === barangay) &&
        (!status || i.status === status) &&
        (!match ||
          (match === "high"
            ? i.matchScore >= 90
            : match === "review"
              ? i.matchScore >= 75 && i.matchScore < 90
              : i.matchScore < 75)) &&
        (!q ||
          `${i.id} ${i.accountId} ${i.accountName} ${i.personId} ${i.residentName}`.toLocaleLowerCase().includes(q)),
    );
  }, [barangay, match, query, records, status]);
  const columns: DataTableColumn<ResidentLink>[] = [
    {
      key: "request",
      header: "Link request",
      className: "ops-wide-cell",
      sortValue: (i) => i.accountName,
      cell: (i) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/identity/links/${i.id}`}>
            {i.accountName}
          </Link>
          <strong>{i.id}</strong>
          <small>
            {i.accountId} · requested {i.requestedAt}
          </small>
        </div>
      ),
    },
    {
      key: "resident",
      header: "Resident match",
      sortValue: (i) => i.residentName,
      cell: (i) => (
        <>
          <strong>{i.residentName}</strong>
          <small>
            {i.personId} · {i.barangay}
          </small>
        </>
      ),
    },
    {
      key: "score",
      header: "Match confidence",
      sortValue: (i) => i.matchScore,
      cell: (i) => (
        <>
          <strong>{i.matchScore}%</strong>
          <small>{i.matchScore >= 90 ? "Strong match" : i.matchScore >= 75 ? "Manual review" : "Low confidence"}</small>
        </>
      ),
    },
    { key: "reviewer", header: "Reviewer", sortValue: (i) => i.reviewedBy, cell: (i) => i.reviewedBy },
    {
      key: "status",
      header: "Status",
      sortValue: (i) => i.status,
      cell: (i) => <StatusBadge tone={tone(i.status)}>{i.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (i) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${i.id}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/identity/links/${i.id}`}>
                <Eye /> View match
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/identity/links/${i.id}/edit`}>
                <Pencil /> Edit request
              </Link>
            </DropdownMenuItem>
            {i.status !== "Approved" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    repository.decideLink(i.id, "Approved", "Resident identity and registry record confirmed.");
                    setRecords(repository.listLinks());
                    setNotice(`${i.id} was approved.`);
                  }}
                >
                  <BadgeCheck /> Approve link
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Resident links</h1>
          <p>Review account claims against permanent resident records before enabling identity services.</p>
        </div>
        <Button asChild>
          <Link href="/ops/identity/links/new">
            <Plus /> New link request
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <IdentitySummary
        items={[
          {
            label: "Pending review",
            value: records.filter((i) => i.status === "Pending").length,
            detail: "new requests",
            icon: Link2,
          },
          {
            label: "Approved",
            value: records.filter((i) => i.status === "Approved").length,
            detail: "linked residents",
            icon: BadgeCheck,
          },
          {
            label: "Corrections",
            value: records.filter((i) => i.status === "Correction").length,
            detail: "awaiting evidence",
            icon: FileText,
          },
          {
            label: "High confidence",
            value: records.filter((i) => i.matchScore >= 90).length,
            detail: "90% and above",
            icon: ShieldCheck,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Request, account, resident, or person ID…" />
        <OpsFilter
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          options={options(records.map((i) => i.barangay))}
        />
        <OpsFilter
          label="Match confidence"
          value={match}
          onChange={setMatch}
          options={[
            { value: "high", label: "90% and above" },
            { value: "review", label: "75% to 89%" },
            { value: "low", label: "Below 75%" },
          ]}
        />
        <OpsFilter label="Status" value={status} onChange={setStatus} options={options(records.map((i) => i.status))} />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(i) => i.id}
          summary={`${rows.length} resident link requests`}
        />
      ) : (
        <Empty noun="resident links" />
      )}
    </Access>
  );
}

export function ApplicationDirectoryView() {
  const [records, setRecords] = useState(() => repository.listApplications());
  const [query, setQuery] = useState("");
  const [barangay, setBarangay] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (i) =>
        (!barangay || i.barangay === barangay) &&
        (!kind || i.kind === kind) &&
        (!status || i.status === status) &&
        (!q || `${i.id} ${i.applicantName} ${i.personId} ${i.accountId} ${i.reviewer}`.toLocaleLowerCase().includes(q)),
    );
  }, [barangay, kind, query, records, status]);
  const columns: DataTableColumn<IdApplication>[] = [
    {
      key: "application",
      header: "Application",
      className: "ops-wide-cell",
      sortValue: (i) => i.applicantName,
      cell: (i) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/identity/applications/${i.id}`}>
            {i.applicantName}
          </Link>
          <strong>{i.id}</strong>
          <small>
            {i.kind} · submitted {i.submittedAt}
          </small>
        </div>
      ),
    },
    {
      key: "resident",
      header: "Resident",
      sortValue: (i) => i.personId,
      cell: (i) => (
        <>
          <strong>{i.personId}</strong>
          <small>
            {i.barangay} · {i.accountId}
          </small>
        </>
      ),
    },
    {
      key: "evidence",
      header: "Evidence",
      sortValue: (i) => i.evidence.length,
      cell: (i) => (
        <>
          <strong>{i.evidence.length} requirements</strong>
          <small>Template {i.templateId}</small>
        </>
      ),
    },
    { key: "reviewer", header: "Reviewer", sortValue: (i) => i.reviewer, cell: (i) => i.reviewer },
    {
      key: "status",
      header: "Status",
      sortValue: (i) => i.status,
      cell: (i) => <StatusBadge tone={tone(i.status)}>{i.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (i) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${i.id}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/identity/applications/${i.id}`}>
                <Eye /> View application
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/identity/applications/${i.id}/edit`}>
                <Pencil /> Edit application
              </Link>
            </DropdownMenuItem>
            {["Submitted", "Under review"].includes(i.status) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    repository.decideApplication(i.id, "Approved", "Identity requirements reviewed and approved.");
                    setRecords(repository.listApplications());
                    setNotice(`${i.id} was approved.`);
                  }}
                >
                  <BadgeCheck /> Approve application
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Applications</h1>
          <p>Manage municipal ID enrollment, renewal, replacement evidence, review assignments, and decisions.</p>
        </div>
        <Button asChild>
          <Link href="/ops/identity/applications/new">
            <Plus /> New application
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <IdentitySummary
        items={[
          {
            label: "For review",
            value: records.filter((i) => ["Submitted", "Under review"].includes(i.status)).length,
            detail: "active applications",
            icon: FileCheck2,
          },
          {
            label: "Corrections",
            value: records.filter((i) => i.status === "Correction").length,
            detail: "awaiting applicants",
            icon: CircleAlert,
          },
          {
            label: "Approved",
            value: records.filter((i) => i.status === "Approved").length,
            detail: "ready or issued",
            icon: BadgeCheck,
          },
          {
            label: "Replacements",
            value: records.filter((i) => i.kind === "Replacement").length,
            detail: "replacement requests",
            icon: RefreshCcw,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch
          value={query}
          onChange={setQuery}
          placeholder="Application, resident, person ID, account, or reviewer…"
        />
        <OpsFilter
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          options={options(records.map((i) => i.barangay))}
        />
        <OpsFilter
          label="Application type"
          value={kind}
          onChange={setKind}
          options={options(records.map((i) => i.kind))}
        />
        <OpsFilter label="Status" value={status} onChange={setStatus} options={options(records.map((i) => i.status))} />
      </div>
      {rows.length ? (
        <DataTable columns={columns} rows={rows} getRowKey={(i) => i.id} summary={`${rows.length} ID applications`} />
      ) : (
        <Empty noun="applications" />
      )}
    </Access>
  );
}

export function CredentialDirectoryView() {
  const [records, setRecords] = useState(() => repository.listCredentials());
  const [query, setQuery] = useState("");
  const [barangay, setBarangay] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [changing, setChanging] = useState<Credential>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (i) =>
        (!barangay || i.barangay === barangay) &&
        (!status || i.status === status) &&
        (!year || i.issuedAt.startsWith(year)) &&
        (!q || `${i.id} ${i.holderName} ${i.personId} ${i.applicationId} ${i.token}`.toLocaleLowerCase().includes(q)),
    );
  }, [barangay, query, records, status, year]);
  const columns: DataTableColumn<Credential>[] = [
    {
      key: "credential",
      header: "Credential",
      className: "ops-wide-cell",
      sortValue: (i) => i.id,
      cell: (i) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/identity/credentials/${i.id}`}>
            {i.id}
          </Link>
          <strong>{i.holderName}</strong>
          <small>
            {i.type} · {i.barangay}
          </small>
        </div>
      ),
    },
    {
      key: "resident",
      header: "Resident reference",
      sortValue: (i) => i.personId,
      cell: (i) => (
        <>
          <strong>{i.personId}</strong>
          <small>{i.applicationId}</small>
        </>
      ),
    },
    {
      key: "validity",
      header: "Validity",
      sortValue: (i) => i.validUntil,
      cell: (i) => (
        <>
          <strong>
            {i.issuedAt} to {i.validUntil}
          </strong>
          <small>{i.token}</small>
        </>
      ),
    },
    { key: "template", header: "Template", sortValue: (i) => i.templateId, cell: (i) => i.templateId },
    {
      key: "status",
      header: "Status",
      sortValue: (i) => i.status,
      cell: (i) => <StatusBadge tone={tone(i.status)}>{i.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (i) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${i.id}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/identity/credentials/${i.id}`}>
                <Eye /> View credential
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/verify/id/${i.token}`}>
                <ShieldCheck /> Verification page
              </Link>
            </DropdownMenuItem>
            {i.status === "Active" && (
              <>
                <DropdownMenuItem
                  onSelect={() => {
                    const next = repository.replaceCredential(i.id);
                    setRecords(repository.listCredentials());
                    if (next) setNotice(`${next.id} was issued as the replacement.`);
                  }}
                >
                  <RefreshCcw /> Issue replacement
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setChanging(i)}>
                  <Ban /> Revoke credential
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Credentials</h1>
          <p>
            Manage issued municipal IDs, validity periods, public verification tokens, replacements, and revocations.
          </p>
        </div>
        <Button asChild>
          <Link href="/ops/identity/credentials/new">
            <Plus /> Issue credential
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <IdentitySummary
        items={[
          { label: "Issued credentials", value: records.length, detail: "credential records", icon: CreditCard },
          {
            label: "Active",
            value: records.filter((i) => i.status === "Active").length,
            detail: "currently valid",
            icon: BadgeCheck,
          },
          {
            label: "Replaced",
            value: records.filter((i) => i.status === "Replaced").length,
            detail: "superseded cards",
            icon: RefreshCcw,
          },
          {
            label: "Revoked",
            value: records.filter((i) => i.status === "Revoked").length,
            detail: "invalid credentials",
            icon: Ban,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch
          value={query}
          onChange={setQuery}
          placeholder="Credential, holder, person ID, application, or token…"
        />
        <OpsFilter
          label="Barangay"
          value={barangay}
          onChange={setBarangay}
          options={options(records.map((i) => i.barangay))}
        />
        <OpsFilter
          label="Issue year"
          value={year}
          onChange={setYear}
          options={options(records.map((i) => i.issuedAt.slice(0, 4)))}
        />
        <OpsFilter label="Status" value={status} onChange={setStatus} options={options(records.map((i) => i.status))} />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(i) => i.id}
          summary={`${rows.length} municipal credentials`}
        />
      ) : (
        <Empty noun="credentials" />
      )}
      <ConfirmationDialog
        open={Boolean(changing)}
        onOpenChange={(open) => !open && setChanging(undefined)}
        title="Revoke credential?"
        description="The credential will immediately become invalid in staff and public verification views."
        confirmLabel="Revoke credential"
        destructive
        onConfirm={() => {
          if (!changing) return;
          repository.setCredentialStatus(changing.id, "Revoked", "Credential revoked by the Municipal Identity Desk.");
          setNotice(`${changing.id} was revoked.`);
          setChanging(undefined);
          setRecords(repository.listCredentials());
        }}
      />
    </Access>
  );
}

export function TemplateDirectoryView() {
  const [records, setRecords] = useState(() => repository.listTemplates());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [orientation, setOrientation] = useState("");
  const [archiving, setArchiving] = useState<IdTemplate>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (i) =>
        (!status || i.status === status) &&
        (!orientation || i.orientation === orientation) &&
        (!q || `${i.id} ${i.name} ${i.description} ${i.updatedBy}`.toLocaleLowerCase().includes(q)),
    );
  }, [orientation, query, records, status]);
  const columns: DataTableColumn<IdTemplate>[] = [
    {
      key: "template",
      header: "ID template",
      className: "ops-wide-cell",
      sortValue: (i) => i.name,
      cell: (i) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/identity/templates/${i.id}`}>
            {i.name}
          </Link>
          <strong>
            {i.id} · Version {i.version}
          </strong>
          <small>{i.description}</small>
        </div>
      ),
    },
    {
      key: "layout",
      header: "Layout",
      sortValue: (i) => i.orientation,
      cell: (i) => (
        <>
          <strong>{i.orientation}</strong>
          <small>{i.elements.length} design layers</small>
        </>
      ),
    },
    {
      key: "updated",
      header: "Last updated",
      sortValue: (i) => i.updatedAt,
      cell: (i) => (
        <>
          <strong>{i.updatedAt}</strong>
          <small>{i.updatedBy}</small>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (i) => i.status,
      cell: (i) => <StatusBadge tone={tone(i.status)}>{i.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (i) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${i.name}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/identity/templates/${i.id}`}>
                <Eye /> View template
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/identity/templates/${i.id}/designer`}>
                <Palette /> Open designer
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/identity/templates/${i.id}/edit`}>
                <Pencil /> Edit details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                const copy = repository.duplicateTemplate(i.id);
                setRecords(repository.listTemplates());
                if (copy) setNotice(`${copy.name} was created.`);
              }}
            >
              <Copy /> Duplicate template
            </DropdownMenuItem>
            {i.status !== "Active" && i.status !== "Archived" && (
              <DropdownMenuItem
                onSelect={() => {
                  repository.setTemplateStatus(i.id, "Active");
                  setRecords(repository.listTemplates());
                  setNotice(`${i.name} is now the active issuance template.`);
                }}
              >
                <BadgeCheck /> Activate template
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {i.status !== "Archived" && (
              <DropdownMenuItem variant="destructive" onSelect={() => setArchiving(i)}>
                <Archive /> Archive template
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Templates</h1>
          <p>Manage municipal ID layouts, versions, activation status, design layers, and issuance readiness.</p>
        </div>
        <Button asChild>
          <Link href="/ops/identity/templates/new">
            <Plus /> New template
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <IdentitySummary
        items={[
          { label: "Templates", value: records.length, detail: "layout records", icon: CreditCard },
          {
            label: "Active",
            value: records.filter((i) => i.status === "Active").length,
            detail: "issuance template",
            icon: BadgeCheck,
          },
          {
            label: "Drafts",
            value: records.filter((i) => i.status === "Draft").length,
            detail: "in development",
            icon: Pencil,
          },
          {
            label: "Design layers",
            value: records.reduce((sum, i) => sum + i.elements.length, 0),
            detail: "configured elements",
            icon: Palette,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Template, description, or editor…" />
        <OpsFilter
          label="Orientation"
          value={orientation}
          onChange={setOrientation}
          options={options(records.map((i) => i.orientation))}
        />
        <OpsFilter label="Status" value={status} onChange={setStatus} options={options(records.map((i) => i.status))} />
      </div>
      {rows.length ? (
        <DataTable columns={columns} rows={rows} getRowKey={(i) => i.id} summary={`${rows.length} ID templates`} />
      ) : (
        <Empty noun="templates" />
      )}
      <ConfirmationDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive ID template?"
        description="The template will no longer be available for new credential issuance."
        confirmLabel="Archive template"
        destructive
        onConfirm={() => {
          if (!archiving) return;
          repository.setTemplateStatus(archiving.id, "Archived");
          setNotice(`${archiving.name} was archived.`);
          setArchiving(undefined);
          setRecords(repository.listTemplates());
        }}
      />
    </Access>
  );
}

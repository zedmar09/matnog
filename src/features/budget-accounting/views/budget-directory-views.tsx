"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  EllipsisVertical,
  Eye,
  FileCheck2,
  Landmark,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  SearchX,
  Send,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { BudgetSummaryCards } from "../components/budget-summary-cards";
import { budgetAccountingRepository as repository } from "../services/budget-accounting-repository";
import { availabilityState, financeMoney, financeStatusTone } from "../services/budget-presentation";
import type {
  Appropriation,
  BudgetChange,
  Disbursement,
  FiscalPeriod,
  Obligation,
  RevenueProjection,
} from "../types/budget-accounting";

function Access({ children }: { children: React.ReactNode }) {
  const { role } = useWorkspaceSession();
  if (role !== "municipal")
    return (
      <PermissionState
        title="Budget records require municipal access"
        description="Authorized municipal staff can manage allocations, obligations, disbursements, adjustments, reconciliation, and fiscal periods."
      />
    );
  return children;
}
function filterOptions(values: (string | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort()
    .map((value) => ({ value, label: value }));
}
function Notice({ text }: { text: string }) {
  return text ? (
    <div className="registry-save-notice mb-6" role="status">
      {text}
    </div>
  ) : null;
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

export function AllocationListView() {
  const [records, setRecords] = useState(() => repository.allocations());
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("");
  const [fund, setFund] = useState("");
  const [office, setOffice] = useState("");
  const [availability, setAvailability] = useState("");
  const [archiving, setArchiving] = useState<Appropriation>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (item) =>
        (!period || item.fiscalPeriod === period) &&
        (!fund || item.fund === fund) &&
        (!office || item.department === office) &&
        (!availability || availabilityState(item.appropriatedMinor, item.obligatedMinor) === availability) &&
        (!q ||
          `${item.id} ${item.fund} ${item.department} ${item.projectReference ?? ""} ${item.source}`
            .toLocaleLowerCase()
            .includes(q)),
    );
  }, [availability, fund, office, period, query, records]);
  const total = records.reduce((sum, item) => sum + item.appropriatedMinor, 0);
  const obligated = records.reduce((sum, item) => sum + item.obligatedMinor, 0);
  const disbursed = records.reduce((sum, item) => sum + item.disbursedMinor, 0);
  const columns: DataTableColumn<Appropriation>[] = [
    {
      key: "allocation",
      header: "Allocation",
      className: "ops-wide-cell",
      sortValue: (item) => item.id,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/finance/allocations/${item.id}`}>
            {item.id}
          </Link>
          <strong>{item.fund}</strong>
          <small>
            {item.fiscalPeriod} · {item.projectReference ?? "Department allocation"}
          </small>
        </div>
      ),
    },
    {
      key: "office",
      header: "Responsible office",
      sortValue: (item) => item.department,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{item.department}</strong>
          <small>{item.source}</small>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Approved budget",
      sortValue: (item) => item.appropriatedMinor,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{financeMoney(item.appropriatedMinor)}</strong>
          <small>{financeMoney(item.appropriatedMinor - item.obligatedMinor)} available</small>
        </div>
      ),
    },
    {
      key: "utilization",
      header: "Utilization",
      sortValue: (item) => item.obligatedMinor / item.appropriatedMinor,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{Math.round((item.obligatedMinor / item.appropriatedMinor) * 100)}% obligated</strong>
          <small>{Math.round((item.disbursedMinor / item.appropriatedMinor) * 100)}% disbursed</small>
        </div>
      ),
    },
    {
      key: "status",
      header: "Availability",
      sortValue: (item) => availabilityState(item.appropriatedMinor, item.obligatedMinor),
      cell: (item) => {
        const status = availabilityState(item.appropriatedMinor, item.obligatedMinor);
        return (
          <StatusBadge tone={status === "Available" ? "success" : status === "Low balance" ? "warning" : "pending"}>
            {status}
          </StatusBadge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.id}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/allocations/${item.id}`}>
                <Eye /> View allocation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/allocations/${item.id}/edit`}>
                <Pencil /> Edit allocation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/obligations/new?allocation=${item.id}`}>
                <Plus /> New obligation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setArchiving(item)}>
              <Archive /> Archive allocation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Allocations</h1>
          <p>
            Manage approved municipal funds, responsible offices, project links, utilization, and available balances.
          </p>
        </div>
        <Button asChild>
          <Link href="/ops/finance/allocations/new">
            <Plus /> New allocation
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <BudgetSummaryCards
        label="Allocation totals"
        items={[
          { label: "Approved budget", value: financeMoney(total), detail: "all allocations", icon: Landmark },
          {
            label: "Obligated",
            value: financeMoney(obligated),
            detail: `${Math.round((obligated / total) * 100)}% utilized`,
            icon: BookOpenCheck,
          },
          { label: "Disbursed", value: financeMoney(disbursed), detail: "recorded releases", icon: CircleDollarSign },
          {
            label: "Available",
            value: financeMoney(total - obligated),
            detail: "unobligated balance",
            icon: WalletCards,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Reference, fund, office, project, or authority…" />
        <OpsFilter
          label="Fiscal period"
          value={period}
          onChange={setPeriod}
          anyLabel="Any period"
          options={filterOptions(records.map((item) => item.fiscalPeriod))}
        />
        <OpsFilter
          label="Fund"
          value={fund}
          onChange={setFund}
          anyLabel="Any fund"
          options={filterOptions(records.map((item) => item.fund))}
        />
        <OpsFilter
          label="Office"
          value={office}
          onChange={setOffice}
          anyLabel="Any office"
          options={filterOptions(records.map((item) => item.department))}
        />
        <OpsFilter
          label="Availability"
          value={availability}
          onChange={setAvailability}
          options={[
            { value: "Available", label: "Available" },
            { value: "Low balance", label: "Low balance" },
            { value: "Fully obligated", label: "Fully obligated" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          summary={`${rows.length} allocation records`}
        />
      ) : (
        <Empty noun="allocations" />
      )}
      <ConfirmationDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive allocation?"
        description="The allocation can only be archived when it has no active obligations."
        confirmLabel="Archive allocation"
        destructive
        onConfirm={() => {
          if (!archiving) return;
          const done = repository.archiveAllocation(archiving.id);
          setNotice(
            done
              ? `${archiving.id} was archived.`
              : "This allocation has active financial records and cannot be archived.",
          );
          setArchiving(undefined);
          setRecords(repository.allocations());
        }}
      />
    </Access>
  );
}

export function ObligationListView() {
  const [records, setRecords] = useState(() => repository.listObligations());
  const allocations = repository.allocations();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [allocation, setAllocation] = useState("");
  const [requester, setRequester] = useState("");
  const [evidence, setEvidence] = useState("");
  const [deleting, setDeleting] = useState<Obligation>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (item) =>
        (!status || item.status === status) &&
        (!allocation || item.appropriationReference === allocation) &&
        (!requester || item.requester === requester) &&
        (!evidence || (evidence === "complete") === item.evidenceReferences.length > 0) &&
        (!q || `${item.id} ${item.payeeProjection} ${item.purpose} ${item.requester}`.toLocaleLowerCase().includes(q)),
    );
  }, [allocation, evidence, query, records, requester, status]);
  const total = records.reduce((sum, item) => sum + item.requestedMinor, 0);
  const approved = records.filter((item) => item.status === "approved" || item.status === "authorized").length;
  const columns: DataTableColumn<Obligation>[] = [
    {
      key: "obligation",
      header: "Obligation",
      className: "ops-wide-cell",
      sortValue: (item) => item.id,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/finance/obligations/${item.id}`}>
            {item.id}
          </Link>
          <strong>{item.purpose}</strong>
          <small>{item.payeeProjection}</small>
        </div>
      ),
    },
    {
      key: "allocation",
      header: "Allocation",
      sortValue: (item) => item.appropriationReference,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{item.appropriationReference}</strong>
          <small>
            {allocations.find((entry) => entry.id === item.appropriationReference)?.fund ?? "Allocation unavailable"}
          </small>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Requested",
      sortValue: (item) => item.requestedMinor,
      cell: (item) => financeMoney(item.requestedMinor),
    },
    {
      key: "requester",
      header: "Requesting office",
      sortValue: (item) => item.requester,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{item.requester}</strong>
          <small>{item.evidenceReferences.length} supporting records</small>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (item) => item.status,
      cell: (item) => <StatusBadge tone={financeStatusTone(item.status)}>{item.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.id}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/obligations/${item.id}`}>
                <Eye /> View obligation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/obligations/${item.id}/edit`}>
                <Pencil /> Edit obligation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/disbursements/new?obligation=${item.id}`}>
                <ReceiptText /> Prepare disbursement
              </Link>
            </DropdownMenuItem>
            {["draft", "for-correction", "rejected"].includes(item.status) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(item)}>
                  <Trash2 /> Delete obligation
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
          <h1>Obligations</h1>
          <p>Review funding commitments, supporting evidence, available balances, and independent budget decisions.</p>
        </div>
        <Button asChild>
          <Link href="/ops/finance/obligations/new">
            <Plus /> New obligation
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <BudgetSummaryCards
        label="Obligation totals"
        items={[
          { label: "Requests", value: records.length, detail: "obligation records", icon: ReceiptText },
          { label: "Requested", value: financeMoney(total), detail: "total commitments", icon: CircleDollarSign },
          { label: "Approved", value: approved, detail: "budget certified", icon: CheckCircle2 },
          {
            label: "Needs action",
            value: records.filter((item) => ["draft", "for-correction"].includes(item.status)).length,
            detail: "draft or correction",
            icon: AlertTriangle,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Reference, payee, purpose, or office…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          options={filterOptions(records.map((item) => item.status))}
        />
        <OpsFilter
          label="Allocation"
          value={allocation}
          onChange={setAllocation}
          options={filterOptions(records.map((item) => item.appropriationReference))}
        />
        <OpsFilter
          label="Requester"
          value={requester}
          onChange={setRequester}
          options={filterOptions(records.map((item) => item.requester))}
        />
        <OpsFilter
          label="Evidence"
          value={evidence}
          onChange={setEvidence}
          options={[
            { value: "complete", label: "Attached" },
            { value: "missing", label: "Missing" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          summary={`${rows.length} obligation records`}
        />
      ) : (
        <Empty noun="obligations" />
      )}
      <ConfirmationDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Delete obligation?"
        description="Only draft or returned obligations without a disbursement can be deleted."
        confirmLabel="Delete obligation"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          const done = repository.deleteObligation(deleting.id);
          setNotice(
            done
              ? `${deleting.id} was deleted.`
              : "This obligation cannot be deleted because it has progressed in the workflow.",
          );
          setDeleting(undefined);
          setRecords(repository.listObligations());
        }}
      />
    </Access>
  );
}

export function DisbursementListView() {
  const [records, setRecords] = useState(() => repository.listDisbursements());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [link, setLink] = useState("");
  const [release, setRelease] = useState("");
  const [posting, setPosting] = useState("");
  const [deleting, setDeleting] = useState<Disbursement>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (item) =>
        (!status || item.status === status) &&
        (!link || (link === "project") === Boolean(item.projectBillingReference)) &&
        (!release || (release === "released") === Boolean(item.releaseReference)) &&
        (!posting || (posting === "posted") === Boolean(item.postingReference)) &&
        (!q ||
          `${item.id} ${item.obligationReference} ${item.projectBillingReference ?? ""} ${item.assistanceReference ?? ""}`
            .toLocaleLowerCase()
            .includes(q)),
    );
  }, [link, posting, query, records, release, status]);
  const columns: DataTableColumn<Disbursement>[] = [
    {
      key: "voucher",
      header: "Disbursement",
      className: "ops-wide-cell",
      sortValue: (item) => item.id,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/finance/disbursements/${item.id}`}>
            {item.id}
          </Link>
          <strong>{item.obligationReference}</strong>
          <small>{item.projectBillingReference ?? item.assistanceReference ?? "General disbursement"}</small>
        </div>
      ),
    },
    {
      key: "gross",
      header: "Gross",
      sortValue: (item) => item.grossMinor,
      cell: (item) => financeMoney(item.grossMinor),
    },
    {
      key: "net",
      header: "Net payment",
      sortValue: (item) => item.netMinor,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{financeMoney(item.netMinor)}</strong>
          <small>{financeMoney(item.retentionMinor)} retention</small>
        </div>
      ),
    },
    {
      key: "references",
      header: "Release and posting",
      sortValue: (item) => item.releaseReference ?? "",
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{item.releaseReference ?? "Release pending"}</strong>
          <small>{item.postingReference ?? "Posting pending"}</small>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (item) => item.status,
      cell: (item) => <StatusBadge tone={financeStatusTone(item.status)}>{item.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.id}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/disbursements/${item.id}`}>
                <Eye /> View disbursement
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/disbursements/${item.id}/edit`}>
                <Pencil /> Edit disbursement
              </Link>
            </DropdownMenuItem>
            {item.status === "draft" && (
              <DropdownMenuItem
                onSelect={() => {
                  repository.setDisbursementStatus(item.id, "authorized");
                  setRecords(repository.listDisbursements());
                  setNotice(`${item.id} was authorized.`);
                }}
              >
                <BadgeCheck /> Authorize payment
              </DropdownMenuItem>
            )}
            {item.status === "authorized" && (
              <DropdownMenuItem
                onSelect={() => {
                  repository.setDisbursementStatus(item.id, "released");
                  setRecords(repository.listDisbursements());
                  setNotice(`${item.id} release was recorded.`);
                }}
              >
                <Send /> Record release
              </DropdownMenuItem>
            )}
            {item.status === "posting-pending" && (
              <DropdownMenuItem
                onSelect={() => {
                  repository.setDisbursementStatus(item.id, "posted");
                  setRecords(repository.listDisbursements());
                  setNotice(`${item.id} was posted.`);
                }}
              >
                <FileCheck2 /> Mark posted
              </DropdownMenuItem>
            )}
            {item.status === "draft" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(item)}>
                  <Trash2 /> Delete draft
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  const total = records.reduce((sum, item) => sum + item.netMinor, 0);
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Disbursements</h1>
          <p>Manage vouchers, accounting authorization, Treasury release references, retention, and ledger posting.</p>
        </div>
        <Button asChild>
          <Link href="/ops/finance/disbursements/new">
            <Plus /> New disbursement
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <BudgetSummaryCards
        label="Disbursement totals"
        items={[
          { label: "Vouchers", value: records.length, detail: "disbursement records", icon: ReceiptText },
          { label: "Net value", value: financeMoney(total), detail: "after retention", icon: CircleDollarSign },
          {
            label: "Released",
            value: records.filter((item) => item.releaseReference).length,
            detail: "release recorded",
            icon: Banknote,
          },
          {
            label: "Posting pending",
            value: records.filter((item) => !item.postingReference).length,
            detail: "requires posting",
            icon: AlertTriangle,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch
          value={query}
          onChange={setQuery}
          placeholder="Voucher, obligation, billing, or assistance reference…"
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          options={filterOptions(records.map((item) => item.status))}
        />
        <OpsFilter
          label="Source"
          value={link}
          onChange={setLink}
          options={[
            { value: "project", label: "Project billing" },
            { value: "other", label: "Other payment" },
          ]}
        />
        <OpsFilter
          label="Release"
          value={release}
          onChange={setRelease}
          options={[
            { value: "released", label: "Recorded" },
            { value: "pending", label: "Pending" },
          ]}
        />
        <OpsFilter
          label="Posting"
          value={posting}
          onChange={setPosting}
          options={[
            { value: "posted", label: "Recorded" },
            { value: "pending", label: "Pending" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          summary={`${rows.length} disbursement records`}
        />
      ) : (
        <Empty noun="disbursements" />
      )}
      <ConfirmationDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Delete disbursement draft?"
        description="Only a voucher that has not entered authorization can be deleted."
        confirmLabel="Delete draft"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          const done = repository.deleteDisbursement(deleting.id);
          setNotice(done ? `${deleting.id} was deleted.` : "This voucher can no longer be deleted.");
          setDeleting(undefined);
          setRecords(repository.listDisbursements());
        }}
      />
    </Access>
  );
}

export function AdjustmentListView() {
  const [records, setRecords] = useState(() => repository.changes());
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [requester, setRequester] = useState("");
  const [deleting, setDeleting] = useState<BudgetChange>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (item) =>
        (!type || item.type === type) &&
        (!status || item.status === status) &&
        (!requester || item.requester === requester) &&
        (!q || `${item.id} ${item.fromReference} ${item.toReference} ${item.reason}`.toLocaleLowerCase().includes(q)),
    );
  }, [query, records, requester, status, type]);
  const columns: DataTableColumn<BudgetChange>[] = [
    {
      key: "adjustment",
      header: "Adjustment",
      className: "ops-wide-cell",
      sortValue: (item) => item.id,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/finance/adjustments/${item.id}`}>
            {item.id}
          </Link>
          <strong className="capitalize">{item.type}</strong>
          <small>
            {item.fromReference} → {item.toReference}
          </small>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortValue: (item) => item.amountMinor,
      cell: (item) => financeMoney(item.amountMinor),
    },
    {
      key: "balance",
      header: "Balance effect",
      sortValue: (item) => item.afterMinor,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{financeMoney(item.afterMinor)} after</strong>
          <small>{financeMoney(item.beforeMinor)} before</small>
        </div>
      ),
    },
    {
      key: "ownership",
      header: "Request and review",
      sortValue: (item) => item.requester,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{item.requester}</strong>
          <small>{item.reviewer}</small>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (item) => item.status,
      cell: (item) => <StatusBadge tone={financeStatusTone(item.status)}>{item.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.id}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/adjustments/${item.id}`}>
                <Eye /> View adjustment
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/adjustments/${item.id}/edit`}>
                <Pencil /> Edit adjustment
              </Link>
            </DropdownMenuItem>
            {["Draft", "Returned for correction"].includes(item.status) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(item)}>
                  <Trash2 /> Delete adjustment
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
          <h1>Adjustments</h1>
          <p>
            Manage realignments, supplemental allocations, corrections, independent review, and before-and-after
            balances.
          </p>
        </div>
        <Button asChild>
          <Link href="/ops/finance/adjustments/new">
            <Plus /> New adjustment
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <BudgetSummaryCards
        label="Adjustment totals"
        items={[
          { label: "Adjustments", value: records.length, detail: "recorded requests", icon: TrendingUp },
          {
            label: "Total value",
            value: financeMoney(records.reduce((sum, item) => sum + item.amountMinor, 0)),
            detail: "requested changes",
            icon: CircleDollarSign,
          },
          {
            label: "Approved",
            value: records.filter((item) => item.status === "Approved").length,
            detail: "completed decisions",
            icon: CheckCircle2,
          },
          {
            label: "For review",
            value: records.filter((item) => item.status.includes("review") || item.status === "Under review").length,
            detail: "pending action",
            icon: AlertTriangle,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Reference, source, destination, or reason…" />
        <OpsFilter
          label="Type"
          value={type}
          onChange={setType}
          options={filterOptions(records.map((item) => item.type))}
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          options={filterOptions(records.map((item) => item.status))}
        />
        <OpsFilter
          label="Requester"
          value={requester}
          onChange={setRequester}
          options={filterOptions(records.map((item) => item.requester))}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          summary={`${rows.length} adjustment records`}
        />
      ) : (
        <Empty noun="adjustments" />
      )}
      <ConfirmationDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Delete adjustment?"
        description="Only draft or returned adjustments can be deleted."
        confirmLabel="Delete adjustment"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          const done = repository.deleteChange(deleting.id);
          setNotice(done ? `${deleting.id} was deleted.` : "This adjustment can no longer be deleted.");
          setDeleting(undefined);
          setRecords(repository.changes());
        }}
      />
    </Access>
  );
}

export function ReconciliationListView() {
  const [records, setRecords] = useState(() => repository.revenues());
  const [batches, setBatches] = useState(() => repository.interfaces());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [account, setAccount] = useState("");
  const [difference, setDifference] = useState("");
  const [posting, setPosting] = useState("");
  const [deleting, setDeleting] = useState<RevenueProjection>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (item) =>
        (!status || item.status === status) &&
        (!account || item.mappedAccount === account) &&
        (!difference || (difference === "balanced") === (item.differenceMinor === 0)) &&
        (!posting || (posting === "posted") === Boolean(item.postingBatch)) &&
        (!q ||
          `${item.id} ${item.collectionReference} ${item.settlementReference} ${item.mappedAccount}`
            .toLocaleLowerCase()
            .includes(q)),
    );
  }, [account, difference, posting, query, records, status]);
  const columns: DataTableColumn<RevenueProjection>[] = [
    {
      key: "record",
      header: "Reconciliation",
      className: "ops-wide-cell",
      sortValue: (item) => item.id,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/finance/reconciliation/${item.id}`}>
            {item.id}
          </Link>
          <strong>{item.collectionReference}</strong>
          <small>{item.settlementReference}</small>
        </div>
      ),
    },
    {
      key: "account",
      header: "Mapped account",
      sortValue: (item) => item.mappedAccount,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>{item.mappedAccount}</strong>
          <small>{item.postingBatch ?? "Batch pending"}</small>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Collection",
      sortValue: (item) => item.amountMinor,
      cell: (item) => financeMoney(item.amountMinor),
    },
    {
      key: "difference",
      header: "Difference",
      sortValue: (item) => item.differenceMinor,
      cell: (item) => (
        <strong className={item.differenceMinor ? "text-destructive" : ""}>{financeMoney(item.differenceMinor)}</strong>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (item) => item.status,
      cell: (item) => <StatusBadge tone={financeStatusTone(item.status)}>{item.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.id}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/reconciliation/${item.id}`}>
                <Eye /> View record
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/reconciliation/${item.id}/edit`}>
                <Pencil /> Edit mapping
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={item.differenceMinor !== 0 || item.mappedAccount.toLocaleLowerCase().includes("unresolved")}
              onSelect={() => {
                const done = repository.reconcileRevenue(item.id);
                setRecords(repository.revenues());
                setNotice(done ? `${item.id} was reconciled.` : "Resolve the account mapping and difference first.");
              }}
            >
              <BadgeCheck /> Mark reconciled
            </DropdownMenuItem>
            {!["Posted", "Reconciled"].includes(item.status) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(item)}>
                  <Trash2 /> Delete record
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  const unresolved = records.filter((item) => item.differenceMinor > 0 || item.status === "Exception").length;
  return (
    <Access>
      <div className="ops-topline">
        <div>
          <h1>Reconciliation</h1>
          <p>Match collections and settlements, resolve account differences, and monitor accounting posting batches.</p>
        </div>
        <Button asChild>
          <Link href="/ops/finance/reconciliation/new">
            <Plus /> New reconciliation
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <BudgetSummaryCards
        label="Reconciliation totals"
        items={[
          { label: "Collections", value: records.length, detail: "records for review", icon: ReceiptText },
          {
            label: "Collection value",
            value: financeMoney(records.reduce((sum, item) => sum + item.amountMinor, 0)),
            detail: "total matched value",
            icon: CircleDollarSign,
          },
          { label: "Unresolved", value: unresolved, detail: "requires action", icon: AlertTriangle },
          { label: "Posting batches", value: batches.length, detail: "accounting batches", icon: FileCheck2 },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Record, collection, settlement, or account…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          options={filterOptions(records.map((item) => item.status))}
        />
        <OpsFilter
          label="Account"
          value={account}
          onChange={setAccount}
          options={filterOptions(records.map((item) => item.mappedAccount))}
        />
        <OpsFilter
          label="Difference"
          value={difference}
          onChange={setDifference}
          options={[
            { value: "balanced", label: "Balanced" },
            { value: "unresolved", label: "With difference" },
          ]}
        />
        <OpsFilter
          label="Posting batch"
          value={posting}
          onChange={setPosting}
          options={[
            { value: "posted", label: "Assigned" },
            { value: "pending", label: "Pending" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          summary={`${rows.length} reconciliation records`}
        />
      ) : (
        <Empty noun="reconciliation records" />
      )}
      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-lg">Posting batches</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {batches.map((batch) => (
            <div className="rounded-xl border bg-card p-4" key={batch.id}>
              <div className="flex items-start justify-between gap-2">
                <strong>{batch.id}</strong>
                <StatusBadge tone={financeStatusTone(batch.status)}>{batch.status}</StatusBadge>
              </div>
              <p className="mt-3 font-bold text-2xl">{financeMoney(batch.amountMinor)}</p>
              <p className="muted mt-1 text-sm">
                {batch.recordCount} records · {batch.createdAt}
              </p>
              {batch.error && <p className="mt-3 text-destructive text-sm">{batch.error}</p>}
              {batch.status === "rejected" && (
                <Button
                  className="mt-3"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    repository.retryInterface(batch.id);
                    setBatches(repository.interfaces());
                    setNotice(`${batch.id} was queued for validation.`);
                  }}
                >
                  <RefreshCw /> Retry batch
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
      <ConfirmationDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Delete reconciliation record?"
        description="Posted and reconciled records cannot be deleted."
        confirmLabel="Delete record"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          const done = repository.deleteRevenue(deleting.id);
          setNotice(done ? `${deleting.id} was deleted.` : "This record can no longer be deleted.");
          setDeleting(undefined);
          setRecords(repository.revenues());
        }}
      />
    </Access>
  );
}

export function PeriodListView() {
  const [records, setRecords] = useState(() => repository.periods());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [readiness, setReadiness] = useState("");
  const [deleting, setDeleting] = useState<FiscalPeriod>();
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter(
      (item) =>
        (!status || item.status === status) &&
        (!readiness || (readiness === "ready") === item.checklist.every((check) => check.complete)) &&
        (!q ||
          `${item.id} ${item.label} ${item.checklist.map((check) => check.label).join(" ")}`
            .toLocaleLowerCase()
            .includes(q)),
    );
  }, [query, readiness, records, status]);
  const columns: DataTableColumn<FiscalPeriod>[] = [
    {
      key: "period",
      header: "Fiscal period",
      className: "ops-wide-cell",
      sortValue: (item) => item.label,
      cell: (item) => (
        <div className="grid gap-0.5">
          <Link className="registry-member-link" href={`/ops/finance/periods/${item.id}`}>
            {item.id}
          </Link>
          <strong>{item.label}</strong>
          <small>{item.closedAt ? `Closed ${item.closedAt}` : "Active financial period"}</small>
        </div>
      ),
    },
    {
      key: "checklist",
      header: "Closing checklist",
      sortValue: (item) => item.checklist.filter((check) => check.complete).length,
      cell: (item) => (
        <div className="grid gap-0.5">
          <strong>
            {item.checklist.filter((check) => check.complete).length}/{item.checklist.length} complete
          </strong>
          <small>{item.checklist.find((check) => !check.complete)?.label ?? "All requirements complete"}</small>
        </div>
      ),
    },
    {
      key: "history",
      header: "Latest activity",
      sortValue: (item) => item.history.at(-1) ?? "",
      cell: (item) => item.history.at(-1) ?? "No activity",
    },
    {
      key: "status",
      header: "Status",
      sortValue: (item) => item.status,
      cell: (item) => <StatusBadge tone={financeStatusTone(item.status)}>{item.status}</StatusBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${item.label}`}>
            <EllipsisVertical size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="ops-row-menu-content">
            <DropdownMenuItem asChild>
              <Link href={`/ops/finance/periods/${item.id}`}>
                <Eye /> View period
              </Link>
            </DropdownMenuItem>
            {item.status !== "closed" && (
              <DropdownMenuItem asChild>
                <Link href={`/ops/finance/periods/${item.id}/edit`}>
                  <Pencil /> Edit checklist
                </Link>
              </DropdownMenuItem>
            )}
            {item.status === "open" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(item)}>
                  <Trash2 /> Delete period
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
          <h1>Periods</h1>
          <p>
            Manage fiscal periods, reconciliation and posting checklists, authorized closing, and controlled reopening.
          </p>
        </div>
        <Button asChild>
          <Link href="/ops/finance/periods/new">
            <Plus /> New period
          </Link>
        </Button>
      </div>
      <Notice text={notice} />
      <BudgetSummaryCards
        label="Fiscal period totals"
        items={[
          { label: "Periods", value: records.length, detail: "financial periods", icon: CalendarCheck },
          {
            label: "Open",
            value: records.filter((item) => item.status === "open").length,
            detail: "active periods",
            icon: BookOpenCheck,
          },
          {
            label: "Closing",
            value: records.filter((item) => item.status === "closing").length,
            detail: "checklist in progress",
            icon: AlertTriangle,
          },
          {
            label: "Closed",
            value: records.filter((item) => item.status === "closed").length,
            detail: "authorized closes",
            icon: CheckCircle2,
          },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Period, reference, or checklist item…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          options={filterOptions(records.map((item) => item.status))}
        />
        <OpsFilter
          label="Checklist"
          value={readiness}
          onChange={setReadiness}
          options={[
            { value: "ready", label: "Complete" },
            { value: "incomplete", label: "Incomplete" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.id}
          summary={`${rows.length} fiscal period records`}
        />
      ) : (
        <Empty noun="fiscal periods" />
      )}
      <ConfirmationDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Delete fiscal period?"
        description="Only an open period without a recorded close can be deleted."
        confirmLabel="Delete period"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          const done = repository.deletePeriod(deleting.id);
          setNotice(done ? `${deleting.id} was deleted.` : "This period cannot be deleted.");
          setDeleting(undefined);
          setRecords(repository.periods());
        }}
      />
    </Access>
  );
}

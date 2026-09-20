"use client";

import { useState } from "react";

import Link from "next/link";

import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileText,
  Landmark,
  Link2,
  type LucideIcon,
  Pencil,
  Percent,
  ReceiptText,
  RotateCcw,
  Send,
  UserRound,
  WalletCards,
} from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { budgetAccountingRepository as repository } from "../services/budget-accounting-repository";
import { availabilityState, financeMoney, financeStatusTone } from "../services/budget-presentation";
import type { BudgetRecordKind } from "./budget-form-view";

const plural: Record<BudgetRecordKind, string> = {
  allocation: "allocations",
  obligation: "obligations",
  disbursement: "disbursements",
  adjustment: "adjustments",
  reconciliation: "reconciliation",
  period: "periods",
};

function FinancialHero({
  icon: Icon,
  eyebrow,
  title,
  amount,
  amountLabel,
  status,
  detail,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  amount: string;
  amountLabel: string;
  status: string;
  detail: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Icon size={22} />
            </span>
            <div>
              <span className="eyebrow">{eyebrow}</span>
              <h2 className="mt-1 text-2xl">{title}</h2>
              <p className="mt-2 max-w-3xl text-muted-foreground text-sm">{detail}</p>
            </div>
          </div>
        </div>
        <div className="min-w-64 rounded-2xl border border-primary/15 bg-card/90 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{amountLabel}</span>
            <StatusBadge tone={financeStatusTone(status)}>{status}</StatusBadge>
          </div>
          <strong className="mt-3 block text-4xl tracking-tight">{amount}</strong>
        </div>
      </div>
    </section>
  );
}

function AmountCards({
  items,
}: {
  items: { label: string; value: string; detail: string; icon: LucideIcon; emphasis?: "primary" | "warning" }[];
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Financial amounts">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            className={`rounded-xl border p-4 shadow-sm ${item.emphasis === "primary" ? "border-primary/25 bg-primary/7" : item.emphasis === "warning" ? "border-amber-200 bg-amber-50" : "bg-card"}`}
            key={item.label}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon size={16} />
              </span>
              <span className="font-semibold text-xs uppercase tracking-wide">{item.label}</span>
            </div>
            <strong className="mt-4 block text-2xl tracking-tight">{item.value}</strong>
            <small className="mt-1 block text-muted-foreground">{item.detail}</small>
          </div>
        );
      })}
    </section>
  );
}

const factIcons = [FileText, Building2, Link2, UserRound];
function Facts({ items }: { items: { label: string; value: React.ReactNode; icon?: LucideIcon }[] }) {
  return (
    <dl className="mt-5 grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => {
        const Icon = item.icon ?? factIcons[index % factIcons.length];
        return (
          <div className="flex min-w-0 gap-3 rounded-xl border bg-muted/20 p-4" key={item.label}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon size={17} />
            </span>
            <div className="min-w-0">
              <dt className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{item.label}</dt>
              <dd className="mt-1 break-words font-semibold leading-relaxed">{item.value}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

function History({ entries }: { entries: string[] }) {
  return (
    <ContentPanel as="aside">
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Clock3 size={21} />
        </span>
        <div>
          <span className="eyebrow">Activity log</span>
          <h2>Record history</h2>
        </div>
      </div>
      <div className="mt-5 grid gap-0">
        {entries.map((entry, index) => (
          <div className="relative grid grid-cols-[2rem_1fr] gap-3 pb-5 last:pb-0" key={entry}>
            {index < entries.length - 1 && <span className="absolute top-8 bottom-0 left-[.95rem] w-px bg-border" />}
            <span className="relative z-10 grid size-8 place-items-center rounded-full border-4 border-card bg-primary font-bold text-primary-foreground text-xs">
              {index + 1}
            </span>
            <div className="rounded-xl border bg-muted/20 p-3 text-sm leading-relaxed">{entry}</div>
          </div>
        ))}
      </div>
    </ContentPanel>
  );
}

export function BudgetRecordView({ kind, recordId }: { kind: BudgetRecordKind; recordId: string }) {
  const { role } = useWorkspaceSession();
  const [, refresh] = useState(0);
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const allocation = kind === "allocation" ? repository.findAllocation(recordId) : undefined;
  const obligation = kind === "obligation" ? repository.findObligation(recordId) : undefined;
  const disbursement = kind === "disbursement" ? repository.findDisbursement(recordId) : undefined;
  const adjustment = kind === "adjustment" ? repository.findChange(recordId) : undefined;
  const reconciliation = kind === "reconciliation" ? repository.findRevenue(recordId) : undefined;
  const period = kind === "period" ? repository.findPeriod(recordId) : undefined;
  const record = allocation ?? obligation ?? disbursement ?? adjustment ?? reconciliation ?? period;
  const destination = `/ops/finance/${plural[kind]}`;
  const title =
    allocation?.fund ??
    obligation?.purpose ??
    disbursement?.id ??
    adjustment?.id ??
    reconciliation?.id ??
    period?.label ??
    recordId;
  if (role !== "municipal")
    return (
      <PermissionState
        title="Budget records require municipal access"
        description="Authorized municipal staff can review financial records."
      />
    );
  if (!record)
    return (
      <EmptyState
        icon={ReceiptText}
        headingLevel="h1"
        title="Financial record unavailable"
        description="The requested record could not be found."
        action={
          <Button asChild variant="outline">
            <Link href={destination}>Back to {plural[kind]}</Link>
          </Button>
        }
      />
    );
  const update = (message: string) => {
    setNotice(message);
    refresh((value) => value + 1);
  };
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href={destination}>
            <ArrowLeft size={15} /> {plural[kind][0].toUpperCase() + plural[kind].slice(1)}
          </Link>
          <h1>{title}</h1>
          <p>{recordId} · Municipal financial record</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`${destination}/${recordId}/edit`}>
            <Pencil /> Edit record
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}

      {allocation &&
        (() => {
          const available = allocation.appropriatedMinor - allocation.obligatedMinor;
          const utilization = Math.round((allocation.obligatedMinor / allocation.appropriatedMinor) * 100);
          const obligations = repository
            .listObligations()
            .filter((item) => item.appropriationReference === allocation.id);
          const status = availabilityState(allocation.appropriatedMinor, allocation.obligatedMinor);
          return (
            <div className="space-y-6">
              <FinancialHero
                icon={Landmark}
                eyebrow="Allocation record"
                title="Approved budget authority"
                amount={financeMoney(allocation.appropriatedMinor)}
                amountLabel="Approved allocation"
                status={status}
                detail={`${allocation.fiscalPeriod} funding authority assigned to ${allocation.department}.`}
              />
              <AmountCards
                items={[
                  {
                    label: "Approved",
                    value: financeMoney(allocation.appropriatedMinor),
                    detail: "total budget authority",
                    icon: Landmark,
                  },
                  {
                    label: "Obligated",
                    value: financeMoney(allocation.obligatedMinor),
                    detail: `${utilization}% committed`,
                    icon: BookOpenCheck,
                  },
                  {
                    label: "Disbursed",
                    value: financeMoney(allocation.disbursedMinor),
                    detail: "released and recorded",
                    icon: Banknote,
                  },
                  {
                    label: "Available",
                    value: financeMoney(available),
                    detail: "unobligated balance",
                    icon: WalletCards,
                    emphasis: "primary",
                  },
                ]}
              />
              <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                <ContentPanel as="section">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <FileText size={21} />
                    </span>
                    <div>
                      <span className="eyebrow">Source and ownership</span>
                      <h2>Allocation information</h2>
                    </div>
                  </div>
                  <Facts
                    items={[
                      { label: "Fiscal period", value: allocation.fiscalPeriod, icon: CalendarCheck },
                      { label: "Responsible office", value: allocation.department, icon: Building2 },
                      {
                        label: "Project reference",
                        value: allocation.projectReference ?? "Department allocation",
                        icon: Link2,
                      },
                      { label: "Appropriation authority", value: allocation.source, icon: FileCheck2 },
                    ]}
                  />
                </ContentPanel>
                <ContentPanel as="aside">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Percent size={21} />
                    </span>
                    <div>
                      <span className="eyebrow">Budget utilization</span>
                      <h2>{utilization}% obligated</h2>
                    </div>
                  </div>
                  <Progress className="mt-6 h-3" value={utilization} />
                  <div className="mt-5 rounded-xl border bg-muted/20 p-4">
                    <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      Remaining authority
                    </p>
                    <strong className="mt-2 block text-3xl">{financeMoney(available)}</strong>
                    <p className="mt-2 text-muted-foreground text-sm">
                      Available for new obligations within this allocation.
                    </p>
                  </div>
                </ContentPanel>
              </div>
              <ContentPanel as="section">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="eyebrow">Related commitments</span>
                    <h2>Obligations against this allocation</h2>
                  </div>
                  <Button asChild>
                    <Link href={`/ops/finance/obligations/new?allocation=${allocation.id}`}>New obligation</Link>
                  </Button>
                </div>
                <div className="mt-5 grid gap-3">
                  {obligations.length ? (
                    obligations.map((item) => (
                      <Link
                        className="grid gap-3 rounded-xl border p-4 transition-colors hover:border-primary/30 hover:bg-primary/5 sm:grid-cols-[1fr_auto] sm:items-center"
                        href={`/ops/finance/obligations/${item.id}`}
                        key={item.id}
                      >
                        <div>
                          <strong>
                            {item.id} · {item.purpose}
                          </strong>
                          <p className="muted mt-1 text-sm">{item.payeeProjection}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <strong className="text-lg">{financeMoney(item.requestedMinor)}</strong>
                          <div className="mt-1">
                            <StatusBadge tone={financeStatusTone(item.status)}>{item.status}</StatusBadge>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="muted">No obligations are recorded against this allocation.</p>
                  )}
                </div>
              </ContentPanel>
            </div>
          );
        })()}

      {obligation &&
        (() => {
          const allocationRecord = repository.findAllocation(obligation.appropriationReference);
          const available = (allocationRecord?.appropriatedMinor ?? 0) - (allocationRecord?.obligatedMinor ?? 0);
          const coverage = obligation.requestedMinor
            ? Math.min(100, Math.round((available / obligation.requestedMinor) * 100))
            : 0;
          return (
            <div className="space-y-6">
              <FinancialHero
                icon={BookOpenCheck}
                eyebrow="Obligation record"
                title={obligation.payeeProjection}
                amount={financeMoney(obligation.requestedMinor)}
                amountLabel="Requested commitment"
                status={obligation.status}
                detail={obligation.purpose}
              />
              <AmountCards
                items={[
                  {
                    label: "Requested",
                    value: financeMoney(obligation.requestedMinor),
                    detail: "obligation amount",
                    icon: ReceiptText,
                    emphasis: "primary",
                  },
                  {
                    label: "Available",
                    value: financeMoney(available),
                    detail: `${coverage}% request coverage`,
                    icon: WalletCards,
                  },
                  {
                    label: "Evidence",
                    value: String(obligation.evidenceReferences.length),
                    detail: "supporting records",
                    icon: FileCheck2,
                  },
                  {
                    label: "Version",
                    value: `v${obligation.version}`,
                    detail: "current record version",
                    icon: FileText,
                  },
                ]}
              />
              <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                <ContentPanel as="section">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <ReceiptText size={21} />
                    </span>
                    <div>
                      <span className="eyebrow">Commitment details</span>
                      <h2>Funding and evidence</h2>
                    </div>
                  </div>
                  <Facts
                    items={[
                      { label: "Allocation", value: obligation.appropriationReference, icon: Landmark },
                      { label: "Payee", value: obligation.payeeProjection, icon: UserRound },
                      { label: "Requesting office", value: obligation.requester, icon: Building2 },
                      { label: "Reviewer", value: obligation.reviewer ?? "Not assigned", icon: BadgeCheck },
                      {
                        label: "Supporting records",
                        value: obligation.evidenceReferences.join(" · ") || "Required",
                        icon: FileCheck2,
                      },
                      { label: "Review note", value: obligation.reason ?? "No note recorded", icon: FileText },
                    ]}
                  />
                  <div className="mt-5 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-sm">Funding coverage</span>
                      <strong>{coverage}%</strong>
                    </div>
                    <Progress className="mt-3" value={coverage} />
                  </div>
                  <label className="form-field mt-5">
                    <span className="form-label">Decision reason</span>
                    <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
                  </label>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={obligation.status === "approved" || obligation.requestedMinor > available}
                      onClick={() =>
                        update(
                          repository.decideObligation(obligation.id, "approve", reason)
                            ? "Obligation approved and allocation availability updated."
                            : "Approval requires sufficient balance, supporting records, an independent reviewer, and a decision reason.",
                        )
                      }
                    >
                      <BadgeCheck /> Approve obligation
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        update(
                          repository.decideObligation(obligation.id, "return", reason)
                            ? "Obligation returned for correction."
                            : "Enter a decision reason and assign an independent reviewer.",
                        )
                      }
                    >
                      <RotateCcw /> Return for correction
                    </Button>
                  </div>
                </ContentPanel>
                <History entries={obligation.history} />
              </div>
            </div>
          );
        })()}

      {disbursement && (
        <div className="space-y-6">
          <FinancialHero
            icon={ReceiptText}
            eyebrow="Disbursement voucher"
            title={disbursement.obligationReference}
            amount={financeMoney(disbursement.netMinor)}
            amountLabel="Net payment"
            status={disbursement.status}
            detail="Payment value after retention, linked to its budget obligation and supporting transaction."
          />
          <AmountCards
            items={[
              {
                label: "Gross",
                value: financeMoney(disbursement.grossMinor),
                detail: "voucher amount",
                icon: CircleDollarSign,
              },
              {
                label: "Retention",
                value: financeMoney(disbursement.retentionMinor),
                detail: `${Math.round((disbursement.retentionMinor / disbursement.grossMinor) * 100)}% withheld`,
                icon: Percent,
              },
              {
                label: "Net payment",
                value: financeMoney(disbursement.netMinor),
                detail: "amount for release",
                icon: Banknote,
                emphasis: "primary",
              },
              {
                label: "Workflow",
                value: String(disbursement.approvalChain.length),
                detail: "completed control steps",
                icon: BadgeCheck,
              },
            ]}
          />
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <ContentPanel as="section">
              <div className="flex items-start gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileCheck2 size={21} />
                </span>
                <div>
                  <span className="eyebrow">Payment controls</span>
                  <h2>References and posting</h2>
                </div>
              </div>
              <Facts
                items={[
                  { label: "Obligation", value: disbursement.obligationReference, icon: BookOpenCheck },
                  {
                    label: "Project billing",
                    value: disbursement.projectBillingReference ?? "Not applicable",
                    icon: Link2,
                  },
                  {
                    label: "Assistance reference",
                    value: disbursement.assistanceReference ?? "Not applicable",
                    icon: Link2,
                  },
                  { label: "Release reference", value: disbursement.releaseReference ?? "Pending", icon: Banknote },
                  { label: "Posting reference", value: disbursement.postingReference ?? "Pending", icon: FileCheck2 },
                ]}
              />
              <div className="mt-5 flex flex-wrap gap-2">
                {disbursement.status === "draft" && (
                  <Button
                    onClick={() =>
                      update(
                        repository.setDisbursementStatus(disbursement.id, "authorized")
                          ? "Payment was authorized."
                          : "Authorization could not be recorded.",
                      )
                    }
                  >
                    <BadgeCheck /> Authorize payment
                  </Button>
                )}
                {disbursement.status === "authorized" && (
                  <Button
                    onClick={() =>
                      update(
                        repository.setDisbursementStatus(disbursement.id, "released")
                          ? "Treasury release was recorded."
                          : "Release could not be recorded.",
                      )
                    }
                  >
                    <Banknote /> Record release
                  </Button>
                )}
                {disbursement.status === "posting-pending" && (
                  <Button
                    onClick={() =>
                      update(
                        repository.setDisbursementStatus(disbursement.id, "posted")
                          ? "Accounting posting was recorded."
                          : "Posting could not be recorded.",
                      )
                    }
                  >
                    <Send /> Mark posted
                  </Button>
                )}
              </div>
            </ContentPanel>
            <History entries={[...disbursement.approvalChain, ...disbursement.history]} />
          </div>
        </div>
      )}

      {adjustment && (
        <div className="space-y-6">
          <FinancialHero
            icon={CircleDollarSign}
            eyebrow="Budget adjustment"
            title={`${adjustment.fromReference} → ${adjustment.toReference}`}
            amount={financeMoney(adjustment.amountMinor)}
            amountLabel="Adjustment value"
            status={adjustment.status}
            detail={adjustment.reason}
          />
          <AmountCards
            items={[
              {
                label: "Adjustment",
                value: financeMoney(adjustment.amountMinor),
                detail: adjustment.type,
                icon: CircleDollarSign,
                emphasis: "primary",
              },
              {
                label: "Balance before",
                value: financeMoney(adjustment.beforeMinor),
                detail: "source position",
                icon: WalletCards,
              },
              {
                label: "Balance after",
                value: financeMoney(adjustment.afterMinor),
                detail: "resulting position",
                icon: Landmark,
              },
              {
                label: "Net effect",
                value: financeMoney(Math.abs(adjustment.afterMinor - adjustment.beforeMinor)),
                detail: adjustment.afterMinor >= adjustment.beforeMinor ? "increase" : "decrease",
                icon: Percent,
              },
            ]}
          />
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <ContentPanel as="section">
              <div className="flex items-start gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Landmark size={21} />
                </span>
                <div>
                  <span className="eyebrow">Adjustment authority</span>
                  <h2 className="capitalize">{adjustment.type} details</h2>
                </div>
              </div>
              <Facts
                items={[
                  { label: "Source", value: adjustment.fromReference, icon: Link2 },
                  { label: "Destination", value: adjustment.toReference, icon: Link2 },
                  { label: "Requesting office", value: adjustment.requester, icon: Building2 },
                  { label: "Independent reviewer", value: adjustment.reviewer, icon: UserRound },
                  { label: "Reason and authority", value: adjustment.reason, icon: FileText },
                ]}
              />
              <label className="form-field mt-5">
                <span className="form-label">Decision reason</span>
                <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    update(
                      repository.decideChange(adjustment.id, true, reason)
                        ? "Adjustment approved."
                        : "An independent reviewer and decision reason are required.",
                    )
                  }
                >
                  <BadgeCheck /> Approve adjustment
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    update(
                      repository.decideChange(adjustment.id, false, reason)
                        ? "Adjustment returned for correction."
                        : "An independent reviewer and decision reason are required.",
                    )
                  }
                >
                  <RotateCcw /> Return for correction
                </Button>
              </div>
            </ContentPanel>
            <History entries={adjustment.history} />
          </div>
        </div>
      )}

      {reconciliation && (
        <div className="space-y-6">
          <FinancialHero
            icon={FileCheck2}
            eyebrow="Collection reconciliation"
            title={`${reconciliation.collectionReference} → ${reconciliation.settlementReference}`}
            amount={financeMoney(reconciliation.amountMinor)}
            amountLabel="Collection value"
            status={reconciliation.status}
            detail={`Mapped to ${reconciliation.mappedAccount}.`}
          />
          <AmountCards
            items={[
              {
                label: "Collection",
                value: financeMoney(reconciliation.amountMinor),
                detail: "recorded receipt value",
                icon: CircleDollarSign,
                emphasis: "primary",
              },
              {
                label: "Difference",
                value: financeMoney(reconciliation.differenceMinor),
                detail: reconciliation.differenceMinor === 0 ? "balanced" : "requires resolution",
                icon: Percent,
                emphasis: reconciliation.differenceMinor ? "warning" : undefined,
              },
              {
                label: "Settlement",
                value: reconciliation.settlementReference,
                detail: "deposit reference",
                icon: Banknote,
              },
              {
                label: "Posting batch",
                value: reconciliation.postingBatch ?? "Pending",
                detail: "accounting interface",
                icon: FileCheck2,
              },
            ]}
          />
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <ContentPanel as="section">
              <div className="flex items-start gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ReceiptText size={21} />
                </span>
                <div>
                  <span className="eyebrow">Mapping details</span>
                  <h2>Settlement and account</h2>
                </div>
              </div>
              <Facts
                items={[
                  { label: "Collection reference", value: reconciliation.collectionReference, icon: ReceiptText },
                  { label: "Settlement reference", value: reconciliation.settlementReference, icon: Banknote },
                  { label: "Mapped account", value: reconciliation.mappedAccount, icon: Landmark },
                  { label: "Posting batch", value: reconciliation.postingBatch ?? "Pending", icon: FileCheck2 },
                ]}
              />
              <Button
                className="mt-5"
                disabled={
                  reconciliation.differenceMinor !== 0 ||
                  reconciliation.mappedAccount.toLocaleLowerCase().includes("unresolved")
                }
                onClick={() =>
                  update(
                    repository.reconcileRevenue(reconciliation.id)
                      ? "Collection and settlement were reconciled."
                      : "Resolve the account mapping and difference first.",
                  )
                }
              >
                <BadgeCheck /> Mark reconciled
              </Button>
            </ContentPanel>
            <ContentPanel as="aside">
              <div className="flex items-start gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CheckCircle2 size={21} />
                </span>
                <div>
                  <span className="eyebrow">Control check</span>
                  <h2>Reconciliation readiness</h2>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  ["Collection identified", Boolean(reconciliation.collectionReference)],
                  ["Settlement identified", Boolean(reconciliation.settlementReference)],
                  ["Account mapped", !reconciliation.mappedAccount.toLocaleLowerCase().includes("unresolved")],
                  ["Difference cleared", reconciliation.differenceMinor === 0],
                  ["Posting batch assigned", Boolean(reconciliation.postingBatch)],
                ].map(([label, complete]) => (
                  <div
                    className="flex items-center justify-between rounded-xl border bg-muted/20 p-4"
                    key={String(label)}
                  >
                    <span className="font-medium">{String(label)}</span>
                    <StatusBadge tone={complete ? "success" : "warning"}>
                      {complete ? "Complete" : "Required"}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </ContentPanel>
          </div>
        </div>
      )}

      {period &&
        (() => {
          const completed = period.checklist.filter((item) => item.complete).length;
          const progress = Math.round((completed / period.checklist.length) * 100);
          return (
            <div className="space-y-6">
              <FinancialHero
                icon={CalendarCheck}
                eyebrow="Fiscal period"
                title={period.label}
                amount={`${completed} of ${period.checklist.length}`}
                amountLabel="Checklist complete"
                status={period.status}
                detail="Period controls for reconciliation, voucher review, posting exceptions, closing, and authorized reopening."
              />
              <AmountCards
                items={[
                  {
                    label: "Completion",
                    value: `${progress}%`,
                    detail: "closing readiness",
                    icon: Percent,
                    emphasis: "primary",
                  },
                  { label: "Completed", value: String(completed), detail: "control checks", icon: CheckCircle2 },
                  {
                    label: "Open",
                    value: String(period.checklist.length - completed),
                    detail: "remaining checks",
                    icon: Clock3,
                  },
                  {
                    label: "Closed date",
                    value: period.closedAt ?? "Not closed",
                    detail: period.reopenReason ?? "period status",
                    icon: CalendarCheck,
                  },
                ]}
              />
              <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                <ContentPanel as="section">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <CalendarCheck size={21} />
                    </span>
                    <div>
                      <span className="eyebrow">Period controls</span>
                      <h2>Closing checklist</h2>
                    </div>
                  </div>
                  <Progress className="mt-6 h-3" value={progress} />
                  <div className="mt-5 grid gap-3">
                    {period.checklist.map((item) => (
                      <div
                        className="flex items-center justify-between rounded-xl border bg-muted/20 p-4"
                        key={item.label}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`grid size-8 place-items-center rounded-full ${item.complete ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}
                          >
                            {item.complete ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                          </span>
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <StatusBadge tone={item.complete ? "success" : "warning"}>
                          {item.complete ? "Complete" : "Open"}
                        </StatusBadge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {period.status !== "closed" && (
                      <Button
                        disabled={period.checklist.some((item) => !item.complete)}
                        onClick={() =>
                          update(
                            repository.closePeriod(period.id)
                              ? "Fiscal period was closed."
                              : "Complete every checklist item before closing the period.",
                          )
                        }
                      >
                        <BadgeCheck /> Close period
                      </Button>
                    )}
                    {period.status === "closed" && (
                      <>
                        <label className="form-field w-full">
                          <span className="form-label">Reopen reason</span>
                          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
                        </label>
                        <Button
                          variant="outline"
                          onClick={() =>
                            update(
                              repository.requestReopen(period.id, reason)
                                ? "Fiscal period was reopened with an audit reason."
                                : "Enter a reason with at least eight characters.",
                            )
                          }
                        >
                          <RotateCcw /> Reopen period
                        </Button>
                      </>
                    )}
                  </div>
                </ContentPanel>
                <History entries={period.history} />
              </div>
            </div>
          );
        })()}
    </>
  );
}

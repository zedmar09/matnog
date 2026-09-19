"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { BookOpenCheck, CircleDollarSign, Landmark, ReceiptText } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Progress } from "@/shared/components/ui/progress";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { budgetAccountingRepository } from "../services/budget-accounting-repository";
import type { FinanceScenario } from "../types/budget-accounting";

export type FinanceScreen = "budgets" | "obligation" | "disbursement" | "changes" | "revenue" | "period" | "interfaces";
const money = (minor: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(minor / 100);
const scenarios: { value: FinanceScenario; label: string }[] = [
  { value: "normal", label: "Normal workflow" },
  { value: "insufficient", label: "Insufficient availability" },
  { value: "ineligible-fund", label: "Ineligible sample fund" },
  { value: "missing-evidence", label: "Missing evidence" },
  { value: "partial-release", label: "Partial / rejected release" },
  { value: "duplicate-posting", label: "Duplicate posting event" },
  { value: "stale-balance", label: "Stale balance version" },
];
const tone = (status: string): "success" | "warning" | "pending" =>
  status.includes("accepted") ||
  status.includes("posted") ||
  status.includes("released") ||
  status.includes("approved") ||
  status.includes("Reconciled")
    ? "success"
    : status.includes("rejected") || status.includes("Exception") || status.includes("correction")
      ? "warning"
      : "pending";

export function BudgetAccountingWorkspace({ screen, recordId }: { screen: FinanceScreen; recordId?: string }) {
  const { role, scenario: globalScenario, setScenario } = useWorkspaceSession();
  const [preview, setPreview] = useState<FinanceScenario>("normal");
  const [query, setQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [decisionReason, setDecisionReason] = useState("Reviewed against the sample balance and linked evidence.");
  const [periodReason, setPeriodReason] = useState("Correct a rejected mapping through an authorized adjustment path.");
  const [notice, setNotice] = useState<string>();
  const [disbursements, setDisbursements] = useState(() => budgetAccountingRepository.listDisbursements());
  const effective = globalScenario === "normal" ? preview : globalScenario;
  const obligation = recordId ? budgetAccountingRepository.findObligation(recordId) : undefined;
  const disbursement = recordId ? disbursements.find((item) => item.id === recordId) : undefined;
  const period = recordId ? budgetAccountingRepository.periods().find((item) => item.id === recordId) : undefined;
  const appropriations = budgetAccountingRepository.appropriations();
  const filtered = useMemo(
    () =>
      appropriations.filter(
        (item) =>
          `${item.id} ${item.fund} ${item.department} ${item.projectReference ?? ""} ${item.source}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (periodFilter === "all" || item.fiscalPeriod === periodFilter) &&
          (departmentFilter === "all" || item.department === departmentFilter),
      ),
    [appropriations, query, periodFilter, departmentFilter],
  );
  const blocked = effective !== "normal";
  if (role !== "municipal" || effective === "denied")
    return (
      <PermissionState
        title="Financial workspace is unavailable"
        description="Choose the Municipal staff demo role. Budget, Accounting and Treasury decisions remain separate capabilities."
      />
    );
  if (effective === "slow") return <LoadingState label="Loading sample financial period…" />;
  if (effective === "error")
    return (
      <ErrorState
        title="Financial records could not load"
        description="This selectable demo failure sends no request to a bank or accounting system."
        onRetry={() => setScenario("normal")}
      />
    );
  const title = {
    budgets: "Budget and appropriation dashboard",
    obligation: `Obligation ${recordId ?? ""}`,
    disbursement: `Disbursement ${recordId ?? ""}`,
    changes: "Budget changes and adjustments",
    revenue: "Revenue reconciliation",
    period: `Fiscal period ${recordId ?? ""}`,
    interfaces: "Accounting interface status",
  }[screen];
  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M14 · Budget and accounting · UI demo</span>
          <h1>{title}</h1>
          <p>
            Keep appropriation, obligation, authorization, Treasury release and accounting posting visibly separate.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/ops/finance/interfaces">Interface status</Link>
        </Button>
      </div>
      <NoticePanel className="mb-5">
        Illustrative financial workflow only. No official chart of accounts, bank transfer, accounting import, period
        close or cash release occurs.
      </NoticePanel>
      <ContentPanel className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="font-medium text-sm">
            Exception preview
            <NativeSelect
              className="mt-2"
              value={preview}
              onChange={(e) => setPreview(e.target.value as FinanceScenario)}
            >
              {scenarios.map((scenario) => (
                <option key={scenario.value} value={scenario.value}>
                  {scenario.label}
                </option>
              ))}
            </NativeSelect>
          </label>
          <div className="text-sm">
            <strong>Ownership chain</strong>
            <p className="muted mt-2">
              M06 collection → M14 reconciliation/posting. M13 verified billing → M14 voucher → separate Treasury
              release.
            </p>
          </div>
        </div>
      </ContentPanel>
      {notice && <NoticePanel className="mb-5">{notice}</NoticePanel>}
      {effective === "empty" ? (
        <EmptyState
          icon={ReceiptText}
          title="No financial records"
          description="The selected sample projection has no records."
        />
      ) : screen === "budgets" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <ContentPanel>
              <Landmark className="text-primary" />
              <strong className="mt-2 block text-3xl">
                {money(appropriations.reduce((s, a) => s + a.appropriatedMinor, 0))}
              </strong>
              <span className="muted text-sm">Appropriated</span>
            </ContentPanel>
            <ContentPanel>
              <BookOpenCheck className="text-primary" />
              <strong className="mt-2 block text-3xl">
                {money(appropriations.reduce((s, a) => s + a.obligatedMinor, 0))}
              </strong>
              <span className="muted text-sm">Obligated</span>
            </ContentPanel>
            <ContentPanel>
              <CircleDollarSign className="text-primary" />
              <strong className="mt-2 block text-3xl">
                {money(appropriations.reduce((s, a) => s + a.disbursedMinor, 0))}
              </strong>
              <span className="muted text-sm">Released / disbursed projection</span>
            </ContentPanel>
          </div>
          <ContentPanel className="my-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Input
                placeholder="Filter fund, department or project"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <NativeSelect value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}>
                <option value="all">All fiscal periods</option>
                {[...new Set(appropriations.map((item) => item.fiscalPeriod))].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                <option value="all">All departments</option>
                {[...new Set(appropriations.map((item) => item.department))].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setPeriodFilter("all");
                  setDepartmentFilter("all");
                }}
              >
                Reset
              </Button>
            </div>
          </ContentPanel>
          <div className="grid gap-4">
            {filtered.map((a) => {
              const available = a.appropriatedMinor - a.obligatedMinor;
              return (
                <ContentPanel key={a.id}>
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <span className="eyebrow">
                        {a.id} · {a.fiscalPeriod}
                      </span>
                      <h2>{a.fund}</h2>
                      <p className="muted">
                        {a.department} · {a.projectReference ?? "Department allocation"}
                      </p>
                    </div>
                    <StatusBadge tone={available > 0 ? "success" : "warning"}>{money(available)} available</StatusBadge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <p>
                      Appropriation
                      <br />
                      <strong>{money(a.appropriatedMinor)}</strong>
                    </p>
                    <p>
                      Obligations
                      <br />
                      <strong>{money(a.obligatedMinor)}</strong>
                    </p>
                    <p>
                      Disbursement
                      <br />
                      <strong>{money(a.disbursedMinor)}</strong>
                    </p>
                  </div>
                  <Progress className="mt-4" value={(a.obligatedMinor / a.appropriatedMinor) * 100} />
                </ContentPanel>
              );
            })}
          </div>
        </>
      ) : screen === "obligation" ? (
        obligation ? (
          (() => {
            const app = appropriations.find((a) => a.id === obligation.appropriationReference);
            const available = (app?.appropriatedMinor ?? 0) - (app?.obligatedMinor ?? 0);
            const shortage = Math.max(0, obligation.requestedMinor - available);
            return (
              <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
                <ContentPanel>
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <span className="eyebrow">
                        {obligation.id} · v{obligation.version}
                      </span>
                      <h2>{obligation.purpose}</h2>
                    </div>
                    <StatusBadge tone={tone(obligation.status)}>{obligation.status}</StatusBadge>
                  </div>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="muted">Requested</dt>
                      <dd className="font-bold text-2xl">{money(obligation.requestedMinor)}</dd>
                    </div>
                    <div>
                      <dt className="muted">Available before request</dt>
                      <dd className="font-bold text-2xl">{money(available)}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-sm">Payee projection: {obligation.payeeProjection}</p>
                  <p className="text-sm">Evidence: {obligation.evidenceReferences.join(", ")}</p>
                  {shortage > 0 && (
                    <NoticePanel className="mt-4">
                      Insufficient by {money(shortage)}. The obligation cannot advance.
                    </NoticePanel>
                  )}
                </ContentPanel>
                <ContentPanel>
                  <h2>Independent review</h2>
                  <p className="muted mt-2 text-sm">
                    Requester: {obligation.requester}
                    <br />
                    Reviewer: {obligation.reviewer ?? "Not assigned"}
                  </p>
                  <label className="mt-4 grid gap-2 font-medium text-sm">
                    Review reason
                    <Textarea value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} />
                  </label>
                  <Button
                    className="mt-5 w-full"
                    disabled={
                      shortage > 0 ||
                      blocked ||
                      obligation.evidenceReferences.length === 0 ||
                      obligation.status === "approved" ||
                      decisionReason.trim().length < 8
                    }
                    onClick={() => {
                      const updated = budgetAccountingRepository.decideObligation(
                        obligation.id,
                        "approve",
                        decisionReason,
                      );
                      setNotice(
                        updated
                          ? "Sample obligation approval recorded and availability updated; no release or posting occurred."
                          : "Approval stayed blocked by evidence, independence, balance or review reason.",
                      );
                    }}
                  >
                    Approve obligation
                  </Button>
                  <Button
                    className="mt-2 w-full"
                    variant="outline"
                    disabled={blocked || decisionReason.trim().length < 8}
                    onClick={() => {
                      const updated = budgetAccountingRepository.decideObligation(
                        obligation.id,
                        "return",
                        decisionReason,
                      );
                      setNotice(
                        updated
                          ? "Correction reason returned to the requesting office and retained in history."
                          : "An independent reviewer and reason are required.",
                      );
                    }}
                  >
                    Return for correction
                  </Button>
                  <div className="mt-4 border-t pt-3 text-sm">
                    {obligation.history.map((entry) => (
                      <p className="mt-1" key={entry}>
                        • {entry}
                      </p>
                    ))}
                  </div>
                </ContentPanel>
              </div>
            );
          })()
        ) : (
          <EmptyState
            icon={ReceiptText}
            title="Obligation unavailable"
            description="The obligation reference was not found."
          />
        )
      ) : screen === "disbursement" ? (
        disbursement ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
            <ContentPanel>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <span className="eyebrow">{disbursement.id}</span>
                  <h2>Voucher and evidence review</h2>
                </div>
                <StatusBadge tone={tone(disbursement.status)}>{disbursement.status}</StatusBadge>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <p>
                  Gross
                  <br />
                  <strong>{money(disbursement.grossMinor)}</strong>
                </p>
                <p>
                  Retention
                  <br />
                  <strong>{money(disbursement.retentionMinor)}</strong>
                </p>
                <p>
                  Net
                  <br />
                  <strong>{money(disbursement.netMinor)}</strong>
                </p>
              </div>
              <p className="mt-4 text-sm">
                Verified M13 billing: {disbursement.projectBillingReference ?? "Not linked"}
              </p>
              <p className="text-sm">M08 benefit: {disbursement.assistanceReference ?? "Not applicable"}</p>
              <div className="mt-4 rounded-lg border p-4 text-sm">
                <strong>Illustrative posting preview</strong>
                <p className="muted mt-2">Debit: sample program/project expenditure · {money(disbursement.netMinor)}</p>
                <p className="muted">Credit: sample payable/release clearing · {money(disbursement.netMinor)}</p>
                <p className="muted mt-2 text-xs">Labels are not an official government chart of accounts.</p>
              </div>
              {disbursement.approvalChain.map((event) => (
                <div key={event} className="mt-3 border-t pt-3 text-sm">
                  ✓ {event}
                </div>
              ))}
              <div className="mt-4 border-t pt-3 text-sm">
                {disbursement.history.map((entry) => (
                  <p className="mt-1" key={entry}>
                    • {entry}
                  </p>
                ))}
              </div>
            </ContentPanel>
            <ContentPanel>
              <h2>Treasury release</h2>
              <p className="muted mt-2 text-sm">
                Authorization is not payment. Treasury records its own simulated release reference.
              </p>
              <p className="mt-3 text-sm">Release: {disbursement.releaseReference ?? "Not released"}</p>
              <p className="text-sm">Posting: {disbursement.postingReference ?? "Not posted"}</p>
              <Button
                className="mt-5 w-full"
                disabled={disbursement.status !== "authorized" || blocked}
                onClick={() => {
                  budgetAccountingRepository.setDisbursementStatus(disbursement.id, "released", "DEMO-REL-LOCAL");
                  setDisbursements(budgetAccountingRepository.listDisbursements());
                  setNotice("Simulated Treasury release recorded. Bank movement did not occur.");
                }}
              >
                Record sample release
              </Button>
            </ContentPanel>
          </div>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title="Disbursement unavailable"
            description="The voucher reference was not found."
          />
        )
      ) : screen === "changes" ? (
        <div className="grid gap-4">
          {budgetAccountingRepository.changes().map((change) => (
            <ContentPanel key={change.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <span className="eyebrow">
                    {change.id} · {change.type}
                  </span>
                  <h2>
                    {change.fromReference} → {change.toReference}
                  </h2>
                </div>
                <StatusBadge tone="pending">{change.status}</StatusBadge>
              </div>
              <p className="mt-3">{change.reason}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <p>
                  Change
                  <br />
                  <strong>{money(change.amountMinor)}</strong>
                </p>
                <p>
                  Before
                  <br />
                  <strong>{money(change.beforeMinor)}</strong>
                </p>
                <p>
                  After
                  <br />
                  <strong>{money(change.afterMinor)}</strong>
                </p>
              </div>
              <p className="muted mt-3 text-sm">
                Requester: {change.requester} · independent reviewer: {change.reviewer}
              </p>
              <label className="mt-4 grid gap-2 font-medium text-sm">
                Independent review reason
                <Textarea value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  disabled={change.requester === change.reviewer || blocked || decisionReason.trim().length < 8}
                  onClick={() => {
                    const updated = budgetAccountingRepository.decideChange(change.id, true, decisionReason);
                    setNotice(
                      updated
                        ? "Sample budget revision approved with original values preserved."
                        : "Independent reviewer and reason are required.",
                    );
                  }}
                >
                  Approve revision
                </Button>
                <Button
                  variant="outline"
                  disabled={change.requester === change.reviewer || blocked || decisionReason.trim().length < 8}
                  onClick={() => {
                    const updated = budgetAccountingRepository.decideChange(change.id, false, decisionReason);
                    setNotice(
                      updated ? "Budget change returned with reason." : "Independent reviewer and reason are required.",
                    );
                  }}
                >
                  Return change
                </Button>
              </div>
              <div className="mt-4 border-t pt-3 text-sm">
                {change.history.map((entry) => (
                  <p className="mt-1" key={entry}>
                    • {entry}
                  </p>
                ))}
              </div>
            </ContentPanel>
          ))}
        </div>
      ) : screen === "revenue" ? (
        <div className="grid gap-4">
          {budgetAccountingRepository.revenues().map((revenue) => (
            <ContentPanel key={revenue.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <span className="eyebrow">{revenue.id}</span>
                  <h2>
                    {revenue.collectionReference} → {revenue.settlementReference}
                  </h2>
                </div>
                <StatusBadge tone={tone(revenue.status)}>{revenue.status}</StatusBadge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <p>
                  Collection
                  <br />
                  <strong>{money(revenue.amountMinor)}</strong>
                </p>
                <p>
                  Difference
                  <br />
                  <strong>{money(revenue.differenceMinor)}</strong>
                </p>
                <p>
                  Posting batch
                  <br />
                  <strong>{revenue.postingBatch ?? "None"}</strong>
                </p>
              </div>
              <p className="muted mt-3 text-sm">
                {revenue.mappedAccount}. M06 owns collection; M14 owns this projection and posting exception.
              </p>
            </ContentPanel>
          ))}
        </div>
      ) : screen === "period" ? (
        period ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
            <ContentPanel>
              <div className="flex justify-between gap-3">
                <div>
                  <span className="eyebrow">{period.id}</span>
                  <h2>{period.label}</h2>
                </div>
                <StatusBadge tone={period.status === "closed" ? "success" : "pending"}>{period.status}</StatusBadge>
              </div>
              {period.checklist.map((check) => (
                <div className="mt-4 flex justify-between gap-3 border-t pt-3" key={check.label}>
                  <span>{check.label}</span>
                  <StatusBadge tone={check.complete ? "success" : "warning"}>
                    {check.complete ? "complete" : "open"}
                  </StatusBadge>
                </div>
              ))}
            </ContentPanel>
            <ContentPanel>
              <h2>Controlled close / reopen</h2>
              <p className="muted mt-2 text-sm">
                Closed-period entries remain immutable. A current-period adjustment or authorized reopen retains the
                original event.
              </p>
              <Button
                className="mt-5 w-full"
                disabled={period.status === "closed" || period.checklist.some((c) => !c.complete) || blocked}
                onClick={() => {
                  const updated = budgetAccountingRepository.closePeriod(period.id);
                  setNotice(
                    updated
                      ? "Sample period close recorded after every checklist item passed; no external close occurred."
                      : "The period stayed open because checklist items remain incomplete.",
                  );
                }}
              >
                Close sample period
              </Button>
              <label className="mt-4 grid gap-2 font-medium text-sm">
                Controlled reopen reason
                <Textarea value={periodReason} onChange={(event) => setPeriodReason(event.target.value)} />
              </label>
              <Button
                className="mt-2 w-full"
                variant="outline"
                disabled={period.status !== "closed" || blocked || periodReason.trim().length < 8}
                onClick={() => {
                  const updated = budgetAccountingRepository.requestReopen(period.id, periodReason);
                  setNotice(
                    updated
                      ? "Controlled reopen request recorded; the closed period and original events were not changed."
                      : "A closed period and reason are required.",
                  );
                }}
              >
                Request controlled reopen
              </Button>
              <div className="mt-4 border-t pt-3 text-sm">
                {period.history.map((entry) => (
                  <p className="mt-1" key={entry}>
                    • {entry}
                  </p>
                ))}
              </div>
            </ContentPanel>
          </div>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title="Period unavailable"
            description="The fiscal period reference was not found."
          />
        )
      ) : (
        <div className="grid gap-4">
          {budgetAccountingRepository.interfaces().map((batch) => (
            <ContentPanel key={batch.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <span className="eyebrow">
                    {batch.id} · {batch.createdAt}
                  </span>
                  <h2>
                    {batch.recordCount} records · {money(batch.amountMinor)}
                  </h2>
                </div>
                <StatusBadge tone={tone(batch.status)}>{batch.status}</StatusBadge>
              </div>
              {batch.error && <NoticePanel className="mt-4">{batch.error}</NoticePanel>}
              <div className="mt-4 text-sm">
                {batch.history.map((entry) => (
                  <p className="mt-1" key={entry}>
                    • {entry}
                  </p>
                ))}
              </div>
              <Button
                className="mt-4"
                variant="outline"
                disabled={batch.status !== "rejected"}
                onClick={() => {
                  const updated = budgetAccountingRepository.retryInterface(batch.id);
                  setNotice(
                    updated
                      ? "Mock export retry queued locally. Source records remain unposted until accepted."
                      : "Only a rejected batch can be retried.",
                  );
                }}
              >
                Retry mock export
              </Button>
            </ContentPanel>
          ))}
        </div>
      )}
      {effective === "insufficient" && (
        <NoticePanel className="mt-5">
          Requested amount exceeds available balance. The difference stays visible and approval is blocked.
        </NoticePanel>
      )}
      {effective === "ineligible-fund" && (
        <NoticePanel className="mt-5">
          The selected sample fund is not eligible for this purpose. Choose an authorized source or return the request.
        </NoticePanel>
      )}
      {effective === "missing-evidence" && (
        <NoticePanel className="mt-5">
          Required source evidence is missing. Accounting approval remains blocked.
        </NoticePanel>
      )}
      {effective === "partial-release" && (
        <NoticePanel className="mt-5">
          The simulated release was partial or rejected. The remaining amount is not shown as paid.
        </NoticePanel>
      )}
      {effective === "duplicate-posting" && (
        <NoticePanel className="mt-5">
          A repeated event was detected. DEMO-PAY-001 appears only once in the posting projection.
        </NoticePanel>
      )}
      {effective === "stale-balance" && (
        <NoticePanel className="mt-5">
          The balance version changed. Reload before authorizing an obligation or release.
        </NoticePanel>
      )}
    </>
  );
}

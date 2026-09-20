import {
  APPROPRIATIONS,
  BUDGET_CHANGES,
  DISBURSEMENTS,
  INTERFACE_BATCHES,
  OBLIGATIONS,
  PERIODS,
  REVENUES,
} from "../data/budget-accounting-fixtures";
import type {
  Appropriation,
  BudgetChange,
  Disbursement,
  FinanceStatus,
  FiscalPeriod,
  Obligation,
  RevenueProjection,
} from "../types/budget-accounting";

export type AllocationInput = Omit<Appropriation, "id" | "obligatedMinor" | "disbursedMinor"> & {
  obligatedMinor?: number;
  disbursedMinor?: number;
};
export type ObligationInput = Omit<Obligation, "id" | "history" | "version" | "status"> & { status?: FinanceStatus };
export type DisbursementInput = Omit<Disbursement, "id" | "netMinor" | "history" | "approvalChain" | "status"> & {
  status?: FinanceStatus;
};
export type AdjustmentInput = Omit<BudgetChange, "id" | "history" | "status"> & { status?: string };
export type ReconciliationInput = Omit<RevenueProjection, "id">;
export type PeriodInput = Omit<FiscalPeriod, "id" | "history" | "closedAt" | "reopenReason">;

export class BudgetAccountingRepository {
  private appropriationRecords = structuredClone(APPROPRIATIONS);
  private obligations = structuredClone(OBLIGATIONS);
  private disbursements = structuredClone(DISBURSEMENTS);
  private changeRecords = structuredClone(BUDGET_CHANGES);
  private revenueRecords = structuredClone(REVENUES);
  private periodRecords = structuredClone(PERIODS);
  private interfaceRecords = structuredClone(INTERFACE_BATCHES);
  private sequences = { allocation: 6, obligation: 6, disbursement: 5, adjustment: 4, reconciliation: 5, period: 10 };

  allocations() {
    return structuredClone(this.appropriationRecords);
  }
  appropriations() {
    return this.allocations();
  }
  findAllocation(id: string) {
    const item = this.appropriationRecords.find((record) => record.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createAllocation(input: AllocationInput) {
    if (!this.validAllocation(input)) return undefined;
    this.sequences.allocation += 1;
    const item: Appropriation = {
      ...input,
      id: `ALC-${input.fiscalPeriod.replace(/\D/g, "") || "2027"}-${String(this.sequences.allocation).padStart(3, "0")}`,
      obligatedMinor: input.obligatedMinor ?? 0,
      disbursedMinor: input.disbursedMinor ?? 0,
    };
    this.appropriationRecords.unshift(item);
    return structuredClone(item);
  }
  updateAllocation(id: string, input: AllocationInput) {
    const item = this.appropriationRecords.find((record) => record.id === id);
    if (!item || !this.validAllocation(input)) return undefined;
    Object.assign(item, input, {
      obligatedMinor: input.obligatedMinor ?? item.obligatedMinor,
      disbursedMinor: input.disbursedMinor ?? item.disbursedMinor,
    });
    return structuredClone(item);
  }
  archiveAllocation(id: string) {
    const index = this.appropriationRecords.findIndex((record) => record.id === id);
    if (
      index < 0 ||
      this.obligations.some(
        (record) => record.appropriationReference === id && !["rejected", "for-correction"].includes(record.status),
      )
    )
      return false;
    this.appropriationRecords.splice(index, 1);
    return true;
  }
  private validAllocation(input: AllocationInput) {
    return (
      input.fiscalPeriod.trim().length >= 4 &&
      input.fund.trim().length >= 4 &&
      input.department.trim().length >= 4 &&
      input.source.trim().length >= 4 &&
      input.appropriatedMinor > 0
    );
  }

  listObligations() {
    return structuredClone(this.obligations);
  }
  findObligation(id: string) {
    const item = this.obligations.find((record) => record.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createObligation(input: ObligationInput) {
    if (!this.validObligation(input)) return undefined;
    this.sequences.obligation += 1;
    const item: Obligation = {
      ...input,
      id: `OBL-2027-${String(this.sequences.obligation).padStart(3, "0")}`,
      status: input.status ?? "draft",
      history: ["Obligation request recorded"],
      version: 1,
    };
    this.obligations.unshift(item);
    return structuredClone(item);
  }
  updateObligation(id: string, input: ObligationInput) {
    const item = this.obligations.find((record) => record.id === id);
    if (!item || !this.validObligation(input) || ["released", "posted"].includes(item.status)) return undefined;
    Object.assign(item, input, { status: input.status ?? item.status });
    item.history.push("Obligation details updated");
    item.version += 1;
    return structuredClone(item);
  }
  deleteObligation(id: string) {
    const item = this.obligations.find((record) => record.id === id);
    if (
      !item ||
      !["draft", "for-correction", "rejected"].includes(item.status) ||
      this.disbursements.some((record) => record.obligationReference === id)
    )
      return false;
    this.obligations = this.obligations.filter((record) => record.id !== id);
    return true;
  }
  private validObligation(input: ObligationInput) {
    return (
      Boolean(this.findAllocation(input.appropriationReference)) &&
      input.payeeProjection.trim().length >= 4 &&
      input.purpose.trim().length >= 8 &&
      input.requestedMinor > 0 &&
      input.requester.trim().length >= 3
    );
  }
  decideObligation(id: string, decision: "approve" | "return", reason: string) {
    const item = this.obligations.find((record) => record.id === id);
    const allocation = this.appropriationRecords.find((record) => record.id === item?.appropriationReference);
    if (!item || !allocation || reason.trim().length < 8 || item.requester === item.reviewer) return undefined;
    const available = allocation.appropriatedMinor - allocation.obligatedMinor;
    if (decision === "approve" && (item.evidenceReferences.length === 0 || item.requestedMinor > available))
      return undefined;
    if (decision === "approve" && item.status !== "approved") allocation.obligatedMinor += item.requestedMinor;
    item.status = decision === "approve" ? "approved" : "for-correction";
    item.reason = reason.trim();
    item.history.push(`${item.status}: ${reason.trim()}`);
    item.version += 1;
    return structuredClone(item);
  }

  listDisbursements() {
    return structuredClone(this.disbursements);
  }
  findDisbursement(id: string) {
    const item = this.disbursements.find((record) => record.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createDisbursement(input: DisbursementInput) {
    if (!this.validDisbursement(input)) return undefined;
    this.sequences.disbursement += 1;
    const item: Disbursement = {
      ...input,
      id: `DV-2027-${String(this.sequences.disbursement).padStart(3, "0")}`,
      netMinor: input.grossMinor - input.retentionMinor,
      status: input.status ?? "draft",
      approvalChain: ["Voucher draft created"],
      history: ["Disbursement voucher created"],
    };
    this.disbursements.unshift(item);
    return structuredClone(item);
  }
  updateDisbursement(id: string, input: DisbursementInput) {
    const item = this.disbursements.find((record) => record.id === id);
    if (!item || !this.validDisbursement(input) || ["released", "posted"].includes(item.status)) return undefined;
    Object.assign(item, input, {
      status: input.status ?? item.status,
      netMinor: input.grossMinor - input.retentionMinor,
    });
    item.history.push("Voucher details updated");
    return structuredClone(item);
  }
  deleteDisbursement(id: string) {
    const item = this.disbursements.find((record) => record.id === id);
    if (item?.status !== "draft") return false;
    this.disbursements = this.disbursements.filter((record) => record.id !== id);
    return true;
  }
  private validDisbursement(input: DisbursementInput) {
    return (
      Boolean(this.findObligation(input.obligationReference)) &&
      input.grossMinor > 0 &&
      input.retentionMinor >= 0 &&
      input.retentionMinor < input.grossMinor
    );
  }
  setDisbursementStatus(id: string, status: FinanceStatus, reference?: string) {
    const item = this.disbursements.find((record) => record.id === id);
    if (!item) return undefined;
    item.status = status;
    if (status === "released") {
      item.releaseReference = reference ?? `REL-2027-${String(this.sequences.disbursement).padStart(3, "0")}`;
      item.approvalChain.push("Treasury release recorded");
    }
    if (status === "posted")
      item.postingReference = reference ?? `POST-2027-${String(this.sequences.disbursement).padStart(3, "0")}`;
    item.history.push(`Disbursement status changed to ${status}`);
    return structuredClone(item);
  }

  changes() {
    return structuredClone(this.changeRecords);
  }
  findChange(id: string) {
    const item = this.changeRecords.find((record) => record.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createChange(input: AdjustmentInput) {
    if (!this.validChange(input)) return undefined;
    this.sequences.adjustment += 1;
    const item: BudgetChange = {
      ...input,
      id: `ADJ-2027-${String(this.sequences.adjustment).padStart(3, "0")}`,
      status: input.status ?? "Draft",
      history: ["Budget adjustment recorded"],
    };
    this.changeRecords.unshift(item);
    return structuredClone(item);
  }
  updateChange(id: string, input: AdjustmentInput) {
    const item = this.changeRecords.find((record) => record.id === id);
    if (!item || !this.validChange(input) || item.status === "Approved") return undefined;
    Object.assign(item, input, { status: input.status ?? item.status });
    item.history.push("Adjustment details updated");
    return structuredClone(item);
  }
  deleteChange(id: string) {
    const item = this.changeRecords.find((record) => record.id === id);
    if (!item || !["Draft", "Returned for correction"].includes(item.status)) return false;
    this.changeRecords = this.changeRecords.filter((record) => record.id !== id);
    return true;
  }
  private validChange(input: AdjustmentInput) {
    return (
      input.fromReference.trim().length >= 4 &&
      input.toReference.trim().length >= 4 &&
      input.amountMinor > 0 &&
      input.reason.trim().length >= 8 &&
      input.requester.trim().length >= 3 &&
      input.reviewer.trim().length >= 3
    );
  }
  decideChange(id: string, approve: boolean, reason: string) {
    const item = this.changeRecords.find((record) => record.id === id);
    if (!item || item.requester === item.reviewer || reason.trim().length < 8) return undefined;
    item.status = approve ? "Approved" : "Returned for correction";
    item.history.push(`${item.status}: ${reason.trim()}`);
    return structuredClone(item);
  }

  revenues() {
    return structuredClone(this.revenueRecords);
  }
  findRevenue(id: string) {
    const item = this.revenueRecords.find((record) => record.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createRevenue(input: ReconciliationInput) {
    if (!this.validRevenue(input)) return undefined;
    this.sequences.reconciliation += 1;
    const item: RevenueProjection = {
      ...input,
      id: `REC-2027-${String(this.sequences.reconciliation).padStart(3, "0")}`,
    };
    this.revenueRecords.unshift(item);
    return structuredClone(item);
  }
  updateRevenue(id: string, input: ReconciliationInput) {
    const item = this.revenueRecords.find((record) => record.id === id);
    if (!item || !this.validRevenue(input) || item.status === "Posted") return undefined;
    Object.assign(item, input);
    return structuredClone(item);
  }
  deleteRevenue(id: string) {
    const item = this.revenueRecords.find((record) => record.id === id);
    if (!item || ["Posted", "Reconciled"].includes(item.status)) return false;
    this.revenueRecords = this.revenueRecords.filter((record) => record.id !== id);
    return true;
  }
  reconcileRevenue(id: string) {
    const item = this.revenueRecords.find((record) => record.id === id);
    if (item?.differenceMinor !== 0 || item.mappedAccount.toLocaleLowerCase().includes("unresolved")) return undefined;
    item.status = "Reconciled";
    item.postingBatch ??= `BATCH-2027-${String(this.sequences.reconciliation).padStart(3, "0")}`;
    return structuredClone(item);
  }
  private validRevenue(input: ReconciliationInput) {
    return (
      input.collectionReference.trim().length >= 4 &&
      input.settlementReference.trim().length >= 4 &&
      input.amountMinor > 0 &&
      input.mappedAccount.trim().length >= 4 &&
      input.differenceMinor >= 0
    );
  }

  periods() {
    return structuredClone(this.periodRecords);
  }
  findPeriod(id: string) {
    const item = this.periodRecords.find((record) => record.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createPeriod(input: PeriodInput) {
    if (input.label.trim().length < 4 || !input.checklist.length) return undefined;
    this.sequences.period += 1;
    const item: FiscalPeriod = {
      ...input,
      id: `PER-2027-${String(this.sequences.period).padStart(2, "0")}`,
      history: ["Fiscal period created"],
    };
    this.periodRecords.unshift(item);
    return structuredClone(item);
  }
  updatePeriod(id: string, input: PeriodInput) {
    const item = this.periodRecords.find((record) => record.id === id);
    if (!item || item.status === "closed" || input.label.trim().length < 4 || !input.checklist.length) return undefined;
    Object.assign(item, input);
    item.history.push("Fiscal period checklist updated");
    return structuredClone(item);
  }
  deletePeriod(id: string) {
    const item = this.periodRecords.find((record) => record.id === id);
    if (item?.status !== "open") return false;
    this.periodRecords = this.periodRecords.filter((record) => record.id !== id);
    return true;
  }
  closePeriod(id: string) {
    const item = this.periodRecords.find((record) => record.id === id);
    if (!item || item.status === "closed" || item.checklist.some((check) => !check.complete)) return undefined;
    item.status = "closed";
    item.closedAt = "2027-09-20";
    item.history.push("Fiscal period closed after checklist completion");
    return structuredClone(item);
  }
  requestReopen(id: string, reason: string) {
    const item = this.periodRecords.find((record) => record.id === id);
    if (item?.status !== "closed" || reason.trim().length < 8) return undefined;
    item.status = "open";
    item.reopenReason = reason.trim();
    item.history.push(`Fiscal period reopened: ${reason.trim()}`);
    return structuredClone(item);
  }

  interfaces() {
    return structuredClone(this.interfaceRecords);
  }
  retryInterface(id: string) {
    const item = this.interfaceRecords.find((record) => record.id === id);
    if (item?.status !== "rejected") return undefined;
    item.status = "pending";
    item.error = undefined;
    item.history.push("Batch queued for validation again");
    return structuredClone(item);
  }
}

export const budgetAccountingRepository = new BudgetAccountingRepository();

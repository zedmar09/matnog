import {
  APPROPRIATIONS,
  BUDGET_CHANGES,
  DISBURSEMENTS,
  INTERFACE_BATCHES,
  OBLIGATIONS,
  PERIODS,
  REVENUES,
} from "../data/budget-accounting-fixtures";
import type { Disbursement, FinanceStatus, Obligation } from "../types/budget-accounting";

export class BudgetAccountingRepository {
  private appropriationRecords = structuredClone(APPROPRIATIONS);
  private obligations = structuredClone(OBLIGATIONS);
  private disbursements = structuredClone(DISBURSEMENTS);
  private changeRecords = structuredClone(BUDGET_CHANGES);
  private revenueRecords = structuredClone(REVENUES);
  private periodRecords = structuredClone(PERIODS);
  private interfaceRecords = structuredClone(INTERFACE_BATCHES);
  appropriations() {
    return structuredClone(this.appropriationRecords);
  }
  listObligations(): Obligation[] {
    return structuredClone(this.obligations);
  }
  findObligation(id: string) {
    return structuredClone(this.obligations.find((item) => item.id === id));
  }
  findDisbursement(id: string) {
    return structuredClone(this.disbursements.find((item) => item.id === id));
  }
  listDisbursements(): Disbursement[] {
    return structuredClone(this.disbursements);
  }
  changes() {
    return structuredClone(this.changeRecords);
  }
  revenues() {
    return structuredClone(this.revenueRecords);
  }
  periods() {
    return structuredClone(this.periodRecords);
  }
  interfaces() {
    return structuredClone(this.interfaceRecords);
  }
  decideObligation(id: string, decision: "approve" | "return", reason: string): Obligation | undefined {
    const item = this.obligations.find((record) => record.id === id);
    const appropriation = this.appropriationRecords.find((record) => record.id === item?.appropriationReference);
    if (!item || !appropriation || reason.trim().length < 8 || item.requester === item.reviewer) return undefined;
    const available = appropriation.appropriatedMinor - appropriation.obligatedMinor;
    if (decision === "approve" && (item.evidenceReferences.length === 0 || item.requestedMinor > available))
      return undefined;
    if (decision === "approve" && item.status !== "approved") appropriation.obligatedMinor += item.requestedMinor;
    item.status = decision === "approve" ? "approved" : "for-correction";
    item.reason = reason.trim();
    item.history.push(`${item.status}: ${reason.trim()}`);
    item.version += 1;
    return structuredClone(item);
  }

  decideChange(id: string, approve: boolean, reason: string) {
    const item = this.changeRecords.find((record) => record.id === id);
    if (!item || item.requester === item.reviewer || reason.trim().length < 8) return undefined;
    item.status = approve ? "Approved sample revision" : "Returned for correction";
    item.history.push(`${item.status}: ${reason.trim()}`);
    return structuredClone(item);
  }

  closePeriod(id: string) {
    const item = this.periodRecords.find((record) => record.id === id);
    if (!item || item.status === "closed" || item.checklist.some((check) => !check.complete)) return undefined;
    item.status = "closed";
    item.closedAt = "2027-09-16";
    item.history.push("Sample close recorded after all checklist items completed");
    return structuredClone(item);
  }

  requestReopen(id: string, reason: string) {
    const item = this.periodRecords.find((record) => record.id === id);
    if (item?.status !== "closed" || reason.trim().length < 8) return undefined;
    item.reopenReason = reason.trim();
    item.history.push(`Controlled reopen requested: ${reason.trim()}`);
    return structuredClone(item);
  }

  retryInterface(id: string) {
    const item = this.interfaceRecords.find((record) => record.id === id);
    if (item?.status !== "rejected") return undefined;
    item.status = "pending";
    item.history.push("Mock export retry queued; source records remain unposted");
    return structuredClone(item);
  }
  setDisbursementStatus(id: string, status: FinanceStatus, releaseReference?: string) {
    const item = this.disbursements.find((record) => record.id === id);
    if (!item) return undefined;
    item.status = status;
    item.releaseReference = releaseReference;
    item.history.push(
      status === "released"
        ? `Treasury sample release ${releaseReference ?? "recorded"}; no bank movement occurred`
        : `Disbursement status changed to ${status}`,
    );
    if (status === "released") item.approvalChain.push("Treasury sample release recorded");
    return structuredClone(item);
  }
}
export const budgetAccountingRepository = new BudgetAccountingRepository();

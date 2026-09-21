import {
  ASSISTANCE_PROGRAMS,
  ASSISTANCE_REQUESTS,
  BENEFIT_LEDGER,
  SECTOR_RECORDS,
} from "../data/sectoral-assistance-fixtures";
import type { LedgerEntryValues } from "../schemas/ledger-schema";
import type { SectorDeactivationValues, SectorRecordValues } from "../schemas/sector-schema";
import type { AssistanceRequest, BenefitLedgerEntry, SectorRecord } from "../types/sectoral-assistance";

export class LocalSectoralAssistanceRepository {
  readonly programs = ASSISTANCE_PROGRAMS;
  readonly sectorRecords = structuredClone(SECTOR_RECORDS) as SectorRecord[];
  readonly requests = structuredClone(ASSISTANCE_REQUESTS) as AssistanceRequest[];
  readonly ledger = structuredClone(BENEFIT_LEDGER) as BenefitLedgerEntry[];
  private sequence = 10;

  request(id: string) {
    return this.requests.find((item) => item.id === id);
  }

  sectorRecord(id: string) {
    return this.sectorRecords.find((item) => item.id === id);
  }

  ledgerEntry(id: string) {
    return this.ledger.find((item) => item.id === id);
  }

  createRequest(input: { programId: string; evidenceNote: string; personId: string; householdId: string }) {
    const program = this.programs.find((item) => item.id === input.programId);
    if (!program || !input.personId || !input.householdId || input.evidenceNote.trim().length < 8) return undefined;
    this.sequence += 1;
    const created: AssistanceRequest = {
      id: `DEMO-AID-${this.sequence}`,
      personId: input.personId,
      householdId: input.householdId,
      programId: program.id,
      programName: program.name,
      period: program.period,
      requestedValue: program.benefit,
      status: "Under assessment",
      evidence: [input.evidenceNote.trim(), "Local attachment selection · sample only"],
      overlap: { kind: "none", explanation: "No same-program match found in the local sample period." },
      documentReference: `DEMO-DOC-AID-${this.sequence}`,
    };
    this.requests.unshift(created);
    return created;
  }

  decideDuplicate(id: string, decision: "exception" | "reject", reason: string) {
    const request = this.request(id);
    if (!request || reason.trim().length < 8) return false;
    request.decisionReason = reason.trim();
    request.status = decision === "exception" ? "Ready for release" : "Denied";
    return true;
  }

  release(id: string, acknowledgment: string) {
    const request = this.request(id);
    if (request?.status !== "Ready for release" || acknowledgment.trim().length < 6) return "blocked";
    const existing = this.ledger.find((entry) => entry.requestId === id);
    if (existing) return "replayed";
    request.status = "Released";
    request.releaseAcknowledgment = acknowledgment.trim();
    this.ledger.push({
      id: `DEMO-REL-${String(this.ledger.length + 1).padStart(3, "0")}`,
      requestId: request.id,
      recipient: request.householdId,
      recipientName: `Household ${request.householdId}`,
      program: request.programName,
      period: request.period,
      value: request.approvedValue ?? request.requestedValue,
      fundSource: request.fundingReference ?? "DEMO-FUND-PENDING",
      releasedAt: "2026-09-16 17:30",
      acknowledgment: acknowledgment.trim(),
      status: "Released",
    });
    return "released";
  }

  private nextLedgerId() {
    const highest = this.ledger.reduce((max, item) => {
      const parsed = Number.parseInt(item.id.replace("DEMO-REL-", ""), 10);
      return Number.isNaN(parsed) ? max : Math.max(max, parsed);
    }, 0);
    return `DEMO-REL-${String(highest + 1).padStart(3, "0")}`;
  }

  createLedgerEntry(values: LedgerEntryValues): BenefitLedgerEntry {
    const created: BenefitLedgerEntry = { id: this.nextLedgerId(), ...values };
    this.ledger.unshift(created);
    return created;
  }

  updateLedgerEntry(id: string, values: LedgerEntryValues): BenefitLedgerEntry | undefined {
    const index = this.ledger.findIndex((item) => item.id === id);
    if (index < 0) return undefined;
    const updated: BenefitLedgerEntry = { id, ...values };
    this.ledger[index] = updated;
    return updated;
  }

  deleteLedgerEntry(id: string): boolean {
    const index = this.ledger.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.ledger.splice(index, 1);
    return true;
  }

  /** The next free sector reference, in the registry's own numbering. */
  private nextSectorId() {
    const highest = this.sectorRecords.reduce((max, item) => {
      const parsed = Number.parseInt(item.id.replace("DEMO-SECTOR-", ""), 10);
      return Number.isNaN(parsed) ? max : Math.max(max, parsed);
    }, 0);
    return `DEMO-SECTOR-${String(highest + 1).padStart(3, "0")}`;
  }

  /** Splits the evidence field, which the form captures as one line per item. */
  private static evidenceOf(value: string) {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  createSectorRecord(values: SectorRecordValues): SectorRecord {
    const created: SectorRecord = {
      id: this.nextSectorId(),
      personId: values.personId,
      personLabel: values.personLabel,
      category: values.category,
      authority: values.authority.trim(),
      validFrom: values.validFrom.trim(),
      validTo: values.validTo.trim(),
      status: values.status,
      source: values.source.trim(),
      evidence: LocalSectoralAssistanceRepository.evidenceOf(values.evidence),
      credential: values.credential.trim(),
    };
    this.sectorRecords.unshift(created);
    return created;
  }

  updateSectorRecord(id: string, values: SectorRecordValues): SectorRecord | undefined {
    const index = this.sectorRecords.findIndex((item) => item.id === id);
    const current = this.sectorRecords[index];
    if (!current) return undefined;
    const updated: SectorRecord = {
      ...current,
      personId: values.personId,
      personLabel: values.personLabel,
      category: values.category,
      authority: values.authority.trim(),
      validFrom: values.validFrom.trim(),
      validTo: values.validTo.trim(),
      status: values.status,
      source: values.source.trim(),
      evidence: LocalSectoralAssistanceRepository.evidenceOf(values.evidence),
      credential: values.credential.trim(),
    };
    this.sectorRecords[index] = updated;
    return updated;
  }

  /**
   * Ends a status before its period runs out. The record and its dates stay on
   * file: a benefit already released may have rested on this status, so it is
   * deactivated rather than deleted.
   */
  deactivateSectorRecord(id: string, values: SectorDeactivationValues, actor: string): SectorRecord | undefined {
    const index = this.sectorRecords.findIndex((item) => item.id === id);
    const current = this.sectorRecords[index];
    if (!current || current.deactivation) return undefined;
    const updated: SectorRecord = {
      ...current,
      status: "Deactivated",
      deactivation: { reason: values.reason, note: values.note.trim(), actor, on: values.on },
    };
    this.sectorRecords[index] = updated;
    return updated;
  }

  /** Reverses a deactivation recorded in error. */
  reactivateSectorRecord(id: string): SectorRecord | undefined {
    const index = this.sectorRecords.findIndex((item) => item.id === id);
    const current = this.sectorRecords[index];
    if (!current?.deactivation) return undefined;
    const { deactivation: _removed, ...rest } = current;
    const updated: SectorRecord = { ...rest, status: "Active" };
    this.sectorRecords[index] = updated;
    return updated;
  }

  startRenewal(id: string) {
    const record = this.sectorRecord(id);
    if (!record) return undefined;
    const renewal: SectorRecord = {
      ...structuredClone(record),
      id: `${record.id}-REN-1`,
      status: "Evidence review",
      validFrom: "Pending decision",
      validTo: "Pending decision",
      source: "Local renewal application",
      credential: "Not issued · renewal under review",
    };
    if (!this.sectorRecord(renewal.id)) this.sectorRecords.push(renewal);
    return renewal;
  }
}

export const localSectoralAssistanceRepository = new LocalSectoralAssistanceRepository();

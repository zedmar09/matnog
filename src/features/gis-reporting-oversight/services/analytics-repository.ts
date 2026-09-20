import { BARANGAY_PROFILES, MAP_LAYER_RECORDS, QUALITY_ISSUES, REPORT_DEFINITIONS } from "../data/analytics-fixtures";
import type { BarangayProfile, MapLayer, QualityIssue, ReportDefinition } from "../types/analytics";

export type BarangayInput = Omit<BarangayProfile, "id" | "history">;
export type LayerInput = Omit<MapLayer, "id" | "history">;
export type QualityInput = Omit<QualityIssue, "id" | "history">;
export type ReportInput = Omit<ReportDefinition, "id" | "history">;

class AnalyticsRepository {
  private barangays = structuredClone(BARANGAY_PROFILES);
  private layers = structuredClone(MAP_LAYER_RECORDS);
  private issues = structuredClone(QUALITY_ISSUES);
  private reports = structuredClone(REPORT_DEFINITIONS);
  private sequences = { barangay: 8, layer: 5, quality: 5, report: 5 };

  listBarangays() {
    return structuredClone(this.barangays);
  }
  findBarangay(id: string) {
    const item = this.barangays.find((entry) => entry.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createBarangay(input: BarangayInput) {
    if (!input.name.trim() || !input.psgcCode.trim() || input.population < 0 || input.households < 0) return undefined;
    const id = `BRGY-${String(++this.sequences.barangay).padStart(3, "0")}`;
    const item: BarangayProfile = { ...input, id, name: input.name.trim(), history: ["Analytics profile created"] };
    this.barangays.unshift(item);
    return structuredClone(item);
  }
  updateBarangay(id: string, input: BarangayInput) {
    const item = this.barangays.find((entry) => entry.id === id);
    if (!item || !input.name.trim()) return undefined;
    Object.assign(item, input, { name: input.name.trim() });
    item.history.push("Analytics profile updated");
    return structuredClone(item);
  }
  archiveBarangay(id: string) {
    const item = this.barangays.find((entry) => entry.id === id);
    if (!item) return false;
    item.status = "Archived";
    item.history.push("Profile archived");
    return true;
  }
  restoreBarangay(id: string) {
    const item = this.barangays.find((entry) => entry.id === id);
    if (!item) return false;
    item.status = "Active";
    item.history.push("Profile restored");
    return true;
  }

  listLayers() {
    return structuredClone(this.layers);
  }
  findLayer(id: string) {
    const item = this.layers.find((entry) => entry.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createLayer(input: LayerInput) {
    if (!input.name.trim() || !input.sourceModule.trim() || !input.owner.trim()) return undefined;
    const id = `LYR-${String(++this.sequences.layer).padStart(3, "0")}`;
    const item: MapLayer = { ...input, id, name: input.name.trim(), history: ["Map layer created"] };
    this.layers.unshift(item);
    return structuredClone(item);
  }
  updateLayer(id: string, input: LayerInput) {
    const item = this.layers.find((entry) => entry.id === id);
    if (!item || !input.name.trim()) return undefined;
    Object.assign(item, input, { name: input.name.trim() });
    item.history.push("Map layer settings updated");
    return structuredClone(item);
  }
  archiveLayer(id: string) {
    const item = this.layers.find((entry) => entry.id === id);
    if (!item) return false;
    item.status = "Archived";
    item.history.push("Map layer archived");
    return true;
  }
  restoreLayer(id: string) {
    const item = this.layers.find((entry) => entry.id === id);
    if (!item) return false;
    item.status = "Active";
    item.history.push("Map layer restored");
    return true;
  }
  toggleLayer(id: string) {
    const item = this.layers.find((entry) => entry.id === id);
    if (!item || item.status === "Archived") return undefined;
    item.status = item.status === "Active" ? "Inactive" : "Active";
    item.history.push(`Map layer marked ${item.status.toLocaleLowerCase()}`);
    return structuredClone(item);
  }

  listIssues() {
    return structuredClone(this.issues);
  }
  findIssue(id: string) {
    const item = this.issues.find((entry) => entry.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createIssue(input: QualityInput) {
    if (!input.title.trim() || !input.sourceModule.trim() || !input.description.trim()) return undefined;
    const id = `DQ-2026-${String(++this.sequences.quality).padStart(3, "0")}`;
    const item: QualityIssue = { ...input, id, title: input.title.trim(), history: ["Quality issue recorded"] };
    this.issues.unshift(item);
    return structuredClone(item);
  }
  updateIssue(id: string, input: QualityInput) {
    const item = this.issues.find((entry) => entry.id === id);
    if (!item || !input.title.trim()) return undefined;
    Object.assign(item, input, { title: input.title.trim() });
    item.history.push("Issue information updated");
    return structuredClone(item);
  }
  setIssueStatus(id: string, status: QualityIssue["status"], resolution = "") {
    const item = this.issues.find((entry) => entry.id === id);
    if (!item) return undefined;
    item.status = status;
    if (resolution.trim()) item.resolution = resolution.trim();
    item.history.push(`Issue marked ${status.toLocaleLowerCase()}`);
    return structuredClone(item);
  }

  listReports() {
    return structuredClone(this.reports);
  }
  findReport(id: string) {
    const item = this.reports.find((entry) => entry.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createReport(input: ReportInput) {
    if (!input.title.trim() || !input.owner.trim() || input.fields.length === 0) return undefined;
    const id = `RPT-2026-${String(++this.sequences.report).padStart(3, "0")}`;
    const item: ReportDefinition = { ...input, id, title: input.title.trim(), history: ["Report definition created"] };
    this.reports.unshift(item);
    return structuredClone(item);
  }
  updateReport(id: string, input: ReportInput) {
    const item = this.reports.find((entry) => entry.id === id);
    if (!item || !input.title.trim() || input.fields.length === 0) return undefined;
    Object.assign(item, input, { title: input.title.trim() });
    item.history.push("Report definition updated");
    return structuredClone(item);
  }
  archiveReport(id: string) {
    const item = this.reports.find((entry) => entry.id === id);
    if (!item) return false;
    item.status = "Archived";
    item.history.push("Report archived");
    return true;
  }
  restoreReport(id: string) {
    const item = this.reports.find((entry) => entry.id === id);
    if (!item) return false;
    item.status = "Active";
    item.history.push("Report restored");
    return true;
  }
  duplicateReport(id: string) {
    const source = this.reports.find((entry) => entry.id === id);
    if (!source) return undefined;
    return this.createReport({
      ...structuredClone(source),
      title: `${source.title} copy`,
      status: "Inactive",
      lastRun: "",
      nextRun: "",
    });
  }
  runReport(id: string) {
    const item = this.reports.find((entry) => entry.id === id);
    if (!item || item.status === "Archived") return undefined;
    item.lastRun = new Date().toISOString().slice(0, 10);
    item.history.push("Report generated by authorized staff");
    return structuredClone(item);
  }
}

export const analyticsRepository = new AnalyticsRepository();

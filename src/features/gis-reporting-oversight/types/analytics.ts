export type RecordStatus = "Active" | "Inactive" | "Archived";
export type QualityStatus = "Open" | "In progress" | "Resolved" | "Reopened";
export type Severity = "Critical" | "High" | "Medium" | "Low";

export type BarangayProfile = {
  id: string;
  name: string;
  psgcCode: string;
  classification: "Rural" | "Urban";
  population: number;
  households: number;
  registryCompleteness: number;
  serviceTurnaround: number;
  lastSubmission: string;
  status: RecordStatus;
  owner: string;
  target: number;
  followUp: string;
  history: string[];
};

export type MapLayer = {
  id: string;
  name: string;
  category: string;
  sourceModule: string;
  scope: string;
  visibility: "Internal" | "Public" | "Restricted";
  status: RecordStatus;
  recordCount: number;
  owner: string;
  lastUpdated: string;
  description: string;
  history: string[];
};

export type QualityIssue = {
  id: string;
  title: string;
  sourceModule: string;
  category: string;
  severity: Severity;
  status: QualityStatus;
  barangay: string;
  owner: string;
  detectedAt: string;
  dueDate: string;
  description: string;
  resolution: string;
  history: string[];
};

export type ReportDefinition = {
  id: string;
  title: string;
  category: string;
  owner: string;
  frequency: string;
  status: RecordStatus;
  scope: string;
  lastRun: string;
  nextRun: string;
  description: string;
  fields: string[];
  grouping: string;
  format: string;
  history: string[];
};

export type AnalyticsRecordKind = "barangay" | "layer" | "quality" | "report";

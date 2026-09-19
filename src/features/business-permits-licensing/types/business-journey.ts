export type BusinessApplicationPathId = "new" | "renewal" | "amendment" | "closure";

export type BusinessApplicationPath = {
  id: BusinessApplicationPathId;
  title: string;
  shortLabel: string;
  purpose: string;
  startsFrom: string;
  requiredContext: readonly string[];
  reviewTracks: readonly string[];
  correctionLoop: string;
  result: string;
};

export type BusinessJourneyStage = {
  id: string;
  title: string;
  owner: string;
  detail: string;
  result: string;
};

export type BusinessApplicationExample = {
  id: string;
  pathId: BusinessApplicationPathId;
  businessId: string;
  businessName: string;
  establishment: string;
  period: string;
  status: string;
  currentStage: string;
  correction: string | null;
  assessmentId: string | null;
  permitSerial: string | null;
};

export type BusinessRecordLayer = {
  title: string;
  reference: string;
  owns: string;
  doesNotDecide: string;
};

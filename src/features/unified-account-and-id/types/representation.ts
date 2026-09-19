export type RepresentationSubjectKind = "person" | "household" | "business";

export type DemoRepresentation = {
  id: string;
  subjectId: string;
  subjectKind: RepresentationSubjectKind;
  subjectLabel: string;
  authorityLabel: string;
  scopes: readonly string[];
  validFrom: string;
  validUntil: string;
};

export type RequesterContext = {
  id: string;
  kind: "self" | RepresentationSubjectKind;
  subjectId: string;
  subjectLabel: string;
  authorityLabel: string;
  scopes: readonly string[];
  validUntil?: string;
};

export type RepresentationAvailability = "active" | "expired" | "not-yet-active";

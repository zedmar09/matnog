import { PUBLICATION_FIXTURES, type PublicationKind, type PublicationRecord } from "../data/publication-fixtures";

type EditorialInput = {
  title: string;
  summary: string;
  body: string;
  language: string;
  effectiveUntil?: string;
  altTextReady: boolean;
  redactionReady: boolean;
  reason: string;
};

export class PublicationRepository {
  private records = structuredClone(PUBLICATION_FIXTURES) as PublicationRecord[];
  private publicSnapshots = structuredClone(
    PUBLICATION_FIXTURES.filter((item) => ["published", "corrected"].includes(item.status)),
  ) as PublicationRecord[];

  listEditorial() {
    return structuredClone(this.records);
  }

  findEditorial(id: string) {
    return structuredClone(this.records.find((item) => item.id === id));
  }

  listPublic(kind?: PublicationKind) {
    return structuredClone(this.publicSnapshots.filter((item) => !kind || item.kind === kind));
  }

  findPublicProject(projectId: string) {
    return structuredClone(
      this.publicSnapshots.find((item) => item.kind === "project" && item.sourceReference === projectId.toUpperCase()),
    );
  }

  findAdvisory(id: string) {
    const upper = id.toUpperCase();
    const snapshot = this.publicSnapshots.find((item) => item.kind === "advisory" && item.id === upper);
    if (snapshot) return structuredClone(snapshot);
    return structuredClone(
      this.records.find((item) => item.kind === "advisory" && item.id === upper && item.status === "archived"),
    );
  }

  archivedAdvisories() {
    return structuredClone(this.records.filter((item) => item.kind === "advisory" && item.status === "archived"));
  }

  transition(id: string, decision: "review" | "return" | "publish" | "archive", input: EditorialInput) {
    const record = this.records.find((item) => item.id === id);
    if (!record || input.reason.trim().length < 8) return undefined;
    const title = input.title.trim();
    const summary = input.summary.trim();
    const body = input.body.trim();
    const contentReady = title.length >= 8 && summary.length >= 12 && body.length >= 20;
    if (decision === "review" && (!contentReady || record.status === "in-review" || record.status === "archived"))
      return undefined;
    if (decision === "return" && record.status !== "in-review") return undefined;
    if (
      decision === "publish" &&
      (record.status !== "in-review" ||
        !contentReady ||
        !input.altTextReady ||
        !input.redactionReady ||
        input.language.includes("unapproved"))
    )
      return undefined;
    if (decision === "archive" && !["published", "corrected"].includes(record.status)) return undefined;
    record.title = title;
    record.summary = summary;
    record.body = body;
    record.language = input.language;
    record.effectiveUntil = input.effectiveUntil?.trim() || undefined;
    record.altTextReady = input.altTextReady;
    record.redactionReady = input.redactionReady;
    record.updatedDate = "2026-09-16";

    if (decision === "review") {
      record.status = "in-review";
      record.history.push(`Submitted for local review: ${input.reason.trim()}`);
    }
    if (decision === "return") {
      record.status = "returned";
      record.history.push(`Returned for correction: ${input.reason.trim()}`);
    }
    if (decision === "publish") {
      const priorIndex = this.publicSnapshots.findIndex((item) => item.id === record.id);
      record.status = priorIndex >= 0 ? "corrected" : "published";
      if (priorIndex >= 0) record.correctionNote = input.reason.trim();
      record.history.push(`${record.status === "corrected" ? "Corrected version" : "Version"} published locally`);
      const snapshot = structuredClone(record);
      if (priorIndex >= 0) this.publicSnapshots[priorIndex] = snapshot;
      else this.publicSnapshots.unshift(snapshot);
    }
    if (decision === "archive") {
      record.status = "archived";
      record.history.push(`Archived locally: ${input.reason.trim()}`);
      this.publicSnapshots = this.publicSnapshots.filter((item) => item.id !== record.id);
    }
    return structuredClone(record);
  }
}

export const publicationRepository = new PublicationRepository();

import { PUBLICATION_FIXTURES, type PublicationKind } from "../data/publication-fixtures";
import type {
  PublicationDecision,
  PublicationInput,
  PublicationOperationsRecord,
} from "../types/publication-operations";

const slugify = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const operationalFixtures: PublicationOperationsRecord[] = PUBLICATION_FIXTURES.map((record, index) => ({
  ...structuredClone(record),
  slug: slugify(record.title),
  priority: record.kind === "advisory" && record.effectiveUntil ? "Important" : "Routine",
  audience:
    record.kind === "service"
      ? "Residents and service applicants"
      : record.kind === "project"
        ? "Residents and oversight stakeholders"
        : "General public",
  channels: record.kind === "advisory" ? ["Website", "Mobile app"] : ["Website"],
  reviewer: ["published", "corrected", "archived"].includes(record.status)
    ? "Public Information Officer"
    : index % 2
      ? "Maria L. Espinas"
      : "Renato B. Frivaldo",
  createdDate: record.issueDate,
  scheduledAt: undefined,
  publishedAt: ["published", "corrected"].includes(record.status) ? record.updatedDate : undefined,
  attachmentCount: Math.min(4, Math.max(0, record.publicFields.length - 1)),
}));

export class PublicationRepository {
  private records = structuredClone(operationalFixtures) as PublicationOperationsRecord[];
  private publicSnapshots = structuredClone(
    operationalFixtures.filter((item) => ["published", "corrected"].includes(item.status)),
  ) as PublicationOperationsRecord[];

  listEditorial() {
    return structuredClone(this.records);
  }

  findEditorial(id: string) {
    return structuredClone(this.records.find((item) => item.id === id.toUpperCase()));
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
    const current = this.publicSnapshots.find((item) => item.kind === "advisory" && item.id === upper);
    if (current) return structuredClone(current);
    return structuredClone(
      this.records.find((item) => item.kind === "advisory" && item.id === upper && item.status === "archived"),
    );
  }

  archivedAdvisories() {
    return structuredClone(this.records.filter((item) => item.kind === "advisory" && item.status === "archived"));
  }

  create(input: PublicationInput) {
    if (!this.valid(input)) return undefined;
    const sequence = Math.max(0, ...this.records.map((item) => Number(item.id.match(/(\d+)$/)?.[1] ?? 0))) + 1;
    const record: PublicationOperationsRecord = {
      ...structuredClone(input),
      id: `PUB-2026-${String(sequence).padStart(3, "0")}`,
      slug: input.slug.trim() || slugify(input.title),
      history: [`Created by ${input.owner}`, `Assigned to ${input.reviewer}`],
    };
    this.records.unshift(record);
    this.syncPublic(record);
    return structuredClone(record);
  }

  update(id: string, input: PublicationInput) {
    const index = this.records.findIndex((item) => item.id === id.toUpperCase());
    if (index < 0 || !this.valid(input)) return undefined;
    const current = this.records[index];
    const record: PublicationOperationsRecord = {
      ...structuredClone(input),
      id: current.id,
      slug: input.slug.trim() || slugify(input.title),
      history: [...current.history, `Record updated by ${input.owner}`],
    };
    this.records[index] = record;
    this.syncPublic(record);
    return structuredClone(record);
  }

  duplicate(id: string) {
    const source = this.records.find((item) => item.id === id.toUpperCase());
    if (!source) return undefined;
    return this.create({
      ...structuredClone(source),
      title: `${source.title} — Copy`,
      slug: `${source.slug}-copy`,
      status: "draft",
      publishedAt: undefined,
      scheduledAt: undefined,
      updatedDate: "2026-09-20",
      issueDate: "2026-09-20",
    });
  }

  decide(id: string, decision: PublicationDecision, note: string) {
    const record = this.records.find((item) => item.id === id.toUpperCase());
    const reason = note.trim();
    if (!record || reason.length < 8) return undefined;
    if (decision === "submit" && !["draft", "returned"].includes(record.status)) return undefined;
    if (decision === "return" && record.status !== "in-review") return undefined;
    if (decision === "publish" && record.status !== "in-review") return undefined;
    if (decision === "publish" && (!record.altTextReady || !record.redactionReady)) return undefined;
    if (decision === "archive" && !["published", "corrected"].includes(record.status)) return undefined;
    if (decision === "restore" && record.status !== "archived") return undefined;

    if (decision === "submit") record.status = "in-review";
    if (decision === "return") record.status = "returned";
    if (decision === "publish") {
      record.status = this.publicSnapshots.some((item) => item.id === record.id) ? "corrected" : "published";
      record.publishedAt = "2026-09-20";
      record.correctionNote = record.status === "corrected" ? reason : undefined;
    }
    if (decision === "archive") record.status = "archived";
    if (decision === "restore") record.status = "draft";
    record.updatedDate = "2026-09-20";
    record.history.push(
      `${
        decision === "submit"
          ? "Submitted for review"
          : decision === "return"
            ? "Returned for correction"
            : decision === "publish"
              ? "Published"
              : decision === "archive"
                ? "Archived"
                : "Restored as draft"
      }: ${reason}`,
    );
    this.syncPublic(record);
    return structuredClone(record);
  }

  private valid(input: PublicationInput) {
    return Boolean(
      input.title.trim().length >= 8 &&
        input.summary.trim().length >= 12 &&
        input.body.trim().length >= 20 &&
        input.issuingOffice.trim() &&
        input.owner.trim() &&
        input.issueDate,
    );
  }

  private syncPublic(record: PublicationOperationsRecord) {
    const index = this.publicSnapshots.findIndex((item) => item.id === record.id);
    if (["published", "corrected"].includes(record.status)) {
      const snapshot = structuredClone(record);
      if (index >= 0) this.publicSnapshots[index] = snapshot;
      else this.publicSnapshots.unshift(snapshot);
    } else if (index >= 0) {
      this.publicSnapshots.splice(index, 1);
    }
  }
}

const browserRegistry =
  typeof window === "undefined"
    ? undefined
    : (window as typeof window & { __matnogPublishingRepository?: PublicationRepository });

function getPublicationRepository() {
  if (!browserRegistry) return new PublicationRepository();
  if (!browserRegistry.__matnogPublishingRepository) {
    browserRegistry.__matnogPublishingRepository = new PublicationRepository();
  }
  return browserRegistry.__matnogPublishingRepository;
}

export const publicationRepository = getPublicationRepository();

import type { PublicationStatus } from "../data/publication-fixtures";
import type { PublicationOperationsRecord } from "../types/publication-operations";

export function PublishingSummary({ records }: { records: PublicationOperationsRecord[] }) {
  const items: { label: string; value: number; detail: string }[] = [
    { label: "Total records", value: records.length, detail: "managed publications" },
    {
      label: "Published",
      value: records.filter((item) => ["published", "corrected"].includes(item.status)).length,
      detail: "publicly available",
    },
    {
      label: "In review",
      value: records.filter((item) => item.status === "in-review").length,
      detail: "awaiting decision",
    },
    {
      label: "Needs action",
      value: records.filter((item) => ["draft", "returned"].includes(item.status)).length,
      detail: "drafts and returns",
    },
  ];
  return (
    <section className="treasury-summary-grid" aria-label="Publishing summary">
      {items.map((item) => (
        <div className="treasury-summary-card" key={item.label}>
          <div className="treasury-summary-heading">
            <span>{item.label}</span>
          </div>
          <div className="treasury-summary-line">
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </div>
        </div>
      ))}
    </section>
  );
}

export const publicationStatusLabel: Record<PublicationStatus, string> = {
  draft: "Draft",
  returned: "Returned",
  "in-review": "In review",
  published: "Published",
  corrected: "Corrected",
  archived: "Archived",
};

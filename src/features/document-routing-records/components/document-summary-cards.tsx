import { FileClock, Route, ScanLine } from "lucide-react";

import { StatusBadge } from "@/shared/components/status-badge";

import type { DocumentWorkspaceRecord } from "../types/document-routing";

function words(value: string) {
  return value.replaceAll("-", " ");
}

export function DocumentSummaryCards({ record }: { record: DocumentWorkspaceRecord }) {
  const version = record.versions.find((item) => item.id === record.document.currentFileVersionId);
  const activeTask = record.tasks.find((task) => !["approved", "released", "endorsed"].includes(task.state));
  return (
    <fieldset className="document-concept-grid">
      <legend className="sr-only">Document routing concepts</legend>
      <section>
        <FileClock />
        <span>File version</span>
        <strong>Revision {version?.revision ?? "—"}</strong>
        <small>{version?.filename ?? "No selected file"}</small>
        <StatusBadge tone="neutral">{words(version?.state ?? "unavailable")}</StatusBadge>
      </section>
      <section>
        <Route />
        <span>Route task</span>
        <strong>{activeTask?.title ?? "Route complete"}</strong>
        <small>{activeTask?.office.label ?? record.route.envelope.scope.label}</small>
        <StatusBadge tone="pending">{words(activeTask?.state ?? record.route.envelope.status)}</StatusBadge>
      </section>
      <section>
        <ScanLine />
        <span>Physical custody</span>
        <strong>{record.custody.currentHolder?.label ?? "Digital record only"}</strong>
        <small>
          {record.custody.intendedReceiver
            ? `Intended for ${record.custody.intendedReceiver.label}`
            : record.custody.mode === "digital"
              ? "No physical file or handover"
              : "No handover is pending"}
        </small>
        <StatusBadge tone="warning">{words(record.custody.state)}</StatusBadge>
      </section>
    </fieldset>
  );
}

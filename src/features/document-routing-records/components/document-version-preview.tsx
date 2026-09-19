import { Eye, FileText, LockKeyhole } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { NoticePanel } from "@/shared/components/notice-panel";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { formatDemoDateTime } from "@/shared/data/demo-clock";

import type { DocumentWorkspaceRecord } from "../types/document-routing";

function formatSize(sizeBytes: number) {
  return `${Math.round(sizeBytes / 1000)} KB`;
}

export function DocumentVersionPreview({
  record,
  selectedVersionId,
  onVersionChange,
}: {
  record: DocumentWorkspaceRecord;
  selectedVersionId: string;
  onVersionChange: (versionId: string) => void;
}) {
  const selected =
    record.versions.find((version) => version.id === selectedVersionId) ??
    record.versions.find((version) => version.id === record.document.currentFileVersionId) ??
    record.versions[0];

  if (!selected) return null;

  return (
    <ContentPanel as="section" className="document-preview-panel">
      <div className="document-preview-heading">
        <SectionHeading
          eyebrow="Retained revision"
          title="Document preview"
          description="Choose any retained revision without changing the current routed file."
        />
        <label htmlFor="previewVersionId">
          Preview revision
          <NativeSelect
            id="previewVersionId"
            value={selected.id}
            onChange={(event) => onVersionChange(event.target.value)}
          >
            {[...record.versions].reverse().map((version) => (
              <option key={version.id} value={version.id}>
                Revision {version.revision} · {version.state}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      <section className="document-preview-sheet" aria-label={`Preview for ${selected.filename}`}>
        <div className="document-preview-sheet-header">
          <span className="document-file-icon">
            <FileText />
          </span>
          <div>
            <span className="eyebrow">Revision {selected.revision}</span>
            <strong>{selected.filename}</strong>
            <small>
              {selected.mediaType} · {formatSize(selected.sizeBytes)} · added {formatDemoDateTime(selected.addedAt)}
            </small>
          </div>
          <StatusBadge tone={selected.state === "submitted" ? "pending" : "neutral"}>{selected.state}</StatusBadge>
        </div>
        <div className="document-preview-placeholder">
          <Eye />
          <strong>PDF document preview</strong>
          <p>{selected.note}</p>
          <small>Document contents are represented by the selected revision metadata.</small>
        </div>
      </section>
      {record.document.classification === "restricted" && (
        <NoticePanel icon={<LockKeyhole />} className="mt-4">
          Restricted document metadata is visible only to authorized municipal staff.
        </NoticePanel>
      )}
    </ContentPanel>
  );
}

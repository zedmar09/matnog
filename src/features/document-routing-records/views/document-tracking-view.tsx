"use client";

import { type FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

import { FileCheck2, Route, Search, SearchX } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Timeline } from "@/shared/components/timeline";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { formatDemoDateTime } from "@/shared/data/demo-clock";

import { trackSafeDocument } from "../services/safe-document-tracking";

export function DocumentTrackingView({ reference }: { reference: string }) {
  const router = useRouter();
  const [input, setInput] = useState(reference);
  const result = trackSafeDocument(reference);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = input.trim().toUpperCase();
    if (!normalized) return;
    router.push(`/track/documents/${encodeURIComponent(normalized)}`);
  }

  return (
    <div className="site-container page-content">
      <PageHeader
        title="Track a released document safely."
        description="This public preview shows a limited timeline without internal document or custody metadata."
      />
      <NoticePanel className="mb-6">
        Subject lines, filenames, reviewer notes, actors, classification, signatures, and custody details are never
        included in this view.
      </NoticePanel>
      <div className="tracking-layout">
        <ContentPanel className="tracking-form">
          <SectionHeading
            eyebrow="Document tracking"
            title="Enter a document reference"
            description="Use a reference from this frontend demonstration."
          />
          <form onSubmit={submit} className="mt-6">
            <label htmlFor="document-reference">
              Document reference
              <Input
                id="document-reference"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="DOC-2026-0048"
              />
            </label>
            <Button type="submit">
              <Search /> Track document
            </Button>
          </form>
          <div className="demo-hint">
            <p>Try the privacy-safe sample</p>
            <button
              className="sample-reference"
              type="button"
              onClick={() => {
                setInput("DOC-2026-0048");
                router.push("/track/documents/DOC-2026-0048");
              }}
            >
              DOC-2026-0048
            </button>
          </div>
        </ContentPanel>

        <div className="tracking-result" aria-live="polite">
          {result.kind !== "success" ? (
            <EmptyState
              icon={result.kind === "empty" ? SearchX : Route}
              iconSize={34}
              title="Document unavailable"
              description="The reference was not found or is not available in this sample tracker."
            />
          ) : (
            <ContentPanel as="section" className="document-safe-tracker">
              <span className="eyebrow">{result.data.reference} · Safe document status</span>
              <h2>{result.data.title}</h2>
              <StatusBadge tone="success">{result.data.status}</StatusBadge>
              <Timeline steps={result.data.steps} />
              {result.data.sampleOutputReference && (
                <div className="document-safe-receipt">
                  <FileCheck2 />
                  <div>
                    <small>SAMPLE RELEASE · NO LEGAL SIGNATURE</small>
                    <strong>{result.data.sampleOutputReference}</strong>
                    {result.data.releasedAt && <span>Released {formatDemoDateTime(result.data.releasedAt)}</span>}
                    <p>No signed file is downloaded or transmitted.</p>
                  </div>
                </div>
              )}
            </ContentPanel>
          )}
        </div>
      </div>
    </div>
  );
}

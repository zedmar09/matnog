"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Archive,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Languages,
  Pencil,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { publicationStatusLabel } from "../components/publishing-ui";
import { publicationRepository as repository } from "../services/publication-repository";

function tone(status: string): StatusTone {
  if (["published", "corrected"].includes(status)) return "success";
  if (["in-review", "returned"].includes(status)) return "warning";
  return "neutral";
}

function FactGrid({ items }: { items: { label: string; value: React.ReactNode; icon: typeof FileText }[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div className="flex gap-3 rounded-xl border bg-muted/20 p-4" key={item.label}>
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <item.icon size={17} />
          </span>
          <div className="min-w-0">
            <dt className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{item.label}</dt>
            <dd className="mt-1 break-words font-semibold">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function PublishingRecordView({ recordId }: { recordId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [record, setRecord] = useState(() => repository.findEditorial(recordId));
  const [notice, setNotice] = useState("");
  const [archiving, setArchiving] = useState(false);
  if (role !== "municipal") {
    return (
      <PermissionState
        title="Publication record requires municipal access"
        description="Authorized municipal staff can review public information records."
      />
    );
  }
  if (!record) {
    return (
      <EmptyState
        icon={FileText}
        headingLevel="h1"
        title="Publication unavailable"
        description="The requested publication record could not be found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/content/publications">Return to publications</Link>
          </Button>
        }
      />
    );
  }
  const update = (message: string) => {
    setNotice(message);
    setRecord(repository.findEditorial(recordId));
  };
  const ready = record.altTextReady && record.redactionReady;
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href="/ops/content/publications">
            <ArrowLeft size={15} /> Publications
          </Link>
          <h1>{record.title}</h1>
          <p>
            {record.id} · {record.issuingOffice}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/ops/content/publications/${record.id}/edit`}>
              <Pencil /> Edit record
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const copy = repository.duplicate(record.id);
              if (copy) router.push(`/ops/content/publications/${copy.id}`);
            }}
          >
            <Copy /> Duplicate
          </Button>
        </div>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)]">
        <div className="grid gap-6">
          <ContentPanel as="section">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="eyebrow">{record.kind} publication</span>
                <h2>Publication record</h2>
              </div>
              <StatusBadge tone={tone(record.status)}>{publicationStatusLabel[record.status]}</StatusBadge>
            </div>
            <div className="mt-5">
              <FactGrid
                items={[
                  { label: "Issuing office", value: record.issuingOffice, icon: Building2 },
                  { label: "Content owner", value: record.owner, icon: UserRound },
                  { label: "Reviewer", value: record.reviewer, icon: ShieldCheck },
                  { label: "Language", value: record.language, icon: Languages },
                  { label: "Issue date", value: record.issueDate, icon: CalendarDays },
                  { label: "Effective until", value: record.effectiveUntil || "No expiry", icon: CalendarDays },
                  { label: "Priority", value: record.priority, icon: BadgeCheck },
                  { label: "Audience", value: record.audience, icon: Eye },
                ]}
              />
            </div>
            <div className="mt-5 rounded-xl border bg-primary/[.035] p-5">
              <div className="flex flex-wrap gap-2">
                {record.topics.map((topic) => (
                  <span
                    className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary text-xs"
                    key={topic}
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <h3 className="mt-4 text-xl">{record.title}</h3>
              <p className="mt-2 font-medium text-muted-foreground">{record.summary}</p>
              <p className="mt-4 whitespace-pre-line leading-7">{record.body}</p>
            </div>
          </ContentPanel>
          <ContentPanel as="section">
            <span className="eyebrow">Source control</span>
            <h2>Source and publication boundary</h2>
            <div className="mt-5">
              <FactGrid
                items={[
                  { label: "Source module", value: record.sourceModule, icon: FileText },
                  { label: "Source reference", value: record.sourceReference || "Direct publication", icon: FileText },
                  { label: "Source version", value: record.sourceVersion, icon: CheckCircle2 },
                  { label: "Channels", value: record.channels.join(" · "), icon: Send },
                ]}
              />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Approved public fields
                </span>
                <ul className="mt-3 grid gap-2 text-sm">
                  {record.publicFields.map((field) => (
                    <li className="flex gap-2" key={field}>
                      <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={15} />
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border p-4">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  Protected internal fields
                </span>
                <ul className="mt-3 grid gap-2 text-sm">
                  {record.blockedFields.length ? (
                    record.blockedFields.map((field) => (
                      <li className="flex gap-2" key={field}>
                        <ShieldCheck className="mt-0.5 shrink-0 text-muted-foreground" size={15} />
                        {field}
                      </li>
                    ))
                  ) : (
                    <li>No protected fields recorded.</li>
                  )}
                </ul>
              </div>
            </div>
          </ContentPanel>
        </div>
        <div className="grid content-start gap-6">
          <ContentPanel as="aside">
            <span className="eyebrow">Publication control</span>
            <h2>Workflow actions</h2>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <span>Alternative text</span>
                <strong>{record.altTextReady ? "Reviewed" : "Required"}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <span>Protected fields</span>
                <strong>{record.redactionReady ? "Reviewed" : "Required"}</strong>
              </div>
            </div>
            <div className="mt-5 grid gap-2 border-t pt-5">
              {["draft", "returned"].includes(record.status) && (
                <Button
                  onClick={() => {
                    repository.decide(record.id, "submit", "Content completed and submitted for editorial review.");
                    update(`${record.id} was submitted for review.`);
                  }}
                >
                  <FileText /> Submit for review
                </Button>
              )}
              {record.status === "in-review" && (
                <>
                  <Button
                    disabled={!ready}
                    onClick={() => {
                      repository.decide(record.id, "publish", "Accessibility, redaction, and source checks approved.");
                      update(`${record.id} was published.`);
                    }}
                  >
                    <Send /> Publish
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      repository.decide(
                        record.id,
                        "return",
                        "Content requires editorial correction before publication.",
                      );
                      update(`${record.id} was returned for correction.`);
                    }}
                  >
                    Return for correction
                  </Button>
                </>
              )}
              {["published", "corrected"].includes(record.status) && (
                <Button variant="outline" onClick={() => setArchiving(true)}>
                  <Archive /> Archive
                </Button>
              )}
              {record.status === "archived" && (
                <Button
                  onClick={() => {
                    repository.decide(record.id, "restore", "Restored for editorial revision and future publication.");
                    update(`${record.id} was restored as a draft.`);
                  }}
                >
                  <RotateCcw /> Restore as draft
                </Button>
              )}
            </div>
          </ContentPanel>
          <ContentPanel as="aside">
            <span className="eyebrow">Activity log</span>
            <h2>Publication history</h2>
            <div className="mt-5 grid gap-3">
              {record.history.map((entry) => (
                <div className="flex gap-3 rounded-xl border bg-muted/20 p-3 text-sm" key={entry}>
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <span>{entry}</span>
                </div>
              ))}
            </div>
          </ContentPanel>
          <ContentPanel as="aside">
            <span className="eyebrow">Record information</span>
            <h2>Publication metadata</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Public URL</dt>
                <dd className="text-right font-semibold">/{record.slug}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Attachments</dt>
                <dd className="font-semibold">{record.attachmentCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-semibold">{record.createdDate}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="font-semibold">{record.updatedDate}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Scheduled</dt>
                <dd className="font-semibold">{record.scheduledAt || "Not scheduled"}</dd>
              </div>
            </dl>
          </ContentPanel>
        </div>
      </div>
      <ConfirmationDialog
        open={archiving}
        onOpenChange={setArchiving}
        title="Archive publication?"
        description="The publication will be removed from public listings and retained in the editorial archive."
        confirmLabel="Archive publication"
        destructive
        onConfirm={() => {
          repository.decide(record.id, "archive", "Publication retired from the active public information library.");
          setArchiving(false);
          update(`${record.id} was archived.`);
        }}
      />
    </>
  );
}

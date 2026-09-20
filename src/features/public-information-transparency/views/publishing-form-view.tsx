"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import type { PublicationKind, PublicationStatus } from "../data/publication-fixtures";
import { publicationRepository as repository } from "../services/publication-repository";
import type { PublicationChannel, PublicationInput, PublicationPriority } from "../types/publication-operations";

const split = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const kinds: { value: PublicationKind; label: string }[] = [
  { value: "advisory", label: "Advisory" },
  { value: "project", label: "Project update" },
  { value: "disclosure", label: "Disclosure" },
  { value: "service", label: "Service guide" },
];
const channelOptions: PublicationChannel[] = ["Website", "Mobile app", "SMS bulletin", "Social media"];

export function PublishingFormView({
  recordId,
  initialKind = "advisory",
}: {
  recordId?: string;
  initialKind?: PublicationKind;
}) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const record = recordId ? repository.findEditorial(recordId) : undefined;
  const editing = Boolean(recordId);
  const [error, setError] = useState("");
  const [kind, setKind] = useState<PublicationKind>(record?.kind ?? initialKind);
  const [title, setTitle] = useState(record?.title ?? "");
  const [slug, setSlug] = useState(record?.slug ?? "");
  const [summary, setSummary] = useState(record?.summary ?? "");
  const [body, setBody] = useState(record?.body ?? "");
  const [status, setStatus] = useState<PublicationStatus>(record?.status ?? "draft");
  const [language, setLanguage] = useState(record?.language ?? "English");
  const [priority, setPriority] = useState<PublicationPriority>(record?.priority ?? "Routine");
  const [audience, setAudience] = useState(record?.audience ?? "General public");
  const [office, setOffice] = useState(record?.issuingOffice ?? "Public Information Office");
  const [owner, setOwner] = useState(record?.owner ?? "Public Information Office");
  const [reviewer, setReviewer] = useState(record?.reviewer ?? "Public Information Officer");
  const [issueDate, setIssueDate] = useState(record?.issueDate ?? "2026-09-20");
  const [effectiveUntil, setEffectiveUntil] = useState(record?.effectiveUntil ?? "");
  const [scheduledAt, setScheduledAt] = useState(record?.scheduledAt ?? "");
  const [sourceModule, setSourceModule] = useState(record?.sourceModule ?? "M16 Public information and transparency");
  const [sourceReference, setSourceReference] = useState(record?.sourceReference ?? "");
  const [sourceVersion, setSourceVersion] = useState(record?.sourceVersion ?? "Approved source version");
  const [topics, setTopics] = useState(record?.topics.join(", ") ?? "Notice, Community");
  const [publicFields, setPublicFields] = useState(
    record?.publicFields.join(", ") ?? "Title, Summary, Public guidance",
  );
  const [blockedFields, setBlockedFields] = useState(
    record?.blockedFields.join(", ") ?? "Internal notes, Personal information",
  );
  const [channels, setChannels] = useState<PublicationChannel[]>(record?.channels ?? ["Website", "Mobile app"]);
  const [altTextReady, setAltTextReady] = useState(record?.altTextReady ?? false);
  const [redactionReady, setRedactionReady] = useState(record?.redactionReady ?? false);
  const [attachmentCount, setAttachmentCount] = useState(String(record?.attachmentCount ?? 0));

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Publishing maintenance requires municipal access"
        description="Authorized municipal staff can create and update public information records."
      />
    );
  }
  if (editing && !record) {
    return (
      <EmptyState
        icon={Save}
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

  function submit(event: FormEvent) {
    event.preventDefault();
    const input: PublicationInput = {
      kind,
      title,
      slug,
      summary,
      body,
      status,
      language,
      priority,
      audience,
      channels,
      reviewer,
      createdDate: record?.createdDate ?? "2026-09-20",
      scheduledAt: scheduledAt || undefined,
      publishedAt: record?.publishedAt,
      attachmentCount: Number(attachmentCount) || 0,
      sourceModule,
      sourceReference,
      sourceVersion,
      issueDate,
      updatedDate: "2026-09-20",
      effectiveUntil: effectiveUntil || undefined,
      publicFields: split(publicFields),
      blockedFields: split(blockedFields),
      altTextReady,
      redactionReady,
      correctionNote: record?.correctionNote,
      owner,
      issuingOffice: office,
      topics: split(topics),
    };
    const saved = record ? repository.update(record.id, input) : repository.create(input);
    if (!saved) {
      setError("Complete the title, summary, public body, office, owner, and issue date before saving.");
      return;
    }
    router.push(`/ops/content/publications/${saved.id}`);
  }

  return (
    <>
      <div className="ops-topline analytics-form-topline">
        <div>
          <Link
            className="ops-back-link"
            href={record ? `/ops/content/publications/${record.id}` : "/ops/content/publications"}
          >
            <ArrowLeft size={15} /> Publications
          </Link>
          <h1>{editing ? "Edit publication" : "New publication"}</h1>
          <p>Maintain public content, ownership, schedule, channels, source controls, and publication readiness.</p>
        </div>
      </div>
      <ContentPanel as="section" className="analytics-form-panel">
        <form className="analytics-form-grid grid md:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          <FormField id="publication-kind" label="Content type" required>
            {(p) => (
              <NativeSelect {...p} value={kind} onChange={(event) => setKind(event.target.value as PublicationKind)}>
                {kinds.map((item) => (
                  <option value={item.value} key={item.value}>
                    {item.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="publication-title" label="Title" required className="xl:col-span-2">
            {(p) => <Input {...p} value={title} onChange={(event) => setTitle(event.target.value)} />}
          </FormField>
          <FormField id="publication-slug" label="Public URL slug" hint="Generated from the title when left blank.">
            {(p) => <Input {...p} value={slug} onChange={(event) => setSlug(event.target.value)} />}
          </FormField>
          <FormField id="publication-summary" label="Summary" required className="md:col-span-2">
            {(p) => <Textarea {...p} value={summary} onChange={(event) => setSummary(event.target.value)} />}
          </FormField>
          <FormField id="publication-body" label="Public body" required className="md:col-span-2 xl:col-span-3">
            {(p) => (
              <Textarea {...p} className="min-h-28" value={body} onChange={(event) => setBody(event.target.value)} />
            )}
          </FormField>
          <FormField id="publication-office" label="Issuing office" required>
            {(p) => <Input {...p} value={office} onChange={(event) => setOffice(event.target.value)} />}
          </FormField>
          <FormField id="publication-owner" label="Content owner" required>
            {(p) => <Input {...p} value={owner} onChange={(event) => setOwner(event.target.value)} />}
          </FormField>
          <FormField id="publication-reviewer" label="Reviewer" required>
            {(p) => <Input {...p} value={reviewer} onChange={(event) => setReviewer(event.target.value)} />}
          </FormField>
          <FormField id="publication-language" label="Language">
            {(p) => (
              <NativeSelect {...p} value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option>English</option>
                <option>Filipino</option>
                <option>Bikol</option>
                <option>English and Filipino</option>
              </NativeSelect>
            )}
          </FormField>
          <FormField id="publication-priority" label="Priority">
            {(p) => (
              <NativeSelect
                {...p}
                value={priority}
                onChange={(event) => setPriority(event.target.value as PublicationPriority)}
              >
                <option>Routine</option>
                <option>Important</option>
                <option>Urgent</option>
              </NativeSelect>
            )}
          </FormField>
          <FormField id="publication-status" label="Status">
            {(p) => (
              <NativeSelect
                {...p}
                value={status}
                onChange={(event) => setStatus(event.target.value as PublicationStatus)}
              >
                <option value="draft">Draft</option>
                <option value="returned">Returned</option>
                <option value="in-review">In review</option>
                <option value="published">Published</option>
                <option value="corrected">Corrected</option>
                <option value="archived">Archived</option>
              </NativeSelect>
            )}
          </FormField>
          <FormField id="publication-audience" label="Audience">
            {(p) => <Input {...p} value={audience} onChange={(event) => setAudience(event.target.value)} />}
          </FormField>
          <FormField id="publication-issued" label="Issue date" required>
            {(p) => (
              <Input {...p} type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
            )}
          </FormField>
          <FormField id="publication-until" label="Effective until">
            {(p) => (
              <Input
                {...p}
                type="date"
                value={effectiveUntil}
                onChange={(event) => setEffectiveUntil(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="publication-scheduled" label="Scheduled publication">
            {(p) => (
              <Input
                {...p}
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="publication-source-module" label="Source module">
            {(p) => <Input {...p} value={sourceModule} onChange={(event) => setSourceModule(event.target.value)} />}
          </FormField>
          <FormField id="publication-source-reference" label="Source reference">
            {(p) => (
              <Input {...p} value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} />
            )}
          </FormField>
          <FormField id="publication-source-version" label="Source version">
            {(p) => <Input {...p} value={sourceVersion} onChange={(event) => setSourceVersion(event.target.value)} />}
          </FormField>
          <FormField id="publication-topics" label="Topics" hint="Separate entries with commas.">
            {(p) => <Input {...p} value={topics} onChange={(event) => setTopics(event.target.value)} />}
          </FormField>
          <FormField id="publication-public-fields" label="Public fields" hint="Separate entries with commas.">
            {(p) => <Textarea {...p} value={publicFields} onChange={(event) => setPublicFields(event.target.value)} />}
          </FormField>
          <FormField id="publication-blocked-fields" label="Protected fields" hint="Separate entries with commas.">
            {(p) => (
              <Textarea {...p} value={blockedFields} onChange={(event) => setBlockedFields(event.target.value)} />
            )}
          </FormField>
          <FormField id="publication-attachments" label="Attachment count">
            {(p) => (
              <Input
                {...p}
                min="0"
                type="number"
                value={attachmentCount}
                onChange={(event) => setAttachmentCount(event.target.value)}
              />
            )}
          </FormField>
          <fieldset className="form-field md:col-span-2">
            <legend className="form-label">Publication channels</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {channelOptions.map((channel) => (
                <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" key={channel}>
                  <input
                    type="checkbox"
                    checked={channels.includes(channel)}
                    onChange={(event) =>
                      setChannels((current) =>
                        event.target.checked ? [...current, channel] : current.filter((item) => item !== channel),
                      )
                    }
                  />
                  {channel}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="form-field">
            <legend className="form-label">Readiness checks</legend>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={altTextReady}
                  onChange={(event) => setAltTextReady(event.target.checked)}
                />
                Alternative text reviewed
              </label>
              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={redactionReady}
                  onChange={(event) => setRedactionReady(event.target.checked)}
                />
                Protected fields reviewed
              </label>
            </div>
          </fieldset>
          {error && (
            <p className="form-error md:col-span-2 xl:col-span-3" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-4 md:col-span-2 xl:col-span-3">
            <Button asChild variant="outline">
              <Link href="/ops/content/publications">Cancel</Link>
            </Button>
            <Button type="submit">
              <Save /> Save publication
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}

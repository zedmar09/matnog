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

import { AdministrationTabs } from "../components/admin-ui";
import {
  ADMIN_SECTION_META,
  type AdminPriority,
  type AdminRecordInput,
  type AdminSection,
} from "../data/admin-fixtures";
import { adminRepository as repository } from "../services/admin-repository";

const initialStatus: Record<AdminSection, string> = {
  users: "Pending activation",
  access: "Requested",
  settings: "Draft",
  audit: "Recorded",
  privacy: "Received",
  messages: "Draft",
  integrations: "Disabled",
  operations: "Open",
  imports: "Needs review",
};

const sectionLabels: Record<
  AdminSection,
  { title: string; subtitle: string; reference: string; scope: string; channel: string; target: string }
> = {
  users: {
    title: "Staff member",
    subtitle: "Position or role",
    reference: "Employee reference",
    scope: "Assigned scope",
    channel: "Account type",
    target: "Permitted modules",
  },
  access: {
    title: "Access request",
    subtitle: "Request type",
    reference: "User reference",
    scope: "Requested scope",
    channel: "Assignment method",
    target: "Permitted fields",
  },
  settings: {
    title: "Configuration name",
    subtitle: "Version",
    reference: "Configuration reference",
    scope: "Applies to",
    channel: "Configuration type",
    target: "Affected workflow",
  },
  audit: {
    title: "Audit event",
    subtitle: "Event description",
    reference: "Affected reference",
    scope: "Event scope",
    channel: "Source channel",
    target: "Affected record",
  },
  privacy: {
    title: "Privacy request",
    subtitle: "Request category",
    reference: "Request reference",
    scope: "Record scope",
    channel: "Request source",
    target: "Fields or records",
  },
  messages: {
    title: "Message title",
    subtitle: "Message type",
    reference: "Related reference",
    scope: "Purpose",
    channel: "Delivery channel",
    target: "Recipient",
  },
  integrations: {
    title: "Integration name",
    subtitle: "Connected service",
    reference: "Integration key",
    scope: "Permitted data",
    channel: "Connection type",
    target: "Destination system",
  },
  operations: {
    title: "Operational issue",
    subtitle: "Issue category",
    reference: "Incident reference",
    scope: "Affected service",
    channel: "Reported through",
    target: "Affected component",
  },
  imports: {
    title: "Import batch",
    subtitle: "Dataset type",
    reference: "Batch reference",
    scope: "Import scope",
    channel: "Source format",
    target: "Destination records",
  },
};

const splitTags = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function AdminFormView({ section, recordId }: { section: AdminSection; recordId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const record = recordId ? repository.find(section, recordId) : undefined;
  const editing = Boolean(recordId);
  const meta = ADMIN_SECTION_META[section];
  const labels = sectionLabels[section];
  const [error, setError] = useState("");
  const [title, setTitle] = useState(record?.title ?? "");
  const [subtitle, setSubtitle] = useState(record?.subtitle ?? "");
  const [office, setOffice] = useState(record?.office ?? "");
  const [owner, setOwner] = useState(record?.owner ?? "");
  const status = record?.status ?? initialStatus[section];
  const [priority, setPriority] = useState<AdminPriority>(record?.priority ?? "Routine");
  const [reference, setReference] = useState(record?.reference ?? "");
  const [scope, setScope] = useState(record?.scope ?? "");
  const [channel, setChannel] = useState(record?.channel ?? "");
  const [target, setTarget] = useState(record?.target ?? "");
  const [effectiveDate, setEffectiveDate] = useState(record?.effectiveDate ?? "");
  const [expiresAt, setExpiresAt] = useState(record?.expiresAt ?? "");
  const [description, setDescription] = useState(record?.description ?? "");
  const [tags, setTags] = useState(record?.tags.join(", ") ?? "");

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Administration requires municipal access"
        description="Authorized municipal staff can maintain administration records."
      />
    );
  }
  if (section === "audit") {
    return (
      <EmptyState
        icon={Save}
        headingLevel="h1"
        title="Audit events cannot be changed"
        description="Audit events are immutable and can only be reviewed."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/admin/audit">Return to audit</Link>
          </Button>
        }
      />
    );
  }
  if (editing && !record) {
    return (
      <EmptyState
        icon={Save}
        headingLevel="h1"
        title={`${meta.singular} unavailable`}
        description="The requested administration record could not be found."
        action={
          <Button asChild variant="outline">
            <Link href={`/ops/admin/${section}`}>Return to {meta.title.toLocaleLowerCase()}</Link>
          </Button>
        }
      />
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const input: AdminRecordInput = {
      section,
      title,
      subtitle,
      office,
      owner,
      status,
      priority,
      createdAt: record?.createdAt ?? "2026-09-20",
      updatedAt: "2026-09-20",
      effectiveDate: effectiveDate || undefined,
      expiresAt: expiresAt || undefined,
      description,
      reference,
      scope,
      channel,
      target,
      tags: splitTags(tags),
    };
    const saved = record ? repository.update(section, record.id, input) : repository.create(section, input);
    if (!saved) {
      setError("Complete the title, description, office, owner, and operational details before saving.");
      return;
    }
    router.push(`/ops/admin/${section}/${saved.id}`);
  }

  return (
    <>
      <div className="ops-topline analytics-form-topline">
        <div>
          <Link
            className="ops-back-link"
            href={record ? `/ops/admin/${section}/${record.id}` : `/ops/admin/${section}`}
          >
            <ArrowLeft size={15} /> {meta.title}
          </Link>
          <h1>{editing ? `Edit ${meta.singular}` : `New ${meta.singular}`}</h1>
          <p>Maintain ownership, operational scope, dates, references, and accountable office information.</p>
        </div>
      </div>
      <AdministrationTabs active={section} />
      <ContentPanel as="section" className="analytics-form-panel">
        <form className="analytics-form-grid grid md:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          <FormField id="admin-title" label={labels.title} required className="xl:col-span-2">
            {(p) => <Input {...p} value={title} onChange={(event) => setTitle(event.target.value)} />}
          </FormField>
          <FormField id="admin-subtitle" label={labels.subtitle} required>
            {(p) => <Input {...p} value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />}
          </FormField>
          <FormField id="admin-office" label="Responsible office" required>
            {(p) => <Input {...p} value={office} onChange={(event) => setOffice(event.target.value)} />}
          </FormField>
          <FormField id="admin-owner" label="Accountable owner" required>
            {(p) => <Input {...p} value={owner} onChange={(event) => setOwner(event.target.value)} />}
          </FormField>
          <FormField id="admin-reference" label={labels.reference}>
            {(p) => <Input {...p} value={reference} onChange={(event) => setReference(event.target.value)} />}
          </FormField>
          <FormField id="admin-status" label="Current status">
            {(p) => <Input {...p} value={status} readOnly aria-readonly="true" />}
          </FormField>
          <FormField id="admin-priority" label="Priority">
            {(p) => (
              <NativeSelect
                {...p}
                value={priority}
                onChange={(event) => setPriority(event.target.value as AdminPriority)}
              >
                <option>Routine</option>
                <option>Important</option>
                <option>Critical</option>
              </NativeSelect>
            )}
          </FormField>
          <FormField id="admin-effective" label="Effective date">
            {(p) => (
              <Input
                {...p}
                type="date"
                value={effectiveDate}
                onChange={(event) => setEffectiveDate(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="admin-expiry" label="Expiry date">
            {(p) => (
              <Input {...p} type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            )}
          </FormField>
          <FormField id="admin-scope" label={labels.scope} required>
            {(p) => <Input {...p} value={scope} onChange={(event) => setScope(event.target.value)} />}
          </FormField>
          <FormField id="admin-channel" label={labels.channel} required>
            {(p) => <Input {...p} value={channel} onChange={(event) => setChannel(event.target.value)} />}
          </FormField>
          <FormField id="admin-target" label={labels.target} required>
            {(p) => <Input {...p} value={target} onChange={(event) => setTarget(event.target.value)} />}
          </FormField>
          <FormField id="admin-tags" label="Tags" hint="Separate entries with commas.">
            {(p) => <Input {...p} value={tags} onChange={(event) => setTags(event.target.value)} />}
          </FormField>
          <FormField
            id="admin-description"
            label="Description and purpose"
            required
            className="md:col-span-2 xl:col-span-3"
          >
            {(p) => (
              <Textarea
                {...p}
                className="min-h-28"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            )}
          </FormField>
          {error && (
            <p className="form-error md:col-span-2 xl:col-span-3" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4 md:col-span-2 xl:col-span-3">
            <Button asChild type="button" variant="outline">
              <Link href={record ? `/ops/admin/${section}/${record.id}` : `/ops/admin/${section}`}>Cancel</Link>
            </Button>
            <Button type="submit">
              <Save /> Save {meta.singular}
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}

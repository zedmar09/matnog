"use client";

import { useState } from "react";

import Link from "next/link";

import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Building2,
  CalendarDays,
  CreditCard,
  FileCheck2,
  FileText,
  Link2,
  Palette,
  Pencil,
  Phone,
  RefreshCcw,
  ShieldCheck,
  Tag,
  UserRound,
} from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { IdCardCanvas } from "../components/identity-operations-ui";
import { identityOperationsRepository as repository } from "../services/identity-operations-repository";
import type { IdentityRecordKind } from "../types/identity-operations";

const destinations: Record<IdentityRecordKind, string> = {
  account: "/ops/identity/accounts",
  link: "/ops/identity/links",
  application: "/ops/identity/applications",
  credential: "/ops/identity/credentials",
  template: "/ops/identity/templates",
};
function tone(value: string): StatusTone {
  if (["Active", "Approved", "Verified"].includes(value)) return "success";
  if (["Rejected", "Revoked", "Deactivated"].includes(value)) return "destructive";
  if (["Pending", "Submitted", "Under review", "Correction", "Suspended", "Draft"].includes(value)) return "warning";
  return "neutral";
}
function FactGrid({ items }: { items: { label: string; value: React.ReactNode; icon: typeof Tag }[] }) {
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
function History({ entries }: { entries: string[] }) {
  return (
    <ContentPanel as="aside">
      <span className="eyebrow">Activity log</span>
      <h2>Record history</h2>
      <div className="mt-5 grid gap-3">
        {entries.map((entry) => (
          <div className="flex gap-3 rounded-xl border bg-muted/20 p-3 text-sm" key={entry}>
            <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
            <span>{entry}</span>
          </div>
        ))}
      </div>
    </ContentPanel>
  );
}

export function IdentityRecordView({ kind, recordId }: { kind: IdentityRecordKind; recordId: string }) {
  const { role } = useWorkspaceSession();
  const [, refresh] = useState(0);
  const [notice, setNotice] = useState("");
  const account = kind === "account" ? repository.findAccount(recordId) : undefined;
  const link = kind === "link" ? repository.findLink(recordId) : undefined;
  const application = kind === "application" ? repository.findApplication(recordId) : undefined;
  const credential = kind === "credential" ? repository.findCredential(recordId) : undefined;
  const template = kind === "template" ? repository.findTemplate(recordId) : undefined;
  const record = account ?? link ?? application ?? credential ?? template;
  const destination = destinations[kind];
  const title =
    account?.name ??
    link?.residentName ??
    application?.applicantName ??
    credential?.holderName ??
    template?.name ??
    recordId;
  if (role !== "municipal")
    return (
      <PermissionState
        title="Identity record requires municipal access"
        description="Authorized municipal staff can review identity records."
      />
    );
  if (!record)
    return (
      <EmptyState
        icon={FileText}
        headingLevel="h1"
        title="Identity record unavailable"
        description="The requested identity record could not be found."
        action={
          <Button asChild variant="outline">
            <Link href={destination}>Return to records</Link>
          </Button>
        }
      />
    );
  const update = (message: string) => {
    setNotice(message);
    refresh((value) => value + 1);
  };
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href={destination}>
            <ArrowLeft size={15} /> {kind === "link" ? "Resident links" : `${kind[0].toUpperCase()}${kind.slice(1)}s`}
          </Link>
          <h1>{title}</h1>
          <p>{record.id} · Municipal identity record</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {template && (
            <Button asChild>
              <Link href={`/ops/identity/templates/${template.id}/designer`}>
                <Palette /> Open designer
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`${destination}/${record.id}/edit`}>
              <Pencil /> Edit record
            </Link>
          </Button>
        </div>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      {account && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <ContentPanel as="section">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Resident account</span>
                <h2>Account information</h2>
              </div>
              <StatusBadge tone={tone(account.status)}>{account.status}</StatusBadge>
            </div>
            <div className="mt-5">
              <FactGrid
                items={[
                  { label: "Person ID", value: account.personId, icon: UserRound },
                  { label: "Barangay", value: account.barangay, icon: Building2 },
                  { label: "Mobile number", value: account.phone, icon: Phone },
                  { label: "Email", value: account.email || "Not provided", icon: FileText },
                  { label: "Verification", value: account.verification, icon: ShieldCheck },
                  { label: "Last access", value: account.lastAccess, icon: CalendarDays },
                ]}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-3 border-t pt-5">
              <Button asChild variant="outline">
                <Link href={`/ops/identity/links/new?account=${account.id}`}>
                  <Link2 /> Link resident
                </Link>
              </Button>
              {account.status === "Deactivated" ? (
                <Button
                  onClick={() => {
                    repository.setAccountStatus(account.id, "Active");
                    update(`${account.name} was restored.`);
                  }}
                >
                  <RefreshCcw /> Restore account
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    repository.setAccountStatus(account.id, "Deactivated");
                    update(`${account.name} was deactivated.`);
                  }}
                >
                  <Ban /> Deactivate account
                </Button>
              )}
            </div>
          </ContentPanel>
          <History entries={account.history} />
        </div>
      )}
      {link && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <ContentPanel as="section">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Account-to-resident association</span>
                <h2>Match review</h2>
              </div>
              <StatusBadge tone={tone(link.status)}>{link.status}</StatusBadge>
            </div>
            <div className="mt-5">
              <FactGrid
                items={[
                  { label: "Account", value: `${link.accountName} · ${link.accountId}`, icon: UserRound },
                  { label: "Registry person", value: `${link.residentName} · ${link.personId}`, icon: Link2 },
                  { label: "Barangay", value: link.barangay, icon: Building2 },
                  { label: "Match confidence", value: `${link.matchScore}%`, icon: ShieldCheck },
                  { label: "Requested", value: link.requestedAt, icon: CalendarDays },
                  { label: "Reviewer", value: link.reviewedBy, icon: UserRound },
                ]}
              />
            </div>
            <div className="mt-5 rounded-xl border p-4">
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Decision note</span>
              <p className="mt-2">{link.reason || "No decision note recorded."}</p>
            </div>
            {link.status !== "Approved" && (
              <div className="mt-5 flex flex-wrap gap-3 border-t pt-5">
                <Button
                  onClick={() => {
                    repository.decideLink(link.id, "Approved", "Resident identity and registry record confirmed.");
                    update(`${link.id} was approved.`);
                  }}
                >
                  <BadgeCheck /> Approve association
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    repository.decideLink(link.id, "Correction", "Additional residency evidence is required.");
                    update(`${link.id} was returned for correction.`);
                  }}
                >
                  Request correction
                </Button>
              </div>
            )}
          </ContentPanel>
          <History entries={link.history} />
        </div>
      )}
      {application && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <ContentPanel as="section">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Municipal ID application</span>
                <h2>Application review</h2>
              </div>
              <StatusBadge tone={tone(application.status)}>{application.status}</StatusBadge>
            </div>
            <div className="mt-5">
              <FactGrid
                items={[
                  { label: "Application type", value: application.kind, icon: CreditCard },
                  { label: "Person ID", value: application.personId, icon: UserRound },
                  { label: "Account", value: application.accountId, icon: Link2 },
                  { label: "Barangay", value: application.barangay, icon: Building2 },
                  { label: "Submitted", value: application.submittedAt, icon: CalendarDays },
                  { label: "Reviewer", value: application.reviewer, icon: UserRound },
                ]}
              />
            </div>
            <div className="mt-5">
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                Evidence requirements
              </span>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {application.evidence.map((item) => (
                  <div className="flex items-center gap-2 rounded-lg border p-3 text-sm" key={item}>
                    <FileCheck2 className="text-primary" size={16} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            {["Submitted", "Under review"].includes(application.status) && (
              <div className="mt-5 flex flex-wrap gap-3 border-t pt-5">
                <Button
                  onClick={() => {
                    repository.decideApplication(
                      application.id,
                      "Approved",
                      "Identity requirements reviewed and approved.",
                    );
                    update(`${application.id} was approved.`);
                  }}
                >
                  <BadgeCheck /> Approve application
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    repository.decideApplication(
                      application.id,
                      "Correction",
                      "Updated evidence is required before approval.",
                    );
                    update(`${application.id} was returned for correction.`);
                  }}
                >
                  Request correction
                </Button>
              </div>
            )}
          </ContentPanel>
          <History entries={application.history} />
        </div>
      )}
      {credential && (
        <div className="space-y-6">
          <section className="grid gap-5 lg:grid-cols-2">
            <div>
              <span className="eyebrow">Credential front</span>
              <IdCardCanvas
                elements={repository.findTemplate(credential.templateId)?.elements ?? []}
                side="front"
                className="mt-3"
              />
            </div>
            <div>
              <span className="eyebrow">Credential back</span>
              <IdCardCanvas
                elements={repository.findTemplate(credential.templateId)?.elements ?? []}
                side="back"
                className="mt-3"
              />
            </div>
          </section>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <ContentPanel as="section">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">Issued municipal credential</span>
                  <h2>Credential information</h2>
                </div>
                <StatusBadge tone={tone(credential.status)}>{credential.status}</StatusBadge>
              </div>
              <div className="mt-5">
                <FactGrid
                  items={[
                    { label: "Credential number", value: credential.id, icon: CreditCard },
                    { label: "Person ID", value: credential.personId, icon: UserRound },
                    { label: "Application", value: credential.applicationId, icon: FileCheck2 },
                    { label: "Barangay", value: credential.barangay, icon: Building2 },
                    { label: "Issued", value: credential.issuedAt, icon: CalendarDays },
                    { label: "Valid until", value: credential.validUntil, icon: ShieldCheck },
                    { label: "Verification token", value: credential.token, icon: Tag },
                    { label: "Template", value: credential.templateId, icon: Palette },
                  ]}
                />
              </div>
              {credential.status === "Active" && (
                <div className="mt-5 flex flex-wrap gap-3 border-t pt-5">
                  <Button
                    onClick={() => {
                      const next = repository.replaceCredential(credential.id);
                      if (next) update(`${next.id} was issued as the replacement.`);
                    }}
                  >
                    <RefreshCcw /> Issue replacement
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      repository.setCredentialStatus(
                        credential.id,
                        "Revoked",
                        "Credential revoked by the Municipal Identity Desk.",
                      );
                      update(`${credential.id} was revoked.`);
                    }}
                  >
                    <Ban /> Revoke credential
                  </Button>
                </div>
              )}
            </ContentPanel>
            <History entries={credential.history} />
          </div>
        </div>
      )}
      {template && (
        <div className="space-y-6">
          <section className="grid gap-5 lg:grid-cols-2">
            <div>
              <span className="eyebrow">Template front</span>
              <IdCardCanvas elements={template.elements} side="front" className="mt-3" />
            </div>
            <div>
              <span className="eyebrow">Template back</span>
              <IdCardCanvas elements={template.elements} side="back" className="mt-3" />
            </div>
          </section>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <ContentPanel as="section">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">Credential layout</span>
                  <h2>Template information</h2>
                </div>
                <StatusBadge tone={tone(template.status)}>{template.status}</StatusBadge>
              </div>
              <p className="muted mt-2">{template.description}</p>
              <div className="mt-5">
                <FactGrid
                  items={[
                    { label: "Version", value: template.version, icon: Tag },
                    { label: "Orientation", value: template.orientation, icon: CreditCard },
                    { label: "Design layers", value: template.elements.length, icon: Palette },
                    { label: "Updated", value: template.updatedAt, icon: CalendarDays },
                    { label: "Template owner", value: template.updatedBy, icon: UserRound },
                    { label: "Issuance status", value: template.status, icon: ShieldCheck },
                  ]}
                />
              </div>
              {template.status !== "Active" && template.status !== "Archived" && (
                <div className="mt-5 border-t pt-5">
                  <Button
                    onClick={() => {
                      repository.setTemplateStatus(template.id, "Active");
                      update(`${template.name} is now active.`);
                    }}
                  >
                    <BadgeCheck /> Activate template
                  </Button>
                </div>
              )}
            </ContentPanel>
            <History entries={template.history} />
          </div>
        </div>
      )}
    </>
  );
}

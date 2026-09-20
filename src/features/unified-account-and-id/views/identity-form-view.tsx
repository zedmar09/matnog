"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Plus, Save } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { identityOperationsRepository as repository } from "../services/identity-operations-repository";
import type {
  AccountStatus,
  ApplicationStatus,
  CredentialStatus,
  IdentityRecordKind,
  LinkStatus,
  TemplateStatus,
} from "../types/identity-operations";

const destinations: Record<IdentityRecordKind, string> = {
  account: "/ops/identity/accounts",
  link: "/ops/identity/links",
  application: "/ops/identity/applications",
  credential: "/ops/identity/credentials",
  template: "/ops/identity/templates",
};
const labels: Record<IdentityRecordKind, string> = {
  account: "account",
  link: "resident link",
  application: "ID application",
  credential: "credential",
  template: "ID template",
};
const split = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function IdentityFormView({
  kind,
  recordId,
  prefillAccount = "",
}: {
  kind: IdentityRecordKind;
  recordId?: string;
  prefillAccount?: string;
}) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const editing = Boolean(recordId);
  const destination = destinations[kind];
  const account = kind === "account" && recordId ? repository.findAccount(recordId) : undefined;
  const link = kind === "link" && recordId ? repository.findLink(recordId) : undefined;
  const application = kind === "application" && recordId ? repository.findApplication(recordId) : undefined;
  const credential = kind === "credential" && recordId ? repository.findCredential(recordId) : undefined;
  const template = kind === "template" && recordId ? repository.findTemplate(recordId) : undefined;
  const record = account ?? link ?? application ?? credential ?? template;
  const prefilled = prefillAccount ? repository.findAccount(prefillAccount) : undefined;
  const [error, setError] = useState("");
  const [name, setName] = useState(
    account?.name ??
      template?.name ??
      application?.applicantName ??
      credential?.holderName ??
      link?.residentName ??
      prefilled?.name ??
      "",
  );
  const [phone, setPhone] = useState(account?.phone ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [barangay, setBarangay] = useState(
    account?.barangay ?? link?.barangay ?? application?.barangay ?? credential?.barangay ?? prefilled?.barangay ?? "",
  );
  const [personId, setPersonId] = useState(
    account?.personId ?? link?.personId ?? application?.personId ?? credential?.personId ?? prefilled?.personId ?? "",
  );
  const [accountId, setAccountId] = useState(link?.accountId ?? application?.accountId ?? prefilled?.id ?? "");
  const [accountName, setAccountName] = useState(link?.accountName ?? prefilled?.name ?? "");
  const [matchScore, setMatchScore] = useState(String(link?.matchScore ?? 80));
  const [requestedAt, setRequestedAt] = useState(link?.requestedAt ?? "2026-09-20");
  const [reviewer, setReviewer] = useState(link?.reviewedBy ?? application?.reviewer ?? "Unassigned");
  const [linkStatus, setLinkStatus] = useState<LinkStatus>(link?.status ?? "Pending");
  const [verification, setVerification] = useState(account?.verification ?? "Pending");
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(account?.status ?? "Active");
  const [createdAt, setCreatedAt] = useState(account?.createdAt ?? "2026-09-20");
  const [applicationId, setApplicationId] = useState(credential?.applicationId ?? "");
  const [applicationKind, setApplicationKind] = useState(application?.kind ?? "New ID");
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>(application?.status ?? "Submitted");
  const [submittedAt, setSubmittedAt] = useState(application?.submittedAt ?? "2026-09-20");
  const [evidence, setEvidence] = useState(
    application?.evidence.join(", ") ?? "Barangay certification, Resident photograph, Specimen signature",
  );
  const [credentialType, setCredentialType] = useState(credential?.type ?? "Municipal Resident ID");
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus>(credential?.status ?? "Active");
  const [issuedAt, setIssuedAt] = useState(credential?.issuedAt ?? "2026-09-20");
  const [validUntil, setValidUntil] = useState(credential?.validUntil ?? "2029-09-19");
  const [token, setToken] = useState(credential?.token ?? "");
  const [templateId, setTemplateId] = useState(application?.templateId ?? credential?.templateId ?? "TPL-001");
  const [reason, setReason] = useState(link?.reason ?? application?.reason ?? credential?.invalidReason ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [templateStatus, setTemplateStatus] = useState<TemplateStatus>(template?.status ?? "Draft");
  const [orientation, setOrientation] = useState(template?.orientation ?? "Landscape");
  const [primaryColor, setPrimaryColor] = useState(template?.primaryColor ?? "#08783e");
  const [secondaryColor, setSecondaryColor] = useState(template?.secondaryColor ?? "#e9f6ee");
  const [updatedBy, setUpdatedBy] = useState(template?.updatedBy ?? "Municipal Identity Desk");

  if (role !== "municipal")
    return (
      <PermissionState
        title="Identity maintenance requires municipal access"
        description="Authorized municipal staff can create and update identity records."
      />
    );
  if (editing && !record)
    return (
      <EmptyState
        icon={Plus}
        headingLevel="h1"
        title="Identity record unavailable"
        description="The requested record could not be found."
        action={
          <Button asChild variant="outline">
            <Link href={destination}>Return to records</Link>
          </Button>
        }
      />
    );
  function submit(event: FormEvent) {
    event.preventDefault();
    let saved: { id: string } | undefined;
    if (kind === "account") {
      const input = {
        name,
        phone,
        email,
        barangay,
        personId,
        verification: verification as "Verified" | "Pending",
        status: accountStatus,
        createdAt,
        lastAccess: account?.lastAccess ?? "Not yet signed in",
      };
      saved = account ? repository.updateAccount(account.id, input) : repository.createAccount(input);
    }
    if (kind === "link") {
      const input = {
        accountId,
        accountName,
        personId,
        residentName: name,
        barangay,
        matchScore: Number(matchScore),
        requestedAt,
        reviewedBy: reviewer,
        status: linkStatus,
        reason,
      };
      saved = link ? repository.updateLink(link.id, input) : repository.createLink(input);
    }
    if (kind === "application") {
      const input = {
        accountId,
        personId,
        applicantName: name,
        barangay,
        kind: applicationKind as "New ID" | "Replacement" | "Renewal",
        status: applicationStatus,
        submittedAt,
        reviewer,
        templateId,
        reason,
        evidence: split(evidence),
      };
      saved = application ? repository.updateApplication(application.id, input) : repository.createApplication(input);
    }
    if (kind === "credential") {
      const generatedToken =
        token ||
        `MATNOG-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const input = {
        applicationId,
        personId,
        holderName: name,
        barangay,
        type: credentialType,
        status: credentialStatus,
        issuedAt,
        validUntil,
        token: generatedToken,
        templateId,
        invalidReason: reason,
      };
      saved = credential ? repository.updateCredential(credential.id, input) : repository.createCredential(input);
    }
    if (kind === "template") {
      const input = {
        name,
        description,
        status: templateStatus,
        orientation: orientation as "Landscape" | "Portrait",
        primaryColor,
        secondaryColor,
        updatedAt: "2026-09-20",
        updatedBy,
        elements: template?.elements ?? [],
      };
      saved = template ? repository.updateTemplate(template.id, input) : repository.createTemplate(input);
    }
    if (!saved) {
      setError("Complete the required fields with valid record information before saving.");
      return;
    }
    router.push(`${destination}/${saved.id}`);
  }
  return (
    <>
      <div className="ops-topline analytics-form-topline">
        <div>
          <Link className="ops-back-link" href={record ? `${destination}/${record.id}` : destination}>
            <ArrowLeft size={15} /> {labels[kind][0].toUpperCase() + labels[kind].slice(1)}s
          </Link>
          <h1>{editing ? `Edit ${labels[kind]}` : `New ${labels[kind]}`}</h1>
          <p>
            {kind === "account"
              ? "Record the resident account, verified contact, registry reference, and access status."
              : kind === "link"
                ? "Associate a resident account with one permanent municipal registry record."
                : kind === "application"
                  ? "Record the applicant, application type, evidence, template, reviewer, and current decision."
                  : kind === "credential"
                    ? "Issue a municipal credential with a controlled validity period and verification token."
                    : "Define the template identity, colors, orientation, ownership, and publication status."}
          </p>
        </div>
      </div>
      <ContentPanel as="section" className="analytics-form-panel">
        <form className="analytics-form-grid grid md:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          <FormField
            id="identity-name"
            label={
              kind === "account"
                ? "Account holder"
                : kind === "link"
                  ? "Resident name"
                  : kind === "application"
                    ? "Applicant name"
                    : kind === "credential"
                      ? "Credential holder"
                      : "Template name"
            }
            required
          >
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
          </FormField>
          {kind === "account" && (
            <>
              <FormField id="identity-phone" label="Mobile number" required>
                {(p) => <Input {...p} value={phone} onChange={(e) => setPhone(e.target.value)} />}
              </FormField>
              <FormField id="identity-email" label="Email address">
                {(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
              </FormField>
              <FormField id="identity-person" label="Person ID" required>
                {(p) => <Input {...p} value={personId} onChange={(e) => setPersonId(e.target.value)} />}
              </FormField>
              <FormField id="identity-barangay" label="Barangay" required>
                {(p) => <Input {...p} value={barangay} onChange={(e) => setBarangay(e.target.value)} />}
              </FormField>
              <FormField id="identity-created" label="Created date" required>
                {(p) => <Input {...p} type="date" value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} />}
              </FormField>
              <FormField id="identity-verification" label="Verification" required>
                {(p) => (
                  <NativeSelect
                    {...p}
                    value={verification}
                    onChange={(e) => setVerification(e.target.value as "Verified" | "Pending")}
                  >
                    <option>Verified</option>
                    <option>Pending</option>
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="identity-account-status" label="Account status" required>
                {(p) => (
                  <NativeSelect
                    {...p}
                    value={accountStatus}
                    onChange={(e) => setAccountStatus(e.target.value as AccountStatus)}
                  >
                    <option>Active</option>
                    <option>Suspended</option>
                    <option>Deactivated</option>
                  </NativeSelect>
                )}
              </FormField>
            </>
          )}
          {kind === "link" && (
            <>
              <FormField id="identity-account-id" label="Account ID" required>
                {(p) => <Input {...p} value={accountId} onChange={(e) => setAccountId(e.target.value)} />}
              </FormField>
              <FormField id="identity-account-name" label="Account name" required>
                {(p) => <Input {...p} value={accountName} onChange={(e) => setAccountName(e.target.value)} />}
              </FormField>
              <FormField id="identity-person" label="Person ID" required>
                {(p) => <Input {...p} value={personId} onChange={(e) => setPersonId(e.target.value)} />}
              </FormField>
              <FormField id="identity-barangay" label="Barangay" required>
                {(p) => <Input {...p} value={barangay} onChange={(e) => setBarangay(e.target.value)} />}
              </FormField>
              <FormField id="identity-match" label="Match confidence (%)" required>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min="0"
                    max="100"
                    value={matchScore}
                    onChange={(e) => setMatchScore(e.target.value)}
                  />
                )}
              </FormField>
              <FormField id="identity-requested" label="Requested date" required>
                {(p) => (
                  <Input {...p} type="date" value={requestedAt} onChange={(e) => setRequestedAt(e.target.value)} />
                )}
              </FormField>
              <FormField id="identity-reviewer" label="Reviewer" required>
                {(p) => <Input {...p} value={reviewer} onChange={(e) => setReviewer(e.target.value)} />}
              </FormField>
              <FormField id="identity-link-status" label="Status" required>
                {(p) => (
                  <NativeSelect {...p} value={linkStatus} onChange={(e) => setLinkStatus(e.target.value as LinkStatus)}>
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Correction</option>
                    <option>Rejected</option>
                  </NativeSelect>
                )}
              </FormField>
            </>
          )}
          {kind === "application" && (
            <>
              <FormField id="identity-account-id" label="Account ID" required>
                {(p) => <Input {...p} value={accountId} onChange={(e) => setAccountId(e.target.value)} />}
              </FormField>
              <FormField id="identity-person" label="Person ID" required>
                {(p) => <Input {...p} value={personId} onChange={(e) => setPersonId(e.target.value)} />}
              </FormField>
              <FormField id="identity-barangay" label="Barangay" required>
                {(p) => <Input {...p} value={barangay} onChange={(e) => setBarangay(e.target.value)} />}
              </FormField>
              <FormField id="identity-application-kind" label="Application type" required>
                {(p) => (
                  <NativeSelect
                    {...p}
                    value={applicationKind}
                    onChange={(e) => setApplicationKind(e.target.value as "New ID" | "Replacement" | "Renewal")}
                  >
                    <option>New ID</option>
                    <option>Renewal</option>
                    <option>Replacement</option>
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="identity-submitted" label="Submitted date" required>
                {(p) => (
                  <Input {...p} type="date" value={submittedAt} onChange={(e) => setSubmittedAt(e.target.value)} />
                )}
              </FormField>
              <FormField id="identity-reviewer" label="Reviewer" required>
                {(p) => <Input {...p} value={reviewer} onChange={(e) => setReviewer(e.target.value)} />}
              </FormField>
              <FormField id="identity-template" label="ID template" required>
                {(p) => <Input {...p} value={templateId} onChange={(e) => setTemplateId(e.target.value)} />}
              </FormField>
              <FormField id="identity-application-status" label="Status" required>
                {(p) => (
                  <NativeSelect
                    {...p}
                    value={applicationStatus}
                    onChange={(e) => setApplicationStatus(e.target.value as ApplicationStatus)}
                  >
                    <option>Submitted</option>
                    <option>Under review</option>
                    <option>Correction</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                    <option>Archived</option>
                  </NativeSelect>
                )}
              </FormField>
              <label className="form-field md:col-span-2 xl:col-span-3">
                <span className="form-label">Evidence requirements</span>
                <span className="form-hint">Separate entries with commas</span>
                <Textarea rows={2} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
              </label>
            </>
          )}
          {kind === "credential" && (
            <>
              <FormField id="identity-application" label="Application ID" required>
                {(p) => <Input {...p} value={applicationId} onChange={(e) => setApplicationId(e.target.value)} />}
              </FormField>
              <FormField id="identity-person" label="Person ID" required>
                {(p) => <Input {...p} value={personId} onChange={(e) => setPersonId(e.target.value)} />}
              </FormField>
              <FormField id="identity-barangay" label="Barangay" required>
                {(p) => <Input {...p} value={barangay} onChange={(e) => setBarangay(e.target.value)} />}
              </FormField>
              <FormField id="identity-credential-type" label="Credential type" required>
                {(p) => <Input {...p} value={credentialType} onChange={(e) => setCredentialType(e.target.value)} />}
              </FormField>
              <FormField id="identity-issued" label="Issue date" required>
                {(p) => <Input {...p} type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />}
              </FormField>
              <FormField id="identity-valid" label="Valid until" required>
                {(p) => <Input {...p} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />}
              </FormField>
              <FormField id="identity-token" label="Verification token" hint="Generated automatically when left blank">
                {(p) => <Input {...p} value={token} onChange={(e) => setToken(e.target.value)} />}
              </FormField>
              <FormField id="identity-template" label="ID template" required>
                {(p) => <Input {...p} value={templateId} onChange={(e) => setTemplateId(e.target.value)} />}
              </FormField>
              <FormField id="identity-credential-status" label="Status" required>
                {(p) => (
                  <NativeSelect
                    {...p}
                    value={credentialStatus}
                    onChange={(e) => setCredentialStatus(e.target.value as CredentialStatus)}
                  >
                    <option>Active</option>
                    <option>Expired</option>
                    <option>Revoked</option>
                    <option>Replaced</option>
                  </NativeSelect>
                )}
              </FormField>
            </>
          )}
          {kind === "template" && (
            <>
              <FormField id="identity-orientation" label="Orientation" required>
                {(p) => (
                  <NativeSelect
                    {...p}
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as "Landscape" | "Portrait")}
                  >
                    <option>Landscape</option>
                    <option>Portrait</option>
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="identity-template-status" label="Status" required>
                {(p) => (
                  <NativeSelect
                    {...p}
                    value={templateStatus}
                    onChange={(e) => setTemplateStatus(e.target.value as TemplateStatus)}
                  >
                    <option>Draft</option>
                    <option>Active</option>
                    {editing && <option>Archived</option>}
                  </NativeSelect>
                )}
              </FormField>
              <FormField id="identity-primary" label="Primary color" required>
                {(p) => (
                  <Input {...p} type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                )}
              </FormField>
              <FormField id="identity-secondary" label="Secondary color" required>
                {(p) => (
                  <Input
                    {...p}
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                  />
                )}
              </FormField>
              <FormField id="identity-editor" label="Template owner" required>
                {(p) => <Input {...p} value={updatedBy} onChange={(e) => setUpdatedBy(e.target.value)} />}
              </FormField>
              <label className="form-field md:col-span-2 xl:col-span-3">
                <span className="form-label">Description</span>
                <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
            </>
          )}
          {kind !== "account" && kind !== "template" && (
            <label className="form-field md:col-span-2 xl:col-span-3">
              <span className="form-label">Decision or record note</span>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          )}
          {error && (
            <p
              className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm md:col-span-2 xl:col-span-3"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-4 md:col-span-2 xl:col-span-3">
            <Button asChild type="button" variant="outline">
              <Link href={record ? `${destination}/${record.id}` : destination}>Cancel</Link>
            </Button>
            <Button type="submit">
              {editing ? <Save /> : <Plus />}
              {editing ? "Save changes" : `Create ${labels[kind]}`}
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}

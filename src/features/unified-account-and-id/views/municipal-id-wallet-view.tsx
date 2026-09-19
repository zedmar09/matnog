"use client";
import { useState } from "react";

import Link from "next/link";

import { ArrowRight, BadgeCheck, FileClock, IdCard, Printer, RefreshCcw, ShieldX } from "lucide-react";

import { CredentialCard } from "@/features/unified-account-and-id/components/credential-card";
import { buildSignInPath } from "@/features/unified-account-and-id/services/account-navigation";
import { resolveAccountState } from "@/features/unified-account-and-id/types/account-context";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Timeline } from "@/shared/components/timeline";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { useDemoSession } from "@/shared/providers/demo-session-provider";

import { useDemoIdentity } from "../providers/demo-identity-provider";

export function MunicipalIdWalletView() {
  const { session, ready } = useDemoSession();
  const { state, resubmitApplication, requestReplacement } = useDemoIdentity();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [replacementReason, setReplacementReason] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  if (!ready) {
    return (
      <div className="site-container page-loading" role="status">
        Opening the sample ID wallet…
      </div>
    );
  }
  if (!session) {
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={IdCard}
          headingLevel="h1"
          title="Sign in to open the ID demo."
          description="The municipal ID sample stays separate from public credential verification."
          action={
            <Button asChild>
              <Link href={buildSignInPath("/account/id")}>
                Sign in with the demo account
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const linked = resolveAccountState(session) === "verified-resident";
  if (!linked) {
    return (
      <div className="site-container page-content">
        <PageHeader
          title="Resident-link approval is required."
          description="Phone verification and a submitted enrollment do not establish municipal residency."
          parent="My account"
          parentHref="/account/profile"
        />
        <NoticePanel icon={<FileClock size={18} />}>
          Request {state.residentLink.id} is {state.residentLink.status}. A municipal reviewer must approve the resident
          association before this account can open an ID wallet.
        </NoticePanel>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/account/profile">
              Return to account profile
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const active = state.credentials.find((credential) => credential.status === "active");
  const replacementPending = state.application.kind === "replacement" && state.application.status === "submitted";
  const applicationTone =
    state.application.status === "approved"
      ? "success"
      : state.application.status === "rejected"
        ? "destructive"
        : "pending";

  function submitReplacement() {
    const result = requestReplacement(replacementReason);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(undefined);
    setMessage(result.message);
    setReplacementReason("");
  }

  return (
    <div className="site-container page-content">
      <div className="account-header">
        <PageHeader
          title="Your sample ID wallet"
          description="Enrollment, credential validity, replacement, and history for the resident account."
          parent="My account"
          parentHref="/account/profile"
        />
        <Button asChild variant="outline">
          <Link href="/account/profile">Back to profile</Link>
        </Button>
      </div>
      <NoticePanel
        icon={<BadgeCheck size={18} />}
        className="mb-6"
        action={
          <Button asChild variant="outline">
            <Link href="/ops/identity/applications">Open UI demo review queue</Link>
          </Button>
        }
      >
        Resident association approved for {session.residentAssociation?.personId}. This is a UI demonstration and not an
        official municipal credential.
      </NoticePanel>
      {message && (
        <div className="registry-save-notice" role="status">
          {message}
        </div>
      )}

      <div className="identity-wallet-grid">
        <ContentPanel as="section">
          <div className="registry-badge-stack">
            <SectionHeading eyebrow="Current application" title={state.application.id} />
            <StatusBadge tone={applicationTone}>{state.application.status}</StatusBadge>
          </div>
          <dl className="registry-facts">
            <div>
              <dt>Application type</dt>
              <dd>{state.application.kind === "new" ? "New municipal ID" : "Replacement municipal ID"}</dd>
            </div>
            <div>
              <dt>Person record</dt>
              <dd>{state.application.personId}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>15 September 2026</dd>
            </div>
            <div>
              <dt>Photo</dt>
              <dd>Sample enrollment photo attached</dd>
            </div>
          </dl>
          {state.application.status === "correction" && (
            <NoticePanel className="mt-5" icon={<RefreshCcw size={18} />}>
              Correction requested: {state.application.correctionReason}
            </NoticePanel>
          )}
          {state.application.status === "rejected" && (
            <NoticePanel className="mt-5" icon={<ShieldX size={18} />}>
              Enrollment rejected: {state.application.decisionReason}
            </NoticePanel>
          )}
          <Timeline
            steps={[
              { title: "Resident link approved", detail: state.residentLink.id, complete: true },
              {
                title: "Enrollment reviewed",
                detail:
                  state.application.status === "correction"
                    ? "A correction is required before another review."
                    : state.application.status === "submitted"
                      ? "Waiting for an ID officer decision."
                      : `Decision: ${state.application.status}.`,
                complete: ["approved", "rejected"].includes(state.application.status),
              },
              {
                title: "Credential available",
                detail: active ? active.id : "No active credential yet.",
                complete: Boolean(active),
              },
            ]}
          />
          {state.application.status === "correction" && (
            <Button
              className="mt-5"
              onClick={() => {
                const result = resubmitApplication();
                setMessage(result.message);
              }}
            >
              <RefreshCcw />
              Apply sample correction and resubmit
            </Button>
          )}
        </ContentPanel>

        <ContentPanel as="section">
          <SectionHeading
            eyebrow="Current credential"
            title={active ? active.id : "No active credential"}
            description={
              active ? "Private wallet view with a safe public verification link." : "Approval creates the sample card."
            }
          />
          {active ? (
            <>
              <CredentialCard credential={active} />
              <div className="registry-actions mt-5">
                <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                  <Printer />
                  Preview sample card
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/verify/id/${active.token}`}>
                    Verify public status
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              icon={IdCard}
              title="No credential has been issued."
              description="The submitted enrollment remains in the local review queue."
            />
          )}
        </ContentPanel>
      </div>

      {active && (
        <ContentPanel as="section" className="mt-6">
          <SectionHeading
            eyebrow="Replacement"
            title={replacementPending ? "Replacement review pending" : "Request a replacement"}
            description="The current card stays active until a replacement is approved."
          />
          {replacementPending ? (
            <NoticePanel icon={<FileClock size={18} />}>
              {state.application.id} is waiting for review. {active.id} remains active.
            </NoticePanel>
          ) : (
            <div className="identity-action-form">
              <FormField id="replacement-reason" label="Replacement reason" error={error}>
                {(props) => (
                  <Textarea
                    {...props}
                    value={replacementReason}
                    onChange={(event) => setReplacementReason(event.target.value)}
                    placeholder="For example: The sample card was damaged."
                  />
                )}
              </FormField>
              <Button onClick={submitReplacement}>Submit replacement review</Button>
            </div>
          )}
        </ContentPanel>
      )}

      <ContentPanel as="section" className="mt-6">
        <SectionHeading eyebrow="Credential history" title="Issued and invalidated versions" />
        {state.credentials.length === 0 ? (
          <p className="muted">No credential history yet.</p>
        ) : (
          <ul className="credential-history">
            {[...state.credentials].reverse().map((credential) => (
              <li key={credential.id}>
                <div>
                  <strong>{credential.id}</strong>
                  <small>
                    Issued {credential.issuedAt} · Token {credential.token}
                  </small>
                </div>
                <StatusBadge tone={credential.status === "active" ? "success" : "warning"}>
                  {credential.status}
                </StatusBadge>
                {credential.invalidReason && <p>{credential.invalidReason}</p>}
              </li>
            ))}
          </ul>
        )}
      </ContentPanel>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sample municipal ID preview</DialogTitle>
            <DialogDescription>
              This preview is visibly invalid for official use and performs no download.
            </DialogDescription>
          </DialogHeader>
          {active && <CredentialCard credential={active} />}
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>
            Close preview
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

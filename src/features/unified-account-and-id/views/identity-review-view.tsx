"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowRight, BadgeCheck, FileImage, RotateCcw, ShieldX } from "lucide-react";

import { REGISTRY_ACTORS } from "@/features/resident-household-registry/services/registry-projections";
import {
  type PersonRecordOption,
  readPersonRecordOption,
} from "@/features/resident-household-registry/services/registry-selectors";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { FormField } from "@/shared/components/form-field";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useDemoSession } from "@/shared/providers/demo-session-provider";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { useDemoIdentity } from "../providers/demo-identity-provider";

export function IdentityReviewView() {
  const { role } = useWorkspaceSession();
  const { approveResidentAssociation } = useDemoSession();
  const { state, reviewLink, reviewApplication, revokeCredential, resetIdentityDemo } = useDemoIdentity();
  const [candidate, setCandidate] = useState<RepositoryResult<PersonRecordOption> | null>(null);
  const [tab, setTab] = useState("link");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [approveOpen, setApproveOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void readPersonRecordOption(REGISTRY_ACTORS["data-steward"], "DEMO-PER-001").then((result) => {
      if (active) setCandidate(result);
    });
    return () => {
      active = false;
    };
  }, []);

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Identity review requires the municipal demo role"
        description="Change the workspace persona to Municipal staff. Client-side role selection remains a UI demonstration."
      />
    );
  }

  const activeCredential = state.credentials.find((credential) => credential.status === "active");
  function applyOutcome(outcome: { ok: boolean; message: string }) {
    if (outcome.ok) {
      setError(undefined);
      setMessage(outcome.message);
      setReason("");
    } else {
      setMessage(undefined);
      setError(outcome.message);
    }
  }

  return (
    <div className="identity-review-page">
      <div className="ops-topline">
        <PageHeader
          title="Identity applications"
          description="Review the resident association, enrollment evidence and credential lifecycle using records."
          parent="Staff workspace"
          parentHref="/ops"
        />
        <div className="account-header-actions">
          <Button asChild variant="outline">
            <Link href="/account/id">
              Open citizen wallet
              <ArrowRight />
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetIdentityDemo();
              setMessage("Identity demo reset to its submitted enrollment seed.");
              setError(undefined);
              setReason("");
              setTab("link");
            }}
          >
            <RotateCcw />
            Reset identity demo
          </Button>
        </div>
      </div>
      <NoticePanel className="mb-6">
        These decisions update one in-memory fixture store. Refreshing the browser restores the seed; no resident,
        credential or audit record is written to a backend.
      </NoticePanel>
      {message && (
        <div className="registry-save-notice" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="form-message" role="alert">
          {error}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="registry-tabs identity-review-tabs">
        <TabsList>
          <TabsTrigger value="link">Resident link</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="credentials">Credentials ({state.credentials.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="link">
          <ContentPanel>
            <div className="identity-review-heading">
              <SectionHeading eyebrow="Account association" title={state.residentLink.id} />
              <StatusBadge tone={state.residentLink.status === "approved" ? "success" : "pending"}>
                {state.residentLink.status}
              </StatusBadge>
            </div>
            <div className="identity-comparison">
              <div>
                <span>Account claim</span>
                <h3>Mara Dela Cruz</h3>
                <dl className="registry-facts">
                  <div>
                    <dt>Account</dt>
                    <dd>{state.residentLink.accountId}</dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>Phone verified only</dd>
                  </div>
                </dl>
              </div>
              <div>
                <span>Minimal M01 projection</span>
                <h3>{candidate?.kind === "success" ? candidate.data.displayName : "Loading resident option…"}</h3>
                {candidate?.kind === "success" && (
                  <dl className="registry-facts">
                    <div>
                      <dt>Person ID</dt>
                      <dd>{candidate.data.personId}</dd>
                    </div>
                    <div>
                      <dt>Residency</dt>
                      <dd>{candidate.data.currentBarangay?.label}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>
            {state.residentLink.status === "pending" ? (
              <>
                <FormField id="link-reason" label="Reason for rejection" hint="Required only when rejecting.">
                  {(props) => (
                    <Textarea {...props} value={reason} onChange={(event) => setReason(event.target.value)} />
                  )}
                </FormField>
                <div className="registry-actions">
                  <Button
                    onClick={() => {
                      const result = reviewLink("approve");
                      if (result.ok) approveResidentAssociation("DEMO-PER-001");
                      applyOutcome(result);
                    }}
                  >
                    <BadgeCheck />
                    Approve resident association
                  </Button>
                  <Button variant="outline" onClick={() => applyOutcome(reviewLink("reject", reason))}>
                    <ShieldX />
                    Reject with reason
                  </Button>
                </div>
              </>
            ) : (
              <p className="small-note">Decision: {state.residentLink.decisionReason}</p>
            )}
          </ContentPanel>
        </TabsContent>

        <TabsContent value="enrollment">
          <ContentPanel>
            <div className="identity-review-heading">
              <SectionHeading eyebrow="Enrollment review" title={state.application.id} />
              <StatusBadge
                tone={
                  state.application.status === "approved"
                    ? "success"
                    : state.application.status === "rejected"
                      ? "destructive"
                      : "pending"
                }
              >
                {state.application.status}
              </StatusBadge>
            </div>
            {state.residentLink.status !== "approved" && (
              <NoticePanel className="mb-6">
                Enrollment decision is blocked until {state.residentLink.id} is approved.
              </NoticePanel>
            )}
            <div className="identity-enrollment-grid">
              <div>
                <div className="sample-id-photo" role="img" aria-label="Sample enrollment photo placeholder">
                  MD
                  <small>Sample photo</small>
                </div>
                <dl className="registry-facts">
                  <div>
                    <dt>Applicant</dt>
                    <dd>{state.application.displayName}</dd>
                  </div>
                  <div>
                    <dt>Person ID</dt>
                    <dd>{state.application.personId}</dd>
                  </div>
                  <div>
                    <dt>Application type</dt>
                    <dd>{state.application.kind}</dd>
                  </div>
                  <div>
                    <dt>Predecessor</dt>
                    <dd>{state.application.predecessorCredentialId ?? "None"}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3>Evidence metadata</h3>
                <ul className="registry-evidence">
                  {state.application.evidence.map((evidence) => (
                    <li key={evidence.id}>
                      <FileImage size={18} />
                      <div>
                        <strong>{evidence.label}</strong>
                        <small>{evidence.filename}</small>
                      </div>
                      <StatusBadge tone={evidence.state === "accepted" ? "success" : "pending"}>
                        {evidence.state}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {state.application.status === "submitted" && (
              <>
                <FormField
                  id="identity-decision-reason"
                  label="Decision reason"
                  hint="Required for correction, rejection, or credential revocation."
                >
                  {(props) => (
                    <Textarea {...props} value={reason} onChange={(event) => setReason(event.target.value)} />
                  )}
                </FormField>
                <div className="registry-actions">
                  <Button disabled={state.residentLink.status !== "approved"} onClick={() => setApproveOpen(true)}>
                    <BadgeCheck />
                    {state.application.kind === "replacement" ? "Approve replacement" : "Approve enrollment"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={state.residentLink.status !== "approved"}
                    onClick={() => applyOutcome(reviewApplication("correction", reason))}
                  >
                    Return for correction
                  </Button>
                  <Button
                    variant="outline"
                    disabled={state.residentLink.status !== "approved"}
                    onClick={() => applyOutcome(reviewApplication("reject", reason))}
                  >
                    Reject enrollment
                  </Button>
                </div>
              </>
            )}
            <ul className="registry-history identity-history">
              {state.application.history.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.title}</strong>
                  <p>{entry.detail}</p>
                  <small>{entry.at}</small>
                </li>
              ))}
            </ul>
          </ContentPanel>
        </TabsContent>

        <TabsContent value="credentials">
          <ContentPanel>
            <SectionHeading eyebrow="Credential lifecycle" title="Issued versions" />
            {state.credentials.length === 0 ? (
              <p className="muted">Approve an enrollment to create the first credential.</p>
            ) : (
              <ul className="credential-history">
                {[...state.credentials].reverse().map((credential) => (
                  <li key={credential.id}>
                    <div>
                      <strong>{credential.id}</strong>
                      <small>
                        {credential.personId} · {credential.token}
                      </small>
                    </div>
                    <StatusBadge tone={credential.status === "active" ? "success" : "warning"}>
                      {credential.status}
                    </StatusBadge>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/verify/id/${credential.token}`}>
                        Public result
                        <ArrowRight />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {activeCredential && (
              <div className="identity-revoke-panel">
                <FormField id="revocation-reason" label={`Revoke ${activeCredential.id}`} error={error}>
                  {(props) => (
                    <Textarea {...props} value={reason} onChange={(event) => setReason(event.target.value)} />
                  )}
                </FormField>
                <Button variant="outline" onClick={() => applyOutcome(revokeCredential(reason))}>
                  <ShieldX />
                  Revoke active credential
                </Button>
              </div>
            )}
            <Button asChild variant="outline" className="mt-6">
              <Link href="/account/id">
                Open citizen ID wallet
                <ArrowRight />
              </Link>
            </Button>
          </ContentPanel>
        </TabsContent>
      </Tabs>

      <ConfirmationDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={state.application.kind === "replacement" ? "Approve this replacement?" : "Approve this enrollment?"}
        description={
          state.application.kind === "replacement"
            ? `A new credential will be created for ${state.application.personId}; ${state.application.predecessorCredentialId} will become invalid.`
            : `A sample municipal credential will be created for ${state.application.personId}.`
        }
        confirmLabel={state.application.kind === "replacement" ? "Issue replacement" : "Issue sample credential"}
        onConfirm={() => {
          applyOutcome(reviewApplication("approve"));
          setApproveOpen(false);
          setTab("credentials");
        }}
      />
    </div>
  );
}

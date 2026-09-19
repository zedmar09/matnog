"use client";
import { useState } from "react";

import { AlertTriangle, ArrowRight, BriefcaseBusiness, Clock3, ShieldCheck, UserRound } from "lucide-react";

import { DEMO_REPRESENTATIONS } from "@/features/unified-account-and-id/data/representations";
import { useDemoRequester } from "@/features/unified-account-and-id/providers/demo-requester-provider";
import { getRepresentationAvailability } from "@/features/unified-account-and-id/services/representation";
import type { RequesterContext } from "@/features/unified-account-and-id/types/representation";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { type ActingContext, ContextSwitcher } from "@/shared/components/context-switcher";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";

function contextDetail(context: RequesterContext): string {
  return context.validUntil
    ? `${context.authorityLabel} · valid through ${context.validUntil}`
    : context.authorityLabel;
}

export function RepresentationPanel() {
  const { active, available, selectRequester, expireActiveAuthority: expireRequesterAuthority } = useDemoRequester();
  const [pendingId, setPendingId] = useState<string>();
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const pending = pendingId ? available.find((context) => context.id === pendingId) : undefined;
  const switcherContexts: ActingContext[] = available.map((context) => ({
    id: context.id,
    kind: context.kind,
    label: context.subjectLabel,
    detail: contextDetail(context),
  }));

  function requestContext(id: string) {
    if (id === active.id) return;
    if (id === "self") {
      selectRequester("self");
      setNotice("Requester context returned to Mara Dela Cruz’s own account.");
      return;
    }
    setPendingId(id);
  }

  function expireActiveAuthority() {
    const expired = expireRequesterAuthority();
    if (!expired) return;
    setNotice(
      `${expired.subjectLabel} authority expired in this preview. The requester returned to Mara Dela Cruz. Select another valid context before continuing.`,
    );
  }

  return (
    <ContentPanel as="section" className="account-context-panel">
      <SectionHeading
        eyebrow="Requester context"
        title="Choose who this visit is for"
        description="Every person, household and business authority has its own scope and validity."
      />
      {notice && (
        <div className="registry-save-notice" role="status">
          {notice}
        </div>
      )}
      <ContextSwitcher contexts={switcherContexts} value={active.id} onChange={requestContext} label="Acting for" />
      <div className="active-context-card" data-context-kind={active.kind}>
        <div className="active-context-icon">{active.kind === "business" ? <BriefcaseBusiness /> : <UserRound />}</div>
        <div className="active-context-copy">
          <span>Current requester</span>
          <h3>{active.subjectLabel}</h3>
          <p>{active.authorityLabel}</p>
          <ul aria-label={`Allowed scope for ${active.subjectLabel}`}>
            {active.scopes.map((scope) => (
              <li key={scope}>
                <ShieldCheck size={14} />
                {scope}
              </li>
            ))}
          </ul>
        </div>
        <div className="active-context-actions">
          {active.validUntil && <small>Valid through {active.validUntil}</small>}
          <Button variant="outline" onClick={() => setHandoffOpen(true)}>
            Preview service handoff
            <ArrowRight />
          </Button>
          {active.id !== "self" && (
            <Button variant="ghost" onClick={expireActiveAuthority}>
              <Clock3 />
              Preview authority expiry
            </Button>
          )}
        </div>
      </div>

      <ul className="representation-list" aria-label="Authorizations">
        {DEMO_REPRESENTATIONS.map((representation) => {
          const status = available.some((context) => context.id === representation.id)
            ? "active"
            : getRepresentationAvailability(representation) === "active"
              ? "expired"
              : getRepresentationAvailability(representation);
          const isActive = active.id === representation.id;
          return (
            <li key={representation.id} className="representation-card" data-expired={status !== "active"}>
              <div className="representation-card-heading">
                <div>
                  <span>{representation.subjectKind}</span>
                  <h3>{representation.subjectLabel}</h3>
                </div>
                <StatusBadge tone={status === "active" ? "success" : "warning"}>
                  {isActive ? "In use" : status === "active" ? "Available" : "Expired"}
                </StatusBadge>
              </div>
              <p>{representation.authorityLabel}</p>
              <small>
                {representation.validFrom} to {representation.validUntil} · {representation.id}
              </small>
              <ul>
                {representation.scopes.map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
              {status === "active" ? (
                <Button variant="outline" disabled={isActive} onClick={() => requestContext(representation.id)}>
                  {isActive ? "Current context" : `Use ${representation.subjectLabel} context`}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    setNotice(
                      `An updated-authority review was recorded for ${representation.subjectLabel}. Access remains unavailable in this UI demo.`,
                    )
                  }
                >
                  <AlertTriangle />
                  Request updated authority
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <p className="small-note account-context-note">
        Being in the same household never grants automatic access. These authorities do not change the signed-in account
        and do not create production permissions.
      </p>

      <ConfirmationDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPendingId(undefined);
        }}
        title={pending ? `Act for ${pending.subjectLabel}?` : "Change requester context?"}
        description={
          pending
            ? `Only the listed ${pending.authorityLabel.toLowerCase()} scope will apply. Confirm the named subject before continuing.`
            : "Confirm the named subject before continuing."
        }
        confirmLabel="Use this context"
        onConfirm={() => {
          if (!pending) return;
          selectRequester(pending.id);
          setNotice(`Requester context changed to ${pending.subjectLabel}.`);
          setPendingId(undefined);
        }}
      />

      <ConfirmationDialog
        open={handoffOpen}
        onOpenChange={setHandoffOpen}
        title={`Continue as ${active.subjectLabel}?`}
        description={`The selected requester will be ${active.subjectLabel} (${active.subjectId}). This preview records the context check but submits no service request.`}
        confirmLabel="Confirm requester"
        onConfirm={() => {
          setNotice(`Context confirmed for ${active.subjectLabel}. No service request was submitted.`);
          setHandoffOpen(false);
        }}
      />
    </ContentPanel>
  );
}

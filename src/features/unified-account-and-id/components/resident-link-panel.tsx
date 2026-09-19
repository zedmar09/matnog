"use client";
import { useState } from "react";

import { AlertTriangle, BadgeCheck, SearchX, UsersRound } from "lucide-react";

import type { PersonRecordOption } from "@/features/resident-household-registry/services/registry-selectors";
import type { AccountState, ResidentAssociation } from "@/features/unified-account-and-id/types/account-context";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { PanelDivider } from "@/shared/components/content-panel";
import { NoticePanel } from "@/shared/components/notice-panel";
import { StatusBadge } from "@/shared/components/status-badge";
import { Timeline } from "@/shared/components/timeline";
import { Button } from "@/shared/components/ui/button";
import type { RepositoryResult } from "@/shared/data/repository-result";

import {
  getResidentMatchScenario,
  RESIDENT_MATCH_SCENARIOS,
  type ResidentMatchScenarioId,
} from "../services/resident-match-scenarios";

export function ResidentLinkPanel({
  accountState,
  association,
  candidate,
  onRequest,
}: {
  accountState: AccountState;
  association?: ResidentAssociation;
  candidate: RepositoryResult<PersonRecordOption> | null;
  onRequest: (personId: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scenarioId, setScenarioId] = useState<ResidentMatchScenarioId>("suggested");
  const [assistedReceipt, setAssistedReceipt] = useState(false);

  if (!candidate) {
    return (
      <>
        <PanelDivider />
        <p className="small-note" role="status">
          Checking the registry candidate…
        </p>
      </>
    );
  }
  if (candidate.kind !== "success") {
    return (
      <>
        <PanelDivider />
        <h3>Resident record link</h3>
        <p className="small-note">The sample candidate is unavailable. No resident access was granted.</p>
      </>
    );
  }

  const scenario = getResidentMatchScenario(scenarioId);

  return (
    <>
      <PanelDivider />
      <div className="registry-badge-stack">
        <h3>Resident record link</h3>
        <StatusBadge tone={accountState === "verified-resident" ? "success" : "pending"}>
          {accountState === "visitor"
            ? "Not requested"
            : accountState === "resident-link-pending"
              ? "Under review"
              : "Linked"}
        </StatusBadge>
      </div>
      <p className="small-note">
        This minimal M01 projection helps request a review. It does not expose contact, birth, evidence or sectoral
        details.
      </p>
      {accountState === "visitor" && (
        <label className="account-link-scenario">
          Resident matching preview
          <select
            aria-label="Resident matching preview"
            value={scenarioId}
            onChange={(event) => {
              setScenarioId(event.target.value as ResidentMatchScenarioId);
              setConfirmed(false);
              setAssistedReceipt(false);
            }}
          >
            {RESIDENT_MATCH_SCENARIOS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <small>{scenario.summary}</small>
        </label>
      )}

      {accountState === "visitor" && scenarioId === "no-match" ? (
        <div className="account-link-exception" role="status">
          <SearchX />
          <div>
            <h4>No resident match found</h4>
            <p>
              The visitor account stays unlinked. A registration desk may review the person without creating a duplicate
              automatically.
            </p>
            {assistedReceipt ? (
              <p className="registry-save-notice">
                Assisted inquiry DEMO-ASSIST-001 recorded locally. No resident record was created.
              </p>
            ) : (
              <Button variant="outline" onClick={() => setAssistedReceipt(true)}>
                Record assisted registration inquiry
              </Button>
            )}
          </div>
        </div>
      ) : accountState === "visitor" && scenarioId === "multiple" ? (
        <div className="account-link-exception" role="status">
          <UsersRound />
          <div>
            <h4>Two possible resident matches need review</h4>
            <ul>
              <li>Mara Reyes Dela Cruz · DEMO-PER-001 · Demo Barangay A</li>
              <li>Mara R. Dela Cruz · DEMO-PER-003 · Demo Barangay B</li>
            </ul>
            <Button disabled>
              <AlertTriangle />
              Resident link blocked pending duplicate review
            </Button>
          </div>
        </div>
      ) : (
        <>
          {accountState === "visitor" && scenarioId === "shared-contact" && (
            <NoticePanel className="mt-4" icon={<UsersRound size={18} />}>
              This demo phone is shared by more than one household contact. Confirming a person still requires the
              separate resident-link review below.
            </NoticePanel>
          )}
          <dl className="registry-facts account-link-facts">
            <div>
              <dt>Person</dt>
              <dd>{candidate.data.displayName}</dd>
            </div>
            <div>
              <dt>Person ID</dt>
              <dd>{candidate.data.personId}</dd>
            </div>
            <div>
              <dt>Current scope</dt>
              <dd>{candidate.data.currentBarangay?.label ?? "No current residency"}</dd>
            </div>
            <div>
              <dt>Household reference</dt>
              <dd>{candidate.data.currentHouseholdId ?? "No current household"}</dd>
            </div>
          </dl>

          {accountState === "visitor" ? (
            <>
              <label className="registry-toggle account-link-confirmation">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I
                confirm this is my own resident record.
              </label>
              <Button className="mt-3" disabled={!confirmed} onClick={() => setDialogOpen(true)}>
                <BadgeCheck />
                Request resident link review
              </Button>
              <ConfirmationDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                title="Request a review for this resident record?"
                description={`The reviewer will compare account DEMO-VIS-001 with ${candidate.data.personId}. Phone verification alone will not approve the link.`}
                confirmLabel="Send demo request"
                onConfirm={() => {
                  onRequest(candidate.data.personId);
                  setDialogOpen(false);
                }}
              />
            </>
          ) : (
            <>
              <dl className="registry-facts account-link-request">
                <div>
                  <dt>Request reference</dt>
                  <dd>{association?.requestId}</dd>
                </div>
                <div>
                  <dt>Relationship claimed</dt>
                  <dd>Self</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>15 September 2026 · 10:30 AM</dd>
                </div>
                <div>
                  <dt>Review owner</dt>
                  <dd>Municipal registry reviewer</dd>
                </div>
              </dl>
              <Timeline
                steps={[
                  { title: "Phone contact verified", detail: "Demo contact check completed.", complete: true },
                  {
                    title: "Resident association reviewed",
                    detail:
                      accountState === "verified-resident"
                        ? "The record link was approved."
                        : "Identity and residency comparison is still pending.",
                    complete: accountState === "verified-resident",
                  },
                  {
                    title: "Resident services available",
                    detail: "Access begins only after the reviewed link is approved.",
                    complete: accountState === "verified-resident",
                  },
                ]}
              />
            </>
          )}
        </>
      )}
    </>
  );
}

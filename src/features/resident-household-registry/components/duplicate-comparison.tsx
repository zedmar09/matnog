"use client";
import { useState } from "react";

import Link from "next/link";

import { GitMerge, Split, Undo2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import type { WorkspaceScenario } from "@/shared/providers/workspace-session-provider";

import { decideDuplicate, reverseDuplicateDecision } from "../services/registry-operations";
import type { RegistryActor } from "../services/registry-projections";
import { ageOn, fullName } from "../services/registry-rules";
import type { DuplicateCandidate, Person } from "../types/registry";

type PendingAction = "distinct" | "merged" | "reverse";

/**
 * Side-by-side comparison for a suggested duplicate. A score ranks the
 * suggestion; it never decides anything. Nothing merges without a recorded
 * reason, and any merge can be reversed with its history intact.
 */
export function DuplicateComparison({
  candidate,
  people,
  actor,
  scenario,
  now,
  onDone,
}: {
  candidate: DuplicateCandidate;
  people: Person[];
  actor: RegistryActor;
  scenario: WorkspaceScenario;
  now: string;
  onDone: () => void;
}) {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  const [left, right] = candidate.personIds.map((id) => people.find((person) => person.envelope.id === id));

  async function commit() {
    if (!pending || saving) return;
    setSaving(true);
    setErrors([]);
    const result =
      pending === "reverse"
        ? await reverseDuplicateDecision(actor, candidate.envelope.id, reason, candidate.envelope.version, scenario)
        : await decideDuplicate(actor, candidate.envelope.id, pending, reason, candidate.envelope.version, scenario);
    setSaving(false);
    if (result.kind === "invalid") {
      setErrors(result.errors);
      return;
    }
    if (result.kind === "conflict") {
      setErrors([{ id: "reason", message: `${result.message} Current version: ${result.currentVersion}.` }]);
      return;
    }
    if (result.kind !== "success") {
      setErrors([
        { id: "reason", message: result.kind === "denied" ? result.message : "The decision could not be recorded." },
      ]);
      return;
    }
    setPending(null);
    setReason("");
    onDone();
  }

  return (
    <ContentPanel>
      <SectionHeading
        eyebrow={`${candidate.envelope.id} · suggestion only`}
        title="Possible duplicate"
        description="A match score ranks this suggestion for review. It is not an identity decision, and nothing is merged automatically."
      />
      <div className="registry-badge-stack mt-3">
        <StatusBadge tone={candidate.decision ? "success" : "pending"}>{candidate.envelope.status}</StatusBadge>
        <StatusBadge tone="neutral">Match score {Math.round(candidate.score * 100)}%</StatusBadge>
      </div>

      <div className="registry-compare">
        {[left, right].map((person, index) => (
          <div key={person?.envelope.id ?? index}>
            <span className="eyebrow">{index === 0 ? "Existing record" : "Possible match"}</span>
            {person ? (
              <>
                <strong>{fullName(person)}</strong>
                <dl>
                  <div>
                    <dt>Person ID</dt>
                    <dd>{person.envelope.id}</dd>
                  </div>
                  <div>
                    <dt>Date of birth</dt>
                    <dd>
                      {person.birthDate} · {ageOn(person, now)} years
                    </dd>
                  </div>
                  <div>
                    <dt>Civil status</dt>
                    <dd>{person.civilStatus}</dd>
                  </div>
                  <div>
                    <dt>Aliases</dt>
                    <dd>{person.aliases.length > 0 ? person.aliases.join(", ") : "None"}</dd>
                  </div>
                  <div>
                    <dt>Current barangay</dt>
                    <dd>{person.residency.find((period) => !period.to)?.barangay.label ?? "None"}</dd>
                  </div>
                  <div>
                    <dt>Verification</dt>
                    <dd>{person.verification.state}</dd>
                  </div>
                </dl>
                <Link className="text-link" href={`/ops/residents/${person.envelope.id}`}>
                  Open full record
                </Link>
              </>
            ) : (
              <p className="muted">This record is outside your scope.</p>
            )}
          </div>
        ))}
      </div>

      <PanelDivider />
      <h3>Why this was suggested</h3>
      <ul className="check-list">
        {candidate.signals.map((signal) => (
          <li key={signal}>
            <Split size={16} />
            <span>{signal}</span>
          </li>
        ))}
      </ul>

      {candidate.decision && (
        <p className="registry-save-notice" role="status">
          Recorded as <strong>{candidate.decision.outcome}</strong> by {candidate.decision.actor} on{" "}
          {formatDemoDateTime(candidate.decision.at)}. Reason: {candidate.decision.reason}
        </p>
      )}
      {candidate.reversedFrom && (
        <p className="small-note">
          <Undo2 size={13} aria-hidden="true" /> A previous <strong>{candidate.reversedFrom.outcome}</strong> decision
          by {candidate.reversedFrom.actor} was reversed. Its reason is retained: {candidate.reversedFrom.reason}
        </p>
      )}

      <PanelDivider />
      <ErrorSummary errors={errors} />
      <FormField
        id="reason"
        label="Decision reason"
        hint="Recorded against your persona and kept in history. At least eight characters."
      >
        {(field) => (
          <Textarea
            {...field}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: different mother's maiden name and different birthplace"
          />
        )}
      </FormField>
      <div className="registry-actions">
        {candidate.decision ? (
          <Button variant="outline" onClick={() => setPending("reverse")} disabled={saving}>
            <Undo2 />
            Reverse this decision
          </Button>
        ) : (
          <>
            <Button onClick={() => setPending("distinct")} disabled={saving}>
              <Split />
              Record as separate people
            </Button>
            <Button variant="outline" onClick={() => setPending("merged")} disabled={saving}>
              <GitMerge />
              Record as the same person
            </Button>
          </>
        )}
      </div>

      <ConfirmationDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={
          pending === "merged"
            ? "Record these as the same person?"
            : pending === "distinct"
              ? "Record these as separate people?"
              : "Reverse the recorded decision?"
        }
        description={
          pending === "merged"
            ? "The candidate is marked as merged with your reason. Both person records remain inspectable and the decision can be reversed."
            : pending === "distinct"
              ? "The two records stay separate. The reason is kept so a later reviewer can see why."
              : "The candidate returns to review. The earlier decision and its reason remain readable in history."
        }
        confirmLabel={saving ? "Recording…" : "Record decision"}
        destructive={pending === "merged"}
        onConfirm={() => void commit()}
      />
    </ContentPanel>
  );
}

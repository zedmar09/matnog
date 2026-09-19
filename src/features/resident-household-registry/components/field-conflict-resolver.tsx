"use client";
import { useState } from "react";

import { ContentPanel } from "@/shared/components/content-panel";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import type { WorkspaceScenario } from "@/shared/providers/workspace-session-provider";

import type { RegistryActor } from "../services/registry-projections";
import { resolveSurveyConflict } from "../services/registry-repository";
import type { SurveyAssignment } from "../types/survey";

/**
 * Field-by-field comparison for a queued change that no longer matches the
 * stored record. The reviewer sees what they started from, what was captured in
 * the field, and what the record holds now, then chooses per field. Nothing is
 * applied wholesale.
 */
export function FieldConflictResolver({
  assignment,
  actor,
  scenario,
  onDone,
}: {
  assignment: SurveyAssignment;
  actor: RegistryActor;
  scenario: WorkspaceScenario;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function resolve(field: string, keep: "local" | "current") {
    setBusy(field);
    const result = await resolveSurveyConflict(actor, assignment.envelope.id, field, keep, scenario);
    setBusy(null);
    if (result.kind === "success") {
      setNotice(`Kept the ${keep === "local" ? "field-captured" : "current stored"} value.`);
      onDone();
    } else {
      setNotice("That change could not be applied.");
    }
  }

  return (
    <ContentPanel>
      <SectionHeading
        eyebrow={`${assignment.envelope.id} · ${assignment.envelope.scope.label}`}
        title="Queued change conflicts with the current record"
        description="The household changed after this draft went offline. Compare each field and choose which value to keep."
      />
      <div className="registry-badge-stack mt-3">
        <StatusBadge tone="warning">Draft based on version {assignment.baseVersion}</StatusBadge>
      </div>
      {notice && (
        <p className="registry-save-notice" role="status">
          {notice}
        </p>
      )}
      <div className="registry-conflicts">
        {assignment.conflicts.map((conflict) => (
          <div key={conflict.field}>
            <h3>{conflict.label}</h3>
            <dl>
              <div>
                <dt>Started from</dt>
                <dd>{conflict.base}</dd>
              </div>
              <div data-choice="local">
                <dt>Captured in the field</dt>
                <dd>{conflict.local}</dd>
              </div>
              <div data-choice="current">
                <dt>Current stored value</dt>
                <dd>{conflict.current}</dd>
              </div>
            </dl>
            <div className="registry-actions">
              <Button variant="outline" disabled={busy !== null} onClick={() => void resolve(conflict.field, "local")}>
                Keep the field value
              </Button>
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => void resolve(conflict.field, "current")}
              >
                Keep the stored value
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ContentPanel>
  );
}

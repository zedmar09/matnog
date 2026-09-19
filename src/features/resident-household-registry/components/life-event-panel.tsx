"use client";
import { useState } from "react";

import { TriangleAlert } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { SectionHeading } from "@/shared/components/section-heading";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import type { WorkspaceScenario } from "@/shared/providers/workspace-session-provider";

import { type LifeEvent, recordLifeEvent } from "../services/registry-operations";
import type { RegistryActor } from "../services/registry-projections";
import type { Person } from "../types/registry";

/**
 * Death and migration updates. Both deactivate the record and close its open
 * periods; neither deletes anything, so historical reports stay reproducible.
 */
export function LifeEventPanel({
  person,
  actor,
  scenario,
  onDone,
}: {
  person: Person;
  actor: RegistryActor;
  scenario: WorkspaceScenario;
  onDone: () => void;
}) {
  const [event, setEvent] = useState<LifeEvent | null>(null);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (person.lifeStatus !== "living") {
    return (
      <ContentPanel>
        <SectionHeading
          title="Life events"
          description="This record is already deactivated. Its residency and membership history stays readable above."
        />
      </ContentPanel>
    );
  }

  async function commit() {
    if (!event || saving) return;
    setSaving(true);
    setErrors([]);
    const result = await recordLifeEvent(actor, person.envelope.id, event, reason, person.envelope.version, scenario);
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
        { id: "reason", message: result.kind === "denied" ? result.message : "The change could not be saved." },
      ]);
      return;
    }
    setEvent(null);
    setReason("");
    setNotice(
      `Recorded. The record is now ${result.data.envelope.status.toLowerCase()} at version ${result.data.envelope.version}.`,
    );
    onDone();
  }

  return (
    <ContentPanel>
      <SectionHeading
        title="Life events"
        description="Recording a death or a move-out deactivates the record and closes its open periods. Nothing is deleted."
      />
      <ErrorSummary errors={errors} />
      {notice && (
        <p className="registry-save-notice" role="status">
          {notice}
        </p>
      )}
      <FormField
        id="reason"
        label="Reason and evidence"
        hint="Recorded on the timeline with your persona. At least eight characters."
      >
        {(field) => (
          <Textarea
            {...field}
            rows={3}
            value={reason}
            onChange={(changed) => {
              setReason(changed.target.value);
              setNotice(null);
            }}
            placeholder="For example: civil registry entry reference"
          />
        )}
      </FormField>
      <div className="registry-actions">
        <Button variant="outline" onClick={() => setEvent("deceased")} disabled={saving}>
          <TriangleAlert />
          Record death
        </Button>
        <Button variant="outline" onClick={() => setEvent("moved-out")} disabled={saving}>
          Record move-out
        </Button>
      </div>
      <ConfirmationDialog
        open={event !== null}
        onOpenChange={(open) => {
          if (!open) setEvent(null);
        }}
        title={event === "deceased" ? "Record this death?" : "Record this move-out?"}
        description={
          event === "deceased"
            ? "The record deactivates and its open residency and household membership close on today's demo date. History is preserved and the change can be reviewed on the activity tab."
            : "The record is marked as moved out and its open residency and household membership close on today's demo date. History is preserved."
        }
        confirmLabel={saving ? "Recording…" : "Record and close periods"}
        destructive
        onConfirm={() => void commit()}
      />
    </ContentPanel>
  );
}

"use client";
import { useState } from "react";

import Link from "next/link";

import { ArrowRight, CircleAlert } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import type { WorkspaceScenario } from "@/shared/providers/workspace-session-provider";

import { advanceTransfer } from "../services/registry-operations";
import type { RegistryActor } from "../services/registry-projections";
import type { TransferRequest, TransferState } from "../types/registry";

type Action = "release" | "accept" | "reject" | "dispute";

const STATE_TONE: Record<TransferState, "success" | "pending" | "neutral" | "warning" | "destructive"> = {
  requested: "pending",
  released: "pending",
  accepted: "success",
  completed: "success",
  rejected: "destructive",
  disputed: "warning",
};

const ACTION_COPY: Record<Action, { title: string; description: string; label: string }> = {
  release: {
    title: "Release from the origin barangay?",
    description:
      "The origin barangay confirms the resident is leaving. The residency period stays open until the destination accepts, so no history is lost while the transfer is in flight.",
    label: "Release",
  },
  accept: {
    title: "Accept into the destination barangay?",
    description:
      "The origin residency period closes on today's demo date and a new one opens in the destination. The person ID never changes and the previous period stays visible.",
    label: "Accept",
  },
  reject: {
    title: "Reject this transfer?",
    description:
      "The request is rejected with your reason. The resident keeps their current residency and can correct and resubmit.",
    label: "Reject",
  },
  dispute: {
    title: "Mark this transfer as disputed?",
    description:
      "The request is escalated for review with your reason. Residency history is preserved while the dispute is open.",
    label: "Dispute",
  },
};

/** Origin release, destination acceptance and escalation, with reasons kept. */
export function TransferReviewPanel({
  transfer,
  actor,
  scenario,
  onDone,
}: {
  transfer: TransferRequest;
  actor: RegistryActor;
  scenario: WorkspaceScenario;
  onDone: () => void;
}) {
  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  const canRelease = transfer.state === "requested";
  const canAccept = transfer.state === "released";
  const open = !["completed", "rejected"].includes(transfer.state);

  async function commit() {
    if (!pending || saving) return;
    setSaving(true);
    setErrors([]);
    const result = await advanceTransfer(
      actor,
      transfer.envelope.id,
      pending,
      reason,
      transfer.envelope.version,
      scenario,
    );
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
        { id: "reason", message: result.kind === "denied" ? result.message : "The transfer could not be updated." },
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
        eyebrow={`${transfer.envelope.id} · requested ${transfer.requestedAt}`}
        title="Transfer request"
        description="A transfer moves residency between barangays. The person ID survives it, and the earlier residency period is closed rather than removed."
      />
      <div className="registry-badge-stack mt-3">
        <StatusBadge tone={STATE_TONE[transfer.state]}>{transfer.envelope.status}</StatusBadge>
      </div>

      <div className="registry-transfer-route">
        <div>
          <span className="eyebrow">Origin</span>
          <strong>{transfer.from.label}</strong>
        </div>
        <ArrowRight size={18} aria-hidden="true" />
        <div>
          <span className="eyebrow">Destination</span>
          <strong>{transfer.to.label}</strong>
          <small>Receiving household {transfer.destinationHouseholdId}</small>
        </div>
      </div>

      <dl className="registry-facts">
        <div>
          <dt>Person</dt>
          <dd>
            <Link className="text-link" href={`/ops/residents/${transfer.personId}`}>
              {transfer.personId}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Stated reason</dt>
          <dd>{transfer.reason ?? "Not given"}</dd>
        </div>
        <div>
          <dt>Record version</dt>
          <dd>{transfer.envelope.version}</dd>
        </div>
      </dl>

      {!open ? (
        <p className="small-note">
          This request is {transfer.state}. Reopening it is not available; a new request would be filed instead.
        </p>
      ) : (
        <>
          <PanelDivider />
          <ErrorSummary errors={errors} />
          <FormField
            id="reason"
            label="Reason"
            hint="Required to reject or dispute. Release and acceptance are affirmative acts and do not need one."
          >
            {(field) => (
              <Textarea
                {...field}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="For example: destination barangay confirmed the address"
              />
            )}
          </FormField>
          <div className="registry-actions">
            <Button
              onClick={() => setPending(canRelease ? "release" : "accept")}
              disabled={saving || (!canRelease && !canAccept)}
            >
              {canRelease ? "Release from origin" : "Accept at destination"}
            </Button>
            <Button variant="outline" onClick={() => setPending("reject")} disabled={saving}>
              Reject
            </Button>
            <Button variant="outline" onClick={() => setPending("dispute")} disabled={saving}>
              <CircleAlert />
              Dispute
            </Button>
          </div>
          {!canRelease && !canAccept && (
            <p className="small-note">
              This request is {transfer.state}; the next step is a rejection or a dispute escalation.
            </p>
          )}
        </>
      )}

      <ConfirmationDialog
        open={pending !== null}
        onOpenChange={(value) => {
          if (!value) setPending(null);
        }}
        title={pending ? ACTION_COPY[pending].title : ""}
        description={pending ? ACTION_COPY[pending].description : ""}
        confirmLabel={saving ? "Recording…" : pending ? ACTION_COPY[pending].label : "Confirm"}
        destructive={pending === "reject"}
        onConfirm={() => void commit()}
      />
    </ContentPanel>
  );
}

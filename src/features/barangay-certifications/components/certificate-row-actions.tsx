"use client";

import { useState } from "react";

import Link from "next/link";

import { BadgeCheck, Ban, EllipsisVertical, FileText, Receipt, RotateCcw, Undo2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import type { RepositoryResult } from "@/shared/data/repository-result";
import type { WorkspaceRole } from "@/shared/providers/workspace-session-provider";

import {
  certificateRepository,
  isFeeOpen,
  isIssuanceActionable,
  isReviewOpen,
} from "../services/certificate-repository";
import type { CertificateWorkspaceRecord } from "../types/certificate-records";

/** A status change that needs something recorded before it can be applied. */
type Pending = "return" | "fee" | "reprint" | "revoke";

const DIALOG: Record<Pending, { title: string; description: string; confirm: string; destructive?: boolean }> = {
  return: {
    title: "Return for correction",
    description: "The request keeps a working revision the requester can correct. Name what is missing.",
    confirm: "Return request",
  },
  fee: {
    title: "Record the fee decision",
    description: "An assessment waits for treasury confirmation. An exemption needs a recorded basis.",
    confirm: "Save fee decision",
  },
  reprint: {
    title: "Record a reprint",
    description: "A reprint reuses the same serial. Nothing new is issued.",
    confirm: "Record reprint",
  },
  revoke: {
    title: "Revoke the issuance",
    description: "The snapshot and its history stay available. The certificate stops being valid.",
    confirm: "Revoke issuance",
    destructive: true,
  },
};

/**
 * Row actions for one certificate request. Each item changes the request's
 * status; every one is offered only when the repository would accept it, so the
 * menu never advertises an action that fails on click.
 */
export function CertificateRowActions({
  record,
  role,
  onUpdated,
  onFailed,
}: {
  record: CertificateWorkspaceRecord;
  role: WorkspaceRole;
  onUpdated: (record: CertificateWorkspaceRecord, message: string) => void;
  /** Failures from the one action with no dialog to show them in. */
  onFailed: (errors: FieldError[]) => void;
}) {
  const [pending, setPending] = useState<Pending>();
  const [reason, setReason] = useState("");
  const [feeKind, setFeeKind] = useState<"assessment" | "exempt">("assessment");
  const [ruleLabel, setRuleLabel] = useState("Barangay certificate fee rule");
  const [exemptionBasis, setExemptionBasis] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  const id = record.request.envelope.id;
  const canAct = role === "barangay";
  const reviewOpen = canAct && isReviewOpen(record);
  const feeOpen = canAct && isFeeOpen(record);
  const issuanceOpen = canAct && isIssuanceActionable(record);

  /**
   * `report` decides where a failure is shown. A dialog action keeps its errors
   * beside the fields; the one action without a dialog sends them to the page,
   * so a refusal is never swallowed.
   */
  function apply(
    result: RepositoryResult<CertificateWorkspaceRecord>,
    message: string,
    report: (errors: FieldError[]) => void,
  ) {
    if (result.kind === "success") {
      setErrors([]);
      setReason("");
      setExemptionBasis("");
      setPending(undefined);
      // Hand back the updated record. The queue applies it directly rather
      // than re-reading, so the row reflects the change without depending on
      // repository module identity.
      onUpdated(result.data, message);
      return;
    }
    const errors: FieldError[] =
      result.kind === "invalid"
        ? result.errors
        : [{ id: "form", message: result.kind === "denied" ? result.message : "The status could not be updated." }];
    report(errors);
  }

  function approve() {
    apply(
      certificateRepository.approveReview(id, role),
      `${id} approved for the current submitted revision.`,
      onFailed,
    );
  }

  function confirm() {
    if (!pending || saving) return;
    setSaving(true);
    if (pending === "return") {
      apply(certificateRepository.returnForCorrection(id, role, reason), `${id} returned for correction.`, setErrors);
    } else if (pending === "fee") {
      apply(
        certificateRepository.setFeeDecision(id, role, { kind: feeKind, ruleLabel, exemptionBasis }),
        feeKind === "assessment" ? `A fee assessment was created for ${id}.` : `An exemption was recorded for ${id}.`,
        setErrors,
      );
    } else if (pending === "reprint") {
      apply(certificateRepository.reprint(id, role, reason), `A reprint was recorded for ${id}.`, setErrors);
    } else {
      apply(certificateRepository.revoke(id, role, reason), `${id} was revoked.`, setErrors);
    }
    setSaving(false);
  }

  function open(next: Pending) {
    setErrors([]);
    setReason("");
    setPending(next);
  }

  const dialog = pending ? DIALOG[pending] : undefined;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${id}`}>
          <EllipsisVertical size={16} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="ops-row-menu-content">
          <DropdownMenuItem asChild>
            <Link href={`/ops/certificates/requests/${id}`}>
              <FileText size={14} aria-hidden="true" />
              Open record
            </Link>
          </DropdownMenuItem>

          {reviewOpen && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={approve}>
                <BadgeCheck size={14} aria-hidden="true" />
                Approve review
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => open("return")}>
                <Undo2 size={14} aria-hidden="true" />
                Return for correction…
              </DropdownMenuItem>
            </>
          )}

          {feeOpen && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => open("fee")}>
                <Receipt size={14} aria-hidden="true" />
                Record fee decision…
              </DropdownMenuItem>
            </>
          )}

          {issuanceOpen && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => open("reprint")}>
                <RotateCcw size={14} aria-hidden="true" />
                Record reprint…
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => open("revoke")}>
                <Ban size={14} aria-hidden="true" />
                Revoke issuance…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {dialog && (
        <ConfirmationDialog
          open={pending !== undefined}
          onOpenChange={(next) => !next && setPending(undefined)}
          title={`${dialog.title} · ${id}`}
          description={dialog.description}
          confirmLabel={saving ? "Saving…" : dialog.confirm}
          destructive={dialog.destructive}
          onConfirm={confirm}
        >
          <ErrorSummary errors={errors} />
          {pending === "fee" ? (
            <>
              <FormField id={`${id}-fee-kind`} label="Fee path" required>
                {(field) => (
                  <Select value={feeKind} onValueChange={(next) => setFeeKind(next as "assessment" | "exempt")}>
                    <SelectTrigger id={field.id} className="form-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assessment">Create a fee assessment</SelectItem>
                      <SelectItem value="exempt">Record an exemption basis</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>
              {feeKind === "assessment" ? (
                <FormField id={`${id}-fee-rule`} label="Fee rule" required>
                  {(field) => (
                    <Input {...field} value={ruleLabel} onChange={(event) => setRuleLabel(event.target.value)} />
                  )}
                </FormField>
              ) : (
                <FormField id={`${id}-fee-basis`} label="Exemption basis" required>
                  {(field) => (
                    <Textarea
                      {...field}
                      rows={2}
                      placeholder="Record the rule or approved eligibility basis."
                      value={exemptionBasis}
                      onChange={(event) => setExemptionBasis(event.target.value)}
                    />
                  )}
                </FormField>
              )}
            </>
          ) : (
            <FormField
              id={`${id}-reason`}
              label="Reason"
              required
              hint="Recorded on the request's history with your role."
            >
              {(field) => (
                <Textarea
                  {...field}
                  rows={2}
                  placeholder={
                    pending === "return"
                      ? "Describe the missing or inconsistent item."
                      : pending === "reprint"
                        ? "For example: the released copy was damaged."
                        : "For example: issued against a superseded residency record."
                  }
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              )}
            </FormField>
          )}
        </ConfirmationDialog>
      )}
    </>
  );
}

"use client";

import { useState } from "react";

import { Archive } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import type { HouseholdClosureReason } from "../types/registry";

const REASONS: { value: HouseholdClosureReason; label: string; note: string }[] = [
  {
    value: "dissolved",
    label: "Dissolved",
    note: "The household no longer exists as a group. Its record and membership history stay on file.",
  },
  {
    value: "merged",
    label: "Merged into another household",
    note: "Every current member moves to the household you choose. Their old membership is closed, not erased.",
  },
  {
    value: "moved-away",
    label: "Moved out of the municipality",
    note: "The household left Matnog. Its record and history stay on file.",
  },
  {
    value: "created-in-error",
    label: "Created in error",
    note: "The household should not have been recorded. Closing keeps the audit trail rather than deleting it.",
  },
];

/**
 * Closes a household. A registry closes a record and keeps it; nothing here
 * deletes a household or the memberships that reference it.
 */
export function HouseholdClosureDialog({
  householdLabel,
  memberCount,
  openHouseholds,
  onClose,
}: {
  householdLabel: string;
  /** Current members. Anything but a merge requires this to be zero. */
  memberCount: number;
  openHouseholds: { id: string; label: string }[];
  onClose: (input: {
    reason: HouseholdClosureReason;
    note: string;
    mergedIntoId?: string;
    on: string;
  }) => Promise<FieldError[]>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<HouseholdClosureReason>("dissolved");
  const [note, setNote] = useState("");
  const [mergedIntoId, setMergedIntoId] = useState("");
  const [on, setOn] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  const selected = REASONS.find((item) => item.value === reason);
  const merging = reason === "merged";

  async function confirm() {
    if (saving) return;
    setSaving(true);
    const result = await onClose({ reason, note, on, ...(merging ? { mergedIntoId } : {}) });
    setSaving(false);
    if (result.length > 0) return setErrors(result);
    setErrors([]);
    setNote("");
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Archive size={14} />
        Close household
      </Button>
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title={`Close ${householdLabel}`}
        description="A closed household leaves the active directory. Its record, members and history are kept and it can be reopened."
        confirmLabel={saving ? "Closing…" : "Close household"}
        destructive
        onConfirm={confirm}
      >
        <ErrorSummary errors={errors} />
        <FormField id="closureReason" label="Reason" required hint={selected?.note}>
          {(field) => (
            <Select value={reason} onValueChange={(next) => setReason(next as HouseholdClosureReason)}>
              <SelectTrigger id={field.id} className="form-select-trigger">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        {merging ? (
          <FormField
            id="closureMergedInto"
            label="Members move into"
            required
            hint={`${memberCount} current ${memberCount === 1 ? "member moves" : "members move"} to this household.`}
          >
            {(field) => (
              <Select value={mergedIntoId} onValueChange={setMergedIntoId}>
                <SelectTrigger id={field.id} className="form-select-trigger">
                  <SelectValue placeholder="Select a household" />
                </SelectTrigger>
                <SelectContent>
                  {openHouseholds.map((household) => (
                    <SelectItem key={household.id} value={household.id}>
                      {household.label} · {household.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        ) : memberCount > 0 ? (
          <p className="small-note">
            This household still has {memberCount} current {memberCount === 1 ? "member" : "members"}. Move them out
            first, or close it as a merge into another household.
          </p>
        ) : null}
        <FormField id="closureOn" label="Closure date" hint="Leave empty to use today's date.">
          {(field) => <Input {...field} type="date" value={on} onChange={(event) => setOn(event.target.value)} />}
        </FormField>
        <FormField id="closureNote" label="Note" required hint="Recorded on the timeline with your role.">
          {(field) => (
            <Textarea
              {...field}
              rows={2}
              placeholder="For example: the family moved to Sorsogon City in August"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </FormField>
      </ConfirmationDialog>
    </>
  );
}

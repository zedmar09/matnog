"use client";

import { useState } from "react";

import { UserRoundCog } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import { HOUSEHOLDS } from "../data/households";
import type { HouseholdMembership } from "../types/registry";

/**
 * Moves a member to another household, or corrects the relationship on the one
 * they already have. Moving closes the current period rather than rewriting it,
 * so the household's earlier composition stays reportable.
 */
export function MembershipEditor({
  personName,
  membership,
  onSave,
}: {
  personName: string;
  membership: HouseholdMembership;
  onSave: (input: {
    householdId: string;
    relationshipToHead: string;
    on: string;
    reason: string;
  }) => Promise<FieldError[]>;
}) {
  const [open, setOpen] = useState(false);
  const [householdId, setHouseholdId] = useState(membership.householdId);
  const [relationship, setRelationship] = useState(membership.relationshipToHead);
  const [on, setOn] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  const moving = householdId !== membership.householdId;

  async function confirm() {
    if (saving) return;
    setSaving(true);
    const result = await onSave({ householdId, relationshipToHead: relationship, on, reason });
    setSaving(false);
    if (result.length > 0) {
      setErrors(result);
      return;
    }
    setErrors([]);
    setReason("");
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserRoundCog size={14} />
        Edit membership
      </Button>
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title={`Edit membership · ${personName}`}
        description={
          moving
            ? "Moving closes the current membership on the date below and opens a new one. The closed period stays on the record."
            : "Changing only the relationship corrects the current membership. No new period is created."
        }
        confirmLabel={moving ? "Move member" : "Save correction"}
        onConfirm={confirm}
      >
        <ErrorSummary errors={errors} />
        <FormField id="membershipHousehold" label="Household" required>
          {(field) => (
            <Select value={householdId} onValueChange={setHouseholdId}>
              <SelectTrigger id={field.id} className="form-select-trigger">
                <SelectValue placeholder="Select a household" />
              </SelectTrigger>
              <SelectContent>
                {HOUSEHOLDS.map((household) => (
                  <SelectItem key={household.envelope.id} value={household.envelope.id}>
                    {household.envelope.scope.label} · {household.envelope.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField id="membershipRelationship" label="Relationship to the household head" required>
          {(field) => (
            <Input
              {...field}
              placeholder="Daughter, tenant, parent"
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
            />
          )}
        </FormField>
        {moving ? (
          <FormField id="membershipOn" label="Move date" hint="Leave empty to use today's date.">
            {(field) => <Input {...field} type="date" value={on} onChange={(event) => setOn(event.target.value)} />}
          </FormField>
        ) : null}
        <FormField id="membershipReason" label="Reason" required hint="Recorded on the timeline with your persona.">
          {(field) => (
            <Textarea
              {...field}
              rows={2}
              placeholder="For example: moved to her aunt's household"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          )}
        </FormField>
      </ConfirmationDialog>
    </>
  );
}

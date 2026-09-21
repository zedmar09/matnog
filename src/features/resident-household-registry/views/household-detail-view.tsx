"use client";
import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { ArrowLeft, Eye, Pencil, RotateCcw, Trophy, UserRound } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorState } from "@/shared/components/error-state";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { ScopeBadge } from "@/shared/components/scope-badge";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useDemoNow } from "@/shared/hooks/use-demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { HouseholdClosureDialog } from "../components/household-closure-dialog";
import { MembershipEditor } from "../components/membership-editor";
import { useRegistryActor } from "../hooks/use-registry-actor";
import { changeMembership, closeHousehold, reopenHousehold } from "../services/registry-operations";
import { canEditRegistry } from "../services/registry-projections";
import { type HouseholdDetail, isStale, listHouseholds, readHousehold } from "../services/registry-repository";
import { fullName } from "../services/registry-rules";
import type { HouseholdClosureReason, TriState } from "../types/registry";

const CLOSURE_LABEL: Record<HouseholdClosureReason, string> = {
  dissolved: "Dissolved",
  merged: "Merged into another household",
  "moved-away": "Moved out of the municipality",
  "created-in-error": "Created in error",
};

const TRI_LABEL: Record<TriState, string> = { yes: "Yes", no: "No", unknown: "Unknown" };
const TRI_TONE: Record<TriState, "success" | "neutral" | "warning"> = {
  yes: "success",
  no: "neutral",
  // Unknown is not "no": an unasked question must never read as a negative.
  unknown: "warning",
};

export function HouseholdDetailView({ householdId }: { householdId: string }) {
  const actor = useRegistryActor();
  const { scenario, generation } = useWorkspaceSession();
  useDemoNow();
  const [result, setResult] = useState<RepositoryResult<HouseholdDetail> | null>(null);
  const [openHouseholds, setOpenHouseholds] = useState<{ id: string; label: string }[]>([]);
  const [errors, setErrors] = useState<FieldError[]>([]);

  const load = useCallback(() => {
    if (!actor) return;
    // Keep the current data on screen while refetching. Blanking it would
    // unmount the panels and discard the confirmation a reviewer just saw.
    void readHousehold(actor, householdId, scenario).then(setResult);
    // Merge targets: every other household still open in the actor's scope.
    void listHouseholds(actor, {}, scenario).then((next) => {
      if (next.kind !== "success") return;
      setOpenHouseholds(
        next.data
          .filter((row) => row.household.envelope.id !== householdId)
          .map((row) => ({ id: row.household.envelope.id, label: row.household.envelope.scope.label })),
      );
    });
  }, [actor, householdId, scenario]);

  // A reset can leave the role (and therefore the actor) unchanged while the
  // fixtures and demo clock have been restored, so `generation` is carried as
  // an explicit refetch trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate refetch trigger.
  useEffect(load, [load, generation]);

  if (!actor) {
    return (
      <PermissionState
        title="The registry is not part of this workspace"
        description="The tourism partner role has no household registry access."
        action={
          <Button asChild variant="outline">
            <Link href="/ops">Back to workspace overview</Link>
          </Button>
        }
      />
    );
  }

  if (result === null) return <LoadingState label="Loading household" message="Opening the household record…" />;

  if (result.kind === "denied" || result.kind === "empty") {
    return (
      <PermissionState
        title={result.kind === "empty" ? "Household not available" : "This household is outside your scope"}
        description={
          result.kind === "empty" ? "No household matches this reference in your assigned scope." : result.message
        }
        action={
          <Button asChild variant="outline">
            <Link href="/ops/households">Back to households</Link>
          </Button>
        }
      />
    );
  }

  if (result.kind !== "success") return <ErrorState onRetry={load} />;

  const { household, structure, members, withheldFlags } = result.data;
  const canEdit = canEditRegistry(actor);

  /** Applies a membership change, then refreshes so the list reflects it. */
  async function saveMembership(
    personId: string,
    input: { householdId: string; relationshipToHead: string; on: string; reason: string },
  ) {
    if (!actor) return [{ id: "form", message: "No actor in this workspace." }];
    const saved = await changeMembership(actor, personId, input, scenario);
    if (saved.kind === "invalid") return saved.errors;
    if (saved.kind !== "success") return [{ id: "form", message: "The change could not be saved in this preview." }];
    load();
    return [];
  }
  /** Closes the household, then refreshes so the banner and actions follow. */
  async function close(input: { reason: HouseholdClosureReason; note: string; mergedIntoId?: string; on: string }) {
    if (!actor) return [{ id: "form", message: "No actor in this workspace." }];
    const done = await closeHousehold(actor, householdId, input, scenario);
    if (done.kind === "invalid") return done.errors;
    if (done.kind !== "success") return [{ id: "form", message: "The household could not be closed." }];
    setErrors([]);
    load();
    return [];
  }

  async function reopen() {
    if (!actor) return;
    const done = await reopenHousehold(actor, householdId, "Reopened from the household record", scenario);
    if (done.kind === "invalid") return setErrors(done.errors);
    if (done.kind !== "success") return setErrors([{ id: "form", message: "The household could not be reopened." }]);
    setErrors([]);
    load();
  }

  const current = members.filter((member) => !member.to);
  // The household head leads the list; everyone else keeps their existing order.
  const ordered = [...members].sort((a, b) => {
    const aHead = a.person.envelope.id === household.headPersonId ? 0 : 1;
    const bHead = b.person.envelope.id === household.headPersonId ? 0 : 1;
    return aHead - bHead;
  });

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link href="/ops/households" className="text-link">
            <ArrowLeft size={15} />
            Households
          </Link>
          <h1>{household.envelope.scope.label}</h1>
          <p>
            {household.envelope.id} · record version {household.envelope.version}
          </p>
          <div className="registry-badge-stack mt-3">
            {household.closure ? (
              <StatusBadge tone="neutral">Closed</StatusBadge>
            ) : (
              <StatusBadge tone={isStale(household) ? "warning" : "success"}>
                {isStale(household) ? "Verification overdue" : "Verified"}
              </StatusBadge>
            )}
            {structure && <ScopeBadge scope="barangay" value={structure.barangay.label} />}
          </div>
        </div>
        {canEdit && (
          <div className="ops-topline-actions">
            {household.closure ? (
              <Button type="button" variant="outline" onClick={reopen}>
                <RotateCcw size={14} />
                Reopen household
              </Button>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href={`/ops/households/${householdId}/edit`}>
                    <Pencil size={14} />
                    Edit household
                  </Link>
                </Button>
                <HouseholdClosureDialog
                  householdLabel={household.envelope.scope.label}
                  memberCount={members.filter((member) => !member.to).length}
                  openHouseholds={openHouseholds}
                  onClose={close}
                />
              </>
            )}
          </div>
        )}
      </div>

      {household.closure && (
        <NoticePanel className="mb-6">
          Closed on {household.closure.on} by {household.closure.actor} · {CLOSURE_LABEL[household.closure.reason]}
          {household.closure.mergedIntoId ? ` into ${household.closure.mergedIntoId}` : ""}. {household.closure.note}
        </NoticePanel>
      )}
      <ErrorSummary errors={errors} />

      <div className="household-layout">
        <div className="household-column">
          <ContentPanel>
            <SectionHeading
              title={`Members (${current.length} current)`}
              description="A closed membership stays listed. Changing the head never erases an earlier membership."
            />
            <ul className="registry-memberships">
              {ordered.map((member) => (
                <li key={`${member.person.envelope.id}-${member.from}`}>
                  <div>
                    <span className="registry-member-name">
                      {member.person.envelope.id === household.headPersonId ? (
                        <Trophy size={16} className="registry-head-mark" aria-label="Household head" />
                      ) : (
                        <UserRound size={16} className="registry-member-mark" aria-hidden="true" />
                      )}
                      <Link className="registry-member-link" href={`/ops/residents/${member.person.envelope.id}`}>
                        {fullName(member.person)}
                      </Link>
                    </span>
                    <p>
                      {member.relationshipToHead} · {member.from} – {member.to ?? "present"}
                    </p>
                    {member.temporaryAbsence && <small>Temporarily away: {member.temporaryAbsence}</small>}
                  </div>
                  <div className="registry-membership-actions">
                    <StatusBadge tone={member.person.lifeStatus === "living" ? "success" : "neutral"}>
                      {member.person.envelope.status}
                    </StatusBadge>
                    {!member.to && canEdit ? (
                      <MembershipEditor
                        personName={fullName(member.person)}
                        membership={{
                          id: `${member.person.envelope.id}-${member.from}`,
                          householdId: household.envelope.id,
                          relationshipToHead: member.relationshipToHead,
                          from: member.from,
                        }}
                        onSave={(input) => saveMembership(member.person.envelope.id, input)}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </ContentPanel>
          <ContentPanel>
            <SectionHeading
              title="Vulnerability"
              description="Unknown is recorded separately from no, so an unasked question is never counted as a negative finding."
            />
            <ul className="registry-flags">
              {household.vulnerabilityFlags.map((flag) => (
                <li key={flag.id}>
                  <span>{flag.label}</span>
                  <StatusBadge tone={TRI_TONE[flag.value]}>{TRI_LABEL[flag.value]}</StatusBadge>
                </li>
              ))}
            </ul>
            {withheldFlags > 0 && (
              <p className="small-note">
                <Eye size={13} aria-hidden="true" /> {withheldFlags} restricted{" "}
                {withheldFlags === 1 ? "indicator is" : "indicators are"} withheld from this projection. Household
                membership alone does not grant sight of another member&rsquo;s confidential details.
              </p>
            )}
          </ContentPanel>
        </div>
        <div className="household-column">
          <ContentPanel>
            <SectionHeading
              title="Address Information"
              description="Addresses come from a normalised address hierarchy. A missing location never discards the address."
            />
            {structure ? (
              <dl className="registry-facts">
                <div>
                  <dt>Address</dt>
                  <dd>
                    {structure.houseNumber} {structure.street}
                  </dd>
                </div>
                <div>
                  <dt>Sitio</dt>
                  <dd>{structure.sitio || "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Purok</dt>
                  <dd>{structure.purok}</dd>
                </div>
                <div>
                  <dt>Barangay</dt>
                  <dd>{structure.barangay.label}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted">No address recorded for this household.</p>
            )}
          </ContentPanel>
          <ContentPanel>
            <SectionHeading
              title="Dwelling and livelihood"
              description="Illustrative survey configuration. None of these categories is a validated municipal standard."
            />
            <dl className="registry-facts">
              <div>
                <dt>Construction</dt>
                <dd>{household.dwelling.constructionMaterial}</dd>
              </div>
              <div>
                <dt>Tenure</dt>
                <dd>{household.dwelling.tenure}</dd>
              </div>
              <div>
                <dt>Water source</dt>
                <dd>{household.dwelling.waterSource}</dd>
              </div>
              <div>
                <dt>Toilet facility</dt>
                <dd>{household.dwelling.toiletFacility}</dd>
              </div>
              <div>
                <dt>Power source</dt>
                <dd>{household.dwelling.powerSource}</dd>
              </div>
              <div>
                <dt>Waste disposal</dt>
                <dd>{household.dwelling.wasteDisposal}</dd>
              </div>
              <div>
                <dt>Internet at home</dt>
                <dd>{TRI_LABEL[household.dwelling.internet]}</dd>
              </div>
              <div>
                <dt>Income bracket</dt>
                <dd>{household.socioeconomic.incomeBracket}</dd>
              </div>
              <div>
                <dt>Livelihood</dt>
                <dd>{household.socioeconomic.livelihood}</dd>
              </div>
              <div>
                <dt>Food security</dt>
                <dd>{TRI_LABEL[household.socioeconomic.foodSecurity]}</dd>
              </div>
            </dl>
          </ContentPanel>
        </div>
      </div>
    </>
  );
}

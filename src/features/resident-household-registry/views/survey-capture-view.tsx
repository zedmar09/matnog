"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { ArrowLeft, ArrowRight, Check, TriangleAlert, Trophy, UserRound } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorState } from "@/shared/components/error-state";
import { FormField } from "@/shared/components/form-field";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { MEMBER_OUTCOMES, SURVEY_FIELDS, type SurveyField, TRI_OPTIONS } from "../data/survey-fields";
import { useRegistryActor } from "../hooks/use-registry-actor";
import { applySurvey, captureSurveySection } from "../services/registry-operations";
import { canEditRegistry } from "../services/registry-projections";
import { type HouseholdDetail, listSurveys, readHousehold } from "../services/registry-repository";
import { fullName } from "../services/registry-rules";
import type { SurveyAssignment, SurveyDraft } from "../types/survey";

/**
 * Step-based household survey on the web. Capture normally happens on a phone
 * in the field; the same steps are here so a desk officer can complete a visit
 * reported by phone, or finish one a device could not sync.
 */
export function SurveyCaptureView({ assignmentId }: { assignmentId: string }) {
  const actor = useRegistryActor();
  const { scenario, generation } = useWorkspaceSession();
  const [result, setResult] = useState<RepositoryResult<SurveyAssignment[]> | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  // Answers edited on screen but not yet saved to the assignment.
  const [draft, setDraft] = useState<SurveyDraft>({});
  const [applyError, setApplyError] = useState("");
  const [detail, setDetail] = useState<HouseholdDetail>();

  const load = useCallback(() => {
    if (!actor) return;
    void listSurveys(actor, scenario).then((next) => {
      setResult(next);
      const assignment =
        next.kind === "success" ? next.data.find((item) => item.envelope.id === assignmentId) : undefined;
      if (!assignment) return;
      // The vulnerability questions come from the household's own flags.
      void readHousehold(actor, assignment.householdId, scenario).then((next) => {
        if (next.kind === "success") setDetail(next.data);
      });
    });
  }, [actor, scenario, assignmentId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate refetch trigger.
  useEffect(load, [load, generation]);

  if (!actor || !canEditRegistry(actor)) {
    return (
      <PermissionState
        title="You cannot capture this survey"
        description="Your demo role can read assignments but not capture them."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/registry/surveys">Back to assignments</Link>
          </Button>
        }
      />
    );
  }
  if (result === null) return <LoadingState label="Loading survey" message="Loading the assignment…" />;
  if (result.kind !== "success") return <ErrorState onRetry={load} />;

  const assignment = result.data.find((item) => item.envelope.id === assignmentId);
  if (!assignment) {
    return (
      <PermissionState
        title="Assignment unavailable"
        description="This assignment is not in your assigned scope."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/registry/surveys">Back to assignments</Link>
          </Button>
        }
      />
    );
  }

  const section = assignment.sections[step];
  // Vulnerability questions come from the household's own flags, so a new
  // indicator appears in the survey without a second list to maintain.
  const fields: SurveyField[] =
    section?.id === "vulnerability"
      ? (detail?.household.vulnerabilityFlags ?? []).map((flag) => ({
          path: `vulnerability.${flag.id}`,
          label: flag.label,
          kind: "tri" as const,
        }))
      : (SURVEY_FIELDS[section?.id ?? ""] ?? []);

  function answer(path: string) {
    return draft[path] ?? assignment?.draft[path] ?? "";
  }

  const lastStep = step === assignment.sections.length - 1;
  const currentMembers = (detail?.members ?? []).filter((member) => !member.to);

  async function saveAndContinue() {
    if (!actor || !section || saving) return;
    setSaving(true);
    setApplyError("");
    const answers =
      section.id === "members"
        ? Object.fromEntries(
            currentMembers.flatMap((member) => {
              const id = member.person.envelope.id;
              const outcome = answer(`member.${id}.outcome`) || "present";
              return [
                [`member.${id}.outcome`, outcome],
                [`member.${id}.relationship`, answer(`member.${id}.relationship`) || member.relationshipToHead],
                [`member.${id}.absence`, outcome === "away" ? answer(`member.${id}.absence`) : ""],
              ];
            }),
          )
        : Object.fromEntries(fields.map((field) => [field.path, answer(field.path)]));
    await captureSurveySection(actor, assignmentId, section.id, answers, scenario);
    setDraft({});
    // Finishing the last step writes the survey onto the household record.
    if (lastStep && assignment?.state !== "accepted") {
      const applied = await applySurvey(actor, assignmentId, scenario);
      if (applied.kind === "invalid") setApplyError(applied.errors[0]?.message ?? "");
    }
    setSaving(false);
    load();
    if (!lastStep) setStep(step + 1);
  }

  return (
    <div className="registry-wizard">
      <div className="registry-wizard-head">
        <Link className="text-link survey-breadcrumb" href="/ops/registry/surveys">
          <ArrowLeft size={15} />
          Assignments
        </Link>
        <h1>Household survey</h1>
        <p>
          {assignment.envelope.scope.label} · {assignment.envelope.id} · due {assignment.dueOn}
        </p>
      </div>

      <ol className="registry-steps">
        {assignment.sections.map((item, index) => (
          <li key={item.id} data-state={index === step ? "current" : item.complete ? "done" : "todo"}>
            <span>{item.complete ? <Check size={13} /> : index + 1}</span>
            {item.title}
          </li>
        ))}
      </ol>

      <ContentPanel>
        {section ? (
          <>
            <div className="survey-step-head">
              <div>
                <h2>{section.title}</h2>
                <p className="muted">{section.description}</p>
              </div>
              <StatusBadge tone={section.complete ? "success" : "neutral"}>
                {section.complete ? "Captured" : "Not captured"}
              </StatusBadge>
            </div>

            <div className="survey-fields">
              {section.id === "members" ? (
                <ul className="survey-members">
                  {currentMembers.map((member) => {
                    const id = member.person.envelope.id;
                    const outcome = answer(`member.${id}.outcome`) || "present";
                    return (
                      <li key={id}>
                        <div className="survey-member-head">
                          <span className="registry-member-name">
                            {id === detail?.household.headPersonId ? (
                              <Trophy size={15} className="registry-head-mark" aria-label="Household head" />
                            ) : (
                              <UserRound size={15} className="registry-member-mark" aria-hidden="true" />
                            )}
                            <strong>{fullName(member.person)}</strong>
                          </span>
                          <small>since {member.from}</small>
                        </div>

                        <RadioGroup
                          className="form-radio-row"
                          value={outcome}
                          onValueChange={(value) => setDraft((prev) => ({ ...prev, [`member.${id}.outcome`]: value }))}
                        >
                          {MEMBER_OUTCOMES.map((option) => (
                            <label className="form-radio" key={option.value}>
                              <RadioGroupItem value={option.value} />
                              {option.label}
                            </label>
                          ))}
                        </RadioGroup>

                        {outcome === "left" ? null : (
                          <div className="survey-member-fields">
                            <FormField id={`rel-${id}`} label="Relationship to the head">
                              {(bound) => (
                                <Input
                                  {...bound}
                                  placeholder={member.relationshipToHead}
                                  value={answer(`member.${id}.relationship`) || member.relationshipToHead}
                                  onChange={(event) =>
                                    setDraft((prev) => ({ ...prev, [`member.${id}.relationship`]: event.target.value }))
                                  }
                                />
                              )}
                            </FormField>
                            {outcome === "away" ? (
                              <FormField
                                id={`away-${id}`}
                                label="Reason for the absence"
                                hint="Still counted as a member."
                              >
                                {(bound) => (
                                  <Input
                                    {...bound}
                                    placeholder="Working overseas, studying"
                                    value={answer(`member.${id}.absence`) || member.temporaryAbsence || ""}
                                    onChange={(event) =>
                                      setDraft((prev) => ({ ...prev, [`member.${id}.absence`]: event.target.value }))
                                    }
                                  />
                                )}
                              </FormField>
                            ) : null}
                          </div>
                        )}
                      </li>
                    );
                  })}
                  {currentMembers.length === 0 ? (
                    <li className="muted">No current members on this household.</li>
                  ) : null}
                </ul>
              ) : fields.length === 0 ? (
                <p className="muted">No questions in this section.</p>
              ) : (
                fields.map((field) => (
                  <FormField key={field.path} id={field.path} label={field.label} hint={field.hint}>
                    {(bound) =>
                      field.kind === "tri" ? (
                        <RadioGroup
                          className="form-radio-row"
                          value={answer(field.path)}
                          onValueChange={(value) => setDraft((prev) => ({ ...prev, [field.path]: value }))}
                        >
                          {TRI_OPTIONS.map((option) => (
                            <label className="form-radio" key={option.value}>
                              <RadioGroupItem value={option.value} />
                              {option.label}
                            </label>
                          ))}
                        </RadioGroup>
                      ) : field.kind === "select" ? (
                        <Select
                          value={answer(field.path)}
                          onValueChange={(value) => setDraft((prev) => ({ ...prev, [field.path]: value }))}
                        >
                          <SelectTrigger id={bound.id} className="form-select-trigger">
                            <SelectValue placeholder="Not answered" />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options ?? []).map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          {...bound}
                          placeholder="Not answered"
                          value={answer(field.path)}
                          onChange={(event) => setDraft((prev) => ({ ...prev, [field.path]: event.target.value }))}
                        />
                      )
                    }
                  </FormField>
                ))
              )}
            </div>

            <div className="form-actions form-actions-split mt-5">
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
                <ArrowLeft /> Back
              </Button>
              <Button onClick={() => void saveAndContinue()} disabled={saving}>
                {saving ? "Saving…" : lastStep ? "Save and finish" : "Save and continue"}
                {lastStep ? null : <ArrowRight />}
              </Button>
            </div>
          </>
        ) : null}
      </ContentPanel>

      {assignment.state === "accepted" ? (
        <NoticePanel className="mt-4" icon={<Check size={16} aria-hidden="true" />}>
          This survey has been applied to the household record.
        </NoticePanel>
      ) : null}

      {applyError && assignment.state !== "accepted" ? (
        <NoticePanel className="mt-4" icon={<TriangleAlert size={16} aria-hidden="true" />}>
          {applyError}
        </NoticePanel>
      ) : null}
    </div>
  );
}

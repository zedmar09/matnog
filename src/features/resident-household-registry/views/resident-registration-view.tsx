"use client";
import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Crown, Info, Mars, TriangleAlert, Venus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { FormSection } from "@/shared/components/form-section";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { BARANGAYS } from "../data/barangays";
import { HOUSEHOLDS, STRUCTURES } from "../data/households";
import { useRegistryActor } from "../hooks/use-registry-actor";
import { type ResidentValues, residentSchema } from "../schemas/registry-schema";
import { findPossibleMatches, type PossibleMatch, registerResident } from "../services/registry-operations";
import { canEditRegistry } from "../services/registry-projections";
import { createStructureForAddress } from "../services/registry-repository";
import { fullName } from "../services/registry-rules";

type Step = "identity" | "placement" | "matches" | "review";

const STEPS: { id: Step; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "placement", label: "Residency" },
  { id: "matches", label: "Possible matches" },
  { id: "review", label: "Review" },
];

type Placement = {
  barangayId: string;
  householdId: string;
  houseNumber: string;
  street: string;
  sitio: string;
  purok: string;
  relationshipToHead: string;
  /** A head of household has no relationship to a head of their own. */
  isHead: boolean;
  from: string;
};

const CIVIL_STATUS = ["Single", "Married", "Widowed", "Separated", "Annulled"];

export function ResidentRegistrationView() {
  const actor = useRegistryActor();
  const { scenario } = useWorkspaceSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>("identity");
  const [placement, setPlacement] = useState<Placement>({
    barangayId: BARANGAYS[0]?.id ?? "",
    householdId: HOUSEHOLDS[0]?.envelope.id ?? "",
    houseNumber: "",
    street: "",
    sitio: "",
    purok: "",
    relationshipToHead: "",
    isHead: false,
    from: "",
  });
  // The household determines the building, so the address is derived, never typed.
  const selectedHousehold = HOUSEHOLDS.find((item) => item.envelope.id === placement.householdId);
  const selectedStructure = STRUCTURES.find((item) => item.envelope.id === selectedHousehold?.structureId);
  const addressLine =
    [
      [placement.houseNumber, placement.street].filter(Boolean).join(" "),
      placement.sitio,
      placement.purok,
      BARANGAYS.find((item) => item.id === placement.barangayId)?.label,
    ]
      .filter(Boolean)
      .join(", ") || "No address entered";
  const householdsInBarangay = HOUSEHOLDS.filter((item) => {
    const structure = STRUCTURES.find((entry) => entry.envelope.id === item.structureId);
    return !placement.barangayId || structure?.barangay.id === placement.barangayId;
  });

  // The selected household proposes its building's address; the clerk can correct it.
  useEffect(() => {
    const household = HOUSEHOLDS.find((item) => item.envelope.id === placement.householdId);
    const structure = STRUCTURES.find((item) => item.envelope.id === household?.structureId);
    if (!structure) return;
    setPlacement((prev) => ({
      ...prev,
      houseNumber: structure.houseNumber,
      street: structure.street,
      sitio: structure.sitio,
      purok: structure.purok,
    }));
  }, [placement.householdId]);

  const [matches, setMatches] = useState<PossibleMatch[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors: fieldErrors },
    control,
  } = useForm<ResidentValues>({
    resolver: zodResolver(residentSchema),
    // Values survive back-navigation between steps because the form stays
    // mounted; nothing is discarded when a reviewer checks an earlier answer.
    defaultValues: {
      firstName: "",
      lastName: "",
      birthDate: "",
      sex: "female",
      civilStatus: "Single",
      citizenship: "Filipino",
    },
  });

  if (!actor || !canEditRegistry(actor)) {
    return (
      <PermissionState
        title="Registration is not available to this role"
        description="Registering a resident is limited to barangay registry staff and the municipal data steward."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/residents">Back to residents</Link>
          </Button>
        }
      />
    );
  }

  const editor = actor;

  const goToMatches = async () => {
    setChecking(true);
    const values = getValues();
    const result = await findPossibleMatches(editor, values, scenario);
    setChecking(false);
    setMatches(result.kind === "success" ? result.data : []);
    setStep("matches");
  };

  /** Reuses the household's building unless the clerk changed the address. */
  const resolveStructureId = async () => {
    const unchanged =
      selectedStructure &&
      selectedStructure.houseNumber === placement.houseNumber &&
      selectedStructure.street === placement.street &&
      selectedStructure.sitio === placement.sitio &&
      selectedStructure.purok === placement.purok;
    if (unchanged) return selectedStructure.envelope.id;
    const barangay = BARANGAYS.find((item) => item.id === placement.barangayId);
    if (!actor || !barangay) return selectedStructure?.envelope.id ?? "";
    const created = await createStructureForAddress(
      actor,
      {
        houseNumber: placement.houseNumber,
        street: placement.street,
        sitio: placement.sitio,
        purok: placement.purok,
        barangay,
      },
      selectedHousehold ? [selectedHousehold.envelope.id] : [],
      scenario,
    );
    return created.kind === "success" ? created.data.envelope.id : (selectedStructure?.envelope.id ?? "");
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    const structureId = await resolveStructureId();
    setErrors([]);
    const values = getValues();
    const barangay = BARANGAYS.find((item) => item.id === placement.barangayId);
    if (!barangay) {
      setSaving(false);
      setErrors([{ id: "barangayId", message: "Select a barangay." }]);
      return;
    }
    const result = await registerResident(
      editor,
      {
        ...values,
        barangay,
        structureId: structureId,
        householdId: placement.householdId,
        relationshipToHead: placement.isHead ? "Head" : placement.relationshipToHead,
        from: placement.from,
      },
      (matches ?? []).map((match) => match.person.envelope.id),
      scenario,
    );
    setSaving(false);
    if (result.kind === "invalid") {
      setErrors(result.errors);
      return;
    }
    if (result.kind !== "success") {
      setErrors([
        { id: "firstName", message: result.kind === "denied" ? result.message : "The record could not be created." },
      ]);
      return;
    }
    router.push(`/ops/residents/${result.data.envelope.id}`);
  };

  const activeIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <>
      <div className="registry-wizard">
        <div className="registry-wizard-head">
          <h1>Register a resident</h1>
          <p>
            A new record starts as an unverified draft. Registration records a person; it does not prove residency or
            issue any credential.
          </p>
        </div>

        <ol className="registry-steps">
          {STEPS.map((item, index) => (
            <li key={item.id} data-state={index === activeIndex ? "current" : index < activeIndex ? "done" : "todo"}>
              <span>{index < activeIndex ? <Check size={13} /> : index + 1}</span>
              {item.label}
            </li>
          ))}
        </ol>

        <ErrorSummary errors={errors} />

        {step === "identity" && (
          <ContentPanel>
            <SectionHeading
              title="Who is being registered?"
              description="Names and demographic details. A future birth date is rejected against the prototype's demo date."
            />
            <form onSubmit={handleSubmit(() => setStep("placement"))} noValidate className="mt-6">
              <FormSection title="Name">
                <FormField id="firstName" label="First name" required error={fieldErrors.firstName?.message}>
                  {(field) => <Input {...field} placeholder="Mara" {...register("firstName")} />}
                </FormField>
                <FormField id="middleName" label="Middle name">
                  {(field) => <Input {...field} placeholder="Reyes" {...register("middleName")} />}
                </FormField>
                <FormField id="lastName" label="Last name" required error={fieldErrors.lastName?.message}>
                  {(field) => <Input {...field} placeholder="Dela Cruz" {...register("lastName")} />}
                </FormField>
                <FormField id="suffix" label="Suffix">
                  {(field) => <Input {...field} placeholder="Jr., III" {...register("suffix")} />}
                </FormField>
              </FormSection>

              <FormSection title="Demographics">
                <FormField id="birthDate" label="Date of birth" required error={fieldErrors.birthDate?.message}>
                  {(field) => <Input {...field} type="date" {...register("birthDate")} />}
                </FormField>
                <FormField id="sex" label="Gender" required error={fieldErrors.sex?.message}>
                  {(field) => (
                    <Controller
                      control={control}
                      name="sex"
                      render={({ field: bound }) => (
                        <RadioGroup
                          className="form-radio-row"
                          value={bound.value}
                          onValueChange={bound.onChange}
                          aria-labelledby={`${field.id}-label`}
                        >
                          <label className="form-radio">
                            <RadioGroupItem value="female" />
                            <Venus size={14} aria-hidden="true" />
                            Female
                          </label>
                          <label className="form-radio">
                            <RadioGroupItem value="male" />
                            <Mars size={14} aria-hidden="true" />
                            Male
                          </label>
                        </RadioGroup>
                      )}
                    />
                  )}
                </FormField>
                <FormField id="civilStatus" label="Civil status" required error={fieldErrors.civilStatus?.message}>
                  {(field) => (
                    <Controller
                      control={control}
                      name="civilStatus"
                      render={({ field: bound }) => (
                        <Select value={bound.value} onValueChange={bound.onChange}>
                          <SelectTrigger id={field.id} className="form-select-trigger">
                            <SelectValue placeholder="Select a civil status" />
                          </SelectTrigger>
                          <SelectContent>
                            {CIVIL_STATUS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                </FormField>
                <FormField id="citizenship" label="Citizenship" required error={fieldErrors.citizenship?.message}>
                  {(field) => <Input {...field} placeholder="Filipino" {...register("citizenship")} />}
                </FormField>
                <FormField id="occupation" label="Occupation">
                  {(field) => <Input {...field} placeholder="Fisher, teacher, vendor" {...register("occupation")} />}
                </FormField>
                <FormField id="contactNumber" label="Contact number">
                  {(field) => <Input {...field} placeholder="09XX XXX XXXX" {...register("contactNumber")} />}
                </FormField>
                <p className="form-info">
                  <Info size={15} aria-hidden="true" />
                  <span>
                    This contact number is how the resident requests a document later. It confirms the request against
                    this record and supports validation of residency, so keep it current.
                  </span>
                </p>
              </FormSection>

              <div className="form-actions">
                <Button type="button" variant="ghost" asChild>
                  <Link href="/ops/residents">Cancel</Link>
                </Button>
                <Button type="submit">
                  Next
                  <ArrowRight />
                </Button>
              </div>
            </form>
          </ContentPanel>
        )}

        {step === "placement" && (
          <ContentPanel>
            <SectionHeading
              title="Where do they live?"
              description="Residency and household membership are separate relationships. Both start on the date you give here."
            />
            <div className="mt-6">
              <FormSection title="Address">
                <FormField id="barangayId" label="Barangay" required>
                  {(field) => (
                    <Select
                      value={placement.barangayId}
                      onValueChange={(value) =>
                        setPlacement((prev) => {
                          const first = HOUSEHOLDS.find((item) => {
                            const structure = STRUCTURES.find((entry) => entry.envelope.id === item.structureId);
                            return structure?.barangay.id === value;
                          });
                          return { ...prev, barangayId: value, householdId: first?.envelope.id ?? "" };
                        })
                      }
                    >
                      <SelectTrigger id={field.id} className="form-select-trigger">
                        <SelectValue placeholder="Select a barangay" />
                      </SelectTrigger>
                      <SelectContent>
                        {BARANGAYS.map((barangay) => (
                          <SelectItem key={barangay.id} value={barangay.id}>
                            {barangay.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
                <FormField id="householdId" label="Household" required>
                  {(field) => (
                    <Select
                      value={placement.householdId}
                      onValueChange={(value) => setPlacement((prev) => ({ ...prev, householdId: value }))}
                    >
                      <SelectTrigger id={field.id} className="form-select-trigger">
                        <SelectValue placeholder="Select a household" />
                      </SelectTrigger>
                      <SelectContent>
                        {householdsInBarangay.map((household) => (
                          <SelectItem key={household.envelope.id} value={household.envelope.id}>
                            {household.envelope.scope.label} · {household.envelope.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
                <FormField id="houseNumber" label="House or lot number">
                  {(field) => (
                    <Input
                      {...field}
                      placeholder="12"
                      value={placement.houseNumber}
                      onChange={(event) => setPlacement((prev) => ({ ...prev, houseNumber: event.target.value }))}
                    />
                  )}
                </FormField>
                <FormField id="street" label="Street" required>
                  {(field) => (
                    <Input
                      {...field}
                      placeholder="Seaside Street"
                      value={placement.street}
                      onChange={(event) => setPlacement((prev) => ({ ...prev, street: event.target.value }))}
                    />
                  )}
                </FormField>
                <FormField id="sitio" label="Sitio">
                  {(field) => (
                    <Input
                      {...field}
                      placeholder="Sitio Malinao"
                      value={placement.sitio}
                      onChange={(event) => setPlacement((prev) => ({ ...prev, sitio: event.target.value }))}
                    />
                  )}
                </FormField>
                <FormField id="purok" label="Purok" required>
                  {(field) => (
                    <Input
                      {...field}
                      placeholder="Purok 1"
                      value={placement.purok}
                      onChange={(event) => setPlacement((prev) => ({ ...prev, purok: event.target.value }))}
                    />
                  )}
                </FormField>
                <FormField
                  id="relationshipToHead"
                  label="Relationship to the household head"
                  className="form-field-wide"
                  hint={placement.isHead ? "Not needed for the household head." : undefined}
                >
                  {(field) => (
                    <Input
                      {...field}
                      placeholder="Son, tenant, parent"
                      disabled={placement.isHead}
                      value={placement.isHead ? "" : placement.relationshipToHead}
                      onChange={(event) =>
                        setPlacement((prev) => ({ ...prev, relationshipToHead: event.target.value }))
                      }
                    />
                  )}
                </FormField>
                <label className="form-case" data-state={placement.isHead ? "on" : "off"}>
                  <Checkbox
                    checked={placement.isHead}
                    onCheckedChange={(checked) => setPlacement((prev) => ({ ...prev, isHead: checked === true }))}
                  />
                  <span className="form-case-badge">
                    <Crown size={13} aria-hidden="true" />
                    Head of household
                  </span>
                  <small>Records the membership as Head, so no relationship is needed.</small>
                </label>
              </FormSection>

              <FormSection title="Residency">
                <FormField
                  id="from"
                  label="Residency start date"
                  hint="Leave empty to use today's date."
                  className="form-field-wide"
                >
                  {(field) => (
                    <Input
                      {...field}
                      type="date"
                      value={placement.from}
                      onChange={(event) => setPlacement((prev) => ({ ...prev, from: event.target.value }))}
                    />
                  )}
                </FormField>
              </FormSection>
            </div>
            <div className="form-actions form-actions-split">
              <Button variant="outline" onClick={() => setStep("identity")}>
                <ArrowLeft />
                Back
              </Button>
              <Button onClick={() => void goToMatches()} disabled={checking}>
                {checking ? "Checking…" : "Next"}
                <ArrowRight />
              </Button>
            </div>
          </ContentPanel>
        )}

        {step === "matches" && (
          <ContentPanel>
            <SectionHeading
              title="Possible matches"
              description="These are suggestions for you to judge. Nothing is merged automatically, and continuing records that you reviewed them."
            />
            {matches === null || matches.length === 0 ? (
              <div className="registry-no-matches" role="status">
                <span>
                  <Check size={20} aria-hidden="true" />
                </span>
                <div>
                  <strong>No existing record looks like this person</strong>
                  <p>
                    The registry was checked against name, date of birth and household. Continue to review the details
                    before saving.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="registry-matches">
                {matches.map((match) => (
                  <li key={match.person.envelope.id}>
                    <div>
                      <strong>{fullName(match.person)}</strong>
                      <p>
                        {match.person.envelope.id} · born {match.person.birthDate}
                      </p>
                      <ul className="check-list">
                        {match.signals.map((signal) => (
                          <li key={signal}>
                            <TriangleAlert size={15} />
                            <span>{signal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="registry-membership-actions">
                      <StatusBadge tone="warning">Match score {Math.round(match.score * 100)}%</StatusBadge>
                      <Link className="text-link" href={`/ops/residents/${match.person.envelope.id}`}>
                        Open existing record
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="form-actions form-actions-split">
              <Button variant="outline" onClick={() => setStep("placement")}>
                <ArrowLeft />
                Back
              </Button>
              <Button onClick={() => setStep("review")}>
                Next
                <ArrowRight />
              </Button>
            </div>
          </ContentPanel>
        )}

        {step === "review" && (
          <ContentPanel>
            <SectionHeading
              title="Review and create"
              description="The record is created as an unverified draft. Verification is a separate step handled by the reviewing office."
            />
            <dl className="registry-facts">
              <div>
                <dt>Name</dt>
                <dd>
                  {[getValues("firstName"), getValues("middleName"), getValues("lastName"), getValues("suffix")]
                    .filter(Boolean)
                    .join(" ")}
                </dd>
              </div>
              <div>
                <dt>Date of birth</dt>
                <dd>{getValues("birthDate")}</dd>
              </div>
              <div>
                <dt>Gender</dt>
                <dd>{getValues("sex") === "female" ? "Female" : "Male"}</dd>
              </div>
              <div>
                <dt>Civil status</dt>
                <dd>{getValues("civilStatus")}</dd>
              </div>
              <div>
                <dt>Citizenship</dt>
                <dd>{getValues("citizenship")}</dd>
              </div>
              <div>
                <dt>Occupation</dt>
                <dd>{getValues("occupation") || "Not given"}</dd>
              </div>
              <div>
                <dt>Contact number</dt>
                <dd>{getValues("contactNumber") || "Not given"}</dd>
              </div>
              <div>
                <dt>Barangay</dt>
                <dd>{BARANGAYS.find((item) => item.id === placement.barangayId)?.label}</dd>
              </div>
              <div>
                <dt>Household</dt>
                <dd>
                  {selectedHousehold?.envelope.scope.label ?? placement.householdId}
                  <small>{placement.householdId}</small>
                </dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{addressLine}</dd>
              </div>
              <div>
                <dt>Relationship to head</dt>
                <dd>{placement.isHead ? "Head of household" : placement.relationshipToHead || "Not given"}</dd>
              </div>
              <div>
                <dt>Residency start</dt>
                <dd>{placement.from || "Today"}</dd>
              </div>
              <div>
                <dt>Possible matches reviewed</dt>
                <dd>
                  {matches && matches.length > 0
                    ? matches.map((match) => match.person.envelope.id).join(", ")
                    : "None found"}
                </dd>
              </div>
              <div>
                <dt>Record state on save</dt>
                <dd>Unverified draft</dd>
              </div>
            </dl>
            <div className="form-actions form-actions-split">
              <Button variant="outline" onClick={() => setStep("matches")}>
                <ArrowLeft />
                Back
              </Button>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </ContentPanel>
        )}

        <NoticePanel dot>
          No civil registry, PhilSys reference or municipal ID is created or contacted by this form.
        </NoticePanel>
      </div>
    </>
  );
}

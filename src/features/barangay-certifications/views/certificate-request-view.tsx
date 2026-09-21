"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, FileText, Phone } from "lucide-react";
import { type FieldErrors, useForm } from "react-hook-form";

import { BARANGAYS } from "@/features/resident-household-registry/data/barangays";
import {
  type OwnResidentProfile,
  readOwnResidentProfile,
} from "@/features/resident-household-registry/services/registry-selectors";
import {
  type AuthChallenge,
  DEMO_OTP_CODE,
  startChallenge,
  verifyChallenge,
} from "@/features/unified-account-and-id/services/auth-simulation";
import { ContentPanel } from "@/shared/components/content-panel";
import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useDemoSession } from "@/shared/providers/demo-session-provider";

import { CERTIFICATE_CATALOG } from "../data/certificate-journey";
import {
  type CertificateRequestValues,
  certificateEvidenceOptions,
  certificateRequestSchema,
  defaultEvidenceFor,
} from "../schemas/certificate-request-schema";
import { certificateRepository } from "../services/certificate-repository";

const PHONE_PATTERN = /^(09\d{9}|\+639\d{9})$/;
const DEMO_PHONE = "09170000000";

function collectFieldErrors(errors: FieldErrors<CertificateRequestValues>): FieldError[] {
  return Object.entries(errors).flatMap(([id, error]) =>
    typeof error?.message === "string" ? [{ id, message: error.message }] : [],
  );
}

export function CertificateRequestView() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, ready, signIn } = useDemoSession();

  const requestedType = params.get("type");
  const initialType = CERTIFICATE_CATALOG.some((item) => item.id === requestedType)
    ? (requestedType as CertificateRequestValues["certificateTypeId"])
    : "residency";

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [challenge, setChallenge] = useState<AuthChallenge>();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneError, setPhoneError] = useState<string>();
  const [summaryErrors, setSummaryErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [residentProfile, setResidentProfile] = useState<RepositoryResult<OwnResidentProfile> | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors: fieldErrors },
  } = useForm<CertificateRequestValues>({
    resolver: zodResolver(certificateRequestSchema),
    defaultValues: {
      certificateTypeId: initialType,
      purpose: "",
      requestingOffice: "",
      barangayId: "DEMO-BRGY-A",
      claimMethod: "barangay-counter",
      evidenceRef: defaultEvidenceFor(initialType),
    },
  });

  const values = watch();
  const certificateTypeField = register("certificateTypeId");
  const selectedType = CERTIFICATE_CATALOG.find((item) => item.id === values.certificateTypeId);
  const verified = Boolean(session);

  useEffect(() => {
    if (session?.phone) {
      setPhone(session.phone);
      setStep(2);
    }
  }, [session?.phone]);

  const linkedPersonId =
    session?.residentAssociation?.status === "linked" ? session.residentAssociation.personId : undefined;
  useEffect(() => {
    if (!linkedPersonId) return setResidentProfile(null);
    let active = true;
    void readOwnResidentProfile(linkedPersonId).then((result) => {
      if (!active) return;
      setResidentProfile(result);
      if (result.kind === "success" && result.data.currentBarangay) {
        setValue("barangayId", result.data.currentBarangay.id as CertificateRequestValues["barangayId"]);
      }
    });
    return () => {
      active = false;
    };
  }, [linkedPersonId, setValue]);

  function sendCode() {
    setPhoneError(undefined);
    if (!PHONE_PATTERN.test(phone.replaceAll(" ", ""))) {
      setPhoneError("Enter a Philippine mobile number, for example 09171234567.");
      return;
    }
    const result = startChallenge({ phone, scenario: "normal" });
    if (result.kind === "blocked") {
      setPhoneError(result.message);
      return;
    }
    setChallenge(result.challenge);
    setStep(1);
  }

  function confirmCode() {
    if (!challenge) return;
    setPhoneError(undefined);
    const outcome = verifyChallenge(challenge, code.trim());
    if (outcome === "expired") {
      setPhoneError("That code has expired. Send a new one.");
      return;
    }
    if (outcome === "incorrect") {
      setPhoneError("That code does not match. Check the message and try again.");
      return;
    }
    signIn(phone);
    setCode("");
    setStep(2);
  }

  const submit = async (input: CertificateRequestValues) => {
    if (!session) return;
    setSummaryErrors([]);
    setSubmitting(true);
    if (input.certificateTypeId === "business-clearance") {
      setSummaryErrors([
        { id: "certificateTypeId", message: "Select an authorized business requester for a business clearance." },
      ]);
      setSubmitting(false);
      return;
    }
    const personId =
      session.residentAssociation?.status === "linked" ? session.residentAssociation.personId : undefined;
    const profile = personId ? await readOwnResidentProfile(personId) : null;
    if (profile?.kind !== "success" || !profile.data.currentBarangay) {
      setSummaryErrors([
        {
          id: "barangayId",
          message: "An approved resident link and current M01 barangay are required for this request.",
        },
      ]);
      setSubmitting(false);
      return;
    }
    if (input.barangayId !== profile.data.currentBarangay.id) {
      setSummaryErrors([
        { id: "barangayId", message: "The issuing barangay must match your current resident record." },
      ]);
      setSubmitting(false);
      return;
    }
    const result = certificateRepository.submitRequest({
      values: input,
      requesterId: session.accountId,
      requesterLabel: session.name,
      subject: {
        kind: "person",
        id: profile.data.personId,
        label: profile.data.displayName,
        barangayId: profile.data.currentBarangay.id,
        barangayLabel: profile.data.currentBarangay.label,
      },
    });
    setSubmitting(false);
    if (result.kind === "invalid") {
      setSummaryErrors(result.errors);
      return;
    }
    if (result.kind !== "success") {
      setSummaryErrors([{ id: "purpose", message: "The request could not be submitted. Try again." }]);
      return;
    }
    router.push(`/certificates/${result.data.request.envelope.id}`);
  };

  if (!ready) {
    return (
      <div className="site-container page-loading" role="status">
        Preparing your request…
      </div>
    );
  }

  const steps = ["Mobile number", "Confirm code", "Request details"];

  return (
    <div className="site-container page-content">
      <PageHeader
        parent="Barangay certificates"
        parentHref="/services/barangay-certificates"
        title="Request a document"
        description="Three quick steps. We issue a control number you can track."
      />

      {selectedType ? (
        <p className="wizard-selection">
          <FileText size={15} aria-hidden="true" />
          You are requesting <strong>{selectedType.title}</strong>
        </p>
      ) : null}

      <ErrorSummary errors={summaryErrors} />

      <div className="request-flow">
        <ol className="wizard-steps">
          {steps.map((label, index) => (
            <li key={label} data-state={index === step ? "current" : index < step ? "done" : "todo"}>
              <span>{index < step ? <Check size={13} aria-hidden="true" /> : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <ContentPanel as="section">
            <h2>Your mobile number</h2>
            <p className="muted">We use it to confirm the request and to text you the result. No account needed.</p>
            <div className="wizard-body wizard-body--narrow">
              <FormField id="phone" label="Mobile number" error={phoneError}>
                {(field) => (
                  <Input
                    {...field}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="09XX XXX XXXX"
                    inputMode="tel"
                  />
                )}
              </FormField>
              <button type="button" className="demo-hint-button" onClick={() => setPhone(DEMO_PHONE)}>
                Use the demo number: {DEMO_PHONE}
              </button>
            </div>
            <div className="registry-actions">
              <Button type="button" onClick={sendCode}>
                Next <ArrowRight />
              </Button>
              <Button asChild type="button" variant="ghost">
                <Link href="/services/barangay-certificates">Cancel</Link>
              </Button>
            </div>
          </ContentPanel>
        )}

        {step === 1 && (
          <ContentPanel as="section">
            <h2>Confirm your number</h2>
            <p className="muted">We sent a code to {phone}.</p>
            <div className="wizard-body wizard-body--narrow">
              <FormField id="code" label="Enter the code" error={phoneError}>
                {(field) => (
                  <Input
                    {...field}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                  />
                )}
              </FormField>
              <button type="button" className="demo-hint-button" onClick={() => setCode(DEMO_OTP_CODE)}>
                Use the demo code: {DEMO_OTP_CODE}
              </button>
            </div>
            <div className="registry-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setChallenge(undefined);
                  setPhoneError(undefined);
                  setStep(0);
                }}
              >
                <ArrowLeft /> Back
              </Button>
              <Button type="button" onClick={confirmCode}>
                Next <ArrowRight />
              </Button>
            </div>
          </ContentPanel>
        )}

        {step === 2 && (
          <ContentPanel as="section">
            <h2>Request details</h2>
            <p className="muted">What you need and why. The barangay confirms the rest during review.</p>
            {verified && (
              <p className="request-verified" role="status">
                <Phone size={15} aria-hidden="true" />
                {session?.phone} confirmed
              </p>
            )}
            <form onSubmit={handleSubmit(submit, (errors) => setSummaryErrors(collectFieldErrors(errors)))} noValidate>
              <div className="wizard-body">
                <FormField id="certificateTypeId" label="Document type" error={fieldErrors.certificateTypeId?.message}>
                  {(field) => (
                    <NativeSelect
                      {...field}
                      {...certificateTypeField}
                      className="w-full"
                      onChange={(event) => {
                        void certificateTypeField.onChange(event);
                        const typeId = event.target.value as CertificateRequestValues["certificateTypeId"];
                        setValue("evidenceRef", defaultEvidenceFor(typeId), { shouldValidate: true });
                      }}
                    >
                      {CERTIFICATE_CATALOG.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </FormField>

                <input type="hidden" {...register("barangayId")} />
                <FormField
                  id="registeredBarangay"
                  label="Current registered barangay"
                  error={fieldErrors.barangayId?.message}
                >
                  {(field) => (
                    <Input
                      {...field}
                      readOnly
                      value={
                        residentProfile?.kind === "success"
                          ? (residentProfile.data.currentBarangay?.label ?? "No current residency")
                          : linkedPersonId
                            ? "Checking resident record…"
                            : "Resident link required"
                      }
                    />
                  )}
                </FormField>
                {linkedPersonId &&
                  residentProfile?.kind === "success" &&
                  !BARANGAYS.some((barangay) => barangay.id === residentProfile.data.currentBarangay?.id) && (
                    <p className="small-note">
                      The current barangay has no certificate issuing desk in this local workspace.
                    </p>
                  )}

                <FormField id="purpose" label="What is it for?" error={fieldErrors.purpose?.message}>
                  {(field) => (
                    <Textarea
                      {...field}
                      {...register("purpose")}
                      placeholder="Example: Scholarship application for school year 2026–2027"
                    />
                  )}
                </FormField>

                <FormField
                  id="requestingOffice"
                  label="Who is asking for it?"
                  error={fieldErrors.requestingOffice?.message}
                >
                  {(field) => (
                    <Input
                      {...field}
                      {...register("requestingOffice")}
                      placeholder="Example: Matnog Community College"
                    />
                  )}
                </FormField>

                <FormField
                  id="evidenceRef"
                  label="Supporting document"
                  error={fieldErrors.evidenceRef?.message}
                  hint={
                    selectedType
                      ? `For a ${selectedType.title.toLowerCase()}, bring this when you claim.`
                      : "Bring this when you claim."
                  }
                >
                  {(field) => (
                    <NativeSelect {...field} {...register("evidenceRef")} className="w-full">
                      {certificateEvidenceOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </FormField>

                <FormField id="claimMethod" label="How will you claim it?" error={fieldErrors.claimMethod?.message}>
                  {(field) => (
                    <NativeSelect {...field} {...register("claimMethod")} className="w-full">
                      <option value="barangay-counter">Pick up at the barangay</option>
                      <option value="digital-copy">Download a copy</option>
                    </NativeSelect>
                  )}
                </FormField>
              </div>

              <div className="registry-actions">
                <Button type="button" variant="outline" onClick={() => setStep(session ? 0 : 1)}>
                  <ArrowLeft /> Back
                </Button>
                <Button type="submit" disabled={!verified || residentProfile?.kind !== "success" || submitting}>
                  {submitting ? "Submitting…" : "Submit request"} <ArrowRight />
                </Button>
              </div>
            </form>
          </ContentPanel>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowLeft, ArrowRight, Check, Copy, FileText, Phone } from "lucide-react";

import type { Service } from "@/features/service-directory/types/service";
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
import { formatDemoDateTime } from "@/shared/data/demo-clock";

import { getRequestForm, type RequestField } from "../data/request-forms";
import { nextControlNumber, recordRequest, type SubmittedRequest } from "../services/request-store";

const PHONE_PATTERN = /^(09\d{9}|\+639\d{9})$/;
const DEMO_PHONE = "09171234567";

export function ServiceRequestView({ service, requestType }: { service: Service; requestType?: string }) {
  const form = getRequestForm(service.slug);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [challenge, setChallenge] = useState<AuthChallenge>();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState<string>();
  const [phoneError, setPhoneError] = useState<string>();
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    requestType && form?.fields[0]?.kind === "select" ? { [form.fields[0].id]: requestType } : {},
  );
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitted, setSubmitted] = useState<SubmittedRequest>();
  const [copied, setCopied] = useState(false);

  if (!form) {
    return (
      <div className="site-container page-content">
        <PageHeader
          parent={service.title}
          parentHref={`/services/${service.slug}`}
          title="Request this service"
          description="This service is handled at the office for now."
        />
        <ContentPanel>
          <p>
            Contact {service.office} on {service.contactNumber} to start this request.
          </p>
          <div className="registry-actions">
            <Button asChild variant="outline">
              <Link href={`/services/${service.slug}`}>Back to the service</Link>
            </Button>
          </div>
        </ContentPanel>
      </div>
    );
  }

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
    const outcome = verifyChallenge(challenge, code.trim());
    if (outcome === "expired") {
      setPhoneError("That code has expired. Send a new one.");
      return;
    }
    if (outcome === "incorrect") {
      setPhoneError("That code does not match. Check the message and try again.");
      return;
    }
    setPhoneError(undefined);
    setVerifiedPhone(phone);
    setCode("");
    setStep(2);
  }

  const config = form;

  function submit() {
    const missing = config.fields
      .filter((field) => field.required && !answers[field.id]?.trim())
      .map((field) => ({ id: field.id, message: `${field.label} is required.` }));
    if (missing.length > 0) {
      setErrors(missing);
      return;
    }
    setErrors([]);
    const record = recordRequest({
      controlNumber: nextControlNumber(config.prefix),
      serviceSlug: service.slug,
      serviceTitle: service.title,
      phone: verifiedPhone ?? phone,
      answers: config.fields.map((field) => ({
        label: field.label,
        value: labelFor(field, answers[field.id] ?? ""),
      })),
    });
    setSubmitted(record);
  }

  if (submitted) {
    return (
      <div className="site-container page-content">
        <PageHeader
          parent={service.title}
          parentHref={`/services/${service.slug}`}
          title="Request received"
          description="Keep your control number. Use it to follow this request and at the counter."
        />
        <div className="request-flow">
          <div className="control-number" role="status">
            <span>Control number</span>
            <strong>{submitted.controlNumber}</strong>
            <small>We also sent it to {submitted.phone}.</small>
          </div>
          <ContentPanel as="section">
            <h2>What you sent</h2>
            <dl className="registry-facts">
              <div>
                <dt>Service</dt>
                <dd>{submitted.serviceTitle}</dd>
              </div>
              {submitted.answers
                .filter((answer) => answer.value)
                .map((answer) => (
                  <div key={answer.label}>
                    <dt>{answer.label}</dt>
                    <dd>{answer.value}</dd>
                  </div>
                ))}
              <div>
                <dt>Received</dt>
                <dd>{formatDemoDateTime(submitted.submittedAt)}</dd>
              </div>
            </dl>
            <div className="registry-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard?.writeText(submitted.controlNumber).then(() => setCopied(true));
                }}
              >
                <Copy /> {copied ? "Copied" : "Copy control number"}
              </Button>
              <Button asChild variant="ghost">
                <Link href="/track">Track a request</Link>
              </Button>
            </div>
          </ContentPanel>
        </div>
      </div>
    );
  }

  const verified = Boolean(verifiedPhone);
  const steps = ["Mobile number", "Confirm code", "Request details"];

  // The first select is the "what do you need" field, so it names the request.
  const typeField = config.fields[0]?.kind === "select" ? config.fields[0] : undefined;
  const selectedTypeLabel = typeField?.options?.find((option) => option.value === answers[typeField.id])?.label;

  return (
    <div className="site-container page-content">
      <PageHeader
        parent={service.title}
        parentHref={`/services/${service.slug}`}
        title={`Request: ${service.title}`}
        description="Three quick steps. We issue a control number you can track."
      />

      {selectedTypeLabel ? (
        <p className="wizard-selection">
          <FileText size={15} aria-hidden="true" />
          You are requesting <strong>{selectedTypeLabel}</strong>
        </p>
      ) : null}

      <ErrorSummary errors={errors} />

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
                <Link href={`/services/${service.slug}`}>Cancel</Link>
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
            <p className="muted">{config.summary}</p>
            {verified && (
              <p className="request-verified" role="status">
                <Phone size={15} aria-hidden="true" />
                {verifiedPhone} confirmed
              </p>
            )}
            <div className="wizard-body">
              {config.fields.map((field) => (
                <FormField
                  key={field.id}
                  id={field.id}
                  label={field.label}
                  hint={field.hint}
                  error={errors.find((error) => error.id === field.id)?.message}
                >
                  {(bound) => renderField(field, bound, answers, setAnswers)}
                </FormField>
              ))}
            </div>
            <div className="registry-actions">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft /> Back
              </Button>
              <Button type="button" onClick={submit}>
                Submit request <ArrowRight />
              </Button>
            </div>
          </ContentPanel>
        )}
      </div>
    </div>
  );
}

function labelFor(field: RequestField, value: string) {
  if (field.kind !== "select") return value;
  return field.options?.find((option) => option.value === value)?.label ?? value;
}

function renderField(
  field: RequestField,
  bound: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined },
  answers: Record<string, string>,
  setAnswers: (update: (previous: Record<string, string>) => Record<string, string>) => void,
) {
  const value = answers[field.id] ?? "";
  const update = (next: string) => setAnswers((previous) => ({ ...previous, [field.id]: next }));

  if (field.kind === "select") {
    return (
      <NativeSelect {...bound} className="w-full" value={value} onChange={(event) => update(event.target.value)}>
        <option value="">Select one</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    );
  }
  if (field.kind === "textarea") {
    return (
      <Textarea
        {...bound}
        value={value}
        onChange={(event) => update(event.target.value)}
        placeholder={field.placeholder}
      />
    );
  }
  return (
    <Input
      {...bound}
      type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"}
      value={value}
      onChange={(event) => update(event.target.value)}
      placeholder={field.placeholder}
    />
  );
}

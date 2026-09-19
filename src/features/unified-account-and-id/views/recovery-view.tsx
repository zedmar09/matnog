"use client";

import { useState } from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleCheck, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";

import { FormField } from "@/shared/components/form-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

import { type RecoveryValues, recoverySchema } from "../schemas/auth-schema";

function ending(value: string) {
  return value.slice(-4);
}

export function RecoveryView() {
  const [submitted, setSubmitted] = useState<RecoveryValues | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecoveryValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { currentPhone: "", newPhone: "", reason: "" },
  });

  async function submit(values: RecoveryValues) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    setSubmitted(values);
  }

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-icon">
            <CircleCheck size={25} />
          </div>
          <span className="eyebrow">Demo recovery</span>
          <h1>Recovery review recorded.</h1>
          <p>No account or phone number was changed. This is a local UI state for the planned assisted-review flow.</p>
          <StatusBadge tone="pending">Manual review required</StatusBadge>
          <dl className="registry-facts mt-5">
            <div>
              <dt>Account reference</dt>
              <dd>DEMO-VIS-001</dd>
            </div>
            <div>
              <dt>Current number</dt>
              <dd>Ending in {ending(submitted.currentPhone)}</dd>
            </div>
            <div>
              <dt>Requested number</dt>
              <dd>Ending in {ending(submitted.newPhone)}</dd>
            </div>
            <div>
              <dt>Resident association</dt>
              <dd>Unchanged</dd>
            </div>
          </dl>
          <Button asChild className="mt-6">
            <Link href="/auth/phone">
              Return to demo sign-in
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-icon">
          <KeyRound size={25} />
        </div>
        <span className="eyebrow">Demo account recovery</span>
        <h1>Request a sample phone change.</h1>
        <p>This records a review request. It does not find an account, send a code, or change a phone number.</p>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <FormField
            id="current-phone"
            label="Current mobile number"
            error={errors.currentPhone?.message}
            hint="Use the account number."
          >
            {(field) => <Input {...field} type="tel" inputMode="tel" {...register("currentPhone")} />}
          </FormField>
          <FormField
            id="new-phone"
            label="Requested new mobile number"
            error={errors.newPhone?.message}
            hint="It must differ from the current number."
          >
            {(field) => <Input {...field} type="tel" inputMode="tel" {...register("newPhone")} />}
          </FormField>
          <FormField id="recovery-reason" label="Reason for recovery" error={errors.reason?.message}>
            {(field) => <Textarea {...field} rows={3} {...register("reason")} />}
          </FormField>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Recording sample request…" : "Request assisted review"}
            <ArrowRight />
          </Button>
        </form>
        <div className="demo-hint">
          <p>Use values to review the form and pending state.</p>
          <button
            className="sample-reference"
            type="button"
            onClick={() => {
              setValue("currentPhone", "09170000000", { shouldValidate: true });
              setValue("newPhone", "09171111111", { shouldValidate: true });
              setValue("reason", "The original demo handset is unavailable.", { shouldValidate: true });
            }}
          >
            Use demo recovery details
          </button>
        </div>
        <div className="auth-bottom">
          <Link href="/auth/phone" className="inline-link">
            Return to demo sign-in
          </Link>
        </div>
      </div>
    </div>
  );
}

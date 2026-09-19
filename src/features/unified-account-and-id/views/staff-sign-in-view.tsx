"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";

import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { type StaffMfaValues, type StaffSignInValues, staffMfaSchema, staffSignInSchema } from "../schemas/auth-schema";

const DEMO_STAFF = { username: "demo.staff", passcode: "STAFF2026", mfa: "654321" } as const;

export function StaffSignInView() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const credentials = useForm<StaffSignInValues>({
    resolver: zodResolver(staffSignInSchema),
    defaultValues: { username: "", passcode: "" },
  });
  const mfa = useForm<StaffMfaValues>({
    resolver: zodResolver(staffMfaSchema),
    defaultValues: { code: "" },
  });

  async function checkCredentials(values: StaffSignInValues) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (values.username !== DEMO_STAFF.username || values.passcode !== DEMO_STAFF.passcode) {
      setCredentialError("Those demo staff credentials do not match.");
      return;
    }
    setCredentialError(null);
    setStep("mfa");
  }

  async function checkMfa(values: StaffMfaValues) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (values.code !== DEMO_STAFF.mfa) {
      setMfaError("That demo staff code does not match. Use 654321.");
      return;
    }
    setMfaError(null);
    router.replace("/ops");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">
          <ShieldCheck size={25} />
        </div>
        <span className="eyebrow">Separate staff access · UI simulation</span>
        {step === "credentials" && (
          <>
            <h1>Open the staff demo.</h1>
            <p>Citizen phone verification cannot open staff tools. This form simulates a separate staff entry.</p>
            <form onSubmit={credentials.handleSubmit(checkCredentials)} noValidate>
              <FormField
                id="staff-username"
                label="Demo staff username"
                error={credentials.formState.errors.username?.message}
              >
                {(field) => <Input {...field} autoComplete="off" {...credentials.register("username")} />}
              </FormField>
              <FormField
                id="staff-passcode"
                label="Demo staff passcode"
                error={credentialError ?? credentials.formState.errors.passcode?.message}
              >
                {(field) => (
                  <Input {...field} type="password" autoComplete="off" {...credentials.register("passcode")} />
                )}
              </FormField>
              <Button type="submit" disabled={credentials.formState.isSubmitting}>
                Continue to staff verification
                <ArrowRight />
              </Button>
            </form>
            <div className="demo-hint">
              <p>No credential is authenticated or stored.</p>
              <button
                className="sample-reference"
                type="button"
                onClick={() => {
                  credentials.setValue("username", DEMO_STAFF.username, { shouldValidate: true });
                  credentials.setValue("passcode", DEMO_STAFF.passcode, { shouldValidate: true });
                }}
              >
                Use demo staff credentials
              </button>
            </div>
          </>
        )}
        {step === "mfa" && (
          <>
            <h1>Confirm the staff demo code.</h1>
            <p>This second step demonstrates stronger staff authentication without contacting an identity provider.</p>
            <form onSubmit={mfa.handleSubmit(checkMfa)} noValidate>
              <FormField
                id="staff-mfa"
                label="Six-digit staff code"
                error={mfaError ?? mfa.formState.errors.code?.message}
                hint="Use demo staff code 654321."
              >
                {(field) => (
                  <Input
                    {...field}
                    className="otp-input"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="off"
                    {...mfa.register("code")}
                  />
                )}
              </FormField>
              <Button type="submit" disabled={mfa.formState.isSubmitting}>
                Verify staff demo
                <ArrowRight />
              </Button>
            </form>
            <div className="otp-actions">
              <button type="button" onClick={() => setStep("credentials")}>
                Back to staff credentials
              </button>
            </div>
          </>
        )}
        <div className="auth-bottom">
          <Link href="/auth/phone" className="inline-link">
            Citizen demo sign-in
          </Link>
        </div>
      </div>
    </div>
  );
}

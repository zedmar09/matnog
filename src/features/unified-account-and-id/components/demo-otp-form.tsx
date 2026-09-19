"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Smartphone } from "lucide-react";
import { useForm } from "react-hook-form";

import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useDemoSession } from "@/shared/providers/demo-session-provider";

import { useDemoAuth } from "../providers/demo-auth-provider";
import { type OtpValues, otpSchema } from "../schemas/auth-schema";
import { buildPhoneEntryPath, resolvePostSignInPath } from "../services/account-navigation";
import { type AuthChallenge, DEMO_OTP_CODE, isChallengeExpired, verifyChallenge } from "../services/auth-simulation";

export function DemoOtpForm({ challenge }: { challenge: AuthChallenge }) {
  const router = useRouter();
  const { signIn } = useDemoSession();
  const { resendChallenge, clearChallenge } = useDemoAuth();
  const [now, setNow] = useState(() => Date.now());
  const [resent, setResent] = useState(false);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { code: "" } });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expired = isChallengeExpired(challenge, now);
  const cooldown = expired ? 0 : Math.max(0, 30 - Math.floor((now - challenge.issuedAt) / 1000));

  async function verify(values: OtpValues) {
    const result = verifyChallenge(challenge, values.code);
    if (result === "expired") {
      setError("code", { message: "This demo code has expired. Generate another code to continue." });
      return;
    }
    if (result === "incorrect") {
      setError("code", { message: `That code does not match. Use demo code ${DEMO_OTP_CODE}.` });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
    signIn(challenge.phone);
    clearChallenge();
    router.replace(resolvePostSignInPath(challenge));
  }

  function resend() {
    const next = resendChallenge();
    if (!next) return;
    setNow(next.issuedAt);
    resetField("code");
    setResent(true);
  }

  return (
    <>
      <div className="auth-icon">
        <Smartphone size={25} />
      </div>
      <span className="eyebrow">Step 2 of 2 · Demo sign-in</span>
      <h1>A quick check, then you’re in.</h1>
      <p>
        Enter the demo code for the number ending in <strong>{challenge.phone.slice(-4)}</strong>.
      </p>
      <form onSubmit={handleSubmit(verify)} noValidate>
        <FormField
          id="otp"
          label="Six-digit code"
          error={errors.code?.message}
          hint={expired ? "The demo code has expired." : "This demo code expires after 5 minutes."}
        >
          {(field) => (
            <Input
              {...field}
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              {...register("code")}
              placeholder="000000"
              autoFocus
              disabled={isSubmitting}
            />
          )}
        </FormField>
        <Button type="submit" disabled={isSubmitting || expired}>
          {isSubmitting ? "Opening your account…" : "Verify & continue"}
          <ArrowRight />
        </Button>
      </form>
      <div className="otp-actions">
        <button type="button" onClick={() => router.push(buildPhoneEntryPath(challenge))} disabled={isSubmitting}>
          Change number
        </button>
        <button type="button" onClick={resend} disabled={cooldown > 0 || isSubmitting}>
          {cooldown > 0 ? `Generate again in ${cooldown}s` : "Generate another demo code"}
        </button>
      </div>
      <div className="demo-hint">
        <p>
          Use demo code <strong>{DEMO_OTP_CODE}</strong>. No SMS is sent and the code is never stored.
        </p>
        {resent && <p role="status">Demo challenge {challenge.generation} is ready. The mobile number was kept.</p>}
      </div>
      <div className="auth-bottom">
        <Link href="/auth/recover" className="inline-link">
          Cannot receive a code? Try account recovery
        </Link>
      </div>
    </>
  );
}

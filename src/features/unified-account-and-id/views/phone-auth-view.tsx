"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Smartphone } from "lucide-react";
import { useForm } from "react-hook-form";

import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { useDemoAuth } from "../providers/demo-auth-provider";
import { type PhoneValues, phoneSchema } from "../schemas/auth-schema";
import { buildVerifyPath } from "../services/account-navigation";

export function PhoneAuthView({ serviceSlug, returnTo }: { serviceSlug?: string; returnTo?: string }) {
  const router = useRouter();
  const { challenge, startChallenge } = useDemoAuth();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: challenge?.phone ?? "" },
  });

  function continueToVerification(values: PhoneValues) {
    startChallenge({ phone: values.phone, scenario: "normal", serviceSlug, returnTo });
    router.push(buildVerifyPath({ serviceSlug, returnTo }));
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">
          <Smartphone size={25} />
        </div>
        <span className="eyebrow">Step 1 of 2 · Demo sign-in</span>
        <h1>
          One number.
          <br />A simpler starting point.
        </h1>
        <p>Explore your sample account and see your municipal requests in one place.</p>
        <form onSubmit={handleSubmit(continueToVerification)} noValidate>
          <FormField
            id="phone"
            label="Mobile number"
            error={errors.phone?.message}
            hint="Philippine mobile number · 09 or +639 format"
          >
            {(field) => (
              <Input
                {...field}
                type="tel"
                autoComplete="off"
                inputMode="tel"
                placeholder="09XX XXX XXXX"
                {...register("phone")}
              />
            )}
          </FormField>
          <Button type="submit" disabled={isSubmitting}>
            Continue with mobile number
            <ArrowRight />
          </Button>
        </form>
        <div className="demo-hint">
          <p>Please use the sample number. This preview does not send SMS or save your number.</p>
          <button
            className="sample-reference"
            type="button"
            onClick={() => setValue("phone", "09170000000", { shouldValidate: true })}
          >
            Use demo number: 09170000000
          </button>
        </div>
        <div className="auth-bottom">
          <Link href="/help#privacy" className="inline-link">
            About your privacy in this preview
          </Link>
          <Link href="/auth/recover" className="inline-link">
            Recover or change the sample number
          </Link>
          <Link href="/staff/sign-in" className="inline-link">
            Municipal staff demo sign-in
          </Link>
        </div>
      </div>
    </div>
  );
}

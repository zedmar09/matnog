"use client";

import Link from "next/link";

import { ArrowRight, Smartphone } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

import { DemoOtpForm } from "../components/demo-otp-form";
import { useDemoAuth } from "../providers/demo-auth-provider";
import { buildPhoneEntryPath } from "../services/account-navigation";

export function VerifyAuthView({ serviceSlug, returnTo }: { serviceSlug?: string; returnTo?: string }) {
  const { challenge } = useDemoAuth();

  if (!challenge) {
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={Smartphone}
          headingLevel="h1"
          title="Start with your mobile number."
          description="This in-memory demo challenge is missing or was cleared. Enter the sample number to continue."
          action={
            <Button asChild>
              <Link href={buildPhoneEntryPath({ serviceSlug, returnTo })}>
                Go to mobile number
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <DemoOtpForm challenge={challenge} />
      </div>
    </div>
  );
}

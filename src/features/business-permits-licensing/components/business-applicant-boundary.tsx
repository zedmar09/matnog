"use client";

import type { ReactNode } from "react";

import Link from "next/link";

import { LockKeyhole } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { useDemoSession } from "@/shared/providers/demo-session-provider";

export function BusinessApplicantBoundary({ children }: { children: ReactNode }) {
  const { session, ready } = useDemoSession();
  if (!ready) {
    return (
      <div className="site-container page-loading" role="status">
        Preparing the represented-business workspace…
      </div>
    );
  }
  if (!session) {
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={LockKeyhole}
          headingLevel="h1"
          title="Sign in before viewing represented businesses"
          description="Phone verification creates a contact account only. M02 still keeps business authority, residency and municipal ID status separate."
          action={
            <Button asChild>
              <Link href="/auth/phone?service=business-permits">Continue with phone number</Link>
            </Button>
          }
        />
      </div>
    );
  }
  return children;
}

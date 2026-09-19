import Link from "next/link";

import { ArrowRight, Clock3 } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

import { buildSignInPath } from "../services/account-navigation";

export function SessionExpiredPanel() {
  return (
    <EmptyState
      icon={Clock3}
      headingLevel="h1"
      title="Your demo session ended."
      description="The local account marker was cleared. Sign in again to return to the sample profile; no resident or staff access is restored automatically."
      action={
        <div className="empty-state-actions">
          <Button asChild>
            <Link href={buildSignInPath("/account/profile")}>
              Sign in again
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/services">Browse public services</Link>
          </Button>
        </div>
      }
    />
  );
}

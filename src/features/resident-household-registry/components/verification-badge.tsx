import { BadgeCheck, CircleHelp, Clock } from "lucide-react";

import { StatusBadge } from "@/shared/components/status-badge";

import type { VerificationState } from "../types/registry";

const META: Record<
  VerificationState,
  { label: string; tone: "success" | "warning" | "neutral"; icon: typeof BadgeCheck }
> = {
  verified: { label: "Verified", tone: "success", icon: BadgeCheck },
  stale: { label: "Verification overdue", tone: "warning", icon: Clock },
  unverified: { label: "Unverified", tone: "neutral", icon: CircleHelp },
};

/** Verification freshness. Always carries text, never colour alone. */
export function VerificationBadge({ state, on }: { state: VerificationState; on?: string }) {
  const meta = META[state];
  return (
    <StatusBadge tone={meta.tone} icon={<meta.icon size={12} aria-hidden="true" />}>
      {on ? `${meta.label} · ${on}` : meta.label}
    </StatusBadge>
  );
}

import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * Status tones used across modules. Every badge shows text, never colour alone,
 * so status stays readable for colour-blind and screen-reader users.
 */
export type StatusTone = "success" | "pending" | "warning" | "neutral" | "destructive";

export function StatusBadge({
  children,
  tone = "success",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: StatusTone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("status-badge", className)} data-tone={tone === "success" ? undefined : tone}>
      {icon}
      {children}
    </span>
  );
}

import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * Supporting notice. Use it to disclose that an action is simulated or that
 * sample content is not an official municipal rule.
 */
export function NoticePanel({
  children,
  icon,
  dot = false,
  action,
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  dot?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("notice-panel", className)}>
      {dot && <span className="notice-dot" />}
      {icon}
      <p>{children}</p>
      {action}
    </div>
  );
}

import type { ComponentType, ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * First-use and filtered-empty state. `headingLevel` keeps heading order valid
 * when the state replaces a page title rather than a section.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  headingLevel = "h2",
  iconSize = 35,
  className,
}: {
  icon: ComponentType<{ size?: number }>;
  title: string;
  description: string;
  action?: ReactNode;
  headingLevel?: "h1" | "h2";
  iconSize?: number;
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <div className={cn("empty-state", className)}>
      <Icon size={iconSize} />
      <Heading>{title}</Heading>
      <p>{description}</p>
      {action}
    </div>
  );
}

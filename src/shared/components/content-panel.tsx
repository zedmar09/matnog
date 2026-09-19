import type { ElementType, ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/** Shared bordered surface for detail sections, asides and form groups. */
export function ContentPanel({
  children,
  as: Tag = "div",
  className,
  id,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Set when the panel is an in-page anchor target. */
  id?: string;
}) {
  return (
    <Tag className={cn("content-panel", className)} id={id}>
      {children}
    </Tag>
  );
}

/** Thin rule used inside a panel to separate a summary from its details. */
export function PanelDivider() {
  return <div className="panel-divider" />;
}

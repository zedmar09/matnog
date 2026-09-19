import type { ReactNode } from "react";

/** Eyebrow, title and supporting sentence for a section inside a page. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action}
    </>
  );
}

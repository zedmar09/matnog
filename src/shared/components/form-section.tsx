import type { ReactNode } from "react";

/**
 * Groups related fields in a long form. Desktop forms group by meaning; mobile
 * layouts use the same grouping as short sequential sections.
 */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      {description && <p className="small-note">{description}</p>}
      {children}
    </fieldset>
  );
}

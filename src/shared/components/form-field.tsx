import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/** Props a control receives so its label, error and hint stay wired together. */
export type FormControlProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

/**
 * Label, control, inline error and hint for one field. The control is rendered
 * through a function so the describedby target always matches the message that
 * is actually on screen.
 */
export function FormField({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Marks the label with an asterisk instead of labelling optional fields. */
  required?: boolean;
  className?: string;
  children: (props: FormControlProps) => ReactNode;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-help`;
  const hasHint = hint !== undefined && hint !== null && hint !== false && hint !== "";
  const describedBy = error ? errorId : hasHint ? hintId : undefined;
  return (
    <div className={cn("form-field", className)}>
      <label className="form-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="form-required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {error ? (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      ) : (
        hasHint && (
          <p id={hintId} className="small-note">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

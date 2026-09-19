"use client";
import { useEffect, useRef } from "react";

import { CircleAlert } from "lucide-react";

import type { FieldError } from "@/shared/data/repository-result";

export type { FieldError };

/**
 * Summary of every validation failure in a form. It takes focus when it
 * appears so keyboard and screen-reader users hear the problem immediately,
 * and each entry moves focus to the field it describes.
 */
export function ErrorSummary({ errors, title = "Check these fields" }: { errors: FieldError[]; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const count = errors.length;
  useEffect(() => {
    if (count > 0) ref.current?.focus();
  }, [count]);
  if (count === 0) return null;
  return (
    <div className="error-summary" ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title">
      <p id="error-summary-title">
        <CircleAlert size={17} aria-hidden="true" />
        {title}
      </p>
      <ul>
        {errors.map((error) => (
          <li key={error.id}>
            <a href={`#${error.id}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

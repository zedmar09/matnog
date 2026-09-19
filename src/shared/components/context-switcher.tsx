"use client";
import { Building2, Home, UserRound, UsersRound } from "lucide-react";

/**
 * Acting context for a citizen or business session: the signed-in person, a
 * household they represent, or a business they represent. Representation is a
 * separate relationship from the account itself, so the current context is
 * always named on screen rather than implied.
 */
export type ActingContextKind = "self" | "person" | "household" | "business";

export type ActingContext = {
  id: string;
  kind: ActingContextKind;
  label: string;
  detail: string;
};

const CONTEXT_ICONS = { self: UserRound, person: UsersRound, household: Home, business: Building2 };

export function ContextSwitcher({
  contexts,
  value,
  onChange,
  label = "Acting as",
}: {
  contexts: readonly ActingContext[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const active = contexts.find((context) => context.id === value) ?? contexts[0];
  if (!active) return null;
  const Icon = CONTEXT_ICONS[active.kind];
  return (
    <div className="context-switcher">
      <span className="context-switcher-icon">
        <Icon size={18} aria-hidden="true" />
      </span>
      <label>
        {label}
        <select aria-label={label} value={active.id} onChange={(event) => onChange(event.target.value)}>
          {contexts.map((context) => (
            <option key={context.id} value={context.id}>
              {context.label}
            </option>
          ))}
        </select>
      </label>
      <small>{active.detail}</small>
    </div>
  );
}

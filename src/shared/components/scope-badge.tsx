import { Building2, FileLock2, Home, Landmark, MapPin, Ship, UserRound } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * Applicable scope of a record. A barangay label alone is not a scope, so each
 * badge names the kind of scope and its value.
 */
export type RecordScope = "person" | "household" | "business" | "office" | "barangay" | "partner" | "case";

const SCOPE_META: Record<RecordScope, { icon: typeof UserRound; label: string }> = {
  person: { icon: UserRound, label: "Person" },
  household: { icon: Home, label: "Household" },
  business: { icon: Building2, label: "Business" },
  office: { icon: Landmark, label: "Office" },
  barangay: { icon: MapPin, label: "Barangay" },
  partner: { icon: Ship, label: "Partner assignment" },
  case: { icon: FileLock2, label: "Restricted case" },
};

export function ScopeBadge({ scope, value, className }: { scope: RecordScope; value?: string; className?: string }) {
  const { icon: Icon, label } = SCOPE_META[scope];
  return (
    <span className={cn("status-badge", className)} data-tone="neutral">
      <Icon size={12} aria-hidden="true" />
      <span className="sr-only">Scope:</span>
      {value ? `${label} · ${value}` : label}
    </span>
  );
}

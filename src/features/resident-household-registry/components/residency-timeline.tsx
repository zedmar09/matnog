import { MapPin } from "lucide-react";

import { StatusBadge } from "@/shared/components/status-badge";

import type { ResidencyPeriod } from "../types/registry";

/**
 * Residency history, newest first. A closed period is never removed, so a
 * transfer remains inspectable long after it completes.
 */
export function ResidencyTimeline({ periods }: { periods: readonly ResidencyPeriod[] }) {
  const ordered = [...periods].sort((a, b) => b.from.localeCompare(a.from));
  return (
    <ol className="registry-periods">
      {ordered.map((period) => (
        <li key={period.id}>
          <span className="registry-period-icon" data-current={!period.to}>
            <MapPin size={14} aria-hidden="true" />
          </span>
          <div>
            <strong>{period.barangay.label}</strong>
            <p>
              {period.from} – {period.to ?? "present"}
              {period.transferId ? ` · Transfer ${period.transferId}` : ""}
            </p>
            <small>Structure {period.structureId}</small>
          </div>
          <StatusBadge tone={period.to ? "neutral" : "success"}>{period.to ? "Closed" : "Current"}</StatusBadge>
        </li>
      ))}
    </ol>
  );
}

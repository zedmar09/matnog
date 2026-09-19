"use client";
import type { FilterOption } from "@/shared/components/filter-bar";
import { type DemoClock, demoClock, formatDemoDate } from "@/shared/data/demo-clock";
import { useDemoNow } from "@/shared/hooks/use-demo-clock";

/**
 * Demo persona and sample-state controls. These stay outside ordinary service
 * journeys: they select which fixture projection is shown and never grant
 * access to real records.
 */
export function ScenarioPanel({
  personaLabel = "Demo persona",
  personas,
  persona,
  onPersonaChange,
  scenarioLabel = "Preview state",
  scenarios,
  scenario,
  onScenarioChange,
}: {
  personaLabel?: string;
  personas: readonly FilterOption[];
  persona: string;
  onPersonaChange: (value: string) => void;
  scenarioLabel?: string;
  scenarios: readonly FilterOption[];
  scenario: string;
  onScenarioChange: (value: string) => void;
}) {
  return (
    <>
      <label>
        {personaLabel}
        <select aria-label={personaLabel} value={persona} onChange={(event) => onPersonaChange(event.target.value)}>
          {personas.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {scenarioLabel}
        <select aria-label={scenarioLabel} value={scenario} onChange={(event) => onScenarioChange(event.target.value)}>
          {scenarios.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

/**
 * Moves the prototype's fixed "today". Expiry, overdue and age are derived from
 * this clock, so a reviewer can reach those states deliberately instead of
 * waiting for the real date to catch up.
 */
export function DemoClockControl({ clock = demoClock }: { clock?: DemoClock }) {
  const now = useDemoNow(clock);
  return (
    <div className="demo-clock">
      <span>Demo date</span>
      <strong>{formatDemoDate(new Date(now).toISOString())}</strong>
      <div>
        <button type="button" onClick={() => clock.advanceDays(1)}>
          +1 day
        </button>
        <button type="button" onClick={() => clock.advanceDays(7)}>
          +7 days
        </button>
        <button type="button" onClick={() => clock.reset()}>
          Reset
        </button>
      </div>
    </div>
  );
}

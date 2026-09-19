"use client";
import { ShieldCheck } from "lucide-react";

import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { ModuleList } from "../components/module-list";
import { GROUPS } from "../data/modules";

export function OperationsView() {
  const { role, scenario, group, generation, setScenario, setGroup, reset } = useWorkspaceSession();

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>{GROUPS.find((item) => item.id === group)?.label}</h1>
          <p>A starting point for the people and services you support.</p>
        </div>
      </div>
      <fieldset className="ops-area-tabs">
        <legend className="sr-only">Workspace area</legend>
        {GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-state={group === item.id ? "on" : "off"}
            onClick={() => setGroup(item.id)}
          >
            {item.label}
          </button>
        ))}
      </fieldset>
      <ModuleList
        key={`${role}-${scenario}-${group}-${generation}`}
        role={role}
        scenario={scenario}
        group={group}
        onRetry={() => setScenario("normal")}
        onReset={reset}
      />
      <p className="ops-scope-note">
        <ShieldCheck size={14} />
        Role selection demonstrates navigation scope. It does not grant access to real records or provide production
        authorization.
      </p>
    </>
  );
}

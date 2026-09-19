"use client";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { demoClock } from "@/shared/data/demo-clock";

/** Demo personas available in the operations workspace. */
export type WorkspaceRole = "municipal" | "barangay" | "partner" | "enumerator";

/** Sample-data states a reviewer can select. */
export type WorkspaceScenario = "normal" | "empty" | "error" | "denied" | "slow";

const STORAGE_KEY = "digital-matnog-workspace-session-v1";

const ROLES: WorkspaceRole[] = ["municipal", "barangay", "partner", "enumerator"];
const SCENARIOS: WorkspaceScenario[] = ["normal", "empty", "error", "denied", "slow"];

export type WorkspaceSession = {
  role: WorkspaceRole;
  scenario: WorkspaceScenario;
  group: string;
  /** Bumped by a role change or reset so dependent views remount. */
  generation: number;
  /** False until the stored selection has been read on the client. */
  ready: boolean;
  setRole: (role: WorkspaceRole) => void;
  setScenario: (scenario: WorkspaceScenario) => void;
  setGroup: (group: string) => void;
  reset: () => void;
};

const WorkspaceSessionContext = createContext<WorkspaceSession | null>(null);

export function WorkspaceSessionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<WorkspaceRole>("municipal");
  const [scenario, setScenarioState] = useState<WorkspaceScenario>("normal");
  const [group, setGroup] = useState("all");
  const [generation, setGeneration] = useState(0);
  const [ready, setReady] = useState(false);

  /**
   * The selected persona survives a page reload, so a reviewer does not lose
   * their context when they open a record in a new tab or refresh. It is read
   * after mount to keep the server and first client render identical, and it
   * lives in sessionStorage so a fresh browser session starts clean.
   */
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
      if (stored && typeof stored === "object") {
        const next = stored as { role?: unknown; scenario?: unknown };
        if (ROLES.includes(next.role as WorkspaceRole)) setRoleState(next.role as WorkspaceRole);
        if (SCENARIOS.includes(next.scenario as WorkspaceScenario)) {
          setScenarioState(next.scenario as WorkspaceScenario);
        }
      }
    } catch {
      /* Storage may be unavailable; the workspace still works in memory. */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: { role: WorkspaceRole; scenario: WorkspaceScenario }) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* The in-memory selection remains usable. */
    }
  }, []);

  const setScenario = useCallback(
    (next: WorkspaceScenario) => {
      setScenarioState(next);
      setRoleState((current) => {
        persist({ role: current, scenario: next });
        return current;
      });
    },
    [persist],
  );

  /**
   * A role change clears incompatible selections and the scenario, and bumps
   * the generation so query results and open records do not carry over. This
   * demonstrates intended behaviour; it is not a security boundary.
   */
  const setRole = useCallback(
    (next: WorkspaceRole) => {
      setRoleState(next);
      setGroup("all");
      setScenarioState("normal");
      setGeneration((value) => value + 1);
      persist({ role: next, scenario: "normal" });
    },
    [persist],
  );

  const reset = useCallback(() => {
    setRoleState("municipal");
    setScenarioState("normal");
    setGroup("all");
    demoClock.reset();
    setGeneration((value) => value + 1);
    persist({ role: "municipal", scenario: "normal" });
  }, [persist]);

  const value = useMemo<WorkspaceSession>(
    () => ({ role, scenario, group, generation, ready, setRole, setScenario, setGroup, reset }),
    [role, scenario, group, generation, ready, setRole, setScenario, reset],
  );

  return <WorkspaceSessionContext.Provider value={value}>{children}</WorkspaceSessionContext.Provider>;
}

export function useWorkspaceSession(): WorkspaceSession {
  const value = useContext(WorkspaceSessionContext);
  if (!value) throw new Error("useWorkspaceSession must be used inside WorkspaceSessionProvider");
  return value;
}

/**
 * The workspace session when one exists, otherwise null.
 *
 * Some views are reachable from both a public route and the operations shell.
 * On the public side there is no workspace, no persona and no scenario switch,
 * so those screens must render without one rather than crash.
 */
export function useOptionalWorkspaceSession(): WorkspaceSession | null {
  return useContext(WorkspaceSessionContext);
}

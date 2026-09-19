"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { useDemoSession } from "@/shared/providers/demo-session-provider";

import { DEMO_REPRESENTATIONS } from "../data/representations";
import { listAvailableRequesterContexts, resolveRequesterContext } from "../services/representation";
import type { RequesterContext } from "../types/representation";

type RequesterContextValue = {
  active: RequesterContext;
  available: readonly RequesterContext[];
  selectRequester: (id: string) => boolean;
  expireActiveAuthority: () => RequesterContext | null;
  resetRequester: () => void;
};

const Context = createContext<RequesterContextValue | null>(null);

export function DemoRequesterProvider({ children }: { children: ReactNode }) {
  const { session, ready } = useDemoSession();
  const [activeId, setActiveId] = useState("self");
  const [locallyExpiredIds, setLocallyExpiredIds] = useState<string[]>([]);
  const expiredSet = useMemo(() => new Set(locallyExpiredIds), [locallyExpiredIds]);
  const available = useMemo(() => listAvailableRequesterContexts(DEMO_REPRESENTATIONS, expiredSet), [expiredSet]);
  const active = resolveRequesterContext(activeId, available);

  useEffect(() => {
    if (ready && !session) {
      setActiveId("self");
      setLocallyExpiredIds([]);
    }
  }, [ready, session]);

  const value = useMemo<RequesterContextValue>(
    () => ({
      active,
      available,
      selectRequester(id) {
        if (!available.some((context) => context.id === id)) return false;
        setActiveId(id);
        return true;
      },
      expireActiveAuthority() {
        if (active.id === "self") return null;
        setLocallyExpiredIds((current) => [...new Set([...current, active.id])]);
        setActiveId("self");
        return active;
      },
      resetRequester() {
        setActiveId("self");
        setLocallyExpiredIds([]);
      },
    }),
    [active, available],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDemoRequester() {
  const context = useContext(Context);
  if (!context) throw new Error("useDemoRequester requires DemoRequesterProvider");
  return context;
}

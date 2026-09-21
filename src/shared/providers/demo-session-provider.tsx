"use client";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import {
  createDemoVisitorSession,
  createResidentAssociation,
  type DemoSession,
  restoreDemoSession,
} from "@/features/unified-account-and-id/types/account-context";

type SessionContext = {
  session: DemoSession | null;
  ready: boolean;
  expired: boolean;
  signIn: (phone?: string) => void;
  signOut: () => void;
  expireSession: () => void;
  requestResidentAssociation: (personId: string) => void;
  approveResidentAssociation: (personId: string) => void;
};
const Context = createContext<SessionContext | null>(null);
const KEY = "digital-matnog-demo-session-v1";
const SEEDED_RESIDENT_PHONE = "09170000000";

/** This one fictional account already has an approved M01 link on file. */
function withSeededResidentLink(session: DemoSession): DemoSession {
  const digits = session.phone.replace(/\D/g, "");
  const known = digits === SEEDED_RESIDENT_PHONE || digits === `63${SEEDED_RESIDENT_PHONE.slice(1)}`;
  return known && !session.residentAssociation
    ? { ...session, residentAssociation: createResidentAssociation("linked") }
    : session;
}

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
      const restored = restoreDemoSession(stored);
      if (restored) setSession(withSeededResidentLink(restored));
    } catch {
      /* Storage may be unavailable; the demo still works in memory. */
    }
    setReady(true);
  }, []);
  function signIn(phone?: string) {
    const next = withSeededResidentLink(createDemoVisitorSession(phone));
    setSession(next);
    setExpired(false);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* In-memory session remains usable. */
    }
  }
  function signOut() {
    setSession(null);
    setExpired(false);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* No persistent storage is required. */
    }
  }
  function expireSession() {
    setSession(null);
    setExpired(true);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* No persistent storage is required. */
    }
  }
  function requestResidentAssociation(personId: string) {
    setSession((current) => {
      if (!current || personId !== "DEMO-PER-001" || current.residentAssociation) return current;
      const next: DemoSession = {
        ...current,
        residentAssociation: createResidentAssociation("pending"),
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* In-memory association remains usable. */
      }
      return next;
    });
  }
  function approveResidentAssociation(personId: string) {
    setSession((current) => {
      if (
        !current ||
        personId !== "DEMO-PER-001" ||
        current.residentAssociation?.personId !== personId ||
        current.residentAssociation.status !== "pending"
      ) {
        return current;
      }
      const next: DemoSession = {
        ...current,
        residentAssociation: createResidentAssociation("linked"),
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* In-memory association remains usable. */
      }
      return next;
    });
  }
  return (
    <Context.Provider
      value={{
        session,
        ready,
        expired,
        signIn,
        signOut,
        expireSession,
        requestResidentAssociation,
        approveResidentAssociation,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemoSession() {
  const context = useContext(Context);
  if (!context) throw new Error("useDemoSession requires DemoSessionProvider");
  return context;
}

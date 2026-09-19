"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

import {
  type AuthChallenge,
  type AuthScenario,
  startChallenge as createChallenge,
  resendChallenge as createResentChallenge,
  type StartChallengeResult,
} from "../services/auth-simulation";

type StartChallengeInput = {
  phone: string;
  scenario: AuthScenario;
  serviceSlug?: string;
  returnTo?: string;
};

type DemoAuthContext = {
  challenge: AuthChallenge | null;
  startChallenge: (input: StartChallengeInput) => StartChallengeResult;
  resendChallenge: () => AuthChallenge | null;
  clearChallenge: () => void;
};

const Context = createContext<DemoAuthContext | null>(null);

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);

  const value = useMemo<DemoAuthContext>(
    () => ({
      challenge,
      startChallenge(input) {
        const result = createChallenge(input);
        setChallenge(result.kind === "ready" ? result.challenge : null);
        return result;
      },
      resendChallenge() {
        if (!challenge) return null;
        const next = createResentChallenge(challenge);
        setChallenge(next);
        return next;
      },
      clearChallenge() {
        setChallenge(null);
      },
    }),
    [challenge],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDemoAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("useDemoAuth requires DemoAuthProvider");
  return context;
}

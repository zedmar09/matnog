"use client";
import { createContext, type ReactNode, useContext, useState } from "react";

import { createIdentityDemoSeed } from "../data/identity-fixtures";
import {
  type IdentityOperationResult,
  requestCredentialReplacement,
  resubmitIdentityApplication,
  reviewIdentityApplication,
  reviewResidentLink,
  revokeActiveCredential,
} from "../services/municipal-id";
import type { IdentityDemoState } from "../types/municipal-id";

type OperationOutcome = { ok: boolean; message: string };

type IdentityContextValue = {
  state: IdentityDemoState;
  reviewLink: (decision: "approve" | "reject", reason?: string) => OperationOutcome;
  reviewApplication: (decision: "approve" | "correction" | "reject", reason?: string) => OperationOutcome;
  resubmitApplication: () => OperationOutcome;
  requestReplacement: (reason: string) => OperationOutcome;
  revokeCredential: (reason: string) => OperationOutcome;
  resetIdentityDemo: () => void;
};

const Context = createContext<IdentityContextValue | null>(null);

export function DemoIdentityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<IdentityDemoState>(() => createIdentityDemoSeed());

  function run(operation: (current: IdentityDemoState) => IdentityOperationResult): OperationOutcome {
    const result = operation(state);
    setState(result.state);
    return { ok: result.ok, message: result.message };
  }

  const value: IdentityContextValue = {
    state,
    reviewLink: (decision, reason) => run((current) => reviewResidentLink(current, decision, reason)),
    reviewApplication: (decision, reason) => run((current) => reviewIdentityApplication(current, decision, reason)),
    resubmitApplication: () => run(resubmitIdentityApplication),
    requestReplacement: (reason) => run((current) => requestCredentialReplacement(current, reason)),
    revokeCredential: (reason) => run((current) => revokeActiveCredential(current, reason)),
    resetIdentityDemo: () => setState(createIdentityDemoSeed()),
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDemoIdentity(): IdentityContextValue {
  const value = useContext(Context);
  if (!value) throw new Error("useDemoIdentity must be used inside DemoIdentityProvider");
  return value;
}

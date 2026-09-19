"use client";
import { useMemo } from "react";

import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { REGISTRY_ACTORS, type RegistryActor } from "../services/registry-projections";

/**
 * Maps the workspace persona onto a registry actor. The tourism partner has no
 * registry role at all, which the screens present as a permission state rather
 * than an empty list.
 */
export function useRegistryActor(): RegistryActor | null {
  const { role } = useWorkspaceSession();
  return useMemo(() => {
    switch (role) {
      case "municipal":
        return REGISTRY_ACTORS["data-steward"];
      case "barangay":
        return REGISTRY_ACTORS["barangay-staff"];
      case "enumerator":
        return REGISTRY_ACTORS.enumerator;
      case "partner":
        return null;
    }
  }, [role]);
}

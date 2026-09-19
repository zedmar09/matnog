"use client";

import { type ReactNode, useEffect, useState } from "react";

import Link from "next/link";

import { FileX2 } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

/**
 * Applies the shared selectable repository states to M05 screens. The delay is
 * deliberately local and deterministic; it does not perform a network call.
 */
export function DocumentScenarioBoundary({
  children,
  emptyTitle = "No document records",
  emptyDescription = "No document-routing records are available.",
}: {
  children: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { scenario, generation, setScenario } = useWorkspaceSession();
  const scenarioKey = `${scenario}-${generation}`;
  const [resolvedSlowKey, setResolvedSlowKey] = useState("");

  useEffect(() => {
    if (scenario !== "slow") return;
    const timer = window.setTimeout(() => setResolvedSlowKey(scenarioKey), 650);
    return () => window.clearTimeout(timer);
  }, [scenario, scenarioKey]);

  if (scenario === "slow" && resolvedSlowKey !== scenarioKey) {
    return (
      <LoadingState label="Loading document records" message="Loading the latest routing and custody information…" />
    );
  }
  if (scenario === "empty") {
    return (
      <EmptyState
        icon={FileX2}
        title={emptyTitle}
        description={emptyDescription}
        action={<Button onClick={() => setScenario("normal")}>Restore records</Button>}
      />
    );
  }
  if (scenario === "error") {
    return (
      <ErrorState
        title="The document workspace could not load."
        description="The document records could not be retrieved. Try again."
        onRetry={() => setScenario("normal")}
      />
    );
  }
  if (scenario === "denied") {
    return (
      <PermissionState
        title="Document workspace unavailable"
        description="This role cannot access document metadata or actions."
        action={
          <Button asChild variant="outline">
            <Link href="/ops">Return to workspace</Link>
          </Button>
        }
      />
    );
  }
  return children;
}

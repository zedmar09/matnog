"use client";

import Link from "next/link";

import { useList } from "@refinedev/core";
import { ArrowRight, FolderOpen, LockKeyhole, SearchX } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { Button } from "@/shared/components/ui/button";

import { GROUPS } from "../data/modules";
import type { DemoScenario, MunicipalModule, WorkspaceRole } from "../types/module";

/**
 * The workspace index. Every module lists the screens it owns, so the overview
 * is the complete way in rather than a description of work.
 */
export function ModuleList({
  role,
  scenario,
  group,
  onRetry,
  onReset,
}: {
  role: WorkspaceRole;
  scenario: DemoScenario;
  group: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  const { result, query } = useList<MunicipalModule>({
    resource: "municipal-modules",
    pagination: { mode: "off" },
    queryOptions: { retry: false, queryKey: ["municipal-modules", role, scenario] },
  });
  const modules = result.data.filter((module) => group === "all" || module.group === group);

  if (query.isLoading) return <LoadingState label="Loading modules" />;
  if (query.isError) return <ErrorState onRetry={onRetry} />;
  if (modules.length === 0)
    return (
      <EmptyState
        icon={scenario === "empty" ? FolderOpen : SearchX}
        title={scenario === "empty" ? "Your workspace is clear." : "No modules in this area."}
        description={
          scenario === "empty" ? "This workspace has no assigned modules." : "Choose a different workspace area."
        }
        action={
          <Button variant="outline" onClick={onReset}>
            Reset workspace
          </Button>
        }
      />
    );

  return (
    <div className="ops-module-grid">
      {modules.map((module) => {
        const screens = module.screens.filter(
          (screen) => !screen.hidden && (!screen.roles || screen.roles.includes(role)),
        );
        return (
          <article className="ops-module-card" key={module.id}>
            <div className="ops-module-head">
              <span className="ops-module-area">{GROUPS.find((item) => item.id === module.group)?.label}</span>
            </div>
            <h3>{module.name}</h3>
            <p>
              {module.restricted
                ? "Protected records are limited by staff assignment, case class, and scope."
                : module.description}
            </p>
            {module.restricted ? (
              <p className="ops-module-restricted">
                <LockKeyhole size={14} aria-hidden="true" />
                Restricted module
              </p>
            ) : null}
            <ul className="ops-module-screens">
              {screens.map((screen) => (
                <li key={screen.href}>
                  <Link href={screen.href}>
                    {screen.label}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

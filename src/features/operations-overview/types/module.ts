import type { WorkspaceRole, WorkspaceScenario } from "@/shared/providers/workspace-session-provider";

export type { WorkspaceRole };
export type DemoScenario = WorkspaceScenario;
export type ModuleGroup = "people" | "services" | "planning" | "administration";
/** One reachable staff screen inside a module. */
export type ModuleScreen = {
  href: string;
  label: string;
  /** Reachable from inside the module, so it is left out of the menus. */
  hidden?: boolean;
  /** Narrower than the module's own roles when a screen is further limited. */
  roles?: WorkspaceRole[];
};

export type MunicipalModule = {
  id: string;
  name: string;
  /** Sidebar label. The full name is used on the overview cards. */
  shortName: string;
  description: string;
  group: ModuleGroup;
  stage: string;
  roles: WorkspaceRole[];
  features: string[];
  /** Every screen the module owns. Drives both the sidebar and the overview. */
  screens: ModuleScreen[];
  foundation?: boolean;
  restricted?: boolean;
};

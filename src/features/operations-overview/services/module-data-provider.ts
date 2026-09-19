import type { BaseRecord, DataProvider } from "@refinedev/core";

import { MODULES } from "../data/modules";
import type { DemoScenario, WorkspaceRole } from "../types/module";

function unavailable(): never {
  throw Object.assign(new Error("Module editing is planned for a later phase."), { statusCode: 405 });
}
export function createModuleDataProvider(role: WorkspaceRole, scenario: DemoScenario): DataProvider {
  return {
    getList: async <TData extends BaseRecord = BaseRecord>({ resource }: { resource: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (resource !== "municipal-modules")
        throw Object.assign(new Error("Unknown preview resource."), { statusCode: 404 });
      if (scenario === "error")
        throw Object.assign(new Error("Simulated connection issue. Retry with sample data."), { statusCode: 503 });
      const data = scenario === "empty" ? [] : MODULES.filter((module) => module.roles.includes(role));
      return { data: data as unknown as TData[], total: data.length };
    },
    getOne: async <TData extends BaseRecord = BaseRecord>({ id }: { id: string | number }) => {
      const data = MODULES.find((module) => module.id === id && module.roles.includes(role));
      if (!data) throw Object.assign(new Error("Module unavailable in this workspace."), { statusCode: 404 });
      return { data: data as unknown as TData };
    },
    create: async () => unavailable(),
    update: async () => unavailable(),
    deleteOne: async () => unavailable(),
    getApiUrl: () => "",
  };
}

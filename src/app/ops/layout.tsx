import type { ReactNode } from "react";

import { OperationsShell } from "@/shared/layouts/operations/operations-shell";

export default function OpsLayout({ children }: { children: ReactNode }) {
  return <OperationsShell>{children}</OperationsShell>;
}

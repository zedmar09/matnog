import type { ReactNode } from "react";

import { WorkspaceSessionProvider } from "@/shared/providers/workspace-session-provider";

export default function PartnerLayout({ children }: { children: ReactNode }) {
  return <WorkspaceSessionProvider>{children}</WorkspaceSessionProvider>;
}
